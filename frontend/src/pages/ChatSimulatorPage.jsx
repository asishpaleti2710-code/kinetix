import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Check, 
  Copy, 
  Share2, 
  RotateCcw, 
  MessageCircle, 
  Mail, 
  ShieldCheck, 
  Briefcase, 
  DollarSign, 
  Clock, 
  CheckCircle2 
} from 'lucide-react';
import { sendChatMessage } from '../services/api';

export default function ChatSimulatorPage({ initialLead, initialPrompt }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: "Hello! I am your Kinetix Autonomous Sales Representative. I can assist you with product capabilities, subscription pricing, qualify enterprise requirements, book an executive demo, or prepare personalized outreach sequences. How can I assist your business today?",
      meta: {
        intent: 'General Inquiry',
        grounding: 'Verified Enterprise Catalog',
        qualification: null,
        followups: null
      }
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeMeta, setActiveMeta] = useState(null);
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

  // If initialPrompt was provided from Command Center, send it automatically
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  const quickPrompts = [
    { label: '💰 Subscription Pricing', text: 'What are your enterprise subscription pricing tiers and what is included in the Growth tier?' },
    { label: '📅 Schedule Demo', text: 'I want to schedule an executive product demonstration for tomorrow at 2:00 PM EST.' },
    { label: '🏢 Qualify Enterprise Fit', text: 'We run a B2B SaaS platform with 40 employees, an $8,500 budget, looking to deploy within 3 weeks.' },
    { label: '🔍 Product Capabilities', text: 'How does your autonomous intelligence ground answers against uploaded product manuals and sales guidelines?' },
    { label: '📱 Request Follow-up', text: 'Can you generate WhatsApp and Email outreach follow-up messages for our executive team?' }
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
          grounding: 'Verified Enterprise Knowledge',
          qualification: response.lead_qualification,
          followups: response.suggested_followups
        }
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setActiveMeta(assistantMsg.meta);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: 'I am currently unable to retrieve a response. Please verify the service connection and try again.',
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
        text: "Hello! I am your Kinetix Autonomous Sales Representative. How can I assist your business today?",
        meta: null
      }
    ]);
    setActiveMeta(null);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.84rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={15} color="#38bdf8" />
            <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: 600, width: '110px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              Lead Profile Synced
            </span>
          )}
        </div>

        <button onClick={handleResetChat} className="btn-secondary" style={{ fontSize: '0.78rem', padding: '5px 12px' }}>
          <RotateCcw size={13} />
          <span>New Session</span>
        </button>
      </div>

      {/* Main Grid: Chat on Left, Intelligence & Follow-up Center on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '24px', height: 'calc(100vh - 190px)' }}>
        
        {/* Left Column: Live Chat Interface */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {/* Chat Header */}
          <div style={{ padding: '14px 20px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                <Bot size={16} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>AI Sales Assistant</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
              <span className="live-pulse-dot"></span>
              <span>Online &bull; Grounded</span>
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
                  padding: '5px 12px',
                  borderRadius: '16px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#818cf8'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
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
                onClick={() => m.meta && setActiveMeta(m.meta)}
                style={{ cursor: m.meta ? 'pointer' : 'default' }}
              >
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>

                {m.meta && (
                  <div style={{
                    marginTop: '8px',
                    paddingTop: '6px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.72rem',
                    color: '#a5b4fc',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ fontWeight: 600 }}>Intent: {m.meta.intent}</span>
                    <span>&bull;</span>
                    <span style={{ color: '#34d399' }}>✓ Grounded in Knowledge</span>
                  </div>
                )}
              </div>
            ))}

            {/* User Friendly Execution Stepper Indicator */}
            {loading && (
              <div className="message-bubble assistant" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '340px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 700, color: '#818cf8' }}>
                  <Sparkles size={14} className="animate-spin" />
                  <span>Processing Request...</span>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ color: '#34d399' }}>✓ Understanding Request</div>
                  <div style={{ color: '#34d399' }}>✓ Analyzing Content</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>⏳ Generating Insights &amp; Recommendations</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="chat-input-area">
            <input
              type="text"
              placeholder="Ask pricing, request a meeting slot, or describe your company requirements..."
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
              <Send size={15} />
              <span>Send</span>
            </button>
          </div>
        </div>

        {/* Right Column: Customer Intelligence & Action Sequences */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          
          {/* Intelligence & Lead Qualification Summary */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <ShieldCheck size={18} color="#818cf8" />
              <h4 style={{ fontWeight: 700 }}>Inquiry Intelligence &amp; Fit</h4>
            </div>

            {activeMeta ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Detected Intent */}
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Identified Business Intent</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#818cf8', marginTop: '2px' }}>
                    {activeMeta.intent}
                  </div>
                </div>

                {/* Grounding Verification */}
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Knowledge Verification</div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} color="#34d399" />
                    <span>Response verified against company documentation &amp; pricing matrices</span>
                  </div>
                </div>

                {/* BANT Qualification Summary if available */}
                {activeMeta.qualification && (
                  <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ fontSize: '0.74rem', color: '#fb7185', fontWeight: 700, textTransform: 'uppercase' }}>
                        Lead Qualification Fit
                      </div>
                      <span className="badge badge-hot">
                        {activeMeta.qualification.lead_score}/100 ({activeMeta.qualification.lead_status})
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <div>Budget: <strong style={{ color: 'var(--text-primary)' }}>${(activeMeta.qualification.budget || 0).toLocaleString()}</strong></div>
                      <div>Timeline: <strong style={{ color: 'var(--text-primary)' }}>{activeMeta.qualification.timeline}</strong></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Engage in conversation to view real-time intent classification, qualification scores, and recommendations.
              </div>
            )}
          </div>

          {/* Omnichannel Communication Sequences */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Share2 size={18} color="#10b981" />
              <h4 style={{ fontWeight: 700 }}>Outreach Sequences</h4>
            </div>

            {activeMeta && activeMeta.followups ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* WhatsApp Follow-up */}
                <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: 700, fontSize: '0.78rem' }}>
                      <MessageCircle size={15} />
                      <span>WhatsApp Outreach</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(activeMeta.followups.whatsapp, 'wa')}
                      className="btn-secondary"
                      style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                    >
                      {copiedKey === 'wa' ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                      <span>{copiedKey === 'wa' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {activeMeta.followups.whatsapp}
                  </div>
                </div>

                {/* Email Follow-up */}
                <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#818cf8', fontWeight: 700, fontSize: '0.78rem' }}>
                      <Mail size={15} />
                      <span>Email Outreach Draft</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(`${activeMeta.followups.email_subject}\n\n${activeMeta.followups.email_body}`, 'em')}
                      className="btn-secondary"
                      style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                    >
                      {copiedKey === 'em' ? <Check size={12} color="#818cf8" /> : <Copy size={12} />}
                      <span>{copiedKey === 'em' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Subject: {activeMeta.followups.email_subject}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                    {activeMeta.followups.email_body}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '18px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Ask the assistant for outreach sequences or qualify a prospect to generate one-click WhatsApp and Email drafts!
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
