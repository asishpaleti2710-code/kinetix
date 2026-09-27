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
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(Conversation)
    if lead_id:
        query = query.filter(Conversation.lead_id == lead_id)
    if session_id:
        query = query.filter(Conversation.session_id == session_id)
    if search:
        query = query.filter(Conversation.message.ilike(f"%{search}%"))

    return query.order_by(Conversation.timestamp.desc()).limit(limit).all()
