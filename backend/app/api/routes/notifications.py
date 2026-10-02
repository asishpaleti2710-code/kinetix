"""
notifications.py – Mock omnichannel notification service.

Simulates:
  - WhatsApp message dispatch (via mock / Twilio-ready interface)
  - Email delivery (via mock / SendGrid-ready interface)
  - In-app notification log

All sent notifications are persisted in the `notifications` table for audit.
Switch TWILIO_ACCOUNT_SID / SENDGRID_API_KEY env vars to go live.
"""

import os
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Session

from app.core.database import get_db, Base, engine, SessionLocal
from app.models.models import Lead

logger = logging.getLogger("kinetix.notifications")

# ── Pydantic request models ────────────────────────────────────────────────────

class SendWhatsAppRequest(BaseModel):
    lead_id: int
    message: str
    phone: Optional[str] = None


class SendEmailRequest(BaseModel):
    lead_id: int
    to_email: Optional[str] = None
    subject: str
    body: str


class BulkNotifyRequest(BaseModel):
    lead_ids: List[int]
    channel: str  # "whatsapp" | "email" | "all"
    whatsapp_message: Optional[str] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None


# ── SQLAlchemy Notification model ──────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True)
    channel = Column(String(50), nullable=False)         # "whatsapp" | "email"
    recipient = Column(String(255), nullable=True)       # phone or email
    subject = Column(String(512), nullable=True)         # email subject
    message = Column(Text, nullable=False)
    status = Column(String(50), default="sent")          # sent | failed | queued
    provider = Column(String(100), default="mock")       # mock | twilio | sendgrid
    external_id = Column(String(255), nullable=True)     # provider message SID/ID
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, default=datetime.utcnow)


# Create the table if it doesn't exist
try:
    Base.metadata.create_all(bind=engine, tables=[Notification.__table__])
except Exception:
    pass


# ── Dispatch helpers ───────────────────────────────────────────────────────────

def _dispatch_whatsapp(to: str, message: str) -> Dict[str, Any]:
    """
    Sends a WhatsApp message. 
    Set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM to go live.
    """
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
    twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
    twilio_from = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

    if twilio_sid and twilio_token:
        try:
            from twilio.rest import Client as TwilioClient
            client = TwilioClient(twilio_sid, twilio_token)
            msg = client.messages.create(
                body=message,
                from_=twilio_from,
                to=f"whatsapp:{to}",
            )
            logger.info(f"[WhatsApp] Sent via Twilio → SID: {msg.sid}")
            return {"provider": "twilio", "external_id": msg.sid, "status": "sent"}
        except Exception as e:
            logger.warning(f"[WhatsApp] Twilio error: {e}. Falling back to mock.")

    # Mock dispatch
    logger.info(f"[WhatsApp/MOCK] → {to}: {message[:80]}…")
    return {
        "provider": "mock",
        "external_id": f"mock_wa_{int(datetime.utcnow().timestamp())}",
        "status": "sent",
    }


def _dispatch_email(to: str, subject: str, body: str) -> Dict[str, Any]:
    """
    Sends an email.
    Set SENDGRID_API_KEY / SENDGRID_FROM_EMAIL to go live.
    """
    sg_key = os.getenv("SENDGRID_API_KEY")
    sg_from = os.getenv("SENDGRID_FROM_EMAIL", "sales@kinetix.ai")

    if sg_key:
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail

            mail = Mail(
                from_email=sg_from,
                to_emails=to,
                subject=subject,
                plain_text_content=body,
            )
            sg = SendGridAPIClient(sg_key)
            response = sg.send(mail)
            logger.info(f"[Email] Sent via SendGrid → status: {response.status_code}")
            return {"provider": "sendgrid", "external_id": response.headers.get("X-Message-Id", ""), "status": "sent"}
        except Exception as e:
            logger.warning(f"[Email] SendGrid error: {e}. Falling back to mock.")

    # Mock dispatch
    logger.info(f"[Email/MOCK] → {to} | Subject: {subject} | Body: {body[:80]}…")
    return {
        "provider": "mock",
        "external_id": f"mock_email_{int(datetime.utcnow().timestamp())}",
        "status": "sent",
    }


