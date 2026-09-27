import json
from app.agents.state import AgentState
from app.agents.llm_client import call_gemini_or_fallback
from app.tools.sales_tools import tool_fetch_customer_history

PLANNER_SYSTEM_PROMPT = """You are the Lead Sales Orchestration & Planner Agent for AgentFlow AI.
Based on the detected user intent, message context, and customer status, your role is to:
1. Formulate step-by-step reasoning on what information or tool is required.
2. Select the most appropriate specialized agent:
   - "lead_agent": For qualification questions, budget, company size, timeline.
   - "knowledge_agent": For product feature queries, pricing details, technical questions (calls RAG).
   - "appointment_agent": For meeting scheduling, slot selection, and calendar booking.
   - "followup_agent": For drafting re-engagement messages or post-qualification follow-ups.
3. Decide if history or lead records need to be retrieved.

Respond strictly in valid JSON:
{
  "thought": "<concise reasoning on the strategy>",
  "target_agent": "<lead_agent | knowledge_agent | appointment_agent | followup_agent>",
  "required_tools": ["<tool_names>"]
}
"""

def planner_agent_node(state: AgentState) -> dict:
    intent = state.get("intent", "General Question")
    user_message = state.get("user_message", "")
    lead_id = state.get("lead_id")
    session_id = state.get("session_id", "default_session")

    # Fetch customer history context if lead_id or session_id is available
    history_ctx = tool_fetch_customer_history(lead_id=lead_id, session_id=session_id)

    prompt = (
        f"Detected Intent: {intent}\n"
        f"Customer Message: \"{user_message}\"\n"
        f"Existing Profile: {json.dumps(history_ctx.get('lead_profile'))}\n"
        f"Available Specialized Agents: lead_agent, knowledge_agent, appointment_agent, followup_agent"
    )

    raw_response = call_gemini_or_fallback(
        prompt=prompt,
        system_instruction=PLANNER_SYSTEM_PROMPT,
        json_mode=True
    )

    try:
        parsed = json.loads(raw_response)
        thought = parsed.get("thought", f"Routing {intent} to appropriate specialized handler.")
        target_agent = parsed.get("target_agent")
    except Exception:
        thought = f"Autonomous routing based on classified intent: {intent}"
        target_agent = None

    # Deterministic fallback router mapping if LLM response was ambiguous
    if not target_agent or target_agent not in ["lead_agent", "knowledge_agent", "appointment_agent", "followup_agent"]:
        if intent == "Lead Qualification":
            target_agent = "lead_agent"
        elif intent in ["Product Inquiry", "Pricing Inquiry"]:
            target_agent = "knowledge_agent"
        elif intent == "Schedule Meeting":
            target_agent = "appointment_agent"
        else:
            target_agent = "knowledge_agent"

    return {
        "planner_thought": thought,
        "target_agent": target_agent
    }
