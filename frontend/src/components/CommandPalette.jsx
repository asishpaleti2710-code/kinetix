import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Sparkles, 
  Bot, 
  Users, 
  BookOpen, 
  ShieldCheck, 
  MessageSquare, 
  Compass, 
  ArrowRight, 
  X, 
  BarChart2 
} from 'lucide-react';

export default function CommandPalette({ isOpen, onClose, onSelectTab }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const actions = [
    { id: 'dashboard', title: 'Open AI Command Center', subtitle: 'Executive overview, quick action triggers & priority opportunities', category: 'Navigation', icon: Compass },
    { id: 'doc_intelligence', title: 'Document Intelligence', subtitle: 'Deep AI synthesis of executive summaries, risks & recommendations', category: 'Intelligence', icon: Sparkles },
    { id: 'chat', title: 'AI Sales Assistant', subtitle: 'Autonomous conversational buyer qualification & meeting bookings', category: 'Intelligence', icon: Bot },
    { id: 'leads', title: 'Prospects & Leads', subtitle: 'Manage leads, scores, qualification criteria & follow-ups', category: 'Operations', icon: Users },
    { id: 'knowledge', title: 'Knowledge Library', subtitle: 'Browse and synchronize enterprise collateral & documentation', category: 'Operations', icon: BookOpen },
    { id: 'evaluation', title: 'Quality & Accuracy Center', subtitle: 'Evaluate grounding benchmarks, intent precision & safety', category: 'Quality', icon: ShieldCheck },
    { id: 'conversations', title: 'Interaction History', subtitle: 'Audit customer conversation records & completed actions', category: 'Records', icon: MessageSquare },
    { id: 'analytics', title: 'Revenue Analytics', subtitle: 'Pipeline value, win rates, conversion funnels & forecasts', category: 'Analytics', icon: BarChart2 }
  ];

  const filtered = actions.filter(a => 
    a.title.toLowerCase().includes(query.toLowerCase()) || 
    a.subtitle.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="cmd-backdrop" onClick={onClose}>
      <div className="cmd-modal" onClick={(e) => e.stopPropagation()}>
        {/* Search Input Bar */}
        <div className="cmd-input-row">
          <Search size={18} className="cmd-modal-icon" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-input"
            placeholder="Type a command, page, or search query..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="cmd-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="cmd-results">
          {filtered.length === 0 ? (
            <div className="cmd-empty" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No matching commands or navigation targets found for "{query}".
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="cmd-item"
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                >
                  <div className="cmd-item-icon">
                    <Icon size={16} />
                  </div>
                  <div className="cmd-item-text">
                    <div className="cmd-item-title">{item.title}</div>
                    <div className="cmd-item-sub">{item.subtitle}</div>
                  </div>
                  <span className="cmd-item-category">{item.category}</span>
                  <ArrowRight size={14} className="cmd-item-arrow" />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="cmd-footer">
          <span>Navigate with <kbd>↑</kbd> <kbd>↓</kbd></span>
          <span>Select with <kbd>↵</kbd></span>
          <span>Close with <kbd>ESC</kbd></span>
        </div>
      </div>
    </div>
  );
}
