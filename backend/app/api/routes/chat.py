import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Conversation, Lead
from app.models.schemas import ChatRequest, ChatResponse, ToolCallLog
from app.agents.graph import sales_agent_workflow

router = APIRouter(prefix="/chat", tags=["Chat & Agent Workflow"])

@router.post("", response_model=ChatResponse)
def handle_customer_chat(payload: ChatRequest, db: Session = Depends(get_db)):
    """
    Primary Agentic Endpoint:
    Routes the customer message through LangGraph Multi-Agent Workflow:
    Customer Message -> Intent Agent -> Planner Agent -> Specialized Agent -> Tools -> Formatted Reply
    """
    # 1. Fetch recent history for this session
    recent_convos = db.query(Conversation).filter(
        Conversation.session_id == payload.session_id
    ).order_by(Conversation.timestamp.desc()).limit(6).all()
    
    formatted_history = [
        {"sender": c.sender, "message": c.message} 
        for c in reversed(recent_convos)
    ]

    # 2. Check if lead exists or can be matched by email
    lead_id = payload.lead_id
    customer_name = payload.customer_name
    if not lead_id and payload.customer_email:
        lead = db.query(Lead).filter(Lead.email == payload.customer_email).first()
        if lead:
            lead_id = lead.id
            customer_name = customer_name or lead.customer_name

    # 3. Assemble initial LangGraph state
    initial_state = {
        "session_id": payload.session_id or "default_session",
        "lead_id": lead_id,
        "customer_name": customer_name,
        "customer_email": payload.customer_email,
        "customer_phone": payload.customer_phone,
        "user_message": payload.message,
        "conversation_history": formatted_history,
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

    # 4. Save Customer Message to DB
    user_convo = Conversation(
        lead_id=lead_id,
        session_id=payload.session_id,
        message=payload.message,
        sender="customer"
    )
    db.add(user_convo)
    db.commit()

    # 5. Run LangGraph Multi-Agent Workflow
    final_state = sales_agent_workflow.execute(initial_state)

    # 6. Extract tool executions
    tools_executed = []
    for call, res in zip(final_state.get("tools_called", []), final_state.get("tool_results", [])):
        tools_executed.append(ToolCallLog(
            tool=call.get("tool", "unknown"),
            arguments=call.get("arguments", {}),
            output=res
        ))

    # 7. Update lead_id if created/modified by Lead Agent
    resolved_lead_id = final_state.get("lead_id") or lead_id

    # 8. Save Assistant Response & Tool Execution Log to DB
    tools_str = json.dumps([t.dict() for t in tools_executed]) if tools_executed else None
    assistant_convo = Conversation(
        lead_id=resolved_lead_id,
        session_id=payload.session_id,
        message=final_state.get("final_response", ""),
        sender="assistant",
        agent_used=final_state.get("target_agent", "IntentAgent"),
        tools_called=tools_str
    )
    db.add(assistant_convo)
    db.commit()

    return ChatResponse(
        response=final_state.get("final_response", ""),
        session_id=payload.session_id,
        lead_id=resolved_lead_id,
        detected_intent=final_state.get("intent", "General Question"),
        routed_agent=final_state.get("target_agent", "knowledge_agent"),
        planner_thought=final_state.get("planner_thought"),
        tools_executed=tools_executed,
        lead_qualification=final_state.get("lead_qualification"),
        suggested_followups=final_state.get("followup_drafts")
    )
