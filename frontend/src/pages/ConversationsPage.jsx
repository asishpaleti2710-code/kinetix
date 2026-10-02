import React, { useEffect, useState } from 'react';
import { MessageSquare, Search, Bot, User, Clock, CheckCircle2 } from 'lucide-react';
import { fetchConversations } from '../services/api';

export default function ConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadConvos();
  }, []);

  const loadConvos = async () => {
    try {
      setLoading(true);
      const data = await fetchConversations(null, null, searchQuery);
      setConversations(data);
    } catch (e) {
      console.error('Error fetching conversations:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadConvos();
  };

  return (
    <div className="view-canvas">
      {/* Search Bar */}
      <div style={{ marginBottom: '24px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', maxWidth: '600px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search interaction history and transcripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="chat-input"
              style={{ paddingLeft: '42px', width: '100%' }}
            />
          </div>
          <button type="submit" className="btn-secondary">Search History</button>
        </form>
      </div>

      {/* Main Conversation Stream */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} color="#818cf8" />
            <h4 style={{ fontWeight: 700 }}>Customer Interaction Records</h4>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{conversations.length} Messages Logged</span>
        </div>

        <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading history...</div>
          ) : conversations.length > 0 ? (
            conversations.map((c) => {
              const isAssistant = c.sender === 'assistant';
              let toolsParsed = null;
              if (c.tools_called) {
                try { toolsParsed = JSON.parse(c.tools_called); } catch(e) {}
              }

              return (
                <div
                  key={c.id}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: isAssistant ? 'var(--bg-secondary)' : 'rgba(99, 102, 241, 0.05)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isAssistant ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#818cf8', fontWeight: 700 }}>
                          <Bot size={15} />
                          <span>AI Sales Representative</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: 700 }}>
                          <User size={15} />
                          <span>Customer Inquiry</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                      <Clock size={13} />
                      <span>{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                    {c.message}
                  </div>

                  {toolsParsed && toolsParsed.length > 0 && (
                    <div style={{
                      marginTop: '6px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(16, 185, 129, 0.08)',
                      fontSize: '0.74rem',
                      color: '#34d399',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <CheckCircle2 size={13} />
                      <span>Actions Completed: {toolsParsed.map(t => t.tool.replace(/_/g, ' ')).join(', ')}</span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
              No interaction records found. Use the AI Sales Assistant to initiate customer interactions!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
