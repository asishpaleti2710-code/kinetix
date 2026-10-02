"""
Improved Followup Agent with:
- LLM-powered personalized message generation using customer profile
- Separate WhatsApp and Email generation with proper formatting
- Context-aware templates that reference qualification data
- Multiple follow-up tones: urgent (Hot), nurturing (Warm), educational (Cold)
"""

import json
from app.agents.state import AgentState
from app.agents.llm_client import call_gemini_or_fallback
from app.tools.sales_tools import tool_generate_followup

FOLLOWUP_SYSTEM_PROMPT = """You are the Omnichannel Sales Follow-up Agent for Kinetix.

Generate highly personalized, conversion-optimized outreach for the prospect below.

TONE GUIDELINES based on lead score:
  - Hot Lead (≥75): Urgent, confident, action-focused. Emphasize limited slots, exclusive offer.
  - Warm Lead (50-74): Value-nurturing, curious, question-driven. Highlight ROI and case studies.
  - Cold Lead (<50): Educational, informative, low-pressure. Share resources and invite questions.

WHATSAPP MESSAGE:
  - Max 200 words
  - Conversational, emoji-enhanced, include meeting link
  - Must feel personal and not like a template

EMAIL:
  - Subject: Specific, compelling, personalized (not generic)
  - Body: Professional but warm, 3-4 paragraphs, clear CTA
  - Include customer's specific business type and budget in the body

CUSTOMER PROFILE:
{profile}

RECENT CONTEXT:
{context}

OUTPUT (strict JSON, no markdown):
{{
  "whatsapp": "<WhatsApp message draft>",
  "email_subject": "<Compelling subject line>",
  "email_body": "<Full formatted email body>"
}}"""


def followup_agent_node(state: AgentState) -> dict:
    lead_id = state.get("lead_id") or 1
    user_message = state.get("user_message", "")
    customer_name = state.get("customer_name") or "there"
    customer_email = state.get("customer_email")
    tools_called = list(state.get("tools_called", []))
    tool_results = list(state.get("tool_results", []))

    # Get lead qualification data for personalization
    qualification = state.get("lead_qualification") or {}
    lead_score = qualification.get("lead_score", 50)
    lead_status = qualification.get("lead_status", "Warm")
    business_type = qualification.get("business_type") or "your organization"
    budget = qualification.get("budget")
    timeline = qualification.get("timeline") or "upcoming period"

    # Get customer context string from planner
    context_str = state.get("_customer_context", "")

    # Build profile string for the prompt
    budget_str = f"${budget:,.0f}/month budget" if budget else "budget not yet confirmed"
    profile_str = (
        f"Name: {customer_name}\n"
        f"Email: {customer_email or 'unknown'}\n"
        f"Business: {business_type}\n"
        f"Lead Score: {lead_score}/100 ({lead_status})\n"
        f"Budget: {budget_str}\n"
        f"Timeline: {timeline}\n"
        f"User's Request: {user_message}"
    )

    # Generate personalized follow-up via LLM
    prompt = f"Generate follow-up messages for this prospect."
    system = FOLLOWUP_SYSTEM_PROMPT.format(
        profile=profile_str,
        context=context_str[:500] if context_str else "No additional context",
    )

    raw_response = call_gemini_or_fallback(
        prompt=prompt,
        system_instruction=system,
        json_mode=True,
    )

    try:
        llm_drafts = json.loads(raw_response)
        whatsapp_draft = llm_drafts.get("whatsapp", "")
        email_subject = llm_drafts.get("email_subject", "")
        email_body = llm_drafts.get("email_body", "")
    except Exception:
        llm_drafts = {}
        whatsapp_draft = ""
        email_subject = ""
        email_body = ""

    # Also call the tool (generates template-based fallback and persists context)
    tool_res = tool_generate_followup(
        lead_id=lead_id,
        channel="all",
        custom_context=user_message,
    )
    tools_called.append({
        "tool": "generate_followup",
        "arguments": {"lead_id": lead_id, "channel": "all"},
    })
    tool_results.append(tool_res)

    # Prefer LLM-generated content; fall back to tool templates
    whatsapp_draft = whatsapp_draft or tool_res.get("whatsapp", "")
    email_subject = email_subject or tool_res.get("email_subject", "Follow-up from Kinetix")
    email_body = email_body or tool_res.get("email_body", "")

    drafts = {
        "whatsapp": whatsapp_draft,
        "email_subject": email_subject,
        "email_body": email_body,
    }

    # Format the final display message
    lead_status_emoji = {"Hot": "🔥", "Warm": "🌟", "Cold": "❄️"}.get(lead_status, "📊")

    final_reply = (
        f"{lead_status_emoji} **Follow-up Sequences Ready for {customer_name}** "
        f"({lead_status} Lead — {lead_score}/100)\n\n"
        f"📱 **WhatsApp Message:**\n> {whatsapp_draft}\n\n"
        f"✉️ **Email Campaign:**\n"
        f"**Subject:** {email_subject}\n\n"
        f"{email_body}"
    )

    return {
        "followup_drafts": drafts,
        "tools_called": tools_called,
        "tool_results": tool_results,
        "final_response": final_reply,
    }
