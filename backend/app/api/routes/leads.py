from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Lead
from app.models.schemas import LeadCreate, LeadUpdate, LeadResponse

router = APIRouter(prefix="/leads", tags=["Lead Management"])

@router.get("", response_model=List[LeadResponse])
def get_all_leads(
    status: Optional[str] = Query(None, description="Filter by status: Hot, Warm, Cold"),
    search: Optional[str] = Query(None, description="Search by name, email, or company"),
    db: Session = Depends(get_db)
):
    query = db.query(Lead)
    if status:
        query = query.filter(Lead.lead_status == status)
    if search:
        query = query.filter(
            (Lead.customer_name.ilike(f"%{search}%")) |
            (Lead.email.ilike(f"%{search}%")) |
            (Lead.business_type.ilike(f"%{search}%"))
        )
    return query.order_by(Lead.lead_score.desc()).all()

@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead_by_id(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.post("", response_model=LeadResponse)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db)):
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
