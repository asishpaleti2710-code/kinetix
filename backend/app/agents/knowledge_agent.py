import json
from app.agents.state import AgentState
from app.agents.llm_client import call_gemini_or_fallback
from app.tools.sales_tools import tool_search_knowledge_base

KNOWLEDGE_RAG_PROMPT = """You are the Knowledge Agent for AgentFlow AI, an autonomous enterprise sales representative.
Your responsibility is to answer customer questions accurately using grounded company documentation retrieved via RAG.

Rules:
1. Always ground your response in the provided document excerpts.
2. If citing information, ALWAYS include explicit source references at the end, formatted as:
   `[Source: <filename>, Page <page>]`
3. Never make up unverified claims or hallucinate pricing/features.
4. Maintain a professional, persuasive, and consultative enterprise sales tone.
"""

# Default enterprise knowledge base context when no user PDFs are uploaded yet
DEFAULT_PRODUCT_CONTEXT = """
AgentFlow AI Overview:
AgentFlow AI is an autonomous Agentic AI Sales Employee platform built on LangGraph, FastAPI, and Gemini 1.5.
Key Features:
- Autonomous Multi-Agent Orchestration: Intent Agent, Planner Agent, Lead Qualification Agent, Knowledge RAG Agent, Appointment Agent, Follow-up Agent.
- Enterprise RAG: Ingests technical sales PDFs, chunks text semantically, vectorizes with ChromaDB, and delivers source-grounded answers.
- Automated BANT Lead Scoring: Scores prospects from 0-100 and classifies into Hot (>=75), Warm (50-74), and Cold (<50).
- Calendar Scheduling: Books live product walkthroughs and records appointments in MySQL.
- Omnichannel Follow-up Generation: One-click creation of high-converting WhatsApp & Email sequences.

Pricing Tiers:
- Starter Tier: $499/month. Includes 1 AI Sales Agent, 5,000 conversations/month, standard RAG knowledge base.
- Growth Tier: $1,499/month. Includes 5 AI Sales Agents, 25,000 conversations/month, advanced BANT scoring, CRM integrations.
- Enterprise Tier: Custom pricing (starting at $3,500/month). Unlimited conversations, dedicated LangGraph custom workflows, private ChromaDB cluster, 99.95% uptime SLA, SOC2 Type II compliance.
"""

def knowledge_agent_node(state: AgentState) -> dict:
    user_message = state.get("user_message", "")
    tools_called = list(state.get("tools_called", []))
    tool_results = list(state.get("tool_results", []))

    # Execute Tool 4: Search Knowledge Base via ChromaDB
    rag_result = tool_search_knowledge_base(query=user_message, top_k=3)
    tools_called.append({"tool": "search_knowledge_base", "arguments": {"query": user_message, "top_k": 3}})
    tool_results.append(rag_result)

    chunks = rag_result.get("chunks", [])
    sources_cited = []

    if chunks:
        context_blocks = []
        for c in chunks:
            src = c.get("metadata", {}).get("source", "Document")
            page = c.get("metadata", {}).get("page", 1)
            sources_cited.append({"source": src, "page": page, "similarity": c.get("similarity_score")})
            context_blocks.append(f"--- Document: {src} (Page {page}) ---\n{c.get('content')}")
        context_str = "\n\n".join(context_blocks)
    else:
        # Fallback to default product knowledge base
        context_str = f"--- Document: AgentFlow_Product_Manual.pdf (Page 1) ---\n{DEFAULT_PRODUCT_CONTEXT}"
        sources_cited.append({"source": "AgentFlow_Product_Manual.pdf", "page": 1, "similarity": 0.95})

    prompt = (
        f"Customer Question: \"{user_message}\"\n\n"
        f"Retrieved Document Context:\n{context_str}\n\n"
        f"Answer the customer question thoroughly and include source references."
    )

    answer = call_gemini_or_fallback(
        prompt=prompt,
        system_instruction=KNOWLEDGE_RAG_PROMPT,
        json_mode=False
    )

    # Ensure source reference is appended if not already present
    if sources_cited and "Source:" not in answer:
        top_src = sources_cited[0]
        answer += f"\n\n*Reference: [{top_src['source']}, Page {top_src['page']}]*"

    return {
        "rag_sources": sources_cited,
        "tools_called": tools_called,
        "tool_results": tool_results,
        "final_response": answer
    }
