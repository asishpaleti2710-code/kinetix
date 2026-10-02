"""
Improved Lead Qualification Agent with:
- Context-aware BANT gap filling (only asks for missing fields)
- Better LLM prompt with conversational extraction
- Smoother score calculation with partial-credit bands
- Richer, personalized sales reply generation
"""

import json
import re
from app.agents.state import AgentState
from app.agents.llm_client import call_gemini_or_fallback
from app.tools.sales_tools import tool_save_lead, tool_update_lead

LEAD_QUALIFICATION_PROMPT = """You are the Lead Qualification Agent for Kinetix — an expert enterprise sales consultant.

YOUR MISSION: Extract BANT qualification signals from the customer's message and conversation history.

BANT FIELDS TO EXTRACT:
  - business_type: What type of business/industry are they in? (string)
  - budget: Monthly or total budget available in USD (number)
  - employee_count: Number of employees/team members (integer)
  - timeline: When do they plan to deploy/launch? (string: "Immediate", "1-3 months", "Next quarter", "Exploring")

EXTRACTION RULES:
  - Extract ONLY from what the customer explicitly stated — do NOT invent or assume values.
  - Return null for any field NOT mentioned.
  - budget: Convert "10k" → 10000, "$5,000/month" → 5000.
  - timeline: Map natural language: "ASAP/now/immediately" → "Immediate (< 1 month)", "next month/soon" → "1-3 months"
  - If a field is already known from the customer profile below, do NOT ask for it again.
  - missing_fields: List ONLY fields that are STILL unknown after this message.
  - sales_reply: Write a warm, consultative reply. If fields are missing, ask for 1-2 naturally. If fully qualified, congratulate and suggest next steps.

CUSTOMER PROFILE (already known — do NOT ask for these again):
{known_profile}

OUTPUT (strict JSON, no markdown):
{{
  "business_type": "<string or null>",
  "budget": <number or null>,
  "employee_count": <integer or null>,
  "timeline": "<string or null>",
  "missing_fields": ["<list of still-unknown fields>"],
  "sales_reply": "<consultative, personalized message>"
}}"""


def _compute_bant_score(
    budget: float,
    timeline: str,
    employee_count: int,
    business_type: str,
) -> int:
    """Compute BANT score 0-100 with smooth partial-credit bands."""
    score = 0

    # Budget score (up to 35 pts)
    if budget >= 15000:
        score += 35
    elif budget >= 8000:
        score += 30
    elif budget >= 5000:
        score += 25
    elif budget >= 2000:
        score += 18
    elif budget >= 500:
        score += 10
    else:
        score += 3

    # Timeline score (up to 30 pts)
    tl = timeline.lower() if timeline else ""
    if any(w in tl for w in ["immediate", "asap", "now", "< 1", "week", "month"]):
        score += 30
    elif any(w in tl for w in ["1-3", "quarter", "next quarter", "soon"]):
        score += 22
    elif "half" in tl or "6 month" in tl:
        score += 14
    elif "year" in tl or "exploring" in tl:
        score += 8
    else:
        score += 5

    # Employee count score (up to 20 pts)
    if employee_count >= 100:
        score += 20
    elif employee_count >= 50:
        score += 17
    elif employee_count >= 20:
        score += 13
    elif employee_count >= 10:
        score += 9
    else:
        score += 5

    # Business clarity (up to 15 pts)
    if business_type and len(business_type) > 5 and business_type.lower() not in ("unknown", "n/a"):
        score += 15
    elif business_type:
        score += 8
    else:
        score += 2

    return min(score, 100)


