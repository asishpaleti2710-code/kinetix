import os
import json
import shutil
import threading
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db, SessionLocal
from app.models.models import Document, DocumentAnalysis
from app.rag.pdf_loader import extract_text_chunks_from_pdf
from app.rag.vector_store import vector_store
from app.services.document_intelligence import (
    extract_text_from_file,
    detect_document_type,
    analyze_document,
)

router = APIRouter(prefix="/documents", tags=["Knowledge Base & Document Intelligence"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".csv", ".xlsx", ".xls"}


def _flush_debug(db, analysis_row, debug: dict):
    """Persist the current debug_info dict to the database."""
    try:
        analysis_row.debug_info = json.dumps(debug)
        db.commit()
    except Exception:
        pass


def _background_analyze(document_id: int, file_path: str, filename: str):
    """
    Background task with granular debug tracking:
      Step 1 – Upload  (always done by the time this runs)
      Step 2 – Text Extraction
      Step 3 – Embedding / Vector Store indexing
      Step 4 – AI Analysis
      Step 5 – Completion / DB save
    """
    db = SessionLocal()

    # Initialise the debug tracker
    debug = {
        "upload":     {"status": "done",       "message": "File saved to disk."},
        "extraction": {"status": "processing",  "message": "Extracting text…"},
        "embedding":  {"status": "pending",     "message": "Waiting for extraction."},
        "ai_analysis":{"status": "pending",     "message": "Waiting for extraction."},
        "completion": {"status": "pending",     "message": "Waiting for AI analysis."},
    }

    try:
        # Ensure an analysis row exists and mark as processing
        analysis_row = db.query(DocumentAnalysis).filter(DocumentAnalysis.document_id == document_id).first()
        if not analysis_row:
            analysis_row = DocumentAnalysis(
                document_id=document_id,
                analysis_status="processing",
                debug_info=json.dumps(debug)
            )
            db.add(analysis_row)
            db.commit()
        else:
            analysis_row.analysis_status = "processing"
            analysis_row.error_message = None
            _flush_debug(db, analysis_row, debug)

        # ── Step 2: Text Extraction ───────────────────────────────────────────
        try:
            text, file_type = extract_text_from_file(file_path, filename)
        except Exception as ex:
            text = f"[Extraction exception: {ex}]"
            file_type = "unknown"

        extraction_ok = bool(text) and not text.startswith("[")
        if extraction_ok:
            debug["extraction"] = {"status": "done", "message": f"Extracted {len(text):,} characters ({file_type})."}
        else:
            reason = text or "No text could be extracted from the file."
            debug["extraction"] = {"status": "failed", "message": reason}
            debug["embedding"]   = {"status": "skipped", "message": "Skipped — extraction failed."}
            debug["ai_analysis"] = {"status": "skipped", "message": "Skipped — extraction failed."}
            debug["completion"]  = {"status": "failed",  "message": "Pipeline aborted at extraction step."}
            analysis_row.analysis_status = "failed"
            analysis_row.error_message = reason
            _flush_debug(db, analysis_row, debug)
            return

        _flush_debug(db, analysis_row, debug)

        # Update file_type on Document row
        doc_row = db.query(Document).filter(Document.id == document_id).first()
        if doc_row:
            doc_row.file_type = file_type
            db.commit()

        # Detect document type
        doc_type = detect_document_type(text, filename)

        # ── Step 3: Embedding / Vector Store ─────────────────────────────────
        debug["embedding"] = {"status": "processing", "message": "Chunking and indexing into vector store…"}
        _flush_debug(db, analysis_row, debug)

        embed_error = None
        chunk_count = 0
        try:
            if file_path.lower().endswith(".pdf"):
                try:
                    from app.rag.pdf_loader import extract_text_chunks_from_pdf
                    chunks = extract_text_chunks_from_pdf(file_path)
                except Exception as ex:
                    chunks = []
                    embed_error = f"PDF chunking error: {ex}"
            else:
                from app.rag.pdf_loader import chunk_text_document
                chunks = chunk_text_document(text=text, filename=filename)

            if chunks:
                chunk_count = vector_store.add_chunks(chunks, filename=filename)
                if doc_row:
                    doc_row.chunk_count = chunk_count
                    db.commit()
        except Exception as ex:
            embed_error = str(ex)

        if embed_error:
            debug["embedding"] = {"status": "failed", "message": f"Vector indexing failed: {embed_error}. Analysis will continue without RAG indexing."}
        else:
            debug["embedding"] = {"status": "done", "message": f"{chunk_count} chunks indexed into vector store."}
        _flush_debug(db, analysis_row, debug)

        # ── Step 4: AI Analysis ───────────────────────────────────────────────
        debug["ai_analysis"] = {"status": "processing", "message": f"Running AI analysis on {doc_type} document…"}
        _flush_debug(db, analysis_row, debug)

        try:
            analysis_result = analyze_document(text, filename, doc_type)
        except Exception as ex:
            ai_error = str(ex)
            debug["ai_analysis"] = {"status": "failed",  "message": f"AI analysis failed: {ai_error}"}
            debug["completion"]  = {"status": "failed",  "message": "Pipeline aborted at AI analysis step."}
            analysis_row.analysis_status = "failed"
            analysis_row.error_message = ai_error
            _flush_debug(db, analysis_row, debug)
            return

        debug["ai_analysis"] = {"status": "done", "message": f"AI analysis complete ({doc_type})."}
        _flush_debug(db, analysis_row, debug)

        # ── Step 5: Persist Results ───────────────────────────────────────────
        debug["completion"] = {"status": "processing", "message": "Saving results to database…"}
        _flush_debug(db, analysis_row, debug)

        analysis_row.doc_type = doc_type
        analysis_row.executive_summary = analysis_result.get("executive_summary", "")
        analysis_row.key_topics = json.dumps(analysis_result.get("key_topics", []))
        analysis_row.key_entities = json.dumps(analysis_result.get("key_entities", []))
        analysis_row.key_takeaways = json.dumps(analysis_result.get("key_takeaways", []))
        analysis_row.actionable_suggestions = json.dumps(analysis_result.get("actionable_suggestions", []))
        analysis_row.risks = json.dumps(analysis_result.get("risks", []))
        analysis_row.opportunities = json.dumps(analysis_result.get("opportunities", []))
        analysis_row.recommendations = json.dumps(analysis_result.get("recommendations", []))
        analysis_row.suggested_questions = json.dumps(analysis_result.get("suggested_questions", []))
        analysis_row.important_metrics = json.dumps(analysis_result.get("important_metrics", []))

        if doc_type == "resume":
            analysis_row.ats_score = analysis_result.get("ats_score")
            analysis_row.missing_skills = json.dumps(analysis_result.get("missing_skills", []))
            analysis_row.resume_strengths = json.dumps(analysis_result.get("resume_strengths", []))
            analysis_row.resume_weaknesses = json.dumps(analysis_result.get("resume_weaknesses", []))
            analysis_row.recommended_projects = json.dumps(analysis_result.get("recommended_projects", []))
            analysis_row.recommended_certifications = json.dumps(analysis_result.get("recommended_certifications", []))
            analysis_row.job_match_percentage = analysis_result.get("job_match_percentage")

        elif doc_type == "research_paper":
            analysis_row.abstract_summary = analysis_result.get("abstract_summary", "")
            analysis_row.methodology = analysis_result.get("methodology", "")
            analysis_row.key_findings = json.dumps(analysis_result.get("key_findings", []))
            analysis_row.limitations = json.dumps(analysis_result.get("limitations", []))
            analysis_row.future_scope = analysis_result.get("future_scope", "")
            analysis_row.simplified_explanation = analysis_result.get("simplified_explanation", "")

        elif doc_type == "business_document":
            analysis_row.swot_strengths = json.dumps(analysis_result.get("swot_strengths", []))
            analysis_row.swot_weaknesses = json.dumps(analysis_result.get("swot_weaknesses", []))
            analysis_row.swot_opportunities = json.dumps(analysis_result.get("swot_opportunities", []))
            analysis_row.swot_threats = json.dumps(analysis_result.get("swot_threats", []))
            analysis_row.strategic_recommendations = json.dumps(analysis_result.get("strategic_recommendations", []))
            analysis_row.action_plan = json.dumps(analysis_result.get("action_plan", []))

        debug["completion"] = {"status": "done", "message": "All results saved. Analysis complete!"}
        analysis_row.analysis_status = "complete"
        analysis_row.debug_info = json.dumps(debug)
        db.commit()

    except Exception as e:
        err_msg = str(e)
        try:
            debug["completion"] = {"status": "failed", "message": f"Unexpected error: {err_msg}"}
            analysis_row.analysis_status = "failed"
            analysis_row.error_message = err_msg
            analysis_row.debug_info = json.dumps(debug)
            db.commit()
        except Exception:
            pass
    finally:
        db.close()


def _serialize_analysis(analysis: DocumentAnalysis) -> dict:
    """Convert DocumentAnalysis ORM row to a clean dict with parsed JSON fields."""
    def parse(val):
        if val is None:
            return []
        try:
            return json.loads(val)
        except Exception:
            return [val] if val else []

    # Parse debug_info safely
    debug_info = {}
    if analysis.debug_info:
        try:
            debug_info = json.loads(analysis.debug_info)
        except Exception:
            pass

    return {
        "id": analysis.id,
        "document_id": analysis.document_id,
        "doc_type": analysis.doc_type,
        "analysis_status": analysis.analysis_status,
        "error_message": analysis.error_message,
        "debug_info": debug_info,

        "executive_summary": analysis.executive_summary or "",
        "key_topics": parse(analysis.key_topics),
        "key_entities": parse(analysis.key_entities),
        "key_takeaways": parse(analysis.key_takeaways),
        "actionable_suggestions": parse(analysis.actionable_suggestions),
        "risks": parse(analysis.risks),
        "opportunities": parse(analysis.opportunities),
        "recommendations": parse(analysis.recommendations),
        "suggested_questions": parse(analysis.suggested_questions),
        "important_metrics": parse(getattr(analysis, "important_metrics", None)),

        # Resume
        "ats_score": analysis.ats_score,
        "missing_skills": parse(analysis.missing_skills),
        "resume_strengths": parse(analysis.resume_strengths),
        "resume_weaknesses": parse(analysis.resume_weaknesses),
        "recommended_projects": parse(analysis.recommended_projects),
        "recommended_certifications": parse(analysis.recommended_certifications),
        "job_match_percentage": analysis.job_match_percentage,

        # Research
        "abstract_summary": analysis.abstract_summary or "",
        "methodology": analysis.methodology or "",
        "key_findings": parse(analysis.key_findings),
        "limitations": parse(analysis.limitations),
        "future_scope": analysis.future_scope or "",
        "simplified_explanation": analysis.simplified_explanation or "",

        # Business
        "swot_strengths": parse(analysis.swot_strengths),
        "swot_weaknesses": parse(analysis.swot_weaknesses),
        "swot_opportunities": parse(analysis.swot_opportunities),
        "swot_threats": parse(analysis.swot_threats),
        "strategic_recommendations": parse(analysis.strategic_recommendations),
        "action_plan": parse(analysis.action_plan),

        "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
        "updated_at": analysis.updated_at.isoformat() if analysis.updated_at else None,
    }


# ─────────────────────────────────────────────
# API Routes
# ─────────────────────────────────────────────

@router.get("")
def get_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.upload_date.desc()).all()
    result = []
    for doc in docs:
        d = {
            "id": doc.id,
            "filename": doc.filename,
            "file_path": doc.file_path,
            "file_size": doc.file_size,
            "file_type": doc.file_type,
            "chunk_count": doc.chunk_count,
            "upload_date": doc.upload_date.isoformat() if doc.upload_date else None,
            "analysis_status": doc.analysis.analysis_status if doc.analysis else "not_started",
            "doc_type": doc.analysis.doc_type if doc.analysis else None,
        }
        result.append(d)
    return result


