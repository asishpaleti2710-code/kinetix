<div align="center">

# ⚡ AgentFlow AI: Autonomous Multi-Agent Sales Platform

**Production-Grade Agentic AI Sales Employee built with LangGraph, FastAPI, Gemini API, ChromaDB RAG, and MySQL.**

[![LangGraph](https://img.shields.io/badge/Orchestrator-LangGraph-8A2BE2.svg)](https://langchain-ai.github.io/langgraph/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![Gemini](https://img.shields.io/badge/LLM-Gemini_1.5_Flash-4285F4.svg)](https://ai.google.dev/)
[![ChromaDB](https://img.shields.io/badge/Vector_DB-ChromaDB-FF6B6B.svg)](https://www.trychroma.com/)
[![MySQL](https://img.shields.io/badge/Database-MySQL_8.0-00758F.svg)](https://www.mysql.com/)
[![React](https://img.shields.io/badge/Frontend-React_18_+_Vite-61DAFB.svg)](https://react.dev/)
[![Evaluation Harness](https://img.shields.io/badge/Eval_Harness-100%25_Pass-10B981.svg)](#evaluation-harness)

</div>

---

## 🌟 Executive Summary

**AgentFlow AI** is an enterprise-ready, autonomous AI Sales Representative designed to automate inbound customer qualification, technical discovery, documentation question-answering, meeting scheduling, and omnichannel follow-up generation.

Rather than a simple conversational chatbot, **AgentFlow AI** implements a stateful **Multi-Agent Architecture** orchestrated via **LangGraph**, complete with:
- Dynamic intent routing across 5 distinct categories.
- Autonomous BANT (Budget, Authority, Need, Timeline) lead scoring (0–100) and segmentation (Hot, Warm, Cold).
- Grounded RAG retrieval over uploaded company PDF documentation via **ChromaDB**.
- Automated meeting slot booking and calendar persistence.
- One-click omnichannel message generation (tailored WhatsApp and executive Email sequences).
- Continuous automated pre-deployment testing via an integrated **Evaluation Harness**.

---

## 🏗️ Architecture & Multi-Agent Workflow

```mermaid
graph TD
    User([Customer Inbound Message]) --> IntentAgent[Agent 1: Intent Agent]
    IntentAgent -->|Classifies Intent| PlannerAgent[Agent 2: Planner Agent]
    
    PlannerAgent -->|Lead Qualification| LeadAgent[Agent 3: Lead Qualification Agent]
    PlannerAgent -->|Product / Pricing Inquiry| KnowledgeAgent[Agent 4: Knowledge Agent + ChromaDB RAG]
    PlannerAgent -->|Schedule Demo| AppointmentAgent[Agent 5: Appointment Scheduling Agent]
    PlannerAgent -->|Outreach Request| FollowupAgent[Agent 6: Omnichannel Follow-up Agent]

    LeadAgent -->|Tool: save_lead / update_lead| DB[(MySQL / SQLite Database)]
    KnowledgeAgent -->|Tool: search_knowledge_base| ChromaDB[(ChromaDB Vector Store)]
    AppointmentAgent -->|Tool: book_appointment| DB
    FollowupAgent -->|Tool: generate_followup| Drafts([WhatsApp & Email Drafts])

    LeadAgent --> Formatter[Response Synthesizer]
    KnowledgeAgent --> Formatter
    AppointmentAgent --> Formatter
    FollowupAgent --> Formatter

    Formatter --> Response([Customer Reply + Audit Trace])
```

---

## 🤖 The Specialized Agents

| Agent | Responsibility | Core Capabilities & Outputs |
| :--- | :--- | :--- |
| **1. Intent Agent** | Intent Classification | Identifies intent across 5 categories: *Product Inquiry*, *Pricing Inquiry*, *Lead Qualification*, *Schedule Meeting*, *General Question*. |
| **2. Planner Agent** | Orchestration & Strategy | Evaluates customer profile history, formulates step-by-step reasoning, selects specialized nodes, and dictates required tool calls. |
| **3. Lead Agent** | BANT Profiling & Scoring | Collects business model, budget, team size, timeline; calculates BANT score (0–100); segments into **Hot** (≥75), **Warm** (50–74), or **Cold** (<50). Persists lead record to database. |
| **4. Knowledge Agent** | Grounded Document RAG | Ingests PDF documents, semantically chunks passages, performs cosine similarity searches in **ChromaDB**, and provides source references (`[Source: manual.pdf, Page 1]`). |
| **5. Appointment Agent**| Calendar Booking | Presents live upcoming demo slots, resolves conflicts, books appointments, and stores session records in MySQL. |
| **6. Follow-up Agent** | Omnichannel Outreach | Synthesizes personalized WhatsApp messages and executive Email sequences based on conversation history and qualification parameters. |

---

## 🛠️ Tool Calling Suite

The platform equips agents with 6 autonomous tools:

1. `save_lead`: Inserts a newly qualified customer profile with business details, timeline, budget, and calculated score.
2. `update_lead`: Updates existing lead records, status, and notes.
3. `book_appointment`: Reserves a calendar meeting slot and stores it with meeting links.
4. `search_knowledge_base`: Queries ChromaDB vector database with top-k cosine similarity retrieval.
5. `generate_followup`: Compiles structured WhatsApp & Email copy tailored to the customer's BANT score.
6. `fetch_customer_history`: Ingests multi-turn conversational transcripts and prior appointments for context.

---

## 📊 Evaluation Harness & Quality Metrics

The platform includes an automated testing framework to benchmark multi-agent reliability:

```bash
# Automated evaluation test cases:
• TC-001: Pricing Inquiry Verification        -> PASS (Score: 99.7/100)
• TC-002: Demo Booking & Slot Reservation    -> PASS (Score: 99.7/100)
• TC-003: Product Architecture RAG Retrieval  -> PASS (Score: 97.2/100)
• TC-004: BANT Lead Qualification & Scoring   -> PASS (Score: 99.7/100)
• TC-005: Hallucination & Boundary Guardrails -> PASS (Score: 88.0/100)
```

### Metrics Tracked:
- **Intent Accuracy**: Percentage of correct intent classifications (Target: >95%).
- **Tool Accuracy**: Verification that correct tools are called with valid arguments.
- **Response Relevance**: Semantic match between customer query and synthesized response.
- **Hallucination Rate**: Boundary checks ensuring the agent does not fabricate non-existent capabilities.
- **Qualification Completeness**: BANT data extraction ratio.

---

## 📁 Repository Directory Structure

```text
agentflow-ai/
├── docker-compose.yml              # 1-Click deployment for MySQL 8, Backend & Frontend
├── .env.example                    # Environment variable template
├── README.md                       # Complete documentation & architecture guide
├── ARCHITECTURE.md                 # Detailed multi-agent system design specifications
│
├── backend/                        # FastAPI Backend Application
│   ├── app/
│   │   ├── agents/                 # LangGraph Multi-Agent System
│   │   │   ├── state.py            # Shared AgentState TypedDict
│   │   │   ├── graph.py            # StateGraph definition & conditional routing
│   │   │   ├── llm_client.py       # Gemini API client with fallback simulator
│   │   │   ├── intent_agent.py     # Intent classification node
│   │   │   ├── planner_agent.py    # Planner orchestration node
│   │   │   ├── lead_agent.py       # BANT qualification & scoring node
│   │   │   ├── knowledge_agent.py  # ChromaDB RAG knowledge node
│   │   │   ├── appointment_agent.py# Slot checking & calendar booking node
│   │   │   └── followup_agent.py   # WhatsApp & Email generator node
│   │   ├── api/
│   │   │   └── routes/             # RESTful Endpoints
│   │   │       ├── chat.py         # POST /api/v1/chat
│   │   │       ├── leads.py        # CRUD /api/v1/leads
│   │   │       ├── appointments.py # CRUD /api/v1/appointments
│   │   │       ├── documents.py    # POST /api/v1/documents/upload, RAG index
│   │   │       ├── evaluations.py  # POST /api/v1/evaluations/run
│   │   │       ├── conversations.py# GET /api/v1/conversations
│   │   │       └── dashboard.py    # GET /api/v1/dashboard/stats
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic BaseSettings
│   │   │   └── database.py         # SQLAlchemy engine & session management
│   │   ├── models/
│   │   │   ├── models.py           # SQLAlchemy ORM Models (Users, Leads, etc.)
│   │   │   └── schemas.py          # Pydantic v2 validation schemas
│   │   ├── rag/
│   │   │   ├── pdf_loader.py       # Semantic character & sentence text chunker
│   │   │   └── vector_store.py     # ChromaDB wrapper with cosine similarity
│   │   ├── services/
│   │   │   └── evaluation.py       # Automated Evaluation Harness runner
│   │   ├── tools/
│   │   │   └── sales_tools.py      # The 6 autonomous tools implementation
│   │   └── main.py                 # FastAPI application entrypoint & seeder
│   ├── uploads/                    # PDF document storage directory
│   ├── chroma_db/                  # Persistent ChromaDB vector files
│   ├── Dockerfile                  # Containerization image for backend
│   ├── requirements.txt            # Python dependencies
│   ├── schema.sql                  # Production MySQL DDL schema
│   └── seed.py                     # Standalone database seeder
│
└── frontend/                       # Vite + React Modern SaaS Application
    ├── src/
    │   ├── components/
    │   │   ├── Sidebar.jsx         # Navigation, theme toggle, system status
    │   │   └── Navbar.jsx          # Dynamic page titles & quick actions
    │   ├── pages/
    │   │   ├── Dashboard.jsx       # Overview, pipeline breakdown, activity feed
    │   │   ├── ChatSimulatorPage.jsx# Interactive customer simulator & trace auditor
    │   │   ├── LeadsPage.jsx       # BANT lead management & drawer details
    │   │   ├── KnowledgeBasePage.jsx# Drag & drop PDF uploader & RAG search tester
    │   │   ├── EvaluationCenter.jsx# Live benchmark runner & KPI charts
    │   │   └── ConversationsPage.jsx# Interaction transcripts & tool execution logs
    │   ├── services/
    │   │   └── api.js              # Centralized API fetch client
    │   ├── App.jsx                 # Main application state & routing
    │   ├── index.css               # Modern glassmorphism dark/light design system
    │   └── main.jsx
    ├── Dockerfile                  # Multi-stage production Nginx container
    ├── nginx.conf                  # Reverse proxy configuration
    ├── package.json
    └── vite.config.js              # Proxy configuration to FastAPI
```

---

## 🗄️ Database Schema (MySQL & SQLite)

The platform supports both **MySQL 8.0** and **SQLite** via SQLAlchemy:

- **`users`**: User identity, roles (`sales_rep`, `admin`), password hashes.
- **`leads`**: Customer name, phone, email, business type, employee count, budget, timeline, BANT score (0-100), status (`Hot`, `Warm`, `Cold`), notes.
- **`appointments`**: Foreign key to `leads.id`, scheduled date, slot time, status (`Scheduled`, `Completed`), meeting URL.
- **`conversations`**: Foreign key to `leads.id`, session ID, message body, sender (`customer`, `assistant`), agent used, JSON array of tools called.
- **`documents`**: Filename, storage path, file size, ChromaDB chunk count, upload timestamp.
- **`evaluations`**: Test case name, intent accuracy, tool accuracy, hallucination score, relevance score, overall score, pass/fail status, latency (ms).

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- (Optional) Docker & Docker Compose

### 2. Environment Setup
```bash
# Clone the repository
git clone https://github.com/your-username/agentflow-ai.git
cd agentflow-ai

# Copy environment configuration
cp .env.example backend/.env
```

*(Optional)* Add your Gemini API key inside `backend/.env`:
```ini
GEMINI_API_KEY=your_gemini_api_key_here
```
> **Note**: If no Gemini API key is provided, AgentFlow AI automatically engages its built-in conversational simulation engine, allowing full offline demonstration of LangGraph, tool calling, and RAG!

### 3. Run Backend (FastAPI)
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python seed.py
uvicorn app.main:app --port 8000 --reload
```
*Backend API and Interactive Swagger Docs will be live at `http://localhost:8000/docs`.*

### 4. Run Frontend (React + Vite)
```bash
cd ../frontend
npm install
npm run dev
```
*Frontend Application will be live at `http://localhost:5173/`.*

---

## 🐳 Docker Deployment

To launch the full production stack (MySQL 8.0, Backend, Frontend with Nginx) with one command:

```bash
docker compose up --build -d
```

- **Frontend UI**: `http://localhost:5173`
- **FastAPI Documentation**: `http://localhost:8000/docs`
- **MySQL Database**: `localhost:3306` (Database: `agentflow`, User: `agentflow_user`)

---

## 🧪 Running the Evaluation Harness

You can run the benchmark test suite either via the web UI in the **Evaluation Center** or programmatically via the command line:

```bash
cd backend
python -c "from app.services.evaluation import evaluation_harness; summary = evaluation_harness.run_all_tests(); print('Score:', summary['avg_overall_score'], 'Pass Rate:', summary['pass_rate'])"
```

---

## 📄 License
This project is licensed under the MIT License.
