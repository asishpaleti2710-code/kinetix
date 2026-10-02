import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import ActivityPanel from './components/ActivityPanel';
import CommandPalette from './components/CommandPalette';
import Dashboard from './pages/Dashboard';
import LeadsPage from './pages/LeadsPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import EvaluationCenter from './pages/EvaluationCenter';
import ConversationsPage from './pages/ConversationsPage';
import ChatSimulatorPage from './pages/ChatSimulatorPage';
import DocumentIntelligencePage from './pages/DocumentIntelligencePage';
import AnalyticsPage from './pages/AnalyticsPage';

import Space3DCanvas from './components/Space3DCanvas';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [theme, setTheme] = useState(() => localStorage.getItem('kinetix_theme') || 'dark');
  const [chatLead, setChatLead] = useState(null);
  const [chatInitialPrompt, setChatInitialPrompt] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activityPanelOpen, setActivityPanelOpen] = useState(() => window.innerWidth > 1360);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    document.title = 'Kinetix | AI Operating System';
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) registration.unregister();
      });
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kinetix_theme', theme);
  }, [theme]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl+K → Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      // Cmd/Ctrl+J → Activity / Context Panel
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setActivityPanelOpen(prev => !prev);
      }
      // [ → Toggle sidebar
      if (e.key === '[' && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        setSidebarCollapsed(prev => !prev);
      }
      // Number shortcuts ⌘1–⌘8
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        const tabs = ['dashboard', 'doc_intelligence', 'chat', 'leads', 'knowledge', 'evaluation', 'conversations', 'analytics'];
        const idx = parseInt(e.key) - 1;
        if (idx >= 0 && idx < tabs.length) {
          e.preventDefault();
          setCurrentTab(tabs[idx]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectLeadForChat = (lead) => {
    setChatLead(lead);
    setChatInitialPrompt('');
    setCurrentTab('chat');
  };

  const handleCommandExecute = (prompt) => {
    setChatInitialPrompt(prompt);
  };

  const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);

  const renderActivePage = () => {
    switch (currentTab) {
      case 'dashboard':        return <Dashboard setCurrentTab={setCurrentTab} onCommandExecute={handleCommandExecute} />;
      case 'doc_intelligence': return <DocumentIntelligencePage />;
      case 'chat':             return <ChatSimulatorPage initialLead={chatLead} initialPrompt={chatInitialPrompt} />;
      case 'leads':            return <LeadsPage onSelectLeadForChat={handleSelectLeadForChat} />;
      case 'knowledge':        return <KnowledgeBasePage />;
      case 'evaluation':       return <EvaluationCenter />;
      case 'conversations':    return <ConversationsPage />;
      case 'analytics':        return <AnalyticsPage />;
      default:                 return <Dashboard setCurrentTab={setCurrentTab} onCommandExecute={handleCommandExecute} />;
    }
  };

  return (
    <div className="app-container">
      <Space3DCanvas />
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        theme={theme}
        setTheme={setTheme}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
        onOpenCommand={openCommandPalette}
      />
      <div className="main-content">
        <Navbar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          activityPanelOpen={activityPanelOpen}
          setActivityPanelOpen={setActivityPanelOpen}
          onOpenCommand={openCommandPalette}
        />
        {renderActivePage()}
      </div>
      <ActivityPanel
        isOpen={activityPanelOpen}
        onToggle={() => setActivityPanelOpen(prev => !prev)}
        onSelectTab={setCurrentTab}
      />
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectTab={(tab) => { setCurrentTab(tab); setCommandPaletteOpen(false); }}
      />
    </div>
  );
}
