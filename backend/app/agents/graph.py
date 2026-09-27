from typing import Dict, Any, Callable
from app.agents.state import AgentState
from app.agents.intent_agent import intent_agent_node
from app.agents.planner_agent import planner_agent_node
from app.agents.lead_agent import lead_agent_node
from app.agents.knowledge_agent import knowledge_agent_node
from app.agents.appointment_agent import appointment_agent_node
from app.agents.followup_agent import followup_agent_node

def route_from_planner(state: AgentState) -> str:
    """
    Conditional edge evaluator: reads the target_agent chosen by the Planner Agent
    and routes the state to the designated specialized agent node.
    """
    target = state.get("target_agent", "knowledge_agent")
    if target in ["lead_agent", "knowledge_agent", "appointment_agent", "followup_agent"]:
        return target
    return "knowledge_agent"

class MultiAgentSalesGraph:
    """
    LangGraph Multi-Agent Workflow Orchestrator:
    Customer Message
        ↓
    Intent Agent
        ↓
    Planner Agent
        ↓ (Conditional Edge)
    [Lead Agent | Knowledge Agent | Appointment Agent | Follow-up Agent]
        ↓
    Tool Execution & State Finalization
    """

    def __init__(self):
        self._compiled_graph = None
        self._init_graph()

    def _init_graph(self):
        try:
            from langgraph.graph import StateGraph, END
            
            # Construct LangGraph StateGraph
            workflow = StateGraph(AgentState)

            # Register Nodes
            workflow.add_node("intent_agent", intent_agent_node)
            workflow.add_node("planner_agent", planner_agent_node)
            workflow.add_node("lead_agent", lead_agent_node)
            workflow.add_node("knowledge_agent", knowledge_agent_node)
            workflow.add_node("appointment_agent", appointment_agent_node)
            workflow.add_node("followup_agent", followup_agent_node)

            # Connect Directed Edges
            workflow.set_entry_point("intent_agent")
            workflow.add_edge("intent_agent", "planner_agent")

            # Conditional routing edge from Planner to Specialized Agent
            workflow.add_conditional_edges(
                "planner_agent",
                route_from_planner,
                {
                    "lead_agent": "lead_agent",
                    "knowledge_agent": "knowledge_agent",
                    "appointment_agent": "appointment_agent",
                    "followup_agent": "followup_agent"
                }
            )

            # Each specialized agent terminates to END
            workflow.add_edge("lead_agent", END)
            workflow.add_edge("knowledge_agent", END)
            workflow.add_edge("appointment_agent", END)
            workflow.add_edge("followup_agent", END)

            self._compiled_graph = workflow.compile()
            print("[MultiAgentGraph] Successfully compiled LangGraph StateGraph.")
        except Exception as e:
            print(f"[MultiAgentGraph] Notice: initializing hybrid runtime engine: {e}")
            self._compiled_graph = None

    def execute(self, initial_state: AgentState) -> AgentState:
        """
        Executes the multi-agent graph through LangGraph compiler or direct state machine.
        """
        # Ensure collections exist in initial_state
        state = dict(initial_state)
        state.setdefault("conversation_history", [])
        state.setdefault("tools_called", [])
        state.setdefault("tool_results", [])
        state.setdefault("rag_sources", [])
        state.setdefault("lead_qualification", None)
        state.setdefault("appointment_details", None)
        state.setdefault("followup_drafts", None)

        if self._compiled_graph:
            try:
                result = self._compiled_graph.invoke(state)
                return result
            except Exception as e:
                print(f"[MultiAgentGraph] LangGraph invoke error, running direct state machine: {e}")

        # Deterministic Sequential Execution Mirror
        # Step 1: Intent Agent
        intent_out = intent_agent_node(state)
        state.update(intent_out)

        # Step 2: Planner Agent
        planner_out = planner_agent_node(state)
        state.update(planner_out)

        # Step 3: Conditional Branching
        next_node = route_from_planner(state)
        if next_node == "lead_agent":
            agent_out = lead_agent_node(state)
        elif next_node == "appointment_agent":
            agent_out = appointment_agent_node(state)
        elif next_node == "followup_agent":
            agent_out = followup_agent_node(state)
        else:
            agent_out = knowledge_agent_node(state)

        state.update(agent_out)
        return state

# Singleton graph instance
sales_agent_workflow = MultiAgentSalesGraph()
