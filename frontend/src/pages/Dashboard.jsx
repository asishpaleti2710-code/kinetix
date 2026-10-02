import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  FileText, 
  Bot, 
  Users, 
  Calendar, 
  Share2, 
  ArrowRight, 
  Flame, 
  Search, 
  Zap, 
  Compass, 
  BookOpen, 
  CheckCircle2 
} from 'lucide-react';
import { fetchDashboardStats } from '../services/api';

export default function Dashboard({ setCurrentTab, onCommandExecute }) {
  const [promptInput, setPromptInput] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    } finally {
      setLoading(false);
    }
  };

  // 6 Primary Floating 3D Actions requested by user:
  const actionCards = [
    {
      id: 'doc',
      title: 'Analyze Document',
      description: 'Upload contracts, PDFs, or profiles for 3D executive synthesis & risk extraction.',
      icon: FileText,
      tab: 'doc_intelligence',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
      glow: 'rgba(99, 102, 241, 0.4)',
      badge: 'Hero 3D'
    },
    {
      id: 'chat_kb',
      title: 'Chat with Knowledge Base',
      description: 'Conversational intelligence grounded in verified enterprise documentation.',
      icon: BookOpen,
      tab: 'knowledge',
      prompt: 'Summarize our key enterprise product offerings and pricing structures.',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
      glow: 'rgba(6, 182, 212, 0.4)',
      badge: 'Grounded'
    },
    {
      id: 'insights',
      title: 'Generate Insights',
      description: 'Synthesize cross-document opportunities, competitive strengths, and SWOT.',
      icon: Sparkles,
      tab: 'doc_intelligence',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
      glow: 'rgba(236, 72, 153, 0.4)',
      badge: 'Autonomous'
    },
    {
      id: 'qualify',
      title: 'Qualify Lead',
      description: 'Evaluate BANT criteria (Budget, Authority, Need, Timeline) and probability scores.',
      icon: Users,
      tab: 'leads',
      gradient: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)',
      glow: 'rgba(244, 63, 94, 0.4)',
      badge: 'BANT Fit'
    },
    {
      id: 'schedule',
      title: 'Schedule Meeting',
      description: 'Book executive demonstrations with real-time calendar slot reservation.',
      icon: Calendar,
      tab: 'chat',
      prompt: 'I want to schedule an executive product demonstration for tomorrow.',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      glow: 'rgba(16, 185, 129, 0.4)',
      badge: 'Calendar'
    },
    {
      id: 'followup',
      title: 'Generate Follow-up',
      description: 'Draft customized multi-touch WhatsApp and Email sequences instantly.',
      icon: Share2,
      tab: 'chat',
      prompt: 'Generate personalized WhatsApp and email follow-up sequences for an enterprise buyer.',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
      glow: 'rgba(59, 130, 246, 0.4)',
      badge: 'Omnichannel'
    }
  ];

  const handleAction = (card) => {
    if (card.prompt && onCommandExecute) {
      onCommandExecute(card.prompt);
    }
    setCurrentTab(card.tab);
  };

  const handlePromptSubmit = (e) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    
    const text = promptInput.toLowerCase();
    if (text.includes('document') || text.includes('pdf') || text.includes('upload') || text.includes('contract')) {
      setCurrentTab('doc_intelligence');
    } else {
      if (onCommandExecute) {
        onCommandExecute(promptInput);
      }
      setCurrentTab('chat');
    }
  };

  return (
    <div className="view-canvas" style={{ position: 'relative', zIndex: 1 }}>
      <div className="command-center-container">
        
        {/* ==============================================================
            3D AI COMMAND CENTER CENTERPIECE
           ============================================================== */}
        <div className="command-center-hero floating-3d-workspace">
          
          {/* 3D Holographic Core Orb with Orbital Rings */}
          <div className="orbital-core-wrapper">
            <div className="orbital-ring ring-1"></div>
            <div className="orbital-ring ring-2"></div>
            <div className="orbital-ring ring-3"></div>
            <div className="orbital-core-sphere">
              <Sparkles size={24} color="#ffffff" />
            </div>
          </div>

          <div className="command-hero-header">
            <div className="command-hero-badge badge-3d">
              <Zap size={13} color="#00f2fe" />
              <span>3D AI Operating System</span>
            </div>
            <h1 className="command-hero-title title-3d">
              What would you like to analyze today?
            </h1>
            <p className="command-hero-subtitle">
              Autonomous cognitive engine for document intelligence, sales qualification, and predictive business insights.
            </p>
          </div>

          {/* Large Floating AI Workspace Input */}
          <form onSubmit={handlePromptSubmit} className="command-input-wrapper">
            <div className="command-input-box glass-input-3d">
              <Search size={22} style={{ color: 'var(--accent-primary)', marginLeft: '6px' }} />
              <input
                type="text"
                className="command-input-field"
                placeholder="Ask any question, analyze contracts, qualify a lead, or book a demo..."
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
              />
              <button type="submit" className="command-run-btn run-btn-3d">
                <Sparkles size={16} />
                <span>Initialize</span>
              </button>
            </div>
          </form>

          {/* Floating Pill Quick Filters */}
          <div className="quick-actions-bar">
            {['Contract Analysis', 'Executive Briefing', 'Pricing Matrix', 'Lead Scoring', 'Meeting Booking'].map((tag) => (
              <button
                key={tag}
                type="button"
                className="quick-action-pill pill-3d"
                onClick={() => {
                  setPromptInput(`Analyze ${tag.toLowerCase()}`);
                }}
              >
                <span>{tag}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ==============================================================
            THE 6 FLOATING 3D ACTION CARDS
           ============================================================== */}
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              <Compass size={18} color="#818cf8" />
              <span>Autonomous Action Deck</span>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Interactive 3D Cards</span>
          </div>

          <div className="action-cards-3d-grid">
            {actionCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  className="card-3d-elevated"
                  onClick={() => handleAction(card)}
                  style={{ '--card-glow': card.glow }}
                >
                  <div className="card-3d-inner">
                    <div className="card-3d-header">
                      <div className="card-3d-icon-box" style={{ background: card.gradient }}>
                        <Icon size={20} color="#ffffff" />
                      </div>
                      <span className="card-3d-badge">{card.badge}</span>
                    </div>

                    <h3 className="card-3d-title">{card.title}</h3>
                    <p className="card-3d-desc">{card.description}</p>

                    <div className="card-3d-action-row">
                      <span>Launch Action</span>
                      <ArrowRight size={15} className="card-3d-arrow" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ==============================================================
            FLOATING 3D PRIORITY OPPORTUNITIES & FEED
           ============================================================== */}
        <div className="glass-panel floating-3d-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Flame size={18} color="#f43f5e" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Priority Opportunities &amp; Live Inquiries</h3>
            </div>
            <button onClick={() => setCurrentTab('leads')} className="btn-secondary btn-3d" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
              <span>View All Pipeline</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table table-3d">
              <thead>
                <tr>
                  <th>Prospect / Organization</th>
                  <th>Industry Domain</th>
                  <th>Fit Score</th>
                  <th>Intent Priority</th>
                  <th>Activity Timestamp</th>
                  <th>Autonomous Action</th>
                </tr>
              </thead>
              <tbody>
                {stats && stats.recent_activity && stats.recent_activity.length > 0 ? (
                  stats.recent_activity.map((item) => (
                    <tr key={item.id} className="row-3d-hover">
                      <td style={{ fontWeight: 600 }}>{item.title.replace('New Lead Qualified: ', '')}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{item.business}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 800 }}>{item.score}/100</span>
                          <div style={{ width: '64px', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px' }}>
                            <div style={{
                              width: `${item.score}%`,
                              height: '100%',
                              background: item.score >= 75 ? 'linear-gradient(90deg, #f43f5e, #fb7185)' : (item.score >= 50 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : '#64748b'),
                              borderRadius: '3px'
                            }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          item.status === 'Hot' ? 'badge-hot' : (item.status === 'Warm' ? 'badge-warm' : 'badge-cold')
                        }`}>
                          {item.status} Priority
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{item.time}</td>
                      <td>
                        <button 
                          onClick={() => setCurrentTab('chat')}
                          className="btn-primary btn-mini-3d"
                          style={{ fontSize: '0.74rem', padding: '5px 12px' }}
                        >
                          Engage AI
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px' }}>
                      No recent inquiries recorded. Use the AI Command Center above to launch an analysis!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
