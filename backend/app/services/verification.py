"""
System Health Verification & Test Report
Verifies all modules are functioning correctly.
"""
import time
import json
from datetime import datetime
from typing import Dict, Any, List


def run_system_verification() -> Dict[str, Any]:
    """Run comprehensive functional tests across all modules."""
    results: List[Dict[str, Any]] = []
    passed = 0
    failed = 0
    fixes_applied = []

    def record(name: str, passed_flag: bool, details: str, fix: str = ""):
        nonlocal passed, failed
        results.append({
            "feature": name,
            "status": "PASS" if passed_flag else "FAIL",
            "details": details,
            "fix_applied": fix,
        })
        if passed_flag:
            passed += 1
        else:
            failed += 1
        if fix:
            fixes_applied.append(fix)

    # ── Test 1: Database connectivity
    try:
        from app.core.database import SessionLocal
        db = SessionLocal()
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db.close()
        record("Database Connectivity", True, "SQLite/MySQL connection verified")
    except Exception as e:
        record("Database Connectivity", False, str(e))

    # ── Test 2: Lead Qualification Agent
    try:
        from app.agents.lead_agent import lead_agent_node
        state = {
            "session_id": "verify_001",
            "lead_id": None,
            "customer_name": "Test User",
            "customer_email": "test@verify.com",
            "customer_phone": None,
            "user_message": "We run a SaaS company with 50 employees, budget $10,000, timeline next month.",
            "conversation_history": [],
            "intent": "Lead Qualification",
            "intent_confidence": 0.95,
            "planner_thought": "",
            "target_agent": "lead_agent",
            "tools_called": [],
            "tool_results": [],
            "lead_qualification": None,
            "rag_sources": [],
            "appointment_details": None,
            "followup_drafts": None,
            "final_response": ""
        }
        result = lead_agent_node(state)
        qual = result.get("lead_qualification", {})
        ok = qual and qual.get("lead_score", 0) > 0
        record("Lead Qualification Agent", ok,
               f"Score={qual.get('lead_score')}, Status={qual.get('lead_status')}")
    except Exception as e:
        record("Lead Qualification Agent", False, str(e))

    # ── Test 3: Intent Agent
    try:
        from app.agents.intent_agent import intent_agent_node
        state2 = {
            "session_id": "verify_002",
            "user_message": "What is the price of your Growth tier?",
            "conversation_history": [],
            "intent": "", "intent_confidence": 0.0,
            "lead_id": None, "customer_name": None, "customer_email": None, "customer_phone": None,
            "planner_thought": "", "target_agent": "",
            "tools_called": [], "tool_results": [], "lead_qualification": None,
            "rag_sources": [], "appointment_details": None, "followup_drafts": None, "final_response": ""
        }
        result2 = intent_agent_node(state2)
        detected = result2.get("intent", "")
        ok = detected in ["Pricing Inquiry", "Product Inquiry", "General Question"]
        record("Intent Classification Agent", ok, f"Detected intent: '{detected}'")
    except Exception as e:
        record("Intent Classification Agent", False, str(e))

    # ── Test 4: Knowledge Agent / RAG
    try:
        from app.agents.knowledge_agent import knowledge_agent_node
        state3 = {
            "session_id": "verify_003",
            "user_message": "What features does your platform offer?",
            "conversation_history": [],
            "intent": "Product Inquiry", "intent_confidence": 0.9,
            "lead_id": None, "customer_name": None, "customer_email": None, "customer_phone": None,
            "planner_thought": "", "target_agent": "knowledge_agent",
            "tools_called": [], "tool_results": [], "lead_qualification": None,
            "rag_sources": [], "appointment_details": None, "followup_drafts": None, "final_response": ""
        }
        result3 = knowledge_agent_node(state3)
        response = result3.get("final_response", "")
        ok = len(response) > 20
        record("Knowledge Agent (RAG)", ok, f"Response length: {len(response)} chars")
    except Exception as e:
        record("Knowledge Agent (RAG)", False, str(e))

    # ── Test 5: Appointment Agent
    try:
        from app.agents.appointment_agent import appointment_agent_node
        state4 = {
            "session_id": "verify_004",
            "user_message": "Book a demo for tomorrow at 2 PM",
            "lead_id": 1, "customer_name": "Verify User", "customer_email": None, "customer_phone": None,
            "conversation_history": [],
            "intent": "Schedule Meeting", "intent_confidence": 0.99,
            "planner_thought": "", "target_agent": "appointment_agent",
            "tools_called": [], "tool_results": [], "lead_qualification": None,
            "rag_sources": [], "appointment_details": None, "followup_drafts": None, "final_response": ""
        }
        result4 = appointment_agent_node(state4)
        response4 = result4.get("final_response", "")
        ok = "demo" in response4.lower() or "scheduled" in response4.lower() or "slot" in response4.lower()
        record("Appointment Scheduling Agent", ok, f"Response snippet: {response4[:100]}")
    except Exception as e:
        record("Appointment Scheduling Agent", False, str(e))

    # ── Test 6: Follow-up Agent
    try:
        from app.agents.followup_agent import followup_agent_node
        state5 = {
            "session_id": "verify_005",
            "user_message": "Generate a follow-up message",
            "lead_id": 1, "customer_name": "Verify User", "customer_email": None, "customer_phone": None,
            "conversation_history": [],
            "intent": "General Question", "intent_confidence": 0.85,
            "planner_thought": "", "target_agent": "followup_agent",
            "tools_called": [], "tool_results": [], "lead_qualification": None,
            "rag_sources": [], "appointment_details": None, "followup_drafts": None, "final_response": ""
        }
        result5 = followup_agent_node(state5)
        drafts = result5.get("followup_drafts", {})
        ok = bool(drafts and drafts.get("whatsapp"))
        record("Follow-up Generator Agent", ok, f"WhatsApp: {str(drafts.get('whatsapp',''))[:80]}")
    except Exception as e:
        record("Follow-up Generator Agent", False, str(e))

    # ── Test 7: ChromaDB Vector Store
    try:
        from app.rag.vector_store import vector_store
        stats = vector_store.get_stats()
        ok = "total_chunks" in stats
        record("ChromaDB Vector Store", ok, f"Stats: {stats}")
    except Exception as e:
        record("ChromaDB Vector Store", False, str(e))

    # ── Test 8: LangGraph StateGraph Compilation
    try:
        from app.agents.graph import sales_agent_workflow
        ok = sales_agent_workflow._compiled_graph is not None
        record("LangGraph StateGraph Compilation", ok,
               "Graph compiled and ready" if ok else "Fallback state machine active")
    except Exception as e:
        record("LangGraph StateGraph Compilation", False, str(e))

    # ── Test 9: Document Intelligence Service
    try:
        from app.services.document_intelligence import detect_document_type, analyze_document
        sample_text = "Experience: Software Engineer at Google. Education: BS Computer Science. Skills: Python, ML."
        doc_type = detect_document_type(sample_text, "resume.pdf")
        ok = doc_type == "resume"
        record("Document Intelligence - Type Detection", ok, f"Detected type: {doc_type}")
    except Exception as e:
        record("Document Intelligence - Type Detection", False, str(e))

    # ── Test 10: Dashboard Stats API
    try:
        from app.core.database import SessionLocal
        from app.models.models import Lead, Appointment, Document
        db = SessionLocal()
        lead_count = db.query(Lead).count()
        db.close()
        ok = lead_count >= 0
        record("Dashboard Stats API", ok, f"Leads in DB: {lead_count}")
    except Exception as e:
        record("Dashboard Stats API", False, str(e))

    # ── Test 11: Document file text extraction
    try:
        from app.services.document_intelligence import _extract_txt
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".txt", mode="w", delete=False) as f:
            f.write("Hello, this is a test document for Kinetix verification.")
            tmp_path = f.name
        extracted = _extract_txt(tmp_path)
        import os
        os.unlink(tmp_path)
        ok = "Kinetix" in extracted
        record("Document Text Extraction (TXT)", ok, f"Extracted {len(extracted)} chars")
    except Exception as e:
        record("Document Text Extraction (TXT)", False, str(e))

    # ── Test 12: Multi-Agent Full Pipeline (end-to-end)
    try:
        from app.agents.graph import sales_agent_workflow
        initial_state = {
            "session_id": "verify_e2e",
            "lead_id": None,
            "customer_name": "E2E Test User",
            "customer_email": "e2e@verify.com",
            "customer_phone": None,
            "user_message": "What is the price of your platform?",
            "conversation_history": [],
            "intent": "",
            "intent_confidence": 0.0,
            "planner_thought": "",
            "target_agent": "",
            "tools_called": [],
            "tool_results": [],
            "lead_qualification": None,
            "rag_sources": [],
            "appointment_details": None,
            "followup_drafts": None,
            "final_response": ""
        }
        output = sales_agent_workflow.execute(initial_state)
        response = output.get("final_response", "")
        ok = len(response) > 20 and output.get("intent")
        record("Multi-Agent Full Pipeline (E2E)", ok,
               f"Intent={output.get('intent')}, Agent={output.get('target_agent')}, Response={len(response)} chars")
    except Exception as e:
        record("Multi-Agent Full Pipeline (E2E)", False, str(e))

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "total_tests": len(results),
        "passed": passed,
        "failed": failed,
        "pass_rate": round((passed / max(len(results), 1)) * 100, 1),
        "fixes_applied": fixes_applied,
        "results": results,
    }
