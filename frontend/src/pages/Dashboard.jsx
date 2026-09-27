import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Flame, 
  CalendarCheck, 
  ShieldCheck, 
  ArrowUpRight, 
  Bot, 
  Workflow, 
  Sparkles, 
  Clock, 
  FileText 
} from 'lucide-react';
import { fetchDashboardStats } from '../services/api';

export default function Dashboard({ setCurrentTab }) {
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

  const statCards = [
    {
      label: 'Total Leads Qualified',
      value: stats ? stats.total_leads : '—',
      icon: Users,
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      subtext: '+28% from automated inbound'
    },
    {
      label: 'High-Value Hot Leads',
      value: stats ? stats.hot_leads : '—',
      icon: Flame,
      gradient: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
      subtext: 'BANT Score >= 75/100'
    },
    {
      label: 'Demos & Meetings Booked',
      value: stats ? stats.meetings_scheduled : '—',
      icon: CalendarCheck,
      gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      subtext: 'Autonomous Appointment Agent'
    },
    {
      label: 'Agent Accuracy Benchmark',
      value: stats ? `${stats.agent_accuracy}%` : '—',
      icon: ShieldCheck,
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      subtext: 'Evaluation Harness Score'
    }
  ];

  return (
    <div className="view-canvas">
      {/* Stat Cards Grid */}
      <div className="stats-grid">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="stat-card">
              <div>
                <div className="stat-label">{c.label}</div>
                <div className="stat-value">{c.value}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {c.subtext}
                </div>
              </div>
              <div className="stat-icon" style={{ background: c.gradient, color: 'white' }}>
                <Icon size={22} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '28px' }}>
        {/* Multi-Agent Architecture Graph */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Workflow size={20} color="#818cf8" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Autonomous LangGraph Workflow</h3>
            </div>
            <span className="badge badge-agent">StateGraph Compiled</span>
          </div>

          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Inbound customer queries are routed autonomously through specialized LangGraph nodes with shared state, deterministic guardrails, and automated tool invocation.
          </p>

          {/* Architecture Pipeline Visualizer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 16px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            overflowX: 'auto',
            gap: '12px'
          }}>
            {/* Step 1: Customer Input */}
            <div style={{ textAlign: 'center', minWidth: '110px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px auto',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                <Bot size={20} />
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Customer</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Input Message</div>
            </div>

            <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>→</div>

            {/* Step 2: Intent Agent */}
            <div style={{ textAlign: 'center', minWidth: '120px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px auto',
                border: '1px solid rgba(99, 102, 241, 0.3)'
              }}>
                <Sparkles size={20} />
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Intent Agent</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>5-Way Classifier</div>
            </div>

            <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>→</div>

            {/* Step 3: Planner Agent */}
            <div style={{ textAlign: 'center', minWidth: '120px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#c084fc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px auto',
                border: '1px solid rgba(168, 85, 247, 0.3)'
              }}>
                <Workflow size={20} />
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Planner Agent</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Context & Router</div>
            </div>

            <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>→</div>

            {/* Step 4: Specialized Nodes */}
            <div style={{ textAlign: 'center', minWidth: '140px' }}>
              <div style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(236, 72, 153, 0.15)',
                color: '#f472b6',
                border: '1px solid rgba(236, 72, 153, 0.3)',
                fontSize: '0.74rem',
                fontWeight: 600,
                textAlign: 'left',
                lineHeight: 1.4
              }}>
                <div>• Lead Agent</div>
                <div>• Knowledge RAG</div>
                <div>• Appointment</div>
                <div>• Follow-up Agent</div>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>Specialized Nodes</div>
            </div>

            <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>→</div>

            {/* Step 5: Tool Execution */}
            <div style={{ textAlign: 'center', minWidth: '110px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px auto',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <ShieldCheck size={20} />
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Tool Calls</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>6 Executions</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button onClick={() => setCurrentTab('chat')} className="btn-primary">
              <Bot size={16} />
              <span>Launch Live Agent Demo</span>
            </button>
            <button onClick={() => setCurrentTab('evaluation')} className="btn-secondary">
              <ShieldCheck size={16} />
              <span>Run Automated Evaluation Harness</span>
            </button>
          </div>
        </div>

        {/* Lead Pipeline Distribution */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '18px' }}>Pipeline Breakdown</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ color: '#fb7185', fontWeight: 600 }}>Hot Leads (Score 75-100)</span>
                <span style={{ fontWeight: 700 }}>{stats ? stats.hot_leads : 0}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: stats && stats.total_leads ? `${(stats.hot_leads / stats.total_leads) * 100}%` : '50%', 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #f43f5e, #fb7185)' 
                }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ color: '#fbbf24', fontWeight: 600 }}>Warm Leads (Score 50-74)</span>
                <span style={{ fontWeight: 700 }}>{stats ? stats.warm_leads : 0}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: stats && stats.total_leads ? `${(stats.warm_leads / stats.total_leads) * 100}%` : '25%', 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' 
                }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Cold Prospects (&lt; 50)</span>
                <span style={{ fontWeight: 700 }}>{stats ? stats.cold_leads : 0}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: stats && stats.total_leads ? `${(stats.cold_leads / stats.total_leads) * 100}%` : '25%', 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #64748b, #94a3b8)' 
                }} />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px', padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Knowledge Base Docs</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{stats ? stats.total_documents : 1} PDFs</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Conversations Logged</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{stats ? stats.total_conversations : 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Stream */}
      <div className="glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Live Qualification Feed</h3>
          <button onClick={() => setCurrentTab('leads')} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '5px 12px' }}>
            <span>View All Leads</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Customer / Lead</th>
                <th>Industry / Business</th>
                <th>BANT Score</th>
                <th>Category</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {stats && stats.recent_activity && stats.recent_activity.length > 0 ? (
                stats.recent_activity.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.title.replace('New Lead Qualified: ', '')}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{item.business}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700 }}>{item.score}/100</span>
                        <div style={{ width: '60px', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px' }}>
                          <div style={{
                            width: `${item.score}%`,
                            height: '100%',
                            background: item.score >= 75 ? '#f43f5e' : (item.score >= 50 ? '#f59e0b' : '#64748b'),
                            borderRadius: '3px'
                          }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        item.status === 'Hot' ? 'badge-hot' : (item.status === 'Warm' ? 'badge-warm' : 'badge-cold')
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{item.time}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    No leads recorded yet. Try sending a message in the AI Sales Simulator!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
