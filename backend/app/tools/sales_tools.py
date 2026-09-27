import json
from datetime import datetime, date
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.models import Lead, Appointment, Conversation
from app.rag.vector_store import vector_store

def tool_save_lead(
    customer_name: str,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    business_type: Optional[str] = None,
    employee_count: int = 1,
    budget: float = 0.0,
    timeline: Optional[str] = None,
    lead_score: int = 0,
    lead_status: str = "Cold",
    notes: Optional[str] = None,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Tool 1: Save a new qualified or prospect lead into the database.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        # Check if lead already exists by email
        existing_lead = None
        if email:
            existing_lead = db.query(Lead).filter(Lead.email == email).first()

        if existing_lead:
            existing_lead.customer_name = customer_name or existing_lead.customer_name
            if phone: existing_lead.phone = phone
            if business_type: existing_lead.business_type = business_type
            if employee_count: existing_lead.employee_count = employee_count
            if budget: existing_lead.budget = budget
            if timeline: existing_lead.timeline = timeline
            if lead_score: existing_lead.lead_score = lead_score
            if lead_status: existing_lead.lead_status = lead_status
            if notes: existing_lead.notes = f"{existing_lead.notes or ''}\n{notes}".strip()
            db.commit()
            db.refresh(existing_lead)
            return {
                "success": True,
                "action": "updated_existing",
                "lead_id": existing_lead.id,
                "customer_name": existing_lead.customer_name,
                "lead_score": existing_lead.lead_score,
                "lead_status": existing_lead.lead_status
            }
        else:
            new_lead = Lead(
                customer_name=customer_name,
                email=email,
                phone=phone,
                business_type=business_type,
                employee_count=employee_count,
                budget=budget,
                timeline=timeline,
                lead_score=lead_score,
                lead_status=lead_status,
                notes=notes
            )
            db.add(new_lead)
            db.commit()
            db.refresh(new_lead)
            return {
                "success": True,
                "action": "created_new",
                "lead_id": new_lead.id,
                "customer_name": new_lead.customer_name,
                "lead_score": new_lead.lead_score,
                "lead_status": new_lead.lead_status
            }
    finally:
        if should_close:
            db.close()


def tool_update_lead(
    lead_id: int,
    customer_name: Optional[str] = None,
    phone: Optional[str] = None,
    email: Optional[str] = None,
    business_type: Optional[str] = None,
    employee_count: Optional[int] = None,
    budget: Optional[float] = None,
    timeline: Optional[str] = None,
    lead_score: Optional[int] = None,
    lead_status: Optional[str] = None,
    notes: Optional[str] = None,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Tool 2: Update existing lead information, score, or qualification category.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            return {"success": False, "error": f"Lead with id {lead_id} not found."}

        if customer_name: lead.customer_name = customer_name
        if phone: lead.phone = phone
        if email: lead.email = email
        if business_type: lead.business_type = business_type
        if employee_count is not None: lead.employee_count = employee_count
        if budget is not None: lead.budget = budget
        if timeline: lead.timeline = timeline
        if lead_score is not None: lead.lead_score = lead_score
        if lead_status: lead.lead_status = lead_status
        if notes: lead.notes = f"{lead.notes or ''}\n{notes}".strip()

        db.commit()
        db.refresh(lead)
        return {
            "success": True,
            "lead_id": lead.id,
            "lead_score": lead.lead_score,
            "lead_status": lead.lead_status,
            "budget": lead.budget,
            "timeline": lead.timeline
        }
    finally:
        if should_close:
            db.close()


def tool_book_appointment(
    lead_id: int,
    date_str: str,
    time_str: str,
    notes: Optional[str] = None,
    meeting_link: Optional[str] = "https://meet.agentflow.ai/sales-demo",
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Tool 3: Book an appointment or product demo slot for a qualified customer.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            # Fallback create a guest lead if lead_id not present
            lead = Lead(customer_name="Valued Client", lead_status="Warm")
            db.add(lead)
            db.commit()
            db.refresh(lead)

        parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date() if "-" in date_str else date.today()

        appointment = Appointment(
            lead_id=lead.id,
            date=parsed_date,
            time=time_str,
            status="Scheduled",
            meeting_link=meeting_link,
            notes=notes or f"Demo session scheduled for {lead.customer_name}"
        )
        db.add(appointment)
        
        # Upgrade lead status to Warm/Hot if scheduled
        if lead.lead_status == "Cold":
            lead.lead_status = "Warm"
            lead.lead_score = max(lead.lead_score, 65)

        db.commit()
        db.refresh(appointment)

        return {
            "success": True,
            "appointment_id": appointment.id,
            "lead_name": lead.customer_name,
            "date": str(appointment.date),
            "time": appointment.time,
            "meeting_link": appointment.meeting_link,
            "status": appointment.status
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        if should_close:
            db.close()


def tool_search_knowledge_base(query: str, top_k: int = 3) -> Dict[str, Any]:
    """
    Tool 4: Query company product documentation and uploaded knowledge PDFs using RAG.
    """
    results = vector_store.query(query_text=query, top_k=top_k)
    return {
        "query": query,
        "results_count": len(results),
        "chunks": results
    }


def tool_generate_followup(
    lead_id: int,
    channel: str = "all", # "whatsapp", "email", or "all"
    custom_context: Optional[str] = None,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Tool 5: Generate tailored WhatsApp & Email follow-up messages using customer history.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        customer_name = lead.customer_name if lead else "there"
        business_type = lead.business_type if lead else "your business"
        budget = f"${lead.budget:,.2f}" if lead and lead.budget else "tailored budget"
        timeline = lead.timeline if lead and lead.timeline else "upcoming quarter"

        context_extra = f"\nNote: {custom_context}" if custom_context else ""

        whatsapp_msg = (
            f"Hi {customer_name}! 🚀 Following up from AgentFlow AI. "
            f"We're excited to help scale {business_type} with our autonomous sales agents. "
            f"Based on your {timeline} timeline, let's lock in a 15-min walkthrough: "
            f"https://meet.agentflow.ai/sales-demo. Let us know if you have any questions!{context_extra}"
        )

        email_subject = f"Next steps with AgentFlow AI for {business_type}"
        email_body = (
            f"Hi {customer_name},\n\n"
            f"Thank you for connecting with AgentFlow AI today. We discussed how our agentic AI platform "
            f"can accelerate pipeline growth for {business_type} within your {timeline} timeline.\n\n"
            f"Summary of next steps:\n"
            f"- Review custom solution architecture for {business_type}\n"
            f"- Dedicated meeting slot: https://meet.agentflow.ai/sales-demo\n"
            f"{context_extra}\n\n"
            f"Best regards,\nAgentFlow AI Sales Team\nhttps://agentflow.ai"
        )

        return {
            "success": True,
            "lead_id": lead_id,
            "customer_name": customer_name,
            "whatsapp": whatsapp_msg,
            "email_subject": email_subject,
            "email_body": email_body
        }
    finally:
        if should_close:
            db.close()


def tool_fetch_customer_history(
    lead_id: Optional[int] = None,
    email: Optional[str] = None,
    session_id: Optional[str] = None,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Tool 6: Retrieve historical conversations, lead profile, and appointments for context.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        lead = None
        if lead_id:
            lead = db.query(Lead).filter(Lead.id == lead_id).first()
        elif email:
            lead = db.query(Lead).filter(Lead.email == email).first()

        history_messages = []
        if lead:
            convos = db.query(Conversation).filter(Conversation.lead_id == lead.id).order_by(Conversation.timestamp.desc()).limit(10).all()
            for c in reversed(convos):
                history_messages.append({"sender": c.sender, "message": c.message, "time": str(c.timestamp)})
        elif session_id:
            convos = db.query(Conversation).filter(Conversation.session_id == session_id).order_by(Conversation.timestamp.desc()).limit(10).all()
            for c in reversed(convos):
                history_messages.append({"sender": c.sender, "message": c.message, "time": str(c.timestamp)})

        lead_data = None
        if lead:
            lead_data = {
                "id": lead.id,
                "customer_name": lead.customer_name,
                "email": lead.email,
                "business_type": lead.business_type,
                "budget": lead.budget,
                "timeline": lead.timeline,
                "lead_score": lead.lead_score,
                "lead_status": lead.lead_status,
                "appointments": [{"id": a.id, "date": str(a.date), "time": a.time, "status": a.status} for a in lead.appointments]
            }

        return {
            "lead_found": lead is not None,
            "lead_profile": lead_data,
            "recent_conversations": history_messages
        }
    finally:
        if should_close:
            db.close()

# List of tool metadata for Agent Planner reasoning
AVAILABLE_TOOLS_CATALOG = [
    {
        "name": "save_lead",
        "description": "Save a new qualified lead or prospect with business details, budget, timeline, and lead score.",
        "parameters": ["customer_name", "email", "phone", "business_type", "employee_count", "budget", "timeline", "lead_score", "lead_status", "notes"]
    },
    {
        "name": "update_lead",
        "description": "Update existing lead details, budget, timeline, score or status.",
        "parameters": ["lead_id", "budget", "timeline", "lead_score", "lead_status"]
    },
    {
        "name": "book_appointment",
        "description": "Schedule a meeting or product demo with date and time.",
        "parameters": ["lead_id", "date_str", "time_str", "notes"]
    },
    {
        "name": "search_knowledge_base",
        "description": "Retrieve grounded factual knowledge from company documents and uploaded PDFs using RAG.",
        "parameters": ["query", "top_k"]
    },
    {
        "name": "generate_followup",
        "description": "Generate customized WhatsApp and Email outreach messages for a lead.",
        "parameters": ["lead_id", "channel", "custom_context"]
    },
    {
        "name": "fetch_customer_history",
        "description": "Retrieve full historical chat messages and profile for a customer.",
        "parameters": ["lead_id", "email", "session_id"]
    }
]
