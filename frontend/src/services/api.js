const API_BASE = '/api/v1';

// ─── Helper ────────────────────────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail?.message || err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export async function fetchDashboardStats() {
  return apiFetch(`${API_BASE}/dashboard/stats`);
}

// ─── Leads ─────────────────────────────────────────────────────────────────────
export async function fetchLeads(params = {}) {
  const query = new URLSearchParams();
  if (params.status)   query.append('status', params.status);
  if (params.search)   query.append('search', params.search);
  if (params.min_score !== undefined) query.append('min_score', params.min_score);
  if (params.max_score !== undefined) query.append('max_score', params.max_score);
  if (params.sort_by)  query.append('sort_by', params.sort_by);
  if (params.sort_dir) query.append('sort_dir', params.sort_dir);
  if (params.limit)    query.append('limit', params.limit);
  if (params.offset)   query.append('offset', params.offset);
  return apiFetch(`${API_BASE}/leads?${query}`);
}

export async function fetchLeadStats() {
  return apiFetch(`${API_BASE}/leads/stats`);
}

export async function fetchLeadTimeline(leadId) {
  return apiFetch(`${API_BASE}/leads/${leadId}/timeline`);
}

export async function createLead(leadData) {
  return apiFetch(`${API_BASE}/leads`, { method: 'POST', body: JSON.stringify(leadData) });
}

export async function updateLead(leadId, leadData) {
  return apiFetch(`${API_BASE}/leads/${leadId}`, { method: 'PUT', body: JSON.stringify(leadData) });
}

export async function deleteLead(leadId) {
  return apiFetch(`${API_BASE}/leads/${leadId}`, { method: 'DELETE' });
}

// ─── Appointments ─────────────────────────────────────────────────────────────
export async function fetchAppointments(params = {}) {
  const query = new URLSearchParams();
  if (params.status)       query.append('status', params.status);
  if (params.lead_id)      query.append('lead_id', params.lead_id);
  if (params.upcoming_only) query.append('upcoming_only', 'true');
  if (params.limit)        query.append('limit', params.limit);
  if (params.offset)       query.append('offset', params.offset);
  return apiFetch(`${API_BASE}/appointments?${query}`);
}

export async function fetchUpcomingAppointments(days = 7) {
  return apiFetch(`${API_BASE}/appointments/upcoming?days=${days}`);
}

export async function fetchAppointmentStats() {
  return apiFetch(`${API_BASE}/appointments/stats`);
}

export async function bookAppointment(appointmentData) {
  return apiFetch(`${API_BASE}/appointments`, { method: 'POST', body: JSON.stringify(appointmentData) });
}

