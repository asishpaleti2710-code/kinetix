"""
Improved Knowledge Agent with:
- Hybrid search: ChromaDB semantic search + keyword-filtered re-ranking
- Query expansion for better recall
- Structured citation formatting
- Improved grounding constraints
"""

import json
from app.agents.state import AgentState
from app.agents.llm_client import call_gemini_or_fallback
from app.tools.sales_tools import tool_search_knowledge_base

KNOWLEDGE_RAG_PROMPT = """You are the Knowledge Agent for Kinetix — an autonomous enterprise sales representative with expertise in our product suite.

YOUR RESPONSIBILITY: Answer customer questions using ONLY the retrieved document excerpts below.

CRITICAL RULES:
1. Ground EVERY factual claim in the provided document excerpts.
2. Cite sources explicitly: [Source: <filename>, Page <n>]
3. NEVER fabricate pricing numbers, feature capabilities, or SLAs not found in the context.
4. If the retrieved context doesn't answer the question, say so clearly and offer to connect them with a sales engineer.
5. Maintain a professional, consultative, value-selling tone.
6. Structure long answers with bullet points and bold headers for readability.
7. End responses with a soft call-to-action (e.g., schedule a demo, ask another question).

RETRIEVED CONTEXT:
{context}

CUSTOMER QUESTION: {question}

Answer thoroughly using only the context above:"""


DEFAULT_PRODUCT_CONTEXT = """
=== Kinetix AI Sales Platform — Product Overview ===

Architecture & Technology:
- Built on LangGraph (stateful multi-agent orchestration), FastAPI (backend), and Gemini 1.5 Flash (LLM)
- ChromaDB persistent vector store with cosine similarity search (384+ dimensions)
- 6 specialized agents: Intent, Planner, Lead Qualification, Knowledge RAG, Appointment, Follow-up
- Supports PDF, DOCX, TXT, CSV, XLSX document ingestion with semantic chunking

Core Features:
- Autonomous BANT Lead Scoring (0–100), segments leads into Hot (≥75), Warm (50–74), Cold (<50)
- Real-time appointment scheduling with calendar persistence
- Omnichannel Follow-up Generation: WhatsApp & executive Email sequences
- Document Intelligence: AI analysis of uploaded documents (summaries, SWOT, insights)
- Evaluation Harness: 5 automated benchmark test cases for reliability measurement

Pricing Tiers:
- Starter Tier: $499/month. 1 AI Sales Agent, 5,000 conversations/month, standard RAG knowledge base
- Growth Tier: $1,499/month. 5 AI Sales Agents, 25,000 conversations/month, BANT scoring, CRM integrations
- Enterprise Tier: Custom pricing (from $3,500/month). Unlimited agents, custom LangGraph workflows, private ChromaDB cluster, 99.95% SLA, SOC2 Type II compliance

Security & Compliance:
- SOC2 Type II compliant on Enterprise tier
- Data encryption at rest and in transit
- On-premise deployment available for air-gapped environments
"""


def _rerank_chunks(chunks: list, query: str) -> list:
    """
    Simple keyword-based re-ranking to boost chunks with direct query term matches.
    Supplements semantic similarity with keyword relevance signal.
    """
    query_terms = set(query.lower().split())
    scored = []
    for chunk in chunks:
        content = chunk.get("content", "").lower()
        keyword_hits = sum(1 for term in query_terms if term in content and len(term) > 3)
        # Blend semantic score with keyword signal
        semantic_score = chunk.get("similarity_score", 0.5)
        blended_score = (semantic_score * 0.7) + (min(keyword_hits, 5) / 5.0 * 0.3)
        scored.append((blended_score, chunk))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [chunk for _, chunk in scored]


def _expand_query(query: str) -> list[str]:
    """
    Simple query expansion: adds relevant synonyms/variants to improve recall.
    """
    expansions = [query]
    lower = query.lower()

    if "price" in lower or "cost" in lower or "tier" in lower:
        expansions.append(f"pricing subscription {query}")
    if "rag" in lower or "vector" in lower or "chromadb" in lower:
        expansions.append(f"knowledge base retrieval document {query}")
    if "security" in lower or "compliance" in lower or "soc" in lower:
        expansions.append(f"enterprise security compliance SLA {query}")
    if "agent" in lower or "langgraph" in lower or "architecture" in lower:
        expansions.append(f"multi-agent workflow LangGraph architecture {query}")

    return expansions[:2]  # Use at most 2 expanded queries


def knowledge_agent_node(state: AgentState) -> dict:
    user_message = state.get("user_message", "")
    tools_called = list(state.get("tools_called", []))
    tool_results = list(state.get("tool_results", []))

    # Step 1: Query expansion
    expanded_queries = _expand_query(user_message)

    # Step 2: Execute RAG retrieval with expanded queries
    all_chunks = []
    seen_contents = set()

    for query in expanded_queries:
        rag_result = tool_search_knowledge_base(query=query, top_k=4)
        for chunk in rag_result.get("chunks", []):
            content_key = chunk.get("content", "")[:80]
            if content_key not in seen_contents:
                seen_contents.add(content_key)
                all_chunks.append(chunk)

    tools_called.append({
        "tool": "search_knowledge_base",
        "arguments": {"query": user_message, "top_k": 4, "expanded": len(expanded_queries) > 1},
    })
    tool_results.append({
        "query": user_message,
        "results_count": len(all_chunks),
        "chunks": all_chunks[:4],
    })

    # Step 3: Re-rank chunks
    chunks = _rerank_chunks(all_chunks, user_message)[:4]
    sources_cited = []

    if chunks:
        context_blocks = []
        for c in chunks:
            src = c.get("metadata", {}).get("source", "Document")
            page = c.get("metadata", {}).get("page", 1)
            sim = c.get("similarity_score", 0.0)
            sources_cited.append({"source": src, "page": page, "similarity": sim})
            context_blocks.append(
                f"--- [{src}, Page {page}] (relevance: {sim:.2%}) ---\n{c.get('content', '')}"
            )
        context_str = "\n\n".join(context_blocks)
    else:
        # Fallback to built-in product knowledge
        context_str = f"--- [Kinetix_Product_Manual.pdf, Page 1] ---\n{DEFAULT_PRODUCT_CONTEXT}"
        sources_cited.append({"source": "Kinetix_Product_Manual.pdf", "page": 1, "similarity": 0.90})

    # Step 4: Generate grounded answer
    prompt = KNOWLEDGE_RAG_PROMPT.format(
        context=context_str,
        question=user_message,
    )

    answer = call_gemini_or_fallback(
        prompt=prompt,
        system_instruction=None,  # System prompt already embedded in the prompt template
        json_mode=False,
    )

    # Ensure at least one source citation
    if sources_cited and "[Source:" not in answer and "*Reference:" not in answer:
        top_src = sources_cited[0]
        answer += f"\n\n*Reference: [{top_src['source']}, Page {top_src['page']}]*"

    return {
        "rag_sources": sources_cited,
        "tools_called": tools_called,
        "tool_results": tool_results,
        "final_response": answer,
    }
