from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Appointment, Lead
from app.models.schemas import AppointmentCreate, AppointmentResponse

router = APIRouter(prefix="/appointments", tags=["Appointment Scheduling"])

@router.get("", response_model=List[AppointmentResponse])
def get_all_appointments(db: Session = Depends(get_db)):
    appointments = db.query(Appointment).order_by(Appointment.date.desc()).all()
    results = []
    for a in appointments:
        res = AppointmentResponse.from_orm(a)
        res.customer_name = a.lead.customer_name if a.lead else "Unknown Client"
        results.append(res)
    return results

@router.post("", response_model=AppointmentResponse)
def schedule_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    appointment = Appointment(**payload.dict())
    db.add(appointment)
    
    # Auto-advance lead status to Warm/Hot
    if lead.lead_status == "Cold":
        lead.lead_status = "Warm"
        lead.lead_score = max(lead.lead_score, 65)

    db.commit()
    db.refresh(appointment)
    
    res = AppointmentResponse.from_orm(appointment)
    res.customer_name = lead.customer_name
    return res

@router.patch("/{appointment_id}")
def update_appointment_status(appointment_id: int, status: str, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    appointment.status = status
    db.commit()
    return {"success": True, "appointment_id": appointment_id, "status": status}
