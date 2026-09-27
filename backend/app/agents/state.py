from typing import TypedDict, List, Dict, Any, Optional

class AgentState(TypedDict):
    """
    Shared State across the LangGraph Multi-Agent Workflow
    """
    # Session & Customer Context
    session_id: str
    lead_id: Optional[int]
    customer_name: Optional[str]
    customer_email: Optional[str]
    customer_phone: Optional[str]
    
    # Message History & Current Input
    user_message: str
    conversation_history: List[Dict[str, str]]
    
    # Intent Classification
    intent: str  # "Product Inquiry" | "Pricing Inquiry" | "Lead Qualification" | "Schedule Meeting" | "General Question"
    intent_confidence: float
    
    # Planner Agent Reasoning
    planner_thought: str
    target_agent: str
    
    # Tool Invocation
    tools_called: List[Dict[str, Any]]
    tool_results: List[Dict[str, Any]]
    
    # Specialized Agent Outputs
    lead_qualification: Optional[Dict[str, Any]]
    rag_sources: List[Dict[str, Any]]
    appointment_details: Optional[Dict[str, Any]]
    followup_drafts: Optional[Dict[str, str]]
    
    # Final Output
    final_response: str
