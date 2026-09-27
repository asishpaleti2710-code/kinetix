# AgentFlow AI: System Architecture Specification

## 1. System Overview

AgentFlow AI is designed as a stateful, modular, multi-agent platform for enterprise sales operations. Rather than routing all incoming traffic to a monolithic Large Language Model prompt, the platform decomposes sales workflows into specialized nodes governed by **LangGraph**.

```
[Inbound Channel: Web Chat / WhatsApp / API]
                       │
                       ▼
            ┌──────────────────────┐
            │     FastAPI App      │
            └──────────┬───────────┘
                       │
                       ▼
       ┌───────────────────────────────┐
       │     LangGraph StateGraph      │
       │                               │
       │  1. Intent Classification     │
       │  2. Planner Reasoning         │
       │  3. Dynamic Branching:        │
       │     ├─ Lead Agent             │
       │     ├─ Knowledge RAG Agent    │
       │     ├─ Appointment Agent      │
       │     └─ Follow-up Agent        │
       │  4. Tool Calling Execution    │
       │  5. Response Synthesis        │
       └───────────────┬───────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌──────────────────┐       ┌──────────────────┐
│  MySQL Database  │       │ ChromaDB Storage │
│ (Leads, Appts,   │       │ (Ingested PDFs & │
│  Convos, Evals)  │       │  Vector Embeds)  │
└──────────────────┘       └──────────────────┘
```

---

## 2. Multi-Agent Design Pattern

### 2.1 The Agentic Loop & State Management
All agents interact through a single mutable state contract defined as `AgentState`:

```python
class AgentState(TypedDict):
    session_id: str
    lead_id: Optional[int]
    customer_name: Optional[str]
    customer_email: Optional[str]
    customer_phone: Optional[str]
    user_message: str
    conversation_history: List[Dict[str, str]]
    intent: str
    intent_confidence: float
    planner_thought: str
    target_agent: str
    tools_called: List[Dict[str, Any]]
    tool_results: List[Dict[str, Any]]
    lead_qualification: Optional[Dict[str, Any]]
    rag_sources: List[Dict[str, Any]]
    appointment_details: Optional[Dict[str, Any]]
    followup_drafts: Optional[Dict[str, str]]
    final_response: str
```

### 2.2 Intent Agent (Node 1)
- **Role**: Disambiguate customer intent with high precision.
- **Classification Categories**:
  - `Product Inquiry`: Technical specifications, architecture, security, SLAs.
  - `Pricing Inquiry`: Subscription tiers, licensing models, quotes.
  - `Lead Qualification`: Inquiries where the user describes their company size, budget, or rollout timeline.
  - `Schedule Meeting`: Requests to book demos, check calendar availability, or speak with an account executive.
  - `General Question`: Greetings, chit-chat, or ambiguous prompts.
- **Guardrails**: Forces JSON mode output with confidence estimation.

### 2.3 Planner Agent (Node 2)
- **Role**: Act as the supervisor / meta-controller.
- **Logic**:
  1. Inspects customer history (pulls prior conversation logs if `session_id` or `lead_id` exists).
  2. Synthesizes step-by-step reasoning on what data is missing or what tool should run.
  3. Emits `target_agent`, dynamically evaluated by LangGraph conditional edges.

### 2.4 Lead Qualification Agent (Node 3)
- **Framework**: BANT (Budget, Authority, Need, Timeline).
- **Formula**:
  $$\text{Score} = \text{Budget Score (35 pts)} + \text{Timeline Score (30 pts)} + \text{Team Size (20 pts)} + \text{Clarity (15 pts)}$$
- **Segmentation**:
  - **Hot Lead**: $\text{Score} \ge 75$
  - **Warm Lead**: $50 \le \text{Score} < 75$
  - **Cold Lead**: $\text{Score} < 50$
- **Persistence**: Automatically executes `tool_save_lead` or `tool_update_lead`.

### 2.5 Knowledge Agent & RAG Pipeline (Node 4)
- **Document Ingestion**:
  1. Uploaded PDF $\rightarrow$ `pypdf` page extraction.
  2. Overlapping recursive character sliding window (chunk size = 500 chars, overlap = 100 chars).
  3. Metadata tagging: `{source: filename, page: page_number, start_idx, end_idx}`.
- **Vector Retrieval**:
  - Persistent **ChromaDB** collection with Cosine similarity space.
  - Top-$k$ chunks injected into LLM context window.
  - Strict grounding constraint: Must append `[Source: <filename>, Page <page>]` references.

### 2.6 Appointment Scheduling Agent (Node 5)
- **Role**: Resolves meeting requests into confirmed calendar slots.
- **Tools**: Calls `tool_book_appointment`, automatically binds to `lead_id`, creates Google Meet / Zoom link, and updates lead status to Warm/Hot.

### 2.7 Follow-up Agent (Node 6)
- **Role**: Omnichannel outreach automation.
- **Outputs**:
  - **WhatsApp Message**: Punchy, conversational, includes emoji hooks and direct meeting reservation links.
  - **Executive Email**: Formal subject line, summary of company value proposition, and bulleted call to action.

---

## 3. Evaluation Harness

To prevent regressions, the `EvaluationHarness` runs automated benchmark tests against 5 production scenarios:

| Test ID | Case Scenario | Verification Objective |
| :--- | :--- | :--- |
| **TC-001** | Pricing Inquiry | Intent = Pricing Inquiry, Tool = `search_knowledge_base`, Grounded quote returned. |
| **TC-002** | Demo Booking | Intent = Schedule Meeting, Tool = `book_appointment`, Confirmation & meeting link generated. |
| **TC-003** | Architecture Inquiry | Intent = Product Inquiry, Tool = `search_knowledge_base`, ChromaDB chunks cited. |
| **TC-004** | BANT Qualification | Intent = Lead Qualification, Tool = `save_lead`, Score $\ge$ 75 (Hot lead saved to database). |
| **TC-005** | Hallucination Test | Rejects impossible requests (e.g., physical airplane flying); keeps hallucination rate $< 5\%$. |

```python
Overall_Score = (Intent_Acc * 0.25 + Tool_Acc * 0.25 + Relevance * 0.25 + (1 - Hallucination) * 0.15 + Qual_Completeness * 0.10) * 100
```
Status is marked as **PASS** if $\text{Score} \ge 75.0$.
