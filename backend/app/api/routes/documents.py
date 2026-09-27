import os
import shutil
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.models import Document
from app.models.schemas import DocumentResponse
from app.rag.pdf_loader import extract_text_chunks_from_pdf
from app.rag.vector_store import vector_store

router = APIRouter(prefix="/documents", tags=["Knowledge Base & RAG Documents"])

@router.get("", response_model=List[DocumentResponse])
def get_documents(db: Session = Depends(get_db)):
    return db.query(Document).order_by(Document.upload_date.desc()).all()

@router.post("/upload", response_model=DocumentResponse)
def upload_pdf_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    RAG Ingestion Pipeline:
    PDF Upload -> Semantic Text Chunking -> Embeddings -> ChromaDB Upsert -> Document Record
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for Knowledge Base RAG.")

    file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)

    # 1. Chunk document
    try:
        chunks = extract_text_chunks_from_pdf(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e)}")

    # 2. Vectorize and index into ChromaDB
    chunk_count = vector_store.add_chunks(chunks, filename=file.filename)

    # 3. Store record in DB
    existing_doc = db.query(Document).filter(Document.filename == file.filename).first()
    if existing_doc:
        existing_doc.file_size = file_size
        existing_doc.chunk_count = chunk_count
        db.commit()
        db.refresh(existing_doc)
        return existing_doc

    doc = Document(
        filename=file.filename,
        file_path=file_path,
        file_size=file_size,
        chunk_count=chunk_count
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove chunks from ChromaDB
    vector_store.delete_by_filename(doc.filename)

    # Remove file on disk if exists
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()
    return {"success": True, "message": f"Document '{doc.filename}' deleted and vectors cleared."}
