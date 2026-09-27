import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Workflow, 
  Wrench, 
  Check, 
  Copy, 
  Share2, 
  Calendar, 
  ShieldCheck, 
  RotateCcw,
  MessageCircle,
  Mail
} from 'lucide-react';
import { sendChatMessage } from '../services/api';

export default function ChatSimulatorPage({ initialLead }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: "Hello! I am your AgentFlow AI Sales Representative. I can help qualify your requirements, answer questions from our technical product documentation, schedule a live demo, or prepare personalized follow-up sequences. How can I assist your business today?",
      meta: {
        intent: 'General Question',
        routed_agent: 'knowledge_agent',
        planner_thought: 'Welcome greeting to new prospect.',
        tools: []
      }
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTrace, setActiveTrace] = useState(null);
  const [copiedKey, setCopiedKey] = useState('');

  // Customer session info
  const [sessionId] = useState(`session_${Math.random().toString(36).substring(2, 9)}`);
  const [customerName, setCustomerName] = useState(initialLead ? initialLead.customer_name : 'Alex Rivera');
  const [customerEmail, setCustomerEmail] = useState(initialLead ? initialLead.email : 'alex.rivera@innovate.tech');
  const [leadId, setLeadId] = useState(initialLead ? initialLead.id : null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickPrompts = [
    { label: '💰 Inquire Pricing', text: 'What are your subscription pricing tiers and what is included in the Growth tier?' },
    { label: '📅 Book Demo Slot', text: 'I want to schedule an executive product demo tomorrow at 2:00 PM EST.' },
    { label: '🏢 Qualify My Company', text: 'We run a B2B SaaS platform with 40 employees, an $8,500 budget, looking to deploy within 3 weeks.' },
    { label: '🔍 Ask Tech RAG Question', text: 'How does your multi-agent architecture and ChromaDB vector retrieval work?' },
    { label: '📱 Request Follow-up', text: 'Can you generate WhatsApp and Email follow-up messages for our team?' }
  ];

  const handleSend = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim() || loading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'customer',
      text: text
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await sendChatMessage({
        message: text,
        session_id: sessionId,
        lead_id: leadId,
        customer_name: customerName,
        customer_email: customerEmail
      });

      if (response.lead_id && !leadId) {
        setLeadId(response.lead_id);
      }

      const assistantMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: response.response,
        meta: {
          intent: response.detected_intent,
          routed_agent: response.routed_agent,
          planner_thought: response.planner_thought,
          tools: response.tools_executed || [],
          qualification: response.lead_qualification,
          followups: response.suggested_followups
        }
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setActiveTrace(assistantMsg.meta);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: 'Apologies, I encountered an issue connecting to the multi-agent graph. Please verify the FastAPI backend is running.',
          meta: null
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2500);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 1,
        sender: 'assistant',
        text: "Hello! I am your AgentFlow AI Sales Representative. How can I assist your business today?",
        meta: null
      }
    ]);
    setActiveTrace(null);
  };

  return (
    <div className="view-canvas" style={{ padding: '20px 28px' }}>
      {/* Simulation Persona Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.84rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={15} color="#38bdf8" />
            <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: 600, width: '110px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mail size={15} color="#818cf8" />
            <span style={{ color: 'var(--text-muted)' }}>Email:</span>
            <input
              type="text"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: 600, width: '190px' }}
            />
          </div>

          {leadId && (
            <span className="badge badge-hot">
              Lead #{leadId} Synced
            </span>
          )}
        </div>

        <button onClick={handleResetChat} className="btn-secondary" style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
          <RotateCcw size={13} />
          <span>Reset Session</span>
        </button>
      </div>

      {/* Main Grid: Chat on Left, Agentic Execution Trace on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '24px', height: 'calc(100vh - 190px)' }}>
        
        {/* Left Column: Live Chat Interface */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {/* Chat Header */}
          <div style={{ padding: '14px 20px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={18} color="#818cf8" />
              <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>AI Sales Representative</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#34d399' }}>
              <span className="pulse-indicator"></span>
              <span>LangGraph Multi-Agent Ready</span>
            </div>
          </div>

          {/* Quick Starter Prompts */}
          <div style={{ padding: '10px 16px', background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {quickPrompts.map((qp, i) => (
              <button
                key={i}
                onClick={() => handleSend(qp.text)}
                disabled={loading}
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '0.74rem',
                  padding: '5px 10px',
                  borderRadius: '14px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#818cf8'; e.currentTarget.style.borderColor = '#818cf8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Chat Stream */}
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`message-bubble ${m.sender}`}
                onClick={() => m.meta && setActiveTrace(m.meta)}
                style={{ cursor: m.meta ? 'pointer' : 'default' }}
              >
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>

                {m.meta && (
                  <div style={{
                    marginTop: '8px',
                    paddingTop: '6px',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.72rem',
                    color: '#a5b4fc',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ fontWeight: 600 }}>Intent: {m.meta.intent}</span>
                    <span>•</span>
                    <span>Node: {m.meta.routed_agent}</span>
                    {m.meta.tools && m.meta.tools.length > 0 && (
                      <span className="badge badge-pass" style={{ fontSize: '0.65rem' }}>
                        {m.meta.tools.length} tool(s)
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="message-bubble assistant" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="pulse-indicator"></div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  LangGraph: Intent Agent → Planner Agent → Executing Tools...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="chat-input-area">
            <input
              type="text"
              placeholder="Ask pricing, request a demo, or describe your company requirements..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="chat-input"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !inputValue.trim()}
              className="btn-primary"
            >
              <Send size={16} />
              <span>Send</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Multi-Agent Execution & Tool Inspector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          
          {/* Agentic Routing Panel */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Workflow size={18} color="#818cf8" />
              <h4 style={{ fontWeight: 700 }}>Autonomous Execution Trace</h4>
            </div>

            {activeTrace ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Intent Node */}
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>1. INTENT CLASSIFICATION NODE</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#818cf8', marginTop: '2px' }}>
                    {activeTrace.intent}
                  </div>
                </div>

                {/* Planner Node */}
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>2. PLANNER AGENT REASONING</div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                    {activeTrace.planner_thought || 'Evaluated conversation context and assigned specialized node.'}
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#c084fc' }}>
                    → Routed to: {activeTrace.routed_agent}
                  </div>
                </div>

                {/* Tool Invocations */}
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>
                    3. TOOL CALLS EXECUTED
                  </div>
                  {activeTrace.tools && activeTrace.tools.length > 0 ? (
                    activeTrace.tools.map((t, idx) => (
                      <div key={idx} style={{ marginBottom: '8px', padding: '8px', background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: 700, fontSize: '0.8rem' }}>
                          <Wrench size={13} />
                          <span>{t.tool}()</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Args: {JSON.stringify(t.arguments)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No tool calls required for this query.</div>
                  )}
                </div>

                {/* BANT Qualification Summary if available */}
                {activeTrace.qualification && (
                  <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#fb7185', fontWeight: 700, marginBottom: '4px' }}>
                      BANT LEAD SCORE: {activeTrace.qualification.lead_score}/100 ({activeTrace.qualification.lead_status})
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Budget: ${(activeTrace.qualification.budget || 0).toLocaleString()} • Timeline: {activeTrace.qualification.timeline}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Send a message to view the real-time LangGraph multi-agent execution pipeline.
              </div>
            )}
          </div>

          {/* Omnichannel Follow-up Generator Panel */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Share2 size={18} color="#10b981" />
              <h4 style={{ fontWeight: 700 }}>Follow-up Agent Drafts</h4>
            </div>

            {activeTrace && activeTrace.followups ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* WhatsApp Follow-up */}
                <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: 700, fontSize: '0.78rem' }}>
                      <MessageCircle size={15} />
                      <span>WhatsApp Outreach</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(activeTrace.followups.whatsapp, 'wa')}
                      className="btn-secondary"
                      style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                    >
                      {copiedKey === 'wa' ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                      <span>{copiedKey === 'wa' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {activeTrace.followups.whatsapp}
                  </div>
                </div>

                {/* Email Follow-up */}
                <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#818cf8', fontWeight: 700, fontSize: '0.78rem' }}>
                      <Mail size={15} />
                      <span>Email Sequence Draft</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(`${activeTrace.followups.email_subject}\n\n${activeTrace.followups.email_body}`, 'em')}
                      className="btn-secondary"
                      style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                    >
                      {copiedKey === 'em' ? <Check size={12} color="#818cf8" /> : <Copy size={12} />}
                      <span>{copiedKey === 'em' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Subject: {activeTrace.followups.email_subject}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                    {activeTrace.followups.email_body}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '18px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Ask the agent for a follow-up or qualify a lead to generate one-click WhatsApp and Email sequences!
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
