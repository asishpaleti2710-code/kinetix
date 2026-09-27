import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  CheckCircle2, 
  MessageSquare, 
  Bot, 
  Moon, 
  Sun,
  Cpu,
  Sparkles
} from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, theme, setTheme }) {
  const navItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'AI Sales Simulator', icon: Bot, badge: 'Live' },
    { id: 'leads', label: 'Lead Management', icon: Users },
    { id: 'knowledge', label: 'Knowledge Base (RAG)', icon: BookOpen },
    { id: 'evaluation', label: 'Evaluation Center', icon: CheckCircle2 },
    { id: 'conversations', label: 'Chat Transcripts', icon: MessageSquare }
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-icon-box">
          <Sparkles size={22} />
        </div>
        <div>
          <h1 className="brand-title">AgentFlow AI</h1>
          <div className="brand-tag">Enterprise Sales AI</div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  fontSize: '0.65rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: 700
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Agent System Status */}
      <div style={{
        margin: '0 12px 12px 12px',
        padding: '12px',
        background: 'rgba(99, 102, 241, 0.08)',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.78rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span className="pulse-indicator"></span>
          <span style={{ fontWeight: 600, color: '#a5b4fc' }}>LangGraph Engine</span>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
          6 Autonomous Tools Active • ChromaDB Vector Store Online
        </div>
      </div>

      {/* Footer & Theme Toggle */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <Cpu size={16} />
          <span>v1.0.0 Prod</span>
        </div>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="btn-icon"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </aside>
  );
}
