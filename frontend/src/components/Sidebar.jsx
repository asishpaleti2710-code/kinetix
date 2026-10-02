import React from 'react';
import { 
  Compass, 
  Sparkles, 
  Bot, 
  Users, 
  BookOpen, 
  ShieldCheck, 
  MessageSquare, 
  BarChart2, 
  PanelLeftClose, 
  PanelLeftOpen, 
  ChevronDown, 
  Search, 
  Command, 
  Sun, 
  Moon 
} from 'lucide-react';

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  theme, 
  setTheme,
  isCollapsed,
  setIsCollapsed,
  onOpenCommand
}) {
  const navSections = [
    {
      title: 'Intelligence Hub',
      items: [
        { id: 'dashboard', label: 'Command Center', icon: Compass, shortcut: '⌘1' },
        { id: 'doc_intelligence', label: 'Document Intelligence', icon: Sparkles, badge: 'Hero', shortcut: '⌘2' },
        { id: 'chat', label: 'AI Sales Assistant', icon: Bot, badge: 'Live', shortcut: '⌘3' }
      ]
    },
    {
      title: 'Business Operations',
      items: [
        { id: 'leads', label: 'Prospects & Leads', icon: Users, shortcut: '⌘4' },
        { id: 'knowledge', label: 'Knowledge Library', icon: BookOpen, shortcut: '⌘5' }
      ]
    },
    {
      title: 'Performance & Quality',
      items: [
        { id: 'evaluation', label: 'Quality & Accuracy', icon: ShieldCheck, shortcut: '⌘6' },
        { id: 'conversations', label: 'Interaction History', icon: MessageSquare, shortcut: '⌘7' },
        { id: 'analytics', label: 'Revenue Analytics', icon: BarChart2, badge: 'New', shortcut: '⌘8' }
      ]
    }
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : 'expanded'}`}>
      {/* Brand & Workspace Switcher */}
      <div className="sidebar-brand-wrapper">
        <div className="sidebar-brand" onClick={() => setCurrentTab('dashboard')}>
          <div className="brand-logo-gem">
            <Sparkles size={18} />
          </div>
          {!isCollapsed && (
            <div className="brand-text-block">
              <span className="brand-name">Kinetix</span>
              <span className="brand-tier-pill">AI OS</span>
            </div>
          )}
        </div>

        {/* Collapse toggle icon button */}
        <button 
          className="collapse-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand navigation ([)" : "Collapse navigation ([)"}
          aria-label="Toggle Navigation"
        >
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Workspace Selector Pill */}
      {!isCollapsed && (
        <div className="workspace-pill">
          <div className="workspace-avatar">K</div>
          <div className="workspace-info">
            <span className="workspace-title">Enterprise Ops</span>
            <span className="workspace-env">Autonomous Cloud</span>
          </div>
          <ChevronDown size={14} className="workspace-caret" />
        </div>
      )}

      {/* Quick Search Trigger */}
      {!isCollapsed && (
        <div className="sidebar-search-trigger" onClick={onOpenCommand}>
          <Search size={14} />
          <span className="search-placeholder">Search intelligence...</span>
          <span className="search-kbd"><Command size={10} />K</span>
        </div>
      )}

      {/* Navigation Sections */}
      <nav className="sidebar-nav">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="nav-group">
            {!isCollapsed && (
              <div className="nav-group-title">{section.title}</div>
            )}
            <div className="nav-group-items">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`nav-item-btn ${isActive ? 'active' : ''}`}
                    title={isCollapsed ? `${item.label} (${item.shortcut})` : undefined}
                  >
                    <div className="nav-item-icon-box">
                      <Icon size={17} />
                    </div>
                    
                    {!isCollapsed && (
                      <>
                        <span className="nav-item-label">{item.label}</span>
                        {item.badge && (
                          <span className={`nav-item-badge ${item.badge.toLowerCase()}`}>
                            {item.badge}
                          </span>
                        )}
                        {item.shortcut && (
                          <span className="nav-item-shortcut">{item.shortcut}</span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Engine Status Badge (Clean, customer-facing) */}
      {!isCollapsed ? (
        <div className="sidebar-engine-box">
          <div className="engine-status-row">
            <span className="live-pulse-dot"></span>
            <span className="engine-name">Intelligence Engine</span>
          </div>
          <div className="engine-subtext">All Services Operational</div>
        </div>
      ) : (
        <div className="sidebar-engine-collapsed" title="Intelligence Engine Active • Operational">
          <span className="live-pulse-dot"></span>
        </div>
      )}

      {/* Footer Controls */}
      <div className="sidebar-footer">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="theme-switch-btn"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {!isCollapsed && (
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          )}
        </button>
      </div>
    </aside>
  );
}
