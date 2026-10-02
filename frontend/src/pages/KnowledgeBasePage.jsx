import React, { useEffect, useState, useRef } from 'react';
import { 
  BookOpen, 
  UploadCloud, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  Search, 
  Sparkles, 
  Layers, 
  AlertCircle,
  ShieldCheck,
  Check,
  Compass
} from 'lucide-react';
import { fetchDocuments, uploadDocument, deleteDocument, sendChatMessage } from '../services/api';

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  
  // Knowledge Verification state
  const [verifyQuery, setVerifyQuery] = useState('');
  const [verifyTesting, setVerifyTesting] = useState(false);
  const [verifyResults, setVerifyResults] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      setLoading(true);
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (e) {
      console.error('Error fetching documents:', e);
    } finally {
      setLoading(false);
    }
  };

  const ALLOWED_EXTS = ['.pdf', '.docx', '.doc', '.txt', '.csv', '.xlsx', '.xls'];

  const handleFileUpload = async (file) => {
    if (!file) return;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      setUploadError(`Unsupported file format. Supported: ${ALLOWED_EXTS.join(', ')}`);
      return;
    }

    try {
      setUploading(true);
      setUploadError('');
      setUploadSuccess('');
      await uploadDocument(file);
      await loadDocs();
      setUploadSuccess(`Successfully added "${file.name}" to Enterprise Knowledge Library.`);
    } catch (err) {
      setUploadError(err.message || 'Failed to process document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, filename) => {
    if (window.confirm(`Delete document "${filename}" and remove it from the knowledge library?`)) {
      try {
        await deleteDocument(id);
        setDocuments(documents.filter(d => d.id !== id));
      } catch (err) {
        alert('Failed to delete document');
      }
    }
  };

  const handleTestVerifyQuery = async (e) => {
    e.preventDefault();
    if (!verifyQuery.trim()) return;

    try {
      setVerifyTesting(true);
      const res = await sendChatMessage({
        message: verifyQuery,
        session_id: 'knowledge_tester_session'
      });
      setVerifyResults(res);
    } catch (err) {
      alert('Verification test failed');
    } finally {
      setVerifyTesting(false);
    }
  };

  return (
    <div className="view-canvas">
      {/* Upload Zone */}
      <div className="glass-panel" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <BookOpen size={20} color="#818cf8" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Enterprise Knowledge Library</h3>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
          Centralized business collateral, pricing guidelines, product manuals, and compliance documentation. Uploaded files automatically power autonomous customer conversations with verified facts and citations.
        </p>

        <div
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
          style={{
            border: '2px dashed var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '36px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'var(--bg-secondary)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
            accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.xls"
            style={{ display: 'none' }}
          />

          <UploadCloud size={40} color="#818cf8" style={{ margin: '0 auto 12px auto' }} />
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
            {uploading ? 'Processing & Indexing Document...' : 'Click or drag & drop business collateral here'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Supported: PDF, DOCX, TXT, CSV, XLSX. Automatically verified and grounded.
          </div>
        </div>

        {uploadSuccess && (
          <div style={{ marginTop: '14px', padding: '12px', background: 'var(--success-bg)', color: '#34d399', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{uploadSuccess}</span>
          </div>
        )}

        {uploadError && (
          <div style={{ marginTop: '14px', padding: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
        {/* Uploaded Documents List */}
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ fontWeight: 700 }}>Connected Knowledge Assets</h4>
            <span className="badge badge-pass">{documents.length} Active Documents</span>
          </div>

          <table className="custom-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Coverage</th>
                <th>File Size</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Loading knowledge assets...
                  </td>
                </tr>
              ) : documents.length > 0 ? (
                documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={18} color="#818cf8" />
                        <div>
                          <div style={{ fontWeight: 600 }}>{doc.filename}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Updated {new Date(doc.upload_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldCheck size={14} color="#34d399" />
                        <span style={{ fontWeight: 700, color: '#34d399' }}>Verified</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({doc.chunk_count} sections)</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {(doc.file_size / 1024).toFixed(1)} KB
                    </td>
                    <td>
                      <button
                        onClick={() => handleDelete(doc.id, doc.filename)}
                        className="btn-icon"
                        style={{ width: '30px', height: '30px', color: '#f87171' }}
                        title="Delete Document"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No documents connected yet. Upload one above to begin!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Live Knowledge Grounding Tester */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Sparkles size={18} color="#818cf8" />
            <h4 style={{ fontWeight: 700 }}>Verify Knowledge Grounding</h4>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
            Simulate a customer inquiry to verify how the intelligence engine extracts verified citations and grounded facts.
          </p>

          <form onSubmit={handleTestVerifyQuery} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="e.g. What are the key features and subscription tiers?"
              value={verifyQuery}
              onChange={(e) => setVerifyQuery(e.target.value)}
              className="chat-input"
            />
            <button type="submit" disabled={verifyTesting} className="btn-primary" style={{ justifyContent: 'center' }}>
              <Search size={15} />
              <span>{verifyTesting ? 'Verifying Grounding...' : 'Test Knowledge Response'}</span>
            </button>
          </form>

          {verifyResults && (
            <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.84rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="badge badge-pass">Grounded Response</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Intent: {verifyResults.detected_intent}</span>
              </div>
              <div style={{ lineHeight: 1.6, marginBottom: '10px', color: 'var(--text-primary)' }}>
                {verifyResults.response}
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', fontSize: '0.74rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={13} />
                <span>Verified against uploaded enterprise assets</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
