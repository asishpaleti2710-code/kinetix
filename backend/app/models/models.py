from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, Date, ForeignKey, Numeric
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
    chunk_count = Column(Integer, default=0)
    upload_date = Column(DateTime, default=datetime.utcnow)


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
