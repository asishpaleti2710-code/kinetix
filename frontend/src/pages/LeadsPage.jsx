import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  Mail, 
  Phone, 
  Briefcase, 
  DollarSign, 
  Clock, 
  Trash2, 
  X,
  ExternalLink
} from 'lucide-react';
import { fetchLeads, createLead, deleteLead } from '../services/api';

export default function LeadsPage({ onSelectLeadForChat }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    customer_name: '',
    email: '',
    phone: '',
    business_type: '',
    employee_count: 10,
    budget: 5000,
    timeline: 'Immediate (< 1 month)',
    notes: ''
  });

  useEffect(() => {
    loadLeads();
  }, [statusFilter]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await fetchLeads(statusFilter, searchQuery);
      setLeads(data);
    } catch (e) {
      console.error('Error fetching leads:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadLeads();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await deleteLead(id);
        setLeads(leads.filter(l => l.id !== id));
        if (selectedLead && selectedLead.id === id) setSelectedLead(null);
      } catch (err) {
        alert('Failed to delete lead');
      }
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      // Score calculation
      let score = 50;
      if (newLeadForm.budget >= 10000) score += 30;
      else if (newLeadForm.budget >= 3000) score += 20;
      const status = score >= 75 ? 'Hot' : (score >= 50 ? 'Warm' : 'Cold');

      const payload = {
        ...newLeadForm,
        lead_score: score,
        lead_status: status
      };

      const created = await createLead(payload);
      setLeads([created, ...leads]);
      setShowAddModal(false);
      setNewLeadForm({
        customer_name: '',
        email: '',
        phone: '',
        business_type: '',
        employee_count: 10,
        budget: 5000,
        timeline: 'Immediate (< 1 month)',
        notes: ''
      });
    } catch (err) {
      alert('Failed to create lead');
    }
  };

  return (
    <div className="view-canvas">
      {/* Search and Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search leads by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="chat-input"
              style={{ paddingLeft: '42px', width: '100%' }}
            />
          </div>
          <button type="submit" className="btn-secondary">Search</button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {['', 'Hot', 'Warm', 'Cold'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`btn-secondary ${statusFilter === st ? 'active' : ''}`}
              style={{
                fontSize: '0.8rem',
                padding: '6px 12px',
                background: statusFilter === st ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-tertiary)',
                borderColor: statusFilter === st ? '#818cf8' : 'var(--border-color)'
              }}
            >
              {st === '' ? 'All Leads' : st}
            </button>
          ))}

          <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ padding: '8px 16px' }}>
            <Plus size={16} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Main Leads Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Customer / Contact</th>
                <th>Company / Business</th>
                <th>Budget</th>
                <th>Timeline</th>
                <th>BANT Score</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Loading qualified leads...
                  </td>
                </tr>
              ) : leads.length > 0 ? (
                leads.map((lead) => (
                  <tr 
                    key={lead.id} 
                    onClick={() => setSelectedLead(lead)}
                    style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                  >
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{lead.customer_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{lead.email || 'No email provided'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{lead.business_type || 'General Prospect'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.employee_count} employees</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      ${(lead.budget || 0).toLocaleString()}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {lead.timeline || 'Flexible'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, width: '28px' }}>{lead.lead_score}</span>
                        <div style={{ width: '60px', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px' }}>
                          <div style={{
                            width: `${lead.lead_score}%`,
                            height: '100%',
                            background: lead.lead_score >= 75 ? '#f43f5e' : (lead.lead_score >= 50 ? '#f59e0b' : '#64748b'),
                            borderRadius: '3px'
                          }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        lead.lead_status === 'Hot' ? 'badge-hot' : (lead.lead_status === 'Warm' ? 'badge-warm' : 'badge-cold')
                      }`}>
                        {lead.lead_status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={(e) => handleDelete(lead.id, e)}
                        className="btn-icon"
                        style={{ width: '32px', height: '32px', color: '#f87171' }}
                        title="Delete Lead"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No leads found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Lead Details Modal / Drawer */}
      {selectedLead && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <span className={`badge ${
                  selectedLead.lead_status === 'Hot' ? 'badge-hot' : (selectedLead.lead_status === 'Warm' ? 'badge-warm' : 'badge-cold')
                }`}>
                  {selectedLead.lead_status} Lead • {selectedLead.lead_score}/100
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '8px' }}>{selectedLead.customer_name}</h3>
              </div>
              <button onClick={() => setSelectedLead(null)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>EMAIL</div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{selectedLead.email || 'N/A'}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>PHONE</div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{selectedLead.phone || 'N/A'}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>BUDGET</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#34d399' }}>${(selectedLead.budget || 0).toLocaleString()}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>TIMELINE</div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{selectedLead.timeline || 'Flexible'}</div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                AI Lead Qualification Notes & BANT Profile
              </div>
              <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {selectedLead.notes || 'No qualification notes recorded yet.'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => {
                  if (onSelectLeadForChat) onSelectLeadForChat(selectedLead);
                  setSelectedLead(null);
                }} 
                className="btn-primary"
              >
                <span>Simulate Chat With This Lead</span>
                <ExternalLink size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add New Prospect Lead</h3>
              <button onClick={() => setShowAddModal(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Customer Name *</label>
                <input
                  required
                  type="text"
                  value={newLeadForm.customer_name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, customer_name: e.target.value })}
                  className="chat-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Email</label>
                  <input
                    type="email"
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    className="chat-input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Phone</label>
                  <input
                    type="text"
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    className="chat-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Business Type / Industry</label>
                <input
                  type="text"
                  placeholder="e.g. SaaS, Healthcare, Logistics"
                  value={newLeadForm.business_type}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, business_type: e.target.value })}
                  className="chat-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Estimated Budget ($)</label>
                  <input
                    type="number"
                    value={newLeadForm.budget}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, budget: parseFloat(e.target.value) || 0 })}
                    className="chat-input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Timeline</label>
                  <select
                    value={newLeadForm.timeline}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, timeline: e.target.value })}
                    className="chat-input"
                    style={{ width: '100%' }}
                  >
                    <option value="Immediate (< 1 month)">Immediate (&lt; 1 month)</option>
                    <option value="1-3 months">1-3 months</option>
                    <option value="Next Quarter">Next Quarter</option>
                    <option value="Exploring options">Exploring options</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Qualified Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