def _persist_notification(
    db: Session,
    lead_id: Optional[int],
    channel: str,
    recipient: str,
    message: str,
    result: Dict[str, Any],
    subject: Optional[str] = None,
) -> Notification:
    n = Notification(
        lead_id=lead_id,
        channel=channel,
        recipient=recipient,
        subject=subject,
        message=message,
        status=result.get("status", "sent"),
        provider=result.get("provider", "mock"),
        external_id=result.get("external_id"),
        error_message=result.get("error"),
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


# ── Router ─────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/notifications", tags=["Notifications & Outreach"])


@router.post("/whatsapp")
def send_whatsapp(payload: SendWhatsAppRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Send a WhatsApp message to a lead."""
    lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    to_phone = payload.phone or lead.phone
    if not to_phone:
        raise HTTPException(status_code=400, detail="No phone number available for this lead")

    result = _dispatch_whatsapp(to_phone, payload.message)
    notif = _persist_notification(db, payload.lead_id, "whatsapp", to_phone, payload.message, result)

    return {
        "success": True,
        "notification_id": notif.id,
        "channel": "whatsapp",
        "recipient": to_phone,
        "provider": result["provider"],
        "external_id": result["external_id"],
        "status": result["status"],
    }


@router.post("/email")
def send_email(payload: SendEmailRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Send an email to a lead."""
    lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    to_email = payload.to_email or lead.email
    if not to_email:
        raise HTTPException(status_code=400, detail="No email address available for this lead")

    result = _dispatch_email(to_email, payload.subject, payload.body)
    notif = _persist_notification(db, payload.lead_id, "email", to_email, payload.body, result, subject=payload.subject)

    return {
        "success": True,
        "notification_id": notif.id,
        "channel": "email",
        "recipient": to_email,
        "provider": result["provider"],
        "external_id": result["external_id"],
        "status": result["status"],
    }


@router.post("/bulk")
def send_bulk_notifications(payload: BulkNotifyRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Send WhatsApp and/or Email to multiple leads at once."""
    results = []
    errors = []

    for lead_id in payload.lead_ids:
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            errors.append({"lead_id": lead_id, "error": "Lead not found"})
            continue

        if payload.channel in ("whatsapp", "all") and payload.whatsapp_message:
            phone = lead.phone
            if phone:
                r = _dispatch_whatsapp(phone, payload.whatsapp_message)
                _persist_notification(db, lead_id, "whatsapp", phone, payload.whatsapp_message, r)
                results.append({"lead_id": lead_id, "channel": "whatsapp", **r})
            else:
                errors.append({"lead_id": lead_id, "channel": "whatsapp", "error": "No phone number"})

        if payload.channel in ("email", "all") and payload.email_body:
            email = lead.email
            if email:
                r = _dispatch_email(email, payload.email_subject or "Follow-up from Kinetix", payload.email_body)
                _persist_notification(db, lead_id, "email", email, payload.email_body, r, subject=payload.email_subject)
                results.append({"lead_id": lead_id, "channel": "email", **r})
            else:
                errors.append({"lead_id": lead_id, "channel": "email", "error": "No email address"})

    return {
        "total_leads": len(payload.lead_ids),
        "sent": len(results),
        "errors": len(errors),
        "results": results,
        "error_details": errors,
    }


@router.get("/history")
def get_notification_history(
    lead_id: Optional[int] = None,
    channel: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Retrieve notification audit log."""
    query = db.query(Notification)
    if lead_id:
        query = query.filter(Notification.lead_id == lead_id)
    if channel:
        query = query.filter(Notification.channel == channel)

    notifications = query.order_by(Notification.sent_at.desc()).limit(limit).all()
    return [
        {
            "id": n.id,
            "lead_id": n.lead_id,
            "channel": n.channel,
            "recipient": n.recipient,
            "subject": n.subject,
            "message_preview": (n.message or "")[:100],
            "status": n.status,
            "provider": n.provider,
            "external_id": n.external_id,
            "sent_at": n.sent_at.isoformat() if n.sent_at else None,
        }
        for n in notifications
    ]
