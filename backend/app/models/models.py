from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, Date, ForeignKey, Numeric, Boolean
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="sales_rep")
    created_at = Column(DateTime, default=datetime.utcnow)


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), index=True, nullable=True)
    business_type = Column(String(255), nullable=True)
    employee_count = Column(Integer, default=1)
    budget = Column(Float, default=0.0)
    timeline = Column(String(100), nullable=True)
    lead_score = Column(Integer, default=0, index=True)
    lead_status = Column(String(50), default="Cold", index=True)  # Hot, Warm, Cold
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    appointments = relationship("Appointment", back_populates="lead", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="lead")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    time = Column(String(50), nullable=False)
    status = Column(String(50), default="Scheduled")  # Scheduled, Completed, Cancelled
    meeting_link = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    lead = relationship("Lead", back_populates="appointments")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    session_id = Column(String(100), nullable=False, index=True)
    message = Column(Text, nullable=False)
    sender = Column(String(50), nullable=False)  # customer, assistant, system
    agent_used = Column(String(100), nullable=True)
    tools_called = Column(Text, nullable=True)  # JSON string
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationship
    lead = relationship("Lead", back_populates="conversations")
    evaluations = relationship("Evaluation", back_populates="conversation")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255), nullable=False, index=True)
    file_path = Column(String(500), nullable=True)
    file_size = Column(Integer, default=0)
    file_type = Column(String(50), nullable=True)  # pdf, docx, txt, csv, xlsx
    chunk_count = Column(Integer, default=0)
    upload_date = Column(DateTime, default=datetime.utcnow)

    # Document Intelligence analysis fields
    analysis = relationship("DocumentAnalysis", back_populates="document", uselist=False, cascade="all, delete-orphan")


class DocumentAnalysis(Base):
    """Stores AI-generated analysis for each uploaded document."""
    __tablename__ = "document_analyses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    # Core analysis outputs
    doc_type = Column(String(100), nullable=True)            # "resume", "research_paper", "business_doc", "general_pdf"
    executive_summary = Column(Text, nullable=True)
    key_topics = Column(Text, nullable=True)                  # JSON list
    key_entities = Column(Text, nullable=True)                # JSON list
    key_takeaways = Column(Text, nullable=True)               # JSON list
    actionable_suggestions = Column(Text, nullable=True)      # JSON list
    risks = Column(Text, nullable=True)                       # JSON list
    opportunities = Column(Text, nullable=True)               # JSON list
    recommendations = Column(Text, nullable=True)             # JSON list
    important_metrics = Column(Text, nullable=True)           # JSON list of metrics with value, label, trend

    # Resume-specific
    ats_score = Column(Float, nullable=True)
    missing_skills = Column(Text, nullable=True)              # JSON list
    resume_strengths = Column(Text, nullable=True)            # JSON list
    resume_weaknesses = Column(Text, nullable=True)           # JSON list
    recommended_projects = Column(Text, nullable=True)        # JSON list
    recommended_certifications = Column(Text, nullable=True)  # JSON list
    job_match_percentage = Column(Float, nullable=True)

    # Research paper-specific
    abstract_summary = Column(Text, nullable=True)
    methodology = Column(Text, nullable=True)
    key_findings = Column(Text, nullable=True)                # JSON list
    limitations = Column(Text, nullable=True)                 # JSON list
    future_scope = Column(Text, nullable=True)
    simplified_explanation = Column(Text, nullable=True)

    # Business document-specific
    swot_strengths = Column(Text, nullable=True)              # JSON list
    swot_weaknesses = Column(Text, nullable=True)             # JSON list
    swot_opportunities = Column(Text, nullable=True)          # JSON list
    swot_threats = Column(Text, nullable=True)                # JSON list
    strategic_recommendations = Column(Text, nullable=True)   # JSON list
    action_plan = Column(Text, nullable=True)                 # JSON list

    # Questions user should ask
    suggested_questions = Column(Text, nullable=True)         # JSON list

    # Status & Debug
    analysis_status = Column(String(50), default="pending")  # pending, processing, complete, failed
    error_message = Column(Text, nullable=True)
    debug_info = Column(Text, nullable=True)                 # JSON object containing granular pipeline step statuses & logs
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    document = relationship("Document", back_populates="analysis")


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True)
    test_case_name = Column(String(255), nullable=True)
    intent_accuracy = Column(Float, default=0.0)
    tool_accuracy = Column(Float, default=0.0)
    hallucination_score = Column(Float, default=0.0)
    response_relevance = Column(Float, default=0.0)
    qualification_completeness = Column(Float, default=0.0)
    overall_score = Column(Float, default=0.0)
    status = Column(String(50), default="PASS", index=True)  # PASS, FAIL, WARNING
    execution_time_ms = Column(Float, default=0.0)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationship
    conversation = relationship("Conversation", back_populates="evaluations")
