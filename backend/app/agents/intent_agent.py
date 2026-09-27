import json
from app.agents.state import AgentState
from app.agents.llm_client import call_gemini_or_fallback

INTENT_SYSTEM_PROMPT = """You are the Intent Detection Agent of AgentFlow AI, an enterprise AI Sales Employee.
Your job is to accurately classify the customer's intent into exactly ONE of the following 5 categories:
1. "Product Inquiry" (Questions about product features, technical capabilities, security, integrations, how it works)
2. "Pricing Inquiry" (Questions regarding subscription tiers, monthly costs, enterprise quotes, discounts)
3. "Lead Qualification" (Messages sharing company size, business details, budget ranges, development timelines)
4. "Schedule Meeting" (Requests to book a demo, talk to sales, schedule a consultation, calendar slots)
5. "General Question" (Greetings, company background, casual chit-chat, or ambiguous questions)

Respond strictly in valid JSON format:
{
  "intent": "<ONE_OF_THE_5_INTENTS>",
  "confidence": <float between 0.0 and 1.0>,
  "reasoning": "<short explanation>"
}
"""

def intent_agent_node(state: AgentState) -> dict:
    user_message = state.get("user_message", "")
    history = state.get("conversation_history", [])
    
    prompt = f"Customer message: \"{user_message}\"\nRecent context: {json.dumps(history[-3:] if history else [])}"
    
    raw_response = call_gemini_or_fallback(
        prompt=prompt,
        system_instruction=INTENT_SYSTEM_PROMPT,
        json_mode=True
    )
    
    try:
        parsed = json.loads(raw_response)
        intent = parsed.get("intent", "General Question")
        confidence = float(parsed.get("confidence", 0.9))
    except Exception:
        intent = "General Question"
        confidence = 0.85

    return {
        "intent": intent,
        "intent_confidence": confidence
    }
