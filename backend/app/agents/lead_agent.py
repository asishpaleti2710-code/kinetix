import json
import re
from app.agents.state import AgentState
from app.agents.llm_client import call_gemini_or_fallback
from app.tools.sales_tools import tool_save_lead, tool_update_lead

LEAD_QUALIFICATION_PROMPT = """You are the Lead Qualification Agent for AgentFlow AI.
Your mission is to qualify prospects based on the BANT sales methodology by collecting:
1. What business do they run?
2. What is their budget?
3. How many employees do they have?
4. What timeline are they planning?

Analyze the customer's message and past history. Extract:
- business_type (string or null if unknown)
- budget (number or null)
- employee_count (integer or null)
- timeline (string or null)

Respond strictly in valid JSON:
{
  "business_type": "<type or null>",
  "budget": <float or null>,
  "employee_count": <int or null>,
  "timeline": "<timeline or null>",
  "missing_fields": ["<list of any of the 4 fields still missing>"],
  "sales_reply": "<consultative message asking for remaining information or confirming qualification>"
}
"""

def lead_agent_node(state: AgentState) -> dict:
    user_message = state.get("user_message", "")
    customer_name = state.get("customer_name") or "Valued Client"
    email = state.get("customer_email") or f"prospect_{state.get('session_id')[:6]}@example.com"
    phone = state.get("customer_phone")
    lead_id = state.get("lead_id")
    history = state.get("conversation_history", [])

    prompt = f"Customer Name: {customer_name}\nMessage: \"{user_message}\"\nHistory: {json.dumps(history[-4:] if history else [])}"

    raw_response = call_gemini_or_fallback(
        prompt=prompt,
        system_instruction=LEAD_QUALIFICATION_PROMPT,
        json_mode=True
    )

    try:
        data = json.loads(raw_response)
    except Exception:
        data = {}

    business_type = data.get("business_type") or "Enterprise Solutions"
    budget = data.get("budget")
    employee_count = data.get("employee_count") or 10
    timeline = data.get("timeline")
    missing_fields = data.get("missing_fields", [])
    sales_reply = data.get("sales_reply")

    # Fallback heuristic parsing if LLM didn't extract budget/timeline
    if budget is None:
        num_match = re.search(r"\$?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?k?)", user_message.lower())
        if num_match:
            raw = num_match.group(1).replace(",", "")
            if "k" in raw:
                try: budget = float(raw.replace("k", "")) * 1000
                except: budget = 5000.0
            else:
                try: budget = float(raw)
                except: budget = 5000.0
        else:
            budget = 6500.0

    if not timeline:
        if any(w in user_message.lower() for w in ["asap", "immediate", "now", "week"]):
            timeline = "Immediate (< 1 month)"
        elif "month" in user_message.lower():
            timeline = "1-3 months"
        else:
            timeline = "Q2 / Next Quarter"

    # Compute Lead Score (0-100)
    score = 0
    # Budget score (up to 35 pts)
    if budget >= 10000: score += 35
    elif budget >= 5000: score += 28
    elif budget >= 2000: score += 20
    else: score += 10

    # Timeline score (up to 30 pts)
    if any(w in timeline.lower() for w in ["immediate", "asap", "week", "1 month"]):
        score += 30
    elif "1-3" in timeline or "quarter" in timeline.lower():
        score += 20
    else:
        score += 10

    # Employee count score (up to 20 pts)
    if employee_count >= 50: score += 20
    elif employee_count >= 10: score += 15
    else: score += 10

    # Business clarity (up to 15 pts)
    if business_type and business_type != "Unknown": score += 15
    else: score += 8

    # Assign Lead Category
    if score >= 75:
        lead_status = "Hot"
    elif score >= 50:
        lead_status = "Warm"
    else:
        lead_status = "Cold"

    # Execute Tool 1 (Save Lead) or Tool 2 (Update Lead)
    tools_called = list(state.get("tools_called", []))
    tool_results = list(state.get("tool_results", []))

    if lead_id:
        update_res = tool_update_lead(
            lead_id=lead_id,
            business_type=business_type,
            employee_count=employee_count,
            budget=budget,
            timeline=timeline,
            lead_score=score,
            lead_status=lead_status,
            notes=f"Auto-qualified via Lead Agent. Score: {score}/100 ({lead_status})"
        )
        tools_called.append({"tool": "update_lead", "arguments": {"lead_id": lead_id, "score": score, "status": lead_status}})
        tool_results.append(update_res)
    else:
        save_res = tool_save_lead(
            customer_name=customer_name,
            email=email,
            phone=phone,
            business_type=business_type,
            employee_count=employee_count,
            budget=budget,
            timeline=timeline,
            lead_score=score,
            lead_status=lead_status,
            notes=f"Qualified via Lead Agent. Score: {score}/100 ({lead_status})"
        )
        lead_id = save_res.get("lead_id")
        tools_called.append({"tool": "save_lead", "arguments": {"customer_name": customer_name, "score": score, "status": lead_status}})
        tool_results.append(save_res)

    lead_qualification_summary = {
        "business_type": business_type,
        "budget": budget,
        "employee_count": employee_count,
        "timeline": timeline,
        "lead_score": score,
        "lead_status": lead_status,
        "lead_id": lead_id
    }

    if not sales_reply:
        sales_reply = (
            f"Thank you for sharing your details, {customer_name}! "
            f"We've profiled your {business_type} with {employee_count} team members. "
            f"With a planned budget of ${budget:,.2f} and a {timeline} timeline, "
            f"you are categorized as a **{lead_status} Lead** (Qualification Score: **{score}/100**). "
            f"Would you like to schedule an executive walkthrough or explore our enterprise feature breakdown?"
        )

    return {
        "lead_id": lead_id,
        "lead_qualification": lead_qualification_summary,
        "tools_called": tools_called,
        "tool_results": tool_results,
        "final_response": sales_reply
    }
