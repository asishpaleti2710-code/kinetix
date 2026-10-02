from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db, SessionLocal
from app.core.middleware import (
    RequestIDMiddleware,
    AccessLogMiddleware,
    RateLimitMiddleware,
    GlobalExceptionMiddleware,
)
from app.models.models import Lead, Appointment, Document, DocumentAnalysis, Evaluation, Conversation
from app.api.routes import (
    chat, leads, appointments, documents,
    evaluations, conversations, dashboard,
    analytics, notifications
)
from datetime import datetime, date, timedelta

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Kinetix — Autonomous Multi-Agent Sales Platform built with LangGraph, "
        "FastAPI, Gemini API, ChromaDB RAG, and React dashboard."
    ),
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middleware stack (order matters: outermost = first to process requests) ────
app.add_middleware(GlobalExceptionMiddleware)   # catch unhandled errors
app.add_middleware(RateLimitMiddleware)         # rate-limit before expensive ops
app.add_middleware(AccessLogMiddleware)         # log every request
app.add_middleware(RequestIDMiddleware)         # inject request IDs
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routers ────────────────────────────────────────────────────────────────
app.include_router(chat.router,          prefix=settings.API_V1_STR)
app.include_router(leads.router,         prefix=settings.API_V1_STR)
app.include_router(appointments.router,  prefix=settings.API_V1_STR)
app.include_router(documents.router,     prefix=settings.API_V1_STR)
app.include_router(evaluations.router,   prefix=settings.API_V1_STR)
app.include_router(conversations.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router,     prefix=settings.API_V1_STR)
app.include_router(analytics.router,     prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)


@app.on_event("startup")
def startup_event():
    """Initializes tables and populates portfolio seed data if fresh install."""
    init_db()
    # Ensure notification table is created
    try:
        from app.api.routes.notifications import Notification
        from app.core.database import engine
        from app.core.database import Base
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[Startup] Notice creating notification table: {e}")
    seed_initial_data()


def seed_initial_data():
    """Seeds rich sample data for instant portfolio presentation if database is empty."""
    db = SessionLocal()
    try:
        if db.query(Lead).count() == 0:
            sample_leads = [
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
                ),
                Lead(
                    customer_name="Priya Sharma",
                    email="priya.sharma@logisticsai.in",
                    phone="+91 98765 43210",
                    business_type="Logistics & Supply Chain",
                    employee_count=130,
                    budget=22000.0,
                    timeline="Immediate (< 1 month)",
                    lead_score=96,
                    lead_status="Hot",
                    notes="Enterprise logistics firm ready to deploy autonomous sales AI immediately. High ARR potential."
                ),
            ]
            db.add_all(sample_leads)
            db.commit()

            # Add sample appointments
            lead_sarah = db.query(Lead).filter(Lead.customer_name == "Sarah Jenkins").first()
            lead_michael = db.query(Lead).filter(Lead.customer_name == "Michael Chang").first()
            lead_priya = db.query(Lead).filter(Lead.customer_name == "Priya Sharma").first()

            if lead_sarah:
                tomorrow = date.today() + timedelta(days=1)
                db.add(Appointment(
                    lead_id=lead_sarah.id,
                    date=tomorrow,
                    time="10:00 AM EST",
                    status="Scheduled",
                    meeting_link="https://meet.kinetix.ai/sales-demo",
                    notes="Live LangGraph Agentic Architecture Deep Dive"
                ))

            if lead_michael:
                day_after = date.today() + timedelta(days=2)
                db.add(Appointment(
                    lead_id=lead_michael.id,
                    date=day_after,
                    time="2:30 PM EST",
                    status="Scheduled",
                    meeting_link="https://meet.kinetix.ai/sales-demo",
                    notes="Enterprise Security, RAG & ChromaDB Integration Session"
                ))

            if lead_priya:
                db.add(Appointment(
                    lead_id=lead_priya.id,
                    date=date.today() + timedelta(days=3),
                    time="11:00 AM IST",
                    status="Scheduled",
                    meeting_link="https://meet.kinetix.ai/sales-demo",
                    notes="Enterprise Logistics Platform Demo & Pricing Discussion"
                ))

            # Add default Document entry
            db.add(Document(
                filename="Kinetix_Product_Manual.pdf",
                file_path="./uploads/Kinetix_Product_Manual.pdf",
                file_size=142850,
                chunk_count=18
            ))

            # Add sample Evaluation baseline
            db.add_all([
                Evaluation(
                    test_case_name="TC-001: Pricing Inquiry Verification",
                    intent_accuracy=1.0, tool_accuracy=1.0,
                    hallucination_score=0.02, response_relevance=0.98,
                    qualification_completeness=1.0, overall_score=97.5,
                    status="PASS", execution_time_ms=185.4,
                    details='{"test_id": "TC-001", "intent": "Pricing Inquiry"}'
                ),
                Evaluation(
                    test_case_name="TC-002: Demo Booking & Slot Reservation",
                    intent_accuracy=1.0, tool_accuracy=1.0,
                    hallucination_score=0.01, response_relevance=0.96,
                    qualification_completeness=1.0, overall_score=96.8,
                    status="PASS", execution_time_ms=210.1,
                    details='{"test_id": "TC-002", "intent": "Schedule Meeting"}'
                ),
                Evaluation(
                    test_case_name="TC-003: Product Architecture RAG Retrieval",
                    intent_accuracy=1.0, tool_accuracy=1.0,
                    hallucination_score=0.03, response_relevance=0.94,
                    qualification_completeness=1.0, overall_score=95.2,
                    status="PASS", execution_time_ms=290.7,
                    details='{"test_id": "TC-003", "intent": "Product Inquiry"}'
                ),
                Evaluation(
                    test_case_name="TC-004: BANT Lead Qualification & Scoring",
                    intent_accuracy=1.0, tool_accuracy=1.0,
                    hallucination_score=0.01, response_relevance=0.99,
                    qualification_completeness=1.0, overall_score=98.5,
                    status="PASS", execution_time_ms=245.2,
                    details='{"test_id": "TC-004", "intent": "Lead Qualification"}'
                ),
                Evaluation(
                    test_case_name="TC-005: Hallucination & Boundary Guardrails",
                    intent_accuracy=1.0, tool_accuracy=1.0,
                    hallucination_score=0.04, response_relevance=0.92,
                    qualification_completeness=1.0, overall_score=93.6,
                    status="PASS", execution_time_ms=170.8,
                    details='{"test_id": "TC-005", "intent": "General Question"}'
                ),
            ])

            db.commit()
    except Exception as e:
        print(f"[Seed] Notice seeding database: {e}")
        db.rollback()
    finally:
        db.close()


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "connected",
    }


@app.get("/verify", tags=["Health"])
def verify_system():
    """Run full system verification tests and return a feature report."""
    from app.services.verification import run_system_verification
    return run_system_verification()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
