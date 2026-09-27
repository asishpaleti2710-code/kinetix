const API_BASE = '/api/v1';

export async function fetchDashboardStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function fetchLeads(status = '', search = '') {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (search) params.append('search', search);
  const res = await fetch(`${API_BASE}/leads?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch leads');
  return res.json();
}

export async function createLead(leadData) {
  const res = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leadData)
  });
  if (!res.ok) throw new Error('Failed to create lead');
  return res.json();
}

export async function updateLead(leadId, leadData) {
  const res = await fetch(`${API_BASE}/leads/${leadId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leadData)
  });
  if (!res.ok) throw new Error('Failed to update lead');
  return res.json();
}

export async function deleteLead(leadId) {
  const res = await fetch(`${API_BASE}/leads/${leadId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete lead');
  return res.json();
}

export async function fetchAppointments() {
  const res = await fetch(`${API_BASE}/appointments`);
  if (!res.ok) throw new Error('Failed to fetch appointments');
  return res.json();
}

export async function bookAppointment(appointmentData) {
  const res = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointmentData)
  });
  if (!res.ok) throw new Error('Failed to book appointment');
  return res.json();
}

export async function fetchDocuments() {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload document');
  }
  return res.json();
}

export async function deleteDocument(docId) {
  const res = await fetch(`${API_BASE}/documents/${docId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete document');
  return res.json();
}

export async function fetchEvaluations() {
  const res = await fetch(`${API_BASE}/evaluations`);
  if (!res.ok) throw new Error('Failed to fetch evaluations');
  return res.json();
}

export async function runEvaluations() {
  const res = await fetch(`${API_BASE}/evaluations/run`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to run test evaluation harness');
  return res.json();
}

export async function fetchEvaluationMetrics() {
  const res = await fetch(`${API_BASE}/evaluations/metrics`);
  if (!res.ok) throw new Error('Failed to fetch evaluation metrics');
  return res.json();
}

export async function fetchConversations(leadId = null, sessionId = null, search = '') {
  const params = new URLSearchParams();
  if (leadId) params.append('lead_id', leadId);
  if (sessionId) params.append('session_id', sessionId);
  if (search) params.append('search', search);
  const res = await fetch(`${API_BASE}/conversations?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
}

export async function sendChatMessage(payload) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to send chat message');
  return res.json();
}
