from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Conversation
from app.models.schemas import ConversationResponse

router = APIRouter(prefix="/conversations", tags=["Conversation History"])

@router.get("", response_model=List[ConversationResponse])
def get_conversations(
    lead_id: Optional[int] = Query(None, description="Filter by Lead ID"),
    session_id: Optional[str] = Query(None, description="Filter by Session ID"),
    search: Optional[str] = Query(None, description="Search message contents"),
    sender: Optional[str] = Query(None, description="Filter by sender: customer or assistant"),
    agent: Optional[str] = Query(None, description="Filter by agent used"),
    limit: int = Query(50, ge=1, le=500, description="Page size"),
    offset: int = Query(0, ge=0, description="Number of records to skip (for pagination)"),
    db: Session = Depends(get_db),
):
    """
    Retrieve conversation history with server-side pagination and filtering.
    
    - Filterable by lead_id, session_id, full-text search, sender, and agent
    - Paginatable via limit/offset
    - Returns X-Total-Count header (total records matching filter)
    """
    from fastapi.responses import JSONResponse
    query = db.query(Conversation)
    
    if lead_id:
        query = query.filter(Conversation.lead_id == lead_id)
    if session_id:
        query = query.filter(Conversation.session_id == session_id)
    if search:
        query = query.filter(Conversation.message.ilike(f"%{search}%"))
    if sender:
        query = query.filter(Conversation.sender == sender)
    if agent:
        query = query.filter(Conversation.agent_used.ilike(f"%{agent}%"))

    total = query.count()
    items = query.order_by(Conversation.timestamp.desc()).offset(offset).limit(limit).all()

    return items


@router.get("/sessions")
def get_unique_sessions(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Return a list of unique session IDs with their message counts and timestamps."""
    from sqlalchemy import func
    rows = (
        db.query(
            Conversation.session_id,
            func.count(Conversation.id).label("message_count"),
            func.min(Conversation.timestamp).label("started_at"),
            func.max(Conversation.timestamp).label("last_message_at"),
        )
        .group_by(Conversation.session_id)
        .order_by(func.max(Conversation.timestamp).desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "session_id": r.session_id,
            "message_count": r.message_count,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "last_message_at": r.last_message_at.isoformat() if r.last_message_at else None,
        }
        for r in rows
    ]
