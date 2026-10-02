from typing import List, Optional, Dict, Any
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import Appointment, Lead
from app.models.schemas import AppointmentCreate, AppointmentResponse

router = APIRouter(prefix="/appointments", tags=["Appointment Scheduling"])


class AppointmentUpdate(BaseModel):
    date: Optional[date] = None
    time: Optional[str] = None
    status: Optional[str] = None
    meeting_link: Optional[str] = None
    notes: Optional[str] = None


@router.get("")
def get_all_appointments(
    status: Optional[str] = Query(None, description="Filter: Scheduled, Completed, Cancelled"),
    lead_id: Optional[int] = Query(None, description="Filter by lead ID"),
    from_date: Optional[date] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    to_date: Optional[date] = Query(None, description="End date filter (YYYY-MM-DD)"),
    upcoming_only: bool = Query(False, description="Show only future appointments"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Retrieve appointments with pagination and full filtering.
    """
    query = db.query(Appointment)

    if status:
        query = query.filter(Appointment.status == status)
    if lead_id:
        query = query.filter(Appointment.lead_id == lead_id)
    if from_date:
        query = query.filter(Appointment.date >= from_date)
    if to_date:
        query = query.filter(Appointment.date <= to_date)
    if upcoming_only:
        query = query.filter(Appointment.date >= date.today())

    total = query.count()
    appointments = query.order_by(Appointment.date.asc(), Appointment.created_at.desc()).offset(offset).limit(limit).all()

    results = []
    for a in appointments:
        results.append({
            "id": a.id,
            "lead_id": a.lead_id,
            "customer_name": a.lead.customer_name if a.lead else "Unknown Client",
            "customer_email": a.lead.email if a.lead else None,
            "business_type": a.lead.business_type if a.lead else None,
            "lead_score": a.lead.lead_score if a.lead else None,
            "lead_status": a.lead.lead_status if a.lead else None,
            "date": str(a.date),
            "time": a.time,
            "status": a.status,
            "meeting_link": a.meeting_link,
            "notes": a.notes,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "is_upcoming": a.date >= date.today(),
        })

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "items": results,
    }


@router.get("/upcoming")
def get_upcoming_slots(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Return upcoming scheduled appointments for the next N days."""
    from datetime import timedelta
    end_date = date.today() + timedelta(days=days)
    appointments = (
        db.query(Appointment)
        .filter(
            Appointment.date >= date.today(),
            Appointment.date <= end_date,
            Appointment.status == "Scheduled",
        )
        .order_by(Appointment.date.asc())
        .all()
    )

    return [
        {
            "id": a.id,
            "lead_id": a.lead_id,
            "customer_name": a.lead.customer_name if a.lead else "Unknown",
            "date": str(a.date),
            "time": a.time,
            "meeting_link": a.meeting_link,
            "notes": a.notes,
        }
        for a in appointments
    ]


@router.get("/stats")
def get_appointment_stats(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Summary statistics for the appointments pipeline."""
    from sqlalchemy import func
    total = db.query(Appointment).count()
    scheduled = db.query(Appointment).filter(Appointment.status == "Scheduled").count()
    completed = db.query(Appointment).filter(Appointment.status == "Completed").count()
    cancelled = db.query(Appointment).filter(Appointment.status == "Cancelled").count()
    upcoming = db.query(Appointment).filter(
        Appointment.date >= date.today(), Appointment.status == "Scheduled"
    ).count()

    return {
        "total": total,
        "scheduled": scheduled,
        "completed": completed,
        "cancelled": cancelled,
        "upcoming_7_days": upcoming,
        "show_rate": round(completed / max(total, 1) * 100, 1),
    }


@router.get("/{appointment_id}")
def get_appointment(appointment_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Retrieve a single appointment by ID with full lead details."""
    a = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found")

    return {
        "id": a.id,
        "lead_id": a.lead_id,
        "customer_name": a.lead.customer_name if a.lead else "Unknown Client",
        "customer_email": a.lead.email if a.lead else None,
        "business_type": a.lead.business_type if a.lead else None,
        "lead_score": a.lead.lead_score if a.lead else None,
        "lead_status": a.lead.lead_status if a.lead else None,
        "date": str(a.date),
        "time": a.time,
        "status": a.status,
        "meeting_link": a.meeting_link,
        "notes": a.notes,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


@router.post("")
def schedule_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)) -> Dict[str, Any]:
    lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    appointment = Appointment(**payload.dict())
    db.add(appointment)

    # Auto-advance lead status to Warm/Hot on booking
    if lead.lead_status == "Cold":
        lead.lead_status = "Warm"
        lead.lead_score = max(lead.lead_score, 65)

    db.commit()
    db.refresh(appointment)

    return {
        "success": True,
        "id": appointment.id,
        "lead_id": appointment.lead_id,
        "customer_name": lead.customer_name,
        "date": str(appointment.date),
        "time": appointment.time,
        "status": appointment.status,
        "meeting_link": appointment.meeting_link,
        "notes": appointment.notes,
    }


@router.put("/{appointment_id}")
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdate,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Full update of an appointment record."""
    a = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found")

    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(a, field, value)

    # If marked Completed, update lead score bonus
    if payload.status == "Completed" and a.lead:
        a.lead.lead_score = min(100, (a.lead.lead_score or 0) + 5)
        if a.lead.lead_status == "Warm":
            a.lead.lead_status = "Hot"

    db.commit()
    db.refresh(a)

    return {
        "success": True,
        "id": a.id,
        "status": a.status,
        "date": str(a.date),
        "time": a.time,
        "meeting_link": a.meeting_link,
        "notes": a.notes,
    }


@router.patch("/{appointment_id}/status")
def update_appointment_status(
    appointment_id: int,
    status: str = Query(..., description="New status: Scheduled, Completed, Cancelled"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Quick status update endpoint."""
    valid_statuses = {"Scheduled", "Completed", "Cancelled", "Rescheduled"}
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{status}'. Must be one of: {valid_statuses}",
        )

    a = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found")

    a.status = status

    # Boost lead score on completion
    if status == "Completed" and a.lead:
        a.lead.lead_score = min(100, (a.lead.lead_score or 0) + 5)
        if a.lead.lead_status == "Warm":
            a.lead.lead_status = "Hot"

    db.commit()
    return {"success": True, "appointment_id": appointment_id, "status": status}


@router.delete("/{appointment_id}")
def delete_appointment(appointment_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Delete an appointment record."""
    a = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found")

    db.delete(a)
    db.commit()
    return {"success": True, "message": f"Appointment {appointment_id} deleted"}