@router.post("/upload")
def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Multi-format upload: PDF, DOCX, TXT, CSV, XLSX.
    Immediately saves the file, creates DB records, and kicks off background AI analysis.
    """
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: PDF, DOCX, TXT, CSV, XLSX"
        )

    file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)

    # Upsert Document record
    existing = db.query(Document).filter(Document.filename == file.filename).first()
    if existing:
        existing.file_size = file_size
        existing.file_path = file_path
        existing.chunk_count = 0
        existing.file_type = ext.lstrip(".")
        db.commit()
        doc = existing
        # Reset analysis
        if doc.analysis:
            doc.analysis.analysis_status = "pending"
            doc.analysis.error_message = None
            db.commit()
    else:
        doc = Document(
            filename=file.filename,
            file_path=file_path,
            file_size=file_size,
            file_type=ext.lstrip("."),
            chunk_count=0,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

    # Create pending analysis record if not existing
    if not doc.analysis:
        analysis = DocumentAnalysis(document_id=doc.id, analysis_status="pending")
        db.add(analysis)
        db.commit()

    # Kick off background AI analysis
    background_tasks.add_task(_background_analyze, doc.id, file_path, file.filename)

    return {
        "success": True,
        "document_id": doc.id,
        "filename": doc.filename,
        "file_size": file_size,
        "file_type": ext.lstrip("."),
        "analysis_status": "processing",
        "message": f"'{file.filename}' uploaded successfully. AI analysis is running in the background."
    }


@router.get("/{document_id}/status")
def get_document_status(document_id: int, db: Session = Depends(get_db)):
    """Lightweight polling endpoint: returns analysis_status + debug_info only."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    analysis = doc.analysis
    if not analysis:
        return {
            "document_id": document_id,
            "analysis_status": "not_started",
            "error_message": None,
            "debug_info": {}
        }

    debug_info = {}
    if analysis.debug_info:
        try:
            debug_info = json.loads(analysis.debug_info)
        except Exception:
            pass

    return {
        "document_id": document_id,
        "analysis_status": analysis.analysis_status,
        "error_message": analysis.error_message,
        "debug_info": debug_info,
    }


@router.get("/{document_id}/analysis")
def get_document_analysis(document_id: int, db: Session = Depends(get_db)):
    """Return the full AI analysis for a document."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    analysis = doc.analysis
    if not analysis:
        return {"analysis_status": "not_started", "document_id": document_id}

    return _serialize_analysis(analysis)


@router.post("/{document_id}/reanalyze")
def reanalyze_document(
    document_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Re-trigger AI analysis for an existing document."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.file_path or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=400, detail="Source file no longer exists on disk.")

    if doc.analysis:
        doc.analysis.analysis_status = "pending"
        doc.analysis.error_message = None
    else:
        analysis = DocumentAnalysis(document_id=doc.id, analysis_status="pending")
        db.add(analysis)
    db.commit()

    background_tasks.add_task(_background_analyze, doc.id, doc.file_path, doc.filename)
    return {"success": True, "message": "Re-analysis queued.", "document_id": document_id}


@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove from ChromaDB
    try:
        vector_store.delete_by_filename(doc.filename)
    except Exception:
        pass

    # Remove file on disk
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()
    return {"success": True, "message": f"'{doc.filename}' deleted and vectors cleared."}
