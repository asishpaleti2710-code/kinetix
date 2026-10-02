from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

try:
    from pydantic import EmailStr
    import email_validator
except ImportError:
    EmailStr = str

# User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: Optional[str] = "sales_rep"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# Lead Schemas
class LeadBase(BaseModel):
    customer_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    business_type: Optional[str] = None
    employee_count: Optional[int] = 1
    budget: Optional[float] = 0.0
    timeline: Optional[str] = None
    lead_score: Optional[int] = 0
    lead_status: Optional[str] = "Cold"  # Hot, Warm, Cold
    notes: Optional[str] = None

class LeadCreate(LeadBase):
    pass

class LeadUpdate(BaseModel):
    customer_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    business_type: Optional[str] = None
    employee_count: Optional[int] = None
    budget: Optional[float] = None
    timeline: Optional[str] = None
    lead_score: Optional[int] = None
    lead_status: Optional[str] = None
    notes: Optional[str] = None

class LeadResponse(LeadBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

# Appointment Schemas
class AppointmentBase(BaseModel):
    lead_id: int
    date: date
    time: str
    status: Optional[str] = "Scheduled"
    meeting_link: Optional[str] = None
    notes: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentResponse(AppointmentBase):
    id: int
    created_at: datetime
    customer_name: Optional[str] = None
    class Config:
        from_attributes = True

# Conversation Schemas
class ConversationBase(BaseModel):
    lead_id: Optional[int] = None
    session_id: str
    message: str
    sender: str
    agent_used: Optional[str] = None
    tools_called: Optional[str] = None

class ConversationResponse(ConversationBase):
    id: int
    timestamp: datetime
    class Config:
        from_attributes = True

# Document Schemas
class DocumentResponse(BaseModel):
    id: int
    filename: str
    file_path: Optional[str] = None
    file_size: int
    chunk_count: int
    upload_date: datetime
    class Config:
        from_attributes = True

# Evaluation Schemas
class EvaluationResponse(BaseModel):
    id: int
    conversation_id: Optional[int] = None
    test_case_name: Optional[str] = None
    intent_accuracy: float
    tool_accuracy: float
    hallucination_score: float
    response_relevance: float
    qualification_completeness: float
    overall_score: float
    status: str
    execution_time_ms: float
    details: Optional[str] = None
    timestamp: datetime
    class Config:
        from_attributes = True

# Chat Request & Multi-Agent Response Schemas
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default_session"
    lead_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None

class ToolCallLog(BaseModel):
    tool: str
    arguments: Dict[str, Any]
    output: Any

class ChatResponse(BaseModel):
    response: str
    session_id: str
    lead_id: Optional[int] = None
    detected_intent: str
    routed_agent: str
    planner_thought: Optional[str] = None
    tools_executed: List[ToolCallLog] = []
    lead_qualification: Optional[Dict[str, Any]] = None
    suggested_followups: Optional[Dict[str, str]] = None  # WhatsApp & Email drafts
