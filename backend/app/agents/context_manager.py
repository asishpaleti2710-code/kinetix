"""
context_manager.py – Stateful conversation context manager.

Responsibilities:
  - Load and compress multi-turn conversation history for LLM context windows
  - Build a structured "customer profile snapshot" from DB lead data
  - Produce a compact context string injected into agent prompts
  - Track "qualification gaps" so agents ask for missing BANT fields naturally
"""

import json
from typing import Any, Dict, List, Optional

from app.core.database import SessionLocal
from app.models.models import Lead, Conversation, Appointment


# Maximum number of recent turns to inject verbatim (older turns are summarised)
MAX_VERBATIM_TURNS = 6
MAX_SUMMARY_TURNS = 20


def _summarise_turns(turns: List[Dict[str, str]]) -> str:
    """
    Produces a compact summary of older conversation turns so the agent knows
    what has already been discussed without blowing the context window.
    """
    if not turns:
        return ""
    lines = [f"{t['sender'].capitalize()}: {t['message'][:120]}" for t in turns]
    return "Earlier in this conversation:\n" + "\n".join(lines)


def build_agent_context(
    session_id: str,
    lead_id: Optional[int] = None,
    user_message: str = "",
) -> Dict[str, Any]:
    """
    Returns a rich context dict for use in agent prompts:
      - recent_history: last N turns (verbatim)
      - history_summary: compressed older turns
      - lead_profile: structured customer snapshot
      - appointments: upcoming meetings
      - qualification_gaps: BANT fields still unknown
      - context_string: a single formatted string ready to inject into prompts
    """
    db = SessionLocal()
    try:
        # ── Fetch conversation history ───────────────────────────────────────
        all_convos = (
            db.query(Conversation)
            .filter(Conversation.session_id == session_id)
            .order_by(Conversation.timestamp.asc())
            .limit(MAX_SUMMARY_TURNS)
            .all()
        )
        all_turns = [{"sender": c.sender, "message": c.message} for c in all_convos]

        recent_turns = all_turns[-MAX_VERBATIM_TURNS:]
        older_turns = all_turns[:-MAX_VERBATIM_TURNS] if len(all_turns) > MAX_VERBATIM_TURNS else []

        history_summary = _summarise_turns(older_turns)

        # ── Fetch lead profile ───────────────────────────────────────────────
        lead_profile = None
        upcoming_appointments = []
        qualification_gaps: List[str] = []

        lead = None
        if lead_id:
            lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if lead is None and all_convos:
            # Try to match by session's most recent conversation
            conv_with_lead = next(
                (c for c in reversed(all_convos) if c.lead_id is not None), None
            )
            if conv_with_lead:
                lead = db.query(Lead).filter(Lead.id == conv_with_lead.lead_id).first()

        if lead:
            lead_profile = {
                "id": lead.id,
                "name": lead.customer_name,
                "email": lead.email,
                "phone": lead.phone,
                "business_type": lead.business_type,
                "employee_count": lead.employee_count,
                "budget": lead.budget,
                "timeline": lead.timeline,
                "lead_score": lead.lead_score,
                "lead_status": lead.lead_status,
                "notes": lead.notes,
            }

            # Upcoming appointments
            from datetime import date
            upcoming = [
                a for a in lead.appointments
                if a.status == "Scheduled" and a.date >= date.today()
            ]
            upcoming_appointments = [
                {"date": str(a.date), "time": a.time, "link": a.meeting_link}
                for a in upcoming[:3]
            ]

            # Qualification gaps (BANT)
            if not lead.business_type or lead.business_type == "Enterprise Solutions":
                qualification_gaps.append("business_type")
            if not lead.budget or lead.budget <= 0:
                qualification_gaps.append("budget")
            if not lead.employee_count or lead.employee_count <= 1:
                qualification_gaps.append("employee_count")
            if not lead.timeline:
                qualification_gaps.append("timeline")
        else:
            # No lead yet — all fields unknown
            qualification_gaps = ["business_type", "budget", "employee_count", "timeline"]

        # ── Build context string ─────────────────────────────────────────────
        parts: List[str] = []

        if history_summary:
            parts.append(history_summary)

        if recent_turns:
            parts.append("Recent conversation:\n" + "\n".join(
                f"{t['sender'].capitalize()}: {t['message']}" for t in recent_turns
            ))

        if lead_profile:
            parts.append(
                f"Customer Profile: {lead_profile['name']} | "
                f"Business: {lead_profile['business_type'] or 'Unknown'} | "
                f"Employees: {lead_profile['employee_count']} | "
                f"Budget: ${lead_profile['budget']:,.0f} | "
                f"Timeline: {lead_profile['timeline'] or 'Unknown'} | "
                f"Score: {lead_profile['lead_score']}/100 ({lead_profile['lead_status']})"
            )
        else:
            parts.append("Customer Profile: New prospect — no profile on record yet.")

        if upcoming_appointments:
            appt = upcoming_appointments[0]
            parts.append(f"Upcoming Demo: {appt['date']} at {appt['time']}")

        if qualification_gaps:
            parts.append(f"BANT Gaps Still Missing: {', '.join(qualification_gaps)}")

        context_string = "\n\n".join(parts)

        return {
            "recent_history": recent_turns,
            "history_summary": history_summary,
            "lead_profile": lead_profile,
            "lead_id": lead.id if lead else None,
            "upcoming_appointments": upcoming_appointments,
            "qualification_gaps": qualification_gaps,
            "context_string": context_string,
        }

    finally:
        db.close()
