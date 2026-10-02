import React from 'react';
import { 
  Bot, 
  Sparkles, 
  Search, 
  Command, 
  ChevronRight, 
  PanelRight
} from 'lucide-react';

export default function Navbar({ 
  currentTab, 
  setCurrentTab, 
  activityPanelOpen, 
  setActivityPanelOpen,
  onOpenCommand 
}) {
  const getTabBreadcrumb = () => {
    switch (currentTab) {
      case 'dashboard': return 'Command Center';
      case 'doc_intelligence': return 'Document Intelligence';
      case 'chat': return 'AI Sales Assistant';
      case 'leads': return 'Prospects & Leads';
      case 'knowledge': return 'Knowledge Library';
      case 'evaluation': return 'Quality & Accuracy';
      case 'conversations': return 'Interaction History';
      case 'analytics': return 'Revenue Analytics';
      default: return 'Command Center';
    }
  };

  return (
    <header className="topbar">
      {/* Left: Breadcrumbs */}
      <div className="topbar-left">
        <div className="topbar-breadcrumbs">
          <span className="crumb-root" onClick={() => setCurrentTab('dashboard')}>Kinetix OS</span>
          <ChevronRight size={14} className="crumb-sep" />
          <span className="crumb-active">{getTabBreadcrumb()}</span>
        </div>
      </div>

      {/* Center: Command Palette Trigger */}
      <div className="topbar-center">
        <button className="topbar-command-trigger" onClick={onOpenCommand}>
          <Search size={14} className="cmd-search-icon" />
          <span className="cmd-placeholder">Search intelligence, documents, actions...</span>
          <span className="cmd-badge"><Command size={11} />K</span>
        </button>
      </div>

      {/* Right: Quick Actions & Intelligence Panel Toggle */}
      <div className="topbar-right">
        {/* Quick Action: New Analysis */}
        {currentTab !== 'doc_intelligence' && (
          <button 
            className="topbar-action-pill"
            onClick={() => setCurrentTab('doc_intelligence')}
            title="Analyze document with AI"
          >
            <Sparkles size={13} />
            <span>Analyze Doc</span>
          </button>
        )}

        {/* Quick Action: Live Assistant */}
        {currentTab !== 'chat' && (
          <button 
            className="topbar-action-pill simulator"
            onClick={() => setCurrentTab('chat')}
            title="Launch AI Sales Assistant"
          >
            <Bot size={13} />
            <span>AI Assistant</span>
          </button>
        )}

        {/* Live Engine Status */}
        <div className="topbar-engine-beacon">
          <span className="beacon-pulse"></span>
          <span className="beacon-text">System Online</span>
        </div>

        {/* Toggle Right Context Panel */}
        <button 
          className={`topbar-panel-toggle ${activityPanelOpen ? 'active' : ''}`}
          onClick={() => setActivityPanelOpen(!activityPanelOpen)}
          title={activityPanelOpen ? "Close Context Panel (⌘J)" : "Open Context Panel (⌘J)"}
          aria-label="Toggle Context Panel"
        >
          <PanelRight size={16} />
          <span className="panel-key-hint">⌘J</span>
        </button>
      </div>
    </header>
  );
}
