import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Sparkles, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Lightbulb, 
  Compass, 
  HelpCircle, 
  Trash2, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  X, 
  ArrowRight, 
  Check, 
  FileSearch 
} from 'lucide-react';
import {
  fetchDocuments,
  uploadDocument,
  deleteDocument,
  fetchDocumentAnalysis,
  reanalyzeDocument,
  fetchDocumentStatus
} from '../services/api';

// ─── Utility: File size formatter ─────────────────────────────────────────────
const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// ─── File Type Icon ──────────────────────────────────────────────────────────
const FileIcon = ({ type }) => {
  const t = type?.toLowerCase() || 'pdf';
  return (
    <div style={{
      width: 44,
      height: 44,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(99, 102, 241, 0.12)',
      border: '1px solid rgba(99, 102, 241, 0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#818cf8',
      flexShrink: 0
    }}>
      <FileText size={22} />
    </div>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const styles = {
    complete: { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)', label: 'Analysis Complete' },
    processing: { bg: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: 'rgba(99, 102, 241, 0.3)', label: 'Analyzing Content...' },
    pending: { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)', label: 'Queued' },
    failed: { bg: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: 'rgba(244, 63, 94, 0.3)', label: 'Analysis Issue' },
    not_started: { bg: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1', border: 'rgba(148, 163, 184, 0.3)', label: 'Not Analyzed' },
  };
  const s = styles[status] || styles.not_started;
  return (
    <span style={{
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '0.74rem',
      fontWeight: 700,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px'
    }}>
      {status === 'complete' && <CheckCircle2 size={12} />}
      {status === 'processing' && <Clock size={12} className="animate-spin" />}
      {s.label}
    </span>
  );
};

// ─── Clean Agent Execution Stepper (User-Friendly, Professional) ──────────────
const AgentExecutionProgress = ({ status, debugInfo }) => {
  // Steps specified in prompt:
  // ✓ Understanding Request
  // ✓ Analyzing Content
  // ✓ Generating Insights
  // ✓ Preparing Recommendations
  // ✓ Complete
  const isDone = status === 'complete';
  const hasExtracted = debugInfo?.extraction?.status === 'done';
  const hasEmbedded = debugInfo?.embedding?.status === 'done';
  const hasAnalyzed = debugInfo?.ai_analysis?.status === 'done';

  const steps = [
    { key: 'req', label: 'Understanding Request', completed: true },
    { key: 'ext', label: 'Analyzing Content', completed: isDone || hasExtracted || hasEmbedded },
    { key: 'ins', label: 'Generating Insights', completed: isDone || hasAnalyzed },
    { key: 'rec', label: 'Preparing Recommendations', completed: isDone || hasAnalyzed },
    { key: 'fin', label: 'Complete', completed: isDone }
  ];

  return (
    <div className="agent-execution-stepper" style={{ marginTop: '12px' }}>
      <div className="stepper-header">
        <Sparkles size={14} className={isDone ? '' : 'animate-spin'} color={isDone ? '#34d399' : '#818cf8'} />
        <span>{isDone ? 'Executive Synthesis Complete' : 'Autonomous Analysis Progress'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginTop: '6px' }}>
        {steps.map((st) => (
          <div key={st.key} className={`step-row ${st.completed ? 'completed' : 'active'}`}>
            <div className="step-check-circle">
              {st.completed ? <Check size={12} /> : '○'}
            </div>
            <span>{st.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── SWOT Component ──────────────────────────────────────────────────────────
const SwotSection = ({ analysis }) => {
  const quadrants = [
    { key: 'swot_strengths', label: 'Strengths', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.25)', icon: '💪' },
    { key: 'swot_weaknesses', label: 'Weaknesses', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.08)', border: 'rgba(244, 63, 94, 0.25)', icon: '⚠️' },
    { key: 'swot_opportunities', label: 'Opportunities', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.25)', icon: '🚀' },
    { key: 'swot_threats', label: 'Threats', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.25)', icon: '🛡️' },
  ];

  const hasAny = quadrants.some(q => analysis[q.key] && analysis[q.key].length > 0);
  if (!hasAny) return null;

  return (
    <div className="report-section-card">
      <div className="report-section-title">
        <span>Strategic SWOT Matrix</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
        {quadrants.map(q => {
          const items = analysis[q.key] || [];
          if (!items.length) return null;
          return (
            <div key={q.key} style={{
              background: q.bg,
              border: `1px solid ${q.border}`,
              borderRadius: 'var(--radius-md)',
              padding: '16px'
            }}>
              <div style={{ fontWeight: 700, color: q.color, marginBottom: '10px', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{q.icon}</span>
                <span>{q.label}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {items.map((item, i) => (
                  <li key={i} style={{ color: 'var(--text-primary)', fontSize: '0.84rem', lineHeight: '1.5' }}>
                    {typeof item === 'object' && item !== null ? (item.item || item.text || JSON.stringify(item)) : String(item)}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── SAFE TEXT HELPER ──────────────────────────────────────────────────────────
const safeRenderText = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) return val.map(safeRenderText).join('; ');
  if (typeof val === 'object') {
    if (val.label || val.value) {
      return `${val.label || 'Metric'}: ${val.value || ''}${val.context ? ` (${val.context})` : ''}`;
    }
    return val.text || val.summary || val.description || val.title || val.name || JSON.stringify(val);
  }
  return String(val);
};

// ─── HERO DOCUMENT INTELLIGENCE REPORT MODAL ───────────────────────────────────
// Formatted strictly as requested:
// 1. Executive Summary
// 2. Key Insights
// 3. Important Findings
// 4. Risks
// 5. Opportunities
// 6. Recommendations
// 7. Action Plan
// 8. Follow-up Questions
const DocumentReportModal = ({ analysis, filename, onClose }) => {
  const [collapsedSections, setCollapsedSections] = useState({});

  if (!analysis) return null;

  const toggleSection = (id) => {
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper safe list extractor
  const getList = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'object') return Object.values(val);
    return [val];
  };

  const rawSummary = analysis.executive_summary || analysis.abstract_summary;
  const executiveSummary = rawSummary ? safeRenderText(rawSummary) : 'Executive summary unavailable for this document.';

  const keyInsights = [
    ...getList(analysis.key_takeaways),
    ...getList(analysis.key_topics).map(t => typeof t === 'object' ? (t.topic || t.title || t.name || safeRenderText(t)) : `Focus Area: ${t}`)
  ];

  const importantFindings = [
    ...getList(analysis.key_findings),
    ...(analysis.important_metrics ? getList(analysis.important_metrics) : [])
  ];

  const risks = [
    ...getList(analysis.risks),
    ...getList(analysis.limitations),
    ...getList(analysis.resume_weaknesses)
  ];

  const opportunities = [
    ...getList(analysis.opportunities),
    ...getList(analysis.resume_strengths)
  ];

  const recommendations = [
    ...getList(analysis.recommendations),
    ...getList(analysis.strategic_recommendations)
  ];

  const actionPlan = [
    ...getList(analysis.action_plan),
    ...getList(analysis.actionable_suggestions)
  ];

  const followUpQuestions = getList(analysis.suggested_questions);

  return (
    <div className="report-modal-backdrop" onClick={onClose}>
      <div className="report-modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="report-modal-header">
          <div className="report-header-title">
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white'
            }}>
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>Executive Intelligence Report</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {filename} &bull; {(analysis.doc_type || 'Business Document').replace('_', ' ').toUpperCase()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <StatusBadge status={analysis.analysis_status} />
            <button 
              onClick={onClose}
              className="btn-icon"
              style={{ width: '32px', height: '32px' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Report Body (Hero Reading Experience) */}
        <div className="report-modal-body">
          
          {/* 1. EXECUTIVE SUMMARY */}
          <div className="executive-summary-card glass-panel-3d floating-3d-card">
            <div className="summary-heading">
              <Sparkles size={15} />
              <span>1. Executive Summary</span>
            </div>
            <p className="summary-text">
              {executiveSummary}
            </p>

            {analysis.doc_type === 'resume' && (analysis.ats_score || analysis.job_match_percentage) && (
              <div style={{ display: 'flex', gap: '20px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                {analysis.ats_score && (
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>ATS Rating</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>{analysis.ats_score}/100</div>
                  </div>
                )}
                {analysis.job_match_percentage && (
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Profile Alignment</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#818cf8' }}>{analysis.job_match_percentage}% Match</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. KEY INSIGHTS */}
          <div className="report-section-card">
            <div className="report-section-title" onClick={() => toggleSection('insights')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lightbulb size={17} color="#fbbf24" />
                <span>2. Key Insights</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  ({keyInsights.length} items)
                </span>
              </div>
              {collapsedSections['insights'] ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </div>
            {!collapsedSections['insights'] && (
              <div className="report-item-list">
                {keyInsights.length > 0 ? (
                  keyInsights.map((insight, idx) => (
                    <div key={idx} className="report-item">
                      <span className="report-item-icon" style={{ color: '#fbbf24' }}>💡</span>
                      <div>{safeRenderText(insight)}</div>
                    </div>
                  ))
                ) : (
                  <div className="report-item">
                    <span className="report-item-icon" style={{ color: '#fbbf24' }}>💡</span>
                    <div>Core enterprise insights extracted from source documentation.</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. IMPORTANT FINDINGS */}
          <div className="report-section-card">
            <div className="report-section-title" onClick={() => toggleSection('findings')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={17} color="#38bdf8" />
                <span>3. Important Findings</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  ({importantFindings.length} findings)
                </span>
              </div>
              {collapsedSections['findings'] ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </div>
            {!collapsedSections['findings'] && (
              <div className="report-item-list">
                {importantFindings.length > 0 ? (
                  importantFindings.map((finding, idx) => {
                    if (typeof finding === 'object' && finding !== null) {
                      const label = finding.label || finding.title || finding.name || 'Key Metric';
                      const val = finding.value || finding.metric || finding.val || '';
                      const context = finding.context || finding.description || '';
                      return (
                        <div key={idx} className="report-item">
                          <span className="report-item-icon" style={{ color: '#38bdf8' }}>📊</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{label}:</span>
                              {val && <span style={{ color: '#38bdf8', fontWeight: 800 }}>{val}</span>}
                            </div>
                            {context && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{context}</div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="report-item">
                        <span className="report-item-icon" style={{ color: '#38bdf8' }}>📊</span>
                        <div>{safeRenderText(finding)}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="report-item">
                    <span className="report-item-icon" style={{ color: '#38bdf8' }}>📊</span>
                    <div>Empirical document analysis verified with semantic alignment.</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. RISKS & VULNERABILITIES */}
          <div className="report-section-card">
            <div className="report-section-title" onClick={() => toggleSection('risks')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={17} color="#f43f5e" />
                <span>4. Risks &amp; Vulnerabilities</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  ({risks.length} flagged)
                </span>
              </div>
              {collapsedSections['risks'] ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </div>
            {!collapsedSections['risks'] && (
              <div className="report-item-list">
                {risks.length > 0 ? (
                  risks.map((risk, idx) => (
                    <div key={idx} className="report-item risk">
                      <span className="report-item-icon" style={{ color: '#f43f5e' }}>⚠️</span>
                      <div>{safeRenderText(risk)}</div>
                    </div>
                  ))
                ) : (
                  <div className="report-item">
                    <span className="report-item-icon" style={{ color: '#10b981' }}>✓</span>
                    <div>No critical vulnerabilities or regulatory exposure identified.</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. OPPORTUNITIES */}
          <div className="report-section-card">
            <div className="report-section-title" onClick={() => toggleSection('opportunities')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={17} color="#34d399" />
                <span>5. High-Impact Opportunities</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  ({opportunities.length} avenues)
                </span>
              </div>
              {collapsedSections['opportunities'] ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </div>
            {!collapsedSections['opportunities'] && (
              <div className="report-item-list">
                {opportunities.length > 0 ? (
                  opportunities.map((opp, idx) => (
                    <div key={idx} className="report-item opportunity">
                      <span className="report-item-icon" style={{ color: '#34d399' }}>🚀</span>
                      <div>{safeRenderText(opp)}</div>
                    </div>
                  ))
                ) : (
                  <div className="report-item opportunity">
                    <span className="report-item-icon" style={{ color: '#34d399' }}>🚀</span>
                    <div>Strategic growth vectors and market positioning aligned.</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Optional SWOT Matrix for Business Documents */}
          <SwotSection analysis={analysis} />

          {/* 6. RECOMMENDATIONS */}
          <div className="report-section-card">
            <div className="report-section-title" onClick={() => toggleSection('recommendations')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={17} color="#818cf8" />
                <span>6. Strategic Recommendations</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  ({recommendations.length} actionable items)
                </span>
              </div>
              {collapsedSections['recommendations'] ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </div>
            {!collapsedSections['recommendations'] && (
              <div className="report-item-list">
                {recommendations.length > 0 ? (
                  recommendations.map((rec, idx) => (
                    <div key={idx} className="report-item recommendation">
                      <span className="report-item-icon" style={{ color: '#818cf8' }}>✓</span>
                      <div>{safeRenderText(rec)}</div>
                    </div>
                  ))
                ) : (
                  <div className="report-item recommendation">
                    <span className="report-item-icon" style={{ color: '#818cf8' }}>✓</span>
                    <div>Proceed with stakeholder demonstration and roadmap alignment.</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 7. ACTION PLAN */}
          <div className="report-section-card">
            <div className="report-section-title" onClick={() => toggleSection('actions')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowRight size={17} color="#38bdf8" />
                <span>7. Step-by-Step Action Plan</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  ({actionPlan.length} milestones)
                </span>
              </div>
              {collapsedSections['actions'] ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </div>
            {!collapsedSections['actions'] && (
              <div className="report-item-list">
                {actionPlan.length > 0 ? (
                  actionPlan.map((action, idx) => (
                    <div key={idx} className="report-item action">
                      <div className="action-step-badge">{idx + 1}</div>
                      <div>{safeRenderText(action)}</div>
                    </div>
                  ))
                ) : (
                  <div className="report-item action">
                    <div className="action-step-badge">1</div>
                    <div>Initiate stakeholder briefing and schedule demonstration follow-up.</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 8. FOLLOW-UP QUESTIONS */}
          <div className="report-section-card">
            <div className="report-section-title" onClick={() => toggleSection('questions')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={17} color="#c084fc" />
                <span>8. Key Follow-up Questions for Stakeholders</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  ({followUpQuestions.length} questions)
                </span>
              </div>
              {collapsedSections['questions'] ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </div>
            {!collapsedSections['questions'] && (
              <div className="report-item-list">
                {followUpQuestions.map((q, idx) => (
                  <div key={idx} className="report-item">
                    <span className="report-item-icon" style={{ color: '#c084fc' }}>❓</span>
                    <div style={{ fontStyle: 'italic' }}>"{safeRenderText(q)}"</div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

// ─── DOCUMENT CARD COMPONENT ──────────────────────────────────────────────────
const DocumentCard = ({ doc: initialDoc, onViewAnalysis, onReanalyze, onDelete }) => {
  const [doc, setDoc] = useState(initialDoc);
  const [debugInfo, setDebugInfo] = useState({});
  const isActive = doc.analysis_status === 'processing' || doc.analysis_status === 'pending';
  const pollRef = useRef(null);

  useEffect(() => { setDoc(initialDoc); }, [initialDoc]);

  useEffect(() => {
    if (!isActive) return;

    const poll = async () => {
      try {
        const status = await fetchDocumentStatus(doc.id);
        setDoc(prev => ({ 
          ...prev, 
          analysis_status: status.analysis_status, 
          error_message: status.error_message 
        }));
        setDebugInfo(status.debug_info || {});

        if (status.analysis_status === 'complete' || status.analysis_status === 'failed') {
          clearInterval(pollRef.current);
          onReanalyze(doc.id, status.analysis_status);
        }
      } catch (e) {
        // ignore transient errors
      }
    };

    poll();
    pollRef.current = setInterval(poll, 2500);
    return () => clearInterval(pollRef.current);
  }, [doc.id, isActive, onReanalyze]);

  return (
    <div className="glass-panel card-3d-document floating-3d-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        
        {/* Document Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '240px' }}>
          <FileIcon type={doc.file_type} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {doc.filename}
              </span>
              <StatusBadge status={doc.analysis_status} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>{formatSize(doc.file_size)}</span>
              <span>&bull;</span>
              <span>{new Date(doc.upload_date).toLocaleDateString()}</span>
              {doc.chunk_count > 0 && (
                <>
                  <span>&bull;</span>
                  <span>{doc.chunk_count} verified sections</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {doc.analysis_status === 'complete' && (
            <button
              onClick={() => onViewAnalysis(doc.id, doc.filename)}
              className="btn-primary"
              style={{ fontSize: '0.82rem', padding: '7px 16px' }}
            >
              <Sparkles size={14} />
              <span>View Executive Report</span>
            </button>
          )}

          {(doc.analysis_status === 'failed' || doc.analysis_status === 'complete') && (
            <button
              onClick={() => onReanalyze(doc.id, 'pending')}
              className="btn-secondary"
              style={{ fontSize: '0.82rem', padding: '7px 12px' }}
              title="Re-run analysis"
            >
              <RotateCcw size={14} />
              <span>Re-analyze</span>
            </button>
          )}

          <button
            onClick={() => onDelete(doc.id)}
            className="btn-icon"
            style={{ width: '34px', height: '34px', color: '#f87171' }}
            title="Delete Document"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* When active or analyzing: Display User-Friendly Agent Stepper */}
      {isActive && (
        <AgentExecutionProgress status={doc.analysis_status} debugInfo={debugInfo} />
      )}
    </div>
  );
};

// ─── HERO DOCUMENT INTELLIGENCE MAIN PAGE ─────────────────────────────────────
export default function DocumentIntelligencePage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [selectedDocName, setSelectedDocName] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef();

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      const data = await fetchDocuments();
      setDocuments(data);
    } catch (e) {
      showToast('Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadMsg(`Processing "${file.name}"...`);

    try {
      await uploadDocument(file);
      showToast(`"${file.name}" uploaded successfully! Generating analysis...`);
      await loadDocuments();
    } catch (err) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      setUploadMsg('');
    }
  };

  const handleViewAnalysis = async (docId, filename) => {
    setAnalysisLoading(true);
    try {
      const analysis = await fetchDocumentAnalysis(docId);
      setSelectedAnalysis(analysis);
      setSelectedDocName(filename);
    } catch (e) {
      showToast('Failed to load document analysis', 'error');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleReanalyze = async (docId, newStatus) => {
    if (newStatus === 'pending') {
      try {
        await reanalyzeDocument(docId);
        showToast('Analysis re-triggered!');
        setDocuments(prev => prev.map(d =>
          d.id === docId ? { ...d, analysis_status: 'processing' } : d
        ));
      } catch (e) {
        showToast('Failed to trigger re-analysis', 'error');
      }
    } else {
      await loadDocuments();
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this document and its associated intelligence?')) return;
    try {
      await deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      showToast('Document deleted.');
    } catch (e) {
      showToast('Failed to delete document', 'error');
    }
  };

  const filteredDocs = documents.filter(d => {
    if (filter === 'all') return true;
    if (filter === 'complete') return d.analysis_status === 'complete';
    if (filter === 'processing') return d.analysis_status === 'processing' || d.analysis_status === 'pending';
    return d.doc_type === filter;
  });

  return (
    <div className="view-canvas">
      <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* Hero Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white'
              }}>
                <Sparkles size={20} />
              </div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                Document Intelligence
              </h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Autonomous multi-format extraction, executive synthesis, risk assessment, and action planning.
            </p>
          </div>

          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            disabled={uploading}
            className="btn-primary"
            style={{ padding: '10px 20px', fontSize: '0.9rem' }}
          >
            <UploadCloud size={17} />
            <span>{uploading ? 'Analyzing...' : 'Upload Document'}</span>
          </button>
        </div>

        {/* Upload Drop Zone */}
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
          style={{
            border: '2px dashed var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '36px 24px',
            textAlign: 'center',
            background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.04) 0%, rgba(11, 15, 25, 0.4) 100%)',
            cursor: uploading ? 'default' : 'pointer',
            transition: 'all 0.25s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
          />
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.12)',
            color: '#818cf8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px auto'
          }}>
            <UploadCloud size={26} />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {uploading ? uploadMsg : 'Drop files here or click to upload'}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: '0 auto 14px auto', maxWidth: 460 }}>
            Supports PDF, DOCX, TXT, CSV, and XLSX. AI generates instant summaries, risk reviews, and recommendations.
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['PDF Documents', 'Executive Decks', 'Business Contracts', 'Resumes & Profiles', 'Data Sheets'].map((tag) => (
              <span key={tag} style={{
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                background: 'var(--bg-tertiary)',
                padding: '3px 10px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Filter Navigation */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'all', label: 'All Documents' },
            { id: 'complete', label: 'Analyzed' },
            { id: 'processing', label: 'In Progress' },
            { id: 'business_document', label: 'Business Strategy' },
            { id: 'resume', label: 'Resumes' },
            { id: 'research_paper', label: 'Research Papers' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`btn-secondary ${filter === f.id ? 'active' : ''}`}
              style={{
                fontSize: '0.78rem',
                padding: '6px 14px',
                background: filter === f.id ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-tertiary)',
                borderColor: filter === f.id ? '#818cf8' : 'var(--border-color)',
                color: filter === f.id ? '#818cf8' : 'var(--text-secondary)'
              }}
            >
              {f.label}
            </button>
          ))}
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {filteredDocs.length} {filteredDocs.length === 1 ? 'document' : 'documents'}
          </span>
        </div>

        {/* Documents List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <Clock size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <div>Loading verified documents...</div>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-color)'
          }}>
            <FileSearch size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              No documents found
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              Upload a document above to experience autonomous executive synthesis.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredDocs.map(doc => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onViewAnalysis={handleViewAnalysis}
                onReanalyze={handleReanalyze}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Modal Loading Overlay */}
        {analysisLoading && (
          <div className="report-modal-backdrop">
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '36px 48px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-lg)'
            }}>
              <Sparkles size={32} color="#818cf8" className="animate-spin" style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Retrieving Executive Report...
              </div>
            </div>
          </div>
        )}

        {/* Hero Report Modal */}
        {selectedAnalysis && (
          <DocumentReportModal
            analysis={selectedAnalysis}
            filename={selectedDocName}
            onClose={() => setSelectedAnalysis(null)}
          />
        )}

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            zIndex: 3000,
            background: toast.type === 'error' ? '#ef4444' : '#10b981',
            color: 'white',
            borderRadius: 'var(--radius-md)',
            padding: '12px 20px',
            fontSize: '0.86rem',
            fontWeight: 600,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            <span>{toast.msg}</span>
          </div>
        )}

      </div>
    </div>
  );
}
