from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Lead, Appointment
from app.models.schemas import LeadCreate, LeadUpdate, LeadResponse

router = APIRouter(prefix="/leads", tags=["Lead Management"])

@router.get("", response_model=List[LeadResponse])
def get_all_leads(
    status: Optional[str] = Query(None, description="Filter by status: Hot, Warm, Cold"),
    search: Optional[str] = Query(None, description="Search by name, email, or company"),
    min_score: Optional[int] = Query(None, ge=0, le=100, description="Minimum BANT score"),
    max_score: Optional[int] = Query(None, ge=0, le=100, description="Maximum BANT score"),
    sort_by: str = Query("lead_score", description="Sort field: lead_score, created_at, customer_name, budget"),
    sort_dir: str = Query("desc", description="Sort direction: asc or desc"),
    limit: int = Query(50, ge=1, le=200, description="Page size"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db),
):
    """
    Retrieve leads with full filtering, sorting, and server-side pagination.
    """
    query = db.query(Lead)

    if status:
        query = query.filter(Lead.lead_status == status)
    if search:
        query = query.filter(
            (Lead.customer_name.ilike(f"%{search}%")) |
            (Lead.email.ilike(f"%{search}%")) |
            (Lead.business_type.ilike(f"%{search}%"))
        )
    if min_score is not None:
        query = query.filter(Lead.lead_score >= min_score)
    if max_score is not None:
        query = query.filter(Lead.lead_score <= max_score)

    # Dynamic sorting
    sort_field_map = {
        "lead_score": Lead.lead_score,
        "created_at": Lead.created_at,
        "customer_name": Lead.customer_name,
        "budget": Lead.budget,
        "updated_at": Lead.updated_at,
    }
    sort_col = sort_field_map.get(sort_by, Lead.lead_score)
    if sort_dir.lower() == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    return query.offset(offset).limit(limit).all()


@router.get("/stats")
def get_lead_stats(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Quick statistics for the leads pipeline."""
    total = db.query(Lead).count()
    hot = db.query(Lead).filter(Lead.lead_status == "Hot").count()
    warm = db.query(Lead).filter(Lead.lead_status == "Warm").count()
    cold = db.query(Lead).filter(Lead.lead_status == "Cold").count()
    avg_score = db.query(func.avg(Lead.lead_score)).scalar() or 0.0
    total_pipeline = db.query(func.sum(Lead.budget)).scalar() or 0.0

    return {
        "total": total,
        "hot": hot,
        "warm": warm,
        "cold": cold,
        "avg_score": round(float(avg_score), 1),
        "total_pipeline_value_usd": round(float(total_pipeline), 2),
    }


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead_by_id(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.post("", response_model=LeadResponse)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db)):
    # Check for duplicate email
    if payload.email:
        existing = db.query(Lead).filter(Lead.email == payload.email).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"A lead with email '{payload.email}' already exists (ID: {existing.id})",
            )
    lead = Lead(**payload.dict())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead_details(lead_id: int, payload: LeadUpdate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/{lead_id}")
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()
    return {"success": True, "message": f"Lead {lead_id} removed"}


@router.get("/{lead_id}/timeline")
def get_lead_timeline(lead_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns a full activity timeline for a lead:
    conversations, appointments, and score changes.
    """
    from app.models.models import Conversation
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    convos = (
        db.query(Conversation)
        .filter(Conversation.lead_id == lead_id)
        .order_by(Conversation.timestamp.asc())
        .all()
    )
    appointments = lead.appointments

    events = []
    for c in convos:
        events.append({
            "type": "conversation",
            "sender": c.sender,
            "message_preview": (c.message or "")[:120],
            "agent": c.agent_used,
            "timestamp": c.timestamp.isoformat() if c.timestamp else None,
        })
    for a in appointments:
        events.append({
            "type": "appointment",
            "date": str(a.date),
            "time": a.time,
            "status": a.status,
            "meeting_link": a.meeting_link,
            "timestamp": a.created_at.isoformat() if a.created_at else None,
        })

    events.sort(key=lambda x: x.get("timestamp") or "", reverse=False)

    return {
        "lead_id": lead_id,
        "customer_name": lead.customer_name,
        "lead_score": lead.lead_score,
        "lead_status": lead.lead_status,
        "total_events": len(events),
        "timeline": events,
    }
