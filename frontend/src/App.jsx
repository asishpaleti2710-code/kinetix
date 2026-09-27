import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import LeadsPage from './pages/LeadsPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import EvaluationCenter from './pages/EvaluationCenter';
import ConversationsPage from './pages/ConversationsPage';
import ChatSimulatorPage from './pages/ChatSimulatorPage';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [theme, setTheme] = useState(() => localStorage.getItem('agentflow_theme') || 'dark');
  const [chatLead, setChatLead] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('agentflow_theme', theme);
  }, [theme]);

  const handleSelectLeadForChat = (lead) => {
    setChatLead(lead);
    setCurrentTab('chat');
  };

  const renderActivePage = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard setCurrentTab={setCurrentTab} />;
      case 'chat':
        return <ChatSimulatorPage initialLead={chatLead} />;
      case 'leads':
        return <LeadsPage onSelectLeadForChat={handleSelectLeadForChat} />;
      case 'knowledge':
        return <KnowledgeBasePage />;
      case 'evaluation':
        return <EvaluationCenter />;
      case 'conversations':
        return <ConversationsPage />;
      default:
        return <Dashboard setCurrentTab={setCurrentTab} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        theme={theme}
        setTheme={setTheme}
      />
      <div className="main-content">
        <Navbar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
        />
        {renderActivePage()}
      </div>
    </div>
  );
}
