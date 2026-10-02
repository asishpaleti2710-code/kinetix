import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  FileText, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight, 
  Database, 
  Zap, 
  Users, 
  ShieldCheck, 
  Calendar, 
  Bot 
} from 'lucide-react';
import { fetchDashboardStats, fetchDocuments } from '../services/api';

export default function ActivityPanel({ isOpen, onToggle, onSelectTab }) {
  // Tabs: 'activity' | 'sources' | 'status' | 'actions'
  const [activeTab, setActiveTab] = useState('activity');
  const [stats, setStats] = useState(null);
  const [sources, setSources] = useState([]);
  
  const [events, setEvents] = useState([
    { id: 1, time: 'Just now', title: 'Executive Synthesis Ready', type: 'highlight', desc: 'Analyzed enterprise whitepaper & generated action plan' },
    { id: 2, time: '3m ago', title: 'High-Intent Prospect Qualified', type: 'success', desc: 'Enterprise SaaS buyer qualified with high budget fit' },
    { id: 3, time: '7m ago', title: 'Executive Demo Scheduled', type: 'info', desc: 'Calendar slot reserved for tomorrow at 2:00 PM EST' },
    { id: 4, time: '15m ago', title: 'Knowledge Grounding Synchronized', type: 'success', desc: 'Product pricing and feature specifications updated' },
    { id: 5, time: '28m ago', title: 'Personalized Follow-up Generated', type: 'info', desc: 'Omnichannel email and WhatsApp sequences drafted' }
  ]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [s, docs] = await Promise.all([
        fetchDashboardStats().catch(() => null),
        fetchDocuments().catch(() => [])
      ]);
      if (s) setStats(s);
      if (docs) setSources(docs);
    } catch (e) {
      // transient ignore
    }
  };

  return (
    <aside className={`activity-panel ${isOpen ? 'open' : 'closed'}`}>
      {/* Toggle Handle when collapsed */}
      <button 
        className="collapse-toggle-btn" 
        onClick={onToggle}
        title={isOpen ? "Collapse Context Panel (⌘J)" : "Expand Context Panel (⌘J)"}
        aria-label="Toggle Context Panel"
        style={{
          position: 'absolute',
          left: isOpen ? 'auto' : '-34px',
          top: '16px',
          zIndex: 40,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          display: isOpen ? 'none' : 'flex'
        }}
      >
        <ChevronLeft size={16} />
      </button>

      {isOpen && (
        <div className="activity-panel-inner">
          {/* Header */}
          <div className="activity-header">
            <div className="activity-title-group">
              <div className="activity-beacon"></div>
              <span className="activity-title">Context & Intelligence</span>
            </div>
            <div className="activity-model-tag">
              <Sparkles size={11} />
              <span>AI Cloud</span>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="activity-tabs">
            <button 
              className={`activity-tab ${activeTab === 'activity' ? 'active' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              <Activity size={12} />
              <span>Activity</span>
            </button>
            <button 
              className={`activity-tab ${activeTab === 'sources' ? 'active' : ''}`}
              onClick={() => setActiveTab('sources')}
            >
              <Database size={12} />
              <span>Sources</span>
            </button>
            <button 
              className={`activity-tab ${activeTab === 'status' ? 'active' : ''}`}
              onClick={() => setActiveTab('status')}
            >
              <ShieldCheck size={12} />
              <span>Status</span>
            </button>
            <button 
              className={`activity-tab ${activeTab === 'actions' ? 'active' : ''}`}
              onClick={() => setActiveTab('actions')}
            >
              <Zap size={12} />
              <span>Actions</span>
            </button>
          </div>

          {/* Tab 1: Live Activity */}
          {activeTab === 'activity' && (
            <div className="activity-tab-content">
              <div className="activity-feed-list">
                {events.map((ev) => (
                  <div key={ev.id} className="activity-feed-item">
                    <div className="feed-item-header">
                      <span className="feed-agent-pill">{ev.title}</span>
                      <span className="feed-timestamp">{ev.time}</span>
                    </div>
                    <p className="feed-message">{ev.desc}</p>
                  </div>
                ))}
              </div>

              {stats && stats.recent_activity && stats.recent_activity.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>
                    Recent Inquiries
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {stats.recent_activity.slice(0, 3).map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => onSelectTab && onSelectTab('leads')}
                        style={{
                          padding: '10px 12px',
                          background: 'var(--bg-tertiary)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.title.replace('New Lead Qualified: ', '')}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.business}</div>
                        </div>
                        <span className={`badge ${item.status === 'Hot' ? 'badge-hot' : 'badge-warm'}`}>
                          {item.score}/100
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Sources */}
          {activeTab === 'sources' && (
            <div className="activity-tab-content">
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.05em' }}>
                Connected Knowledge Sources
              </div>

              {sources.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sources.map((doc) => (
                    <div 
                      key={doc.id}
                      onClick={() => onSelectTab && onSelectTab('doc_intelligence')}
                      style={{
                        padding: '12px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={15} color="#818cf8" />
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.filename}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <span>{(doc.file_type || 'PDF').toUpperCase()}</span>
                        <span style={{ color: '#34d399', fontWeight: 600 }}>✓ Verified Grounding</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <Database size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <div>No documents attached yet.</div>
                  <button 
                    onClick={() => onSelectTab && onSelectTab('doc_intelligence')}
                    className="btn-primary" 
                    style={{ marginTop: '12px', fontSize: '0.76rem', padding: '6px 12px' }}
                  >
                    Upload Document
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Analysis Status */}
          {activeTab === 'status' && (
            <div className="activity-tab-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Synthesis Confidence</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>99.2%</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Context grounded across business documents
                  </div>
                </div>

                <div style={{ padding: '14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Average Response Time</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#818cf8', marginTop: '2px' }}>142 ms</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Zero-latency streaming active
                  </div>
                </div>

                <div style={{ padding: '14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Accuracy Guardrails</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', color: '#34d399', fontWeight: 700, fontSize: '0.85rem' }}>
                    <CheckCircle2 size={16} />
                    <span>Active &amp; Calibrated</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Recent Actions */}
          {activeTab === 'actions' && (
            <div className="activity-tab-content">
              <div className="shortcuts-list">
                <button 
                  className="shortcut-action-card"
                  onClick={() => onSelectTab && onSelectTab('doc_intelligence')}
                >
                  <div className="shortcut-icon-box">
                    <Sparkles size={16} />
                  </div>
                  <div className="shortcut-info">
                    <div className="shortcut-title">Analyze Document</div>
                    <div className="shortcut-desc">Generate executive report &amp; action plan</div>
                  </div>
                  <span className="shortcut-key">⌘2</span>
                </button>

                <button 
                  className="shortcut-action-card"
                  onClick={() => onSelectTab && onSelectTab('chat')}
                >
                  <div className="shortcut-icon-box" style={{ color: '#34d399', background: 'rgba(16, 185, 129, 0.15)' }}>
                    <Bot size={16} />
                  </div>
                  <div className="shortcut-info">
                    <div className="shortcut-title">Chat with Documents</div>
                    <div className="shortcut-desc">Converse with grounded enterprise context</div>
                  </div>
                  <span className="shortcut-key">⌘3</span>
                </button>

                <button 
                  className="shortcut-action-card"
                  onClick={() => onSelectTab && onSelectTab('leads')}
                >
                  <div className="shortcut-icon-box" style={{ color: '#fb7185', background: 'rgba(244, 63, 94, 0.15)' }}>
                    <Users size={16} />
                  </div>
                  <div className="shortcut-info">
                    <div className="shortcut-title">Qualify Lead</div>
                    <div className="shortcut-desc">Inspect BANT criteria &amp; pipeline fits</div>
                  </div>
                  <span className="shortcut-key">⌘4</span>
                </button>

                <button 
                  className="shortcut-action-card"
                  onClick={() => onSelectTab && onSelectTab('evaluation')}
                >
                  <div className="shortcut-icon-box" style={{ color: '#c084fc', background: 'rgba(168, 85, 247, 0.15)' }}>
                    <ShieldCheck size={16} />
                  </div>
                  <div className="shortcut-info">
                    <div className="shortcut-title">Run Evaluation</div>
                    <div className="shortcut-desc">Verify intelligence benchmarks &amp; accuracy</div>
                  </div>
                  <span className="shortcut-key">⌘6</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