export async function updateAppointment(appointmentId, data) {
  return apiFetch(`${API_BASE}/appointments/${appointmentId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function updateAppointmentStatus(appointmentId, status) {
  return apiFetch(`${API_BASE}/appointments/${appointmentId}/status?status=${encodeURIComponent(status)}`, { method: 'PATCH' });
}

export async function deleteAppointment(appointmentId) {
  return apiFetch(`${API_BASE}/appointments/${appointmentId}`, { method: 'DELETE' });
}

// ─── Documents ────────────────────────────────────────────────────────────────
export async function fetchDocuments() {
  return apiFetch(`${API_BASE}/documents`);
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/documents/upload`, { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload document');
  }
  return res.json();
}

export async function deleteDocument(docId) {
  return apiFetch(`${API_BASE}/documents/${docId}`, { method: 'DELETE' });
}

export async function fetchDocumentAnalysis(docId) {
  return apiFetch(`${API_BASE}/documents/${docId}/analysis`);
}

export async function reanalyzeDocument(docId) {
  return apiFetch(`${API_BASE}/documents/${docId}/reanalyze`, { method: 'POST' });
}

export async function fetchDocumentStatus(docId) {
  return apiFetch(`${API_BASE}/documents/${docId}/status`);
}

export async function queryDocument(docId, question) {
  return apiFetch(`${API_BASE}/documents/${docId}/query`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
}

// ─── Evaluations ──────────────────────────────────────────────────────────────
export async function runSystemVerification() {
  return apiFetch('/verify');
}

export async function fetchEvaluations(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.limit)  query.append('limit', params.limit);
  if (params.offset) query.append('offset', params.offset);
  return apiFetch(`${API_BASE}/evaluations?${query}`);
}

export async function runEvaluations(options = {}) {
  const query = new URLSearchParams();
  if (options.test_ids)         query.append('test_ids', options.test_ids);
  if (options.enable_llm_judge !== undefined) query.append('enable_llm_judge', options.enable_llm_judge);
  return apiFetch(`${API_BASE}/evaluations/run?${query}`, { method: 'POST' });
}

export async function fetchEvaluationMetrics() {
  return apiFetch(`${API_BASE}/evaluations/metrics`);
}

export async function fetchLatestEvaluation() {
  return apiFetch(`${API_BASE}/evaluations/latest`);
}

export async function fetchEvaluationSuite() {
  return apiFetch(`${API_BASE}/evaluations/suite`);
}

// ─── Conversations ────────────────────────────────────────────────────────────
export async function fetchConversations(params = {}) {
  const query = new URLSearchParams();
  if (params.lead_id)    query.append('lead_id', params.lead_id);
  if (params.session_id) query.append('session_id', params.session_id);
  if (params.search)     query.append('search', params.search);
  if (params.sender)     query.append('sender', params.sender);
  if (params.agent)      query.append('agent', params.agent);
  if (params.limit)      query.append('limit', params.limit);
  if (params.offset)     query.append('offset', params.offset);
  return apiFetch(`${API_BASE}/conversations?${query}`);
}

export async function fetchConversationSessions(limit = 20) {
  return apiFetch(`${API_BASE}/conversations/sessions?limit=${limit}`);
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export async function sendChatMessage(payload) {
  return apiFetch(`${API_BASE}/chat`, { method: 'POST', body: JSON.stringify(payload) });
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export async function fetchAnalyticsOverview() {
  return apiFetch(`${API_BASE}/analytics/overview`);
}

export async function fetchLeadTimeseries(days = 30) {
  return apiFetch(`${API_BASE}/analytics/leads/timeseries?days=${days}`);
}

export async function fetchConversionFunnel() {
  return apiFetch(`${API_BASE}/analytics/conversion`);
}

export async function fetchAgentUsage(days = 30) {
  return apiFetch(`${API_BASE}/analytics/agents?days=${days}`);
}

export async function fetchRevenuePipeline() {
  return apiFetch(`${API_BASE}/analytics/revenue`);
}

export async function fetchConversationTimeseries(days = 14) {
  return apiFetch(`${API_BASE}/analytics/conversations/timeseries?days=${days}`);
}

// ─── Notifications ────────────────────────────────────────────────────────────
export async function sendWhatsApp(leadId, message, phone = null) {
  const payload = { lead_id: leadId, message };
  if (phone) payload.phone = phone;
  return apiFetch(`${API_BASE}/notifications/whatsapp`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function sendEmail(leadId, subject, body, toEmail = null) {
  const payload = { lead_id: leadId, subject, body };
  if (toEmail) payload.to_email = toEmail;
  return apiFetch(`${API_BASE}/notifications/email`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function sendBulkNotification(leadIds, channel, options = {}) {
  return apiFetch(`${API_BASE}/notifications/bulk`, {
    method: 'POST',
    body: JSON.stringify({
      lead_ids: leadIds,
      channel,
      whatsapp_message: options.whatsapp_message,
      email_subject: options.email_subject,
      email_body: options.email_body,
    }),
  });
}

export async function fetchNotificationHistory(params = {}) {
  const query = new URLSearchParams();
  if (params.lead_id) query.append('lead_id', params.lead_id);
  if (params.channel) query.append('channel', params.channel);
  if (params.limit)   query.append('limit', params.limit);
  return apiFetch(`${API_BASE}/notifications/history?${query}`);
}
