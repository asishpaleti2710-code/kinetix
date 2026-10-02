"""
Improved Planner Agent with:
- Context manager integration (full customer profile + BANT gaps)
- Follow-up trigger detection (route to followup_agent when appropriate)
- Richer reasoning prompt with explicit routing criteria
"""

import json
from app.agents.state import AgentState
from app.agents.llm_client import call_gemini_or_fallback
from app.agents.context_manager import build_agent_context

PLANNER_SYSTEM_PROMPT = """You are the Lead Sales Orchestration & Planner Agent for Kinetix — the supervisor of a multi-agent AI sales system.

YOUR ROLE: Given the customer's intent and full context, decide WHICH specialized agent to route to and WHY.

AVAILABLE SPECIALIZED AGENTS:
  - "lead_agent"        → Use when: intent is Lead Qualification OR customer shares budget/team/timeline/business details.
                          Also use when BANT qualification gaps exist and customer provided any qualifying info.
  - "knowledge_agent"   → Use when: intent is Product Inquiry OR Pricing Inquiry. Performs ChromaDB RAG retrieval.
  - "appointment_agent" → Use when: intent is Schedule Meeting, or customer mentions booking/demo/calendar.
  - "followup_agent"    → Use when: customer asks for follow-up messages, re-engagement drafts, or outreach templates.
                          Also use when lead is already Hot/Warm and mentions wanting next steps.

ROUTING RULES (in priority order):
  1. If intent is "Schedule Meeting" → appointment_agent
  2. If intent is "Lead Qualification" OR BANT gaps exist AND customer provided qualifying info → lead_agent
  3. If intent is "Product Inquiry" OR "Pricing Inquiry" → knowledge_agent
  4. If customer asks for follow-up, outreach, or messages → followup_agent
  5. Default fallback → knowledge_agent

IMPORTANT: Consider the full customer profile and qualification gaps in your reasoning.
If budget, timeline, business_type, or employee_count are missing, gently suggest the lead_agent to gather them.

OUTPUT (strict JSON, no markdown):
{
  "thought": "<2-3 sentence strategic reasoning>",
  "target_agent": "<lead_agent|knowledge_agent|appointment_agent|followup_agent>",
  "required_tools": ["<list of tool names>"],
  "should_gather_bant": <true if BANT gaps should be prioritised>,
  "priority_action": "<brief 1-line description of what the selected agent should do>"
}"""

# Deterministic fallback router
_INTENT_AGENT_MAP = {
    "Lead Qualification": "lead_agent",
    "Product Inquiry": "knowledge_agent",
    "Pricing Inquiry": "knowledge_agent",
    "Schedule Meeting": "appointment_agent",
    "General Question": "knowledge_agent",
}


def planner_agent_node(state: AgentState) -> dict:
    intent = state.get("intent", "General Question")
    user_message = state.get("user_message", "")
    lead_id = state.get("lead_id")
    session_id = state.get("session_id", "default_session")

    # Build rich context from DB
    context = build_agent_context(
        session_id=session_id,
        lead_id=lead_id,
        user_message=user_message,
    )

    # Update state with resolved lead_id from context if not already set
    resolved_lead_id = lead_id or context.get("lead_id")
    qual_gaps = context.get("qualification_gaps", [])
    context_str = context.get("context_string", "")

    # Check if this looks like a follow-up request
    lower_msg = user_message.lower()
    is_followup_request = any(w in lower_msg for w in [
        "follow up", "follow-up", "send message", "draft email", "whatsapp", "outreach", "next steps message"
    ])

    prompt = (
        f"Detected Intent: {intent}\n"
        f"Customer Message: \"{user_message}\"\n"
        f"Is Follow-up Request: {is_followup_request}\n"
        f"BANT Qualification Gaps: {qual_gaps if qual_gaps else 'None — fully qualified'}\n\n"
        f"Full Customer Context:\n{context_str}"
    )

    raw_response = call_gemini_or_fallback(
        prompt=prompt,
        system_instruction=PLANNER_SYSTEM_PROMPT,
        json_mode=True,
    )

    try:
        parsed = json.loads(raw_response)
        thought = parsed.get("thought", f"Routing {intent} to appropriate handler.")
        target_agent = parsed.get("target_agent")
    except Exception:
        thought = f"Autonomous routing based on classified intent: {intent}"
        target_agent = None

    # Validate and apply deterministic fallback
    valid_agents = {"lead_agent", "knowledge_agent", "appointment_agent", "followup_agent"}
    if target_agent not in valid_agents:
        if is_followup_request:
            target_agent = "followup_agent"
        else:
            target_agent = _INTENT_AGENT_MAP.get(intent, "knowledge_agent")

    # Override: if intent is Schedule Meeting, always use appointment_agent
    if intent == "Schedule Meeting":
        target_agent = "appointment_agent"

    return {
        "planner_thought": thought,
        "target_agent": target_agent,
        "lead_id": resolved_lead_id,
        # Propagate qualification context for downstream agents
        "_qualification_gaps": qual_gaps,
        "_customer_context": context_str,
    }
