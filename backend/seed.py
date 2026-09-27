"""
Standalone Database Seeding & Verification Script for AgentFlow AI
Populates realistic sales leads, scheduled appointments, knowledge base docs, and evaluation benchmarks.
"""
from datetime import datetime, date, timedelta
from app.core.database import SessionLocal, init_db
from app.models.models import Lead, Appointment, Document, Evaluation, Conversation

def seed():
    print("Initializing AgentFlow AI Database Schema...")
    init_db()
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(Lead).count() > 0:
            print(f"Database already contains {db.query(Lead).count()} leads. Seeding skipped.")
            return

        print("Seeding sample leads...")
        leads = [
            Lead(
                customer_name="Sarah Jenkins",
                email="sarah.jenkins@cloudscale.io",
                phone="+1 (415) 890-1234",
                business_type="B2B DevOps Platform",
                employee_count=85,
                budget=15000.0,
                timeline="Immediate (< 1 month)",
                lead_score=94,
                lead_status="Hot",
                notes="Needs autonomous inbound sales agents for high-velocity signups. Very excited about LangGraph workflows."
            ),
            Lead(
                customer_name="Michael Chang",
                email="m.chang@apexfintech.com",
                phone="+1 (212) 555-8832",
                business_type="Fintech Solutions",
                employee_count=45,
                budget=8500.0,
                timeline="1-3 months",
                lead_score=82,
                lead_status="Hot",
                notes="Requires SOC2 compliance guarantees and custom RAG over financial product sheets."
            ),
            Lead(
                customer_name="Elena Rostova",
                email="elena@healthpulse.ai",
                phone="+1 (617) 449-0129",
                business_type="Healthcare Analytics",
                employee_count=20,
                budget=4500.0,
                timeline="Next Quarter",
                lead_score=68,
                lead_status="Warm",
                notes="Evaluating Growth tier vs custom enterprise deployment."
            ),
            Lead(
                customer_name="David Keller",
                email="david@nexusretail.co",
                phone="+1 (312) 770-4491",
                business_type="E-commerce Wholesale",
                employee_count=12,
                budget=2000.0,
                timeline="Exploring options",
                lead_score=45,
                lead_status="Cold",
                notes="Early stage retail brand exploring AI sales chat capabilities."
            )
        ]
        db.add_all(leads)
        db.commit()

        lead1 = db.query(Lead).filter(Lead.customer_name == "Sarah Jenkins").first()
        lead2 = db.query(Lead).filter(Lead.customer_name == "Michael Chang").first()

        tomorrow = date.today() + timedelta(days=1)
        day_after = date.today() + timedelta(days=2)

        appointments = [
            Appointment(
                lead_id=lead1.id,
                date=tomorrow,
                time="10:00 AM EST",
                status="Scheduled",
                meeting_link="https://meet.agentflow.ai/sales-demo",
                notes="Live LangGraph Agentic Architecture Deep Dive"
            ),
            Appointment(
                lead_id=lead2.id,
                date=day_after,
                time="2:30 PM EST",
                status="Scheduled",
                meeting_link="https://meet.agentflow.ai/sales-demo",
                notes="Enterprise Security, RAG & ChromaDB Integration Session"
            )
        ]
        db.add_all(appointments)

        # Seed Documents
        db.add(Document(
            filename="AgentFlow_Product_Manual.pdf",
            file_path="./uploads/AgentFlow_Product_Manual.pdf",
            file_size=142850,
            chunk_count=18
        ))

        # Seed Evaluation benchmark
        db.add_all([
            Evaluation(
                test_case_name="TC-001: Pricing Inquiry Verification",
                intent_accuracy=1.0,
                tool_accuracy=1.0,
                hallucination_score=0.02,
                response_relevance=0.98,
                qualification_completeness=1.0,
                overall_score=97.5,
                status="PASS",
                execution_time_ms=185.4,
                details='{"test_id": "TC-001", "intent": "Pricing Inquiry"}'
            ),
            Evaluation(
                test_case_name="TC-002: Demo Booking & Slot Reservation",
                intent_accuracy=1.0,
                tool_accuracy=1.0,
                hallucination_score=0.01,
                response_relevance=0.96,
                qualification_completeness=1.0,
                overall_score=96.8,
                status="PASS",
                execution_time_ms=210.1,
                details='{"test_id": "TC-002", "intent": "Schedule Meeting"}'
            ),
            Evaluation(
                test_case_name="TC-003: Product Architecture RAG Retrieval",
                intent_accuracy=1.0,
                tool_accuracy=1.0,
                hallucination_score=0.03,
                response_relevance=0.94,
                qualification_completeness=1.0,
                overall_score=95.2,
                status="PASS",
                execution_time_ms=290.7,
                details='{"test_id": "TC-003", "intent": "Product Inquiry"}'
            ),
            Evaluation(
                test_case_name="TC-004: BANT Lead Qualification & Scoring",
                intent_accuracy=1.0,
                tool_accuracy=1.0,
                hallucination_score=0.01,
                response_relevance=0.99,
                qualification_completeness=1.0,
                overall_score=98.5,
                status="PASS",
                execution_time_ms=245.2,
                details='{"test_id": "TC-004", "intent": "Lead Qualification"}'
            ),
            Evaluation(
                test_case_name="TC-005: Hallucination & Boundary Guardrails",
                intent_accuracy=1.0,
                tool_accuracy=1.0,
                hallucination_score=0.04,
                response_relevance=0.92,
                qualification_completeness=1.0,
                overall_score=93.6,
                status="PASS",
                execution_time_ms=170.8,
                details='{"test_id": "TC-005", "intent": "General Question"}'
            )
        ])
        db.commit()
        print("Database successfully seeded with portfolio data!")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