def lead_agent_node(state: AgentState) -> dict:
    user_message = state.get("user_message", "")
    customer_name = state.get("customer_name") or "Valued Client"
    email = state.get("customer_email") or f"prospect_{state.get('session_id', 'x')[:6]}@example.com"
    phone = state.get("customer_phone")
    lead_id = state.get("lead_id")
    history = state.get("conversation_history", [])
    tools_called = list(state.get("tools_called", []))
    tool_results = list(state.get("tool_results", []))

    # Build known profile for prompt injection (avoid re-asking known fields)
    # Try to get from tools or context
    known = {}
    qualification_gaps = state.get("_qualification_gaps", [])

    # Format known profile for the prompt
    known_profile_str = (
        f"Name: {customer_name} | Email: {email} | Phone: {phone or 'unknown'}\n"
        f"Qualification gaps still needed: {', '.join(qualification_gaps) if qualification_gaps else 'None — fully qualified'}"
    )

    history_str = json.dumps(history[-5:] if history else [])

    prompt = (
        f"Customer Name: {customer_name}\n"
        f"Customer Message: \"{user_message}\"\n"
        f"Recent History: {history_str}"
    )

    # Inject known profile into the system prompt
    system = LEAD_QUALIFICATION_PROMPT.format(known_profile=known_profile_str)

    raw_response = call_gemini_or_fallback(
        prompt=prompt,
        system_instruction=system,
        json_mode=True,
    )

    try:
        data = json.loads(raw_response)
    except Exception:
        data = {}

    # Extract fields (with heuristic fallbacks only for fields still unknown)
    business_type = data.get("business_type")
    budget = data.get("budget")
    employee_count = data.get("employee_count")
    timeline = data.get("timeline")
    missing_fields = data.get("missing_fields", [])
    sales_reply = data.get("sales_reply")

    # Heuristic extraction fallbacks for budget if LLM missed it
    if budget is None:
        num_match = re.search(
            r"\$?\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?)\s*k?\b", user_message.lower()
        )
        if num_match:
            raw = num_match.group(1).replace(",", "")
            try:
                budget = float(raw) * 1000 if "k" in user_message.lower() else float(raw)
            except Exception:
                budget = None

    # Heuristic extraction for employee count
    if employee_count is None:
        emp_match = re.search(
            r"([0-9]+)\s*(?:employee|people|person|team member|staff|headcount)", user_message.lower()
        )
        if emp_match:
            try:
                employee_count = int(emp_match.group(1))
            except Exception:
                pass

    # Heuristic extraction for timeline
    if not timeline:
        lower = user_message.lower()
        if any(w in lower for w in ["asap", "immediately", "right away", "now", "urgent"]):
            timeline = "Immediate (< 1 month)"
        elif any(w in lower for w in ["next month", "soon", "couple of weeks"]):
            timeline = "1-3 months"
        elif any(w in lower for w in ["quarter", "q1", "q2", "q3", "q4", "next quarter"]):
            timeline = "Next Quarter"
        elif any(w in lower for w in ["year", "next year", "eventually", "exploring"]):
            timeline = "Exploring options"

    # Apply safe defaults for scoring only (don't persist unknowns as guesses)
    budget_for_score = budget or 0.0
    employee_for_score = employee_count or 1
    timeline_for_score = timeline or "Exploring options"
    business_for_score = business_type or ""

    # Compute BANT score
    score = _compute_bant_score(
        budget=budget_for_score,
        timeline=timeline_for_score,
        employee_count=employee_for_score,
        business_type=business_for_score,
    )

    lead_status = "Hot" if score >= 75 else "Warm" if score >= 50 else "Cold"

    # Persist lead to database
    if lead_id:
        update_res = tool_update_lead(
            lead_id=lead_id,
            business_type=business_type or None,
            employee_count=employee_count,
            budget=budget,
            timeline=timeline,
            lead_score=score,
            lead_status=lead_status,
            notes=f"Auto-updated via Lead Agent. Score: {score}/100 ({lead_status})",
        )
        tools_called.append({
            "tool": "update_lead",
            "arguments": {"lead_id": lead_id, "score": score, "status": lead_status},
        })
        tool_results.append(update_res)
    else:
        save_res = tool_save_lead(
            customer_name=customer_name,
            email=email,
            phone=phone,
            business_type=business_type,
            employee_count=employee_count,
            budget=budget or 0.0,
            timeline=timeline,
            lead_score=score,
            lead_status=lead_status,
            notes=f"Qualified via Lead Agent. Score: {score}/100 ({lead_status})",
        )
        lead_id = save_res.get("lead_id")
        tools_called.append({
            "tool": "save_lead",
            "arguments": {"customer_name": customer_name, "score": score, "status": lead_status},
        })
        tool_results.append(save_res)

    lead_qualification_summary = {
        "business_type": business_type,
        "budget": budget,
        "employee_count": employee_count,
        "timeline": timeline,
        "lead_score": score,
        "lead_status": lead_status,
        "lead_id": lead_id,
        "missing_fields": missing_fields,
    }

    # Generate a sales reply if LLM didn't provide one
    if not sales_reply:
        if missing_fields:
            ask_about = missing_fields[0].replace("_", " ")
            sales_reply = (
                f"Thank you, {customer_name}! To give you the best recommendation, "
                f"could you tell me more about your {ask_about}?"
            )
        else:
            budget_str = f"${budget:,.0f}" if budget else "your budget"
            sales_reply = (
                f"Excellent, {customer_name}! I've profiled your {business_type or 'organization'} "
                f"({employee_for_score} team members, {budget_str}, {timeline_for_score} timeline). "
                f"You qualify as a **{lead_status} Lead** with a BANT score of **{score}/100**. "
                f"Would you like to schedule a personalized demo or explore our enterprise feature suite?"
            )

    return {
        "lead_id": lead_id,
        "lead_qualification": lead_qualification_summary,
        "tools_called": tools_called,
        "tool_results": tool_results,
        "final_response": sales_reply,
    }
