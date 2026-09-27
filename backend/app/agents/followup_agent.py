import json
from app.agents.state import AgentState
from app.agents.llm_client import call_gemini_or_fallback
from app.tools.sales_tools import tool_generate_followup

FOLLOWUP_SYSTEM_PROMPT = """You are the Omnichannel Sales Follow-up Agent for AgentFlow AI.
Generate personalized, high-converting follow-up drafts for:
1. WhatsApp Message (short, punchy, conversational, includes emojis and meeting link)
2. Email Follow-up (executive subject line, personalized value summary, clear call to action)

Respond strictly in valid JSON:
{
  "whatsapp": "<WhatsApp message draft>",
  "email_subject": "<Subject line>",
  "email_body": "<Formatted email body>"
}
"""

def followup_agent_node(state: AgentState) -> dict:
    lead_id = state.get("lead_id") or 1
    user_message = state.get("user_message", "")
    customer_name = state.get("customer_name") or "there"
    tools_called = list(state.get("tools_called", []))
    tool_results = list(state.get("tool_results", []))

    # Execute Tool 5: Generate Follow-up
    res = tool_generate_followup(
        lead_id=lead_id,
        channel="all",
        custom_context=user_message
    )
    tools_called.append({
        "tool": "generate_followup",
        "arguments": {"lead_id": lead_id, "channel": "all"}
    })
    tool_results.append(res)

    whatsapp_draft = res.get("whatsapp", "")
    email_subject = res.get("email_subject", "")
    email_body = res.get("email_body", "")

    drafts = {
        "whatsapp": whatsapp_draft,
        "email_subject": email_subject,
        "email_body": email_body
    }

    final_reply = (
        f"I have prepared tailored follow-up sequences for **{customer_name}**:\n\n"
        f"📱 **WhatsApp Outreach:**\n> {whatsapp_draft}\n\n"
        f"✉️ **Email Sequence:**\n**Subject:** {email_subject}\n\n{email_body}"
    )

    return {
        "followup_drafts": drafts,
        "tools_called": tools_called,
        "tool_results": tool_results,
        "final_response": final_reply
    }
