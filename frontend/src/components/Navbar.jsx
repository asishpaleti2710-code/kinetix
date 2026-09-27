import React from 'react';
import { Bot, Play, ExternalLink } from 'lucide-react';

export default function Navbar({ currentTab, setCurrentTab }) {
  const getPageTitle = () => {
    switch (currentTab) {
      case 'dashboard': return 'Executive Sales Overview';
      case 'chat': return 'Interactive AI Sales Employee Simulator';
      case 'leads': return 'Autonomous Lead Qualification & Scoring';
      case 'knowledge': return 'Company Knowledge Base & RAG Index';
      case 'evaluation': return 'Multi-Agent Evaluation Harness & Benchmarks';
      case 'conversations': return 'Customer Chat Transcripts & Tool Audit';
      default: return 'AgentFlow AI';
    }
  };

  return (
    <header className="topbar">
      <div>
        <h2 className="page-title">{getPageTitle()}</h2>
      </div>

      <div className="topbar-actions">
        <button 
          onClick={() => setCurrentTab('chat')}
          className="btn-primary"
        >
          <Bot size={16} />
          <span>Simulate Customer Chat</span>
        </button>

        <a 
          href="http://localhost:8000/docs" 
          target="_blank" 
          rel="noreferrer"
          className="btn-secondary"
          style={{ textDecoration: 'none' }}
        >
          <span>Swagger API</span>
          <ExternalLink size={14} />
        </a>
      </div>
    </header>
  );
}
