"""
Improved Intent Agent with:
- Richer system prompt with few-shot examples
- Context injection from conversation history
- Confidence-gated fallback (ambiguous → re-ask rather than misroute)
"""

import json
from app.agents.state import AgentState
from app.agents.llm_client import call_gemini_or_fallback

INTENT_SYSTEM_PROMPT = """You are the Intent Detection Agent of Kinetix — a precision classifier for an enterprise AI Sales platform.

TASK: Classify the customer's current message into EXACTLY ONE of these 5 intents:

1. "Product Inquiry"     – Questions about features, architecture, security, integrations, SLAs, how it works, ChromaDB, LangGraph, agents
2. "Pricing Inquiry"     – Subscription tiers, monthly costs, enterprise quotes, ROI comparisons, discounts
3. "Lead Qualification"  – Customer shares company size, budget, industry, team count, deployment timeline, business use-case
4. "Schedule Meeting"    – Requests to book, reschedule, or cancel a demo, consultation, or calendar slot
5. "General Question"    – Greetings, company background, off-topic questions, ambiguous or very short messages

FEW-SHOT EXAMPLES:
  "What does the Growth tier cost?" → Pricing Inquiry
  "We have 50 employees and a $10k budget, launching next month" → Lead Qualification
  "Can I book a demo for Thursday at 3pm?" → Schedule Meeting
  "How does your ChromaDB RAG pipeline work?" → Product Inquiry
  "Hi, who are you?" → General Question
  "Tell me more about your enterprise security and SOC2 compliance" → Product Inquiry
  "I want to generate follow-up messages for my prospect" → General Question (map to follow-up via planner)

RULES:
- If confidence < 0.70, classify as "General Question" rather than guess.
- Respond ONLY with valid JSON, no markdown fences.

OUTPUT FORMAT (strict JSON):
{
  "intent": "<ONE OF THE 5 INTENTS>",
  "confidence": <float 0.0–1.0>,
  "reasoning": "<one sentence explanation>"
}"""


def intent_agent_node(state: AgentState) -> dict:
    user_message = state.get("user_message", "")
    history = state.get("conversation_history", [])

    # Build a compact context string from recent turns
    history_ctx = ""
    if history:
        recent = history[-4:]  # last 4 exchanges
        history_ctx = "\n".join(
            f"{t['sender'].capitalize()}: {t['message']}" for t in recent
        )
        history_ctx = f"\n\nRecent conversation context:\n{history_ctx}"

    prompt = (
        f"Customer's current message: \"{user_message}\""
        f"{history_ctx}"
    )

    raw_response = call_gemini_or_fallback(
        prompt=prompt,
        system_instruction=INTENT_SYSTEM_PROMPT,
        json_mode=True,
    )

    try:
        parsed = json.loads(raw_response)
        intent = parsed.get("intent", "General Question")
        confidence = float(parsed.get("confidence", 0.9))

        # Validate intent value
        valid_intents = {
            "Product Inquiry", "Pricing Inquiry", "Lead Qualification",
            "Schedule Meeting", "General Question"
        }
        if intent not in valid_intents:
            intent = "General Question"
            confidence = 0.75
    except Exception:
        intent = "General Question"
        confidence = 0.80

    return {
        "intent": intent,
        "intent_confidence": confidence,
    }
