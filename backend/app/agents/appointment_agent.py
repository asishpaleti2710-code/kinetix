import json
import re
from datetime import datetime, timedelta, date
from app.agents.state import AgentState
from app.agents.llm_client import call_gemini_or_fallback
from app.tools.sales_tools import tool_book_appointment

APPOINTMENT_SYSTEM_PROMPT = """You are the Appointment Scheduling Agent for AgentFlow AI.
Your responsibility is to assist customers with booking product demonstrations and sales consultations.

Available demo slots for the next 3 business days:
1. Tomorrow at 10:00 AM EST
2. Tomorrow at 2:00 PM EST
3. In 2 days at 11:30 AM EST
4. In 2 days at 3:30 PM EST

Task:
Analyze customer message:
- If they confirm a slot or propose a date and time, extract:
  date (YYYY-MM-DD format) and time (e.g. "10:00 AM EST").
- If they are inquiring generally, present available slots warmly.

Respond strictly in valid JSON:
{
  "slot_confirmed": <true/false>,
  "date": "<YYYY-MM-DD or null>",
  "time": "<time string or null>",
  "message": "<scheduling reply message>"
}
"""

def appointment_agent_node(state: AgentState) -> dict:
    user_message = state.get("user_message", "")
    lead_id = state.get("lead_id") or 1
    tools_called = list(state.get("tools_called", []))
    tool_results = list(state.get("tool_results", []))

    prompt = f"Customer message: \"{user_message}\"\nToday's Date: {date.today().isoformat()}"

    raw_response = call_gemini_or_fallback(
        prompt=prompt,
        system_instruction=APPOINTMENT_SYSTEM_PROMPT,
        json_mode=True
    )

    try:
        data = json.loads(raw_response)
    except Exception:
        data = {}

    slot_confirmed = data.get("slot_confirmed", False)
    date_val = data.get("date")
    time_val = data.get("time")
    agent_message = data.get("message")

    # Fallback heuristic: check if user requested a slot or time
    lower_msg = user_message.lower()
    if not slot_confirmed and any(w in lower_msg for w in ["tomorrow", "10", "2", "11", "3", "am", "pm", "slot", "book it", "schedule"]):
        slot_confirmed = True
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        date_val = tomorrow
        if "10" in lower_msg: time_val = "10:00 AM EST"
        elif "2" in lower_msg: time_val = "2:00 PM EST"
        elif "3" in lower_msg: time_val = "3:30 PM EST"
        else: time_val = "11:30 AM EST"

    appointment_info = None

    if slot_confirmed and date_val and time_val:
        # Execute Tool 3: Book Appointment
        booking_result = tool_book_appointment(
            lead_id=lead_id,
            date_str=date_val,
            time_str=time_val,
            notes="Product Demo & Architecture Walkthrough"
        )
        tools_called.append({
            "tool": "book_appointment",
            "arguments": {"lead_id": lead_id, "date": date_val, "time": time_val}
        })
        tool_results.append(booking_result)
        appointment_info = booking_result

        final_reply = (
            f"🎉 **Demo Confirmed!** Your consultation has been scheduled for **{date_val} at {time_val}**.\n\n"
            f"• **Session Link**: [https://meet.agentflow.ai/sales-demo](https://meet.agentflow.ai/sales-demo)\n"
            f"• **Calendar Invite**: Sent to your registered email address.\n"
            f"• **Host**: Senior AI Sales Engineer, AgentFlow AI\n\n"
            f"We're looking forward to walking you through our autonomous sales agent architecture!"
        )
    else:
        tomorrow_str = (datetime.now() + timedelta(days=1)).strftime("%A, %b %d")
        next_day_str = (datetime.now() + timedelta(days=2)).strftime("%A, %b %d")
        final_reply = (
            f"I'd be glad to arrange a live interactive demonstration of AgentFlow AI! "
            f"Here are our upcoming VIP slots:\n\n"
            f"1. **{tomorrow_str} at 10:00 AM EST**\n"
            f"2. **{tomorrow_str} at 2:00 PM EST**\n"
            f"3. **{next_day_str} at 11:30 AM EST**\n"
            f"4. **{next_day_str} at 3:30 PM EST**\n\n"
            f"Which time works best for you? Just let me know and I will reserve your slot immediately."
        )

    return {
        "appointment_details": appointment_info,
        "tools_called": tools_called,
        "tool_results": tool_results,
        "final_response": final_reply
    }
