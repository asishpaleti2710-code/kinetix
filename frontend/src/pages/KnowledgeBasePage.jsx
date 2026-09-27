import React, { useEffect, useState, useRef } from 'react';
import { 
  BookOpen, 
  UploadCloud, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  Database, 
  Search, 
  Sparkles,
  Layers,
  AlertCircle
} from 'lucide-react';
import { fetchDocuments, uploadDocument, deleteDocument, sendChatMessage } from '../services/api';

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  
  // RAG Query Tester state
  const [ragQuery, setRagQuery] = useState('');
  const [ragTesting, setRagTesting] = useState(false);
  const [ragResults, setRagResults] = useState(null);

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

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF documents are supported for ChromaDB semantic indexing.');
      return;
    }

    try {
      setUploading(true);
      setUploadError('');
      setUploadSuccess('');
      const uploaded = await uploadDocument(file);
      setDocuments([uploaded, ...documents.filter(d => d.filename !== uploaded.filename)]);
      setUploadSuccess(`Successfully ingested "${uploaded.filename}" into ChromaDB with ${uploaded.chunk_count} semantic chunks.`);
    } catch (err) {
      setUploadError(err.message || 'Failed to parse and vectorize PDF');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, filename) => {
    if (window.confirm(`Delete document "${filename}" and clear its vectors from ChromaDB?`)) {
      try {
        await deleteDocument(id);
        setDocuments(documents.filter(d => d.id !== id));
      } catch (err) {
        alert('Failed to delete document');
      }
    }
  };

  const handleTestRagQuery = async (e) => {
    e.preventDefault();
    if (!ragQuery.trim()) return;

    try {
      setRagTesting(true);
      const res = await sendChatMessage({
        message: ragQuery,
        session_id: 'rag_tester_session'
      });
      setRagResults(res);
    } catch (err) {
      alert('RAG retrieval test failed');
    } finally {
      setRagTesting(false);
    }
  };

  return (
    <div className="view-canvas">
      {/* Upload Zone */}
      <div className="glass-panel" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Database size={20} color="#818cf8" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Company Knowledge Base & ChromaDB Ingestion</h3>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Upload company product manuals, feature sheets, pricing guidelines, or security whitepapers. The system automatically chunks the text, computes embeddings, and stores vectors into ChromaDB for real-time RAG grounding.
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
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#818cf8'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
            accept=".pdf"
            style={{ display: 'none' }}
          />

          <UploadCloud size={40} color="#818cf8" style={{ margin: '0 auto 12px auto' }} />
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
            {uploading ? 'Processing PDF & Vectorizing into ChromaDB...' : 'Click or drag & drop PDF documents here'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Supported format: PDF (up to 25MB). Auto-chunked into semantic overlapping passages.
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
            <h4 style={{ fontWeight: 700 }}>Indexed Knowledge Assets</h4>
            <span className="badge badge-agent">{documents.length} Files</span>
          </div>

          <table className="custom-table">
            <thead>
              <tr>
                <th>Document File</th>
                <th>Chunks in ChromaDB</th>
                <th>Size</th>
                <th>Actions</th>
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
                        <FileText size={18} color="#f43f5e" />
                        <div>
                          <div style={{ fontWeight: 600 }}>{doc.filename}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {new Date(doc.upload_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Layers size={14} color="#818cf8" />
                        <span style={{ fontWeight: 700 }}>{doc.chunk_count}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>vectors</span>
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
                    No PDF documents uploaded yet. Upload one above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Live RAG Vector Search Tester */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Sparkles size={18} color="#a855f7" />
            <h4 style={{ fontWeight: 700 }}>Test RAG Grounding</h4>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Simulate a customer question to see how the Knowledge Agent searches ChromaDB and returns grounded citations.
          </p>

          <form onSubmit={handleTestRagQuery} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="e.g. What is the price of the Growth Tier?"
              value={ragQuery}
              onChange={(e) => setRagQuery(e.target.value)}
              className="chat-input"
            />
            <button type="submit" disabled={ragTesting} className="btn-primary" style={{ justifyContent: 'center' }}>
              <Search size={15} />
              <span>{ragTesting ? 'Searching ChromaDB...' : 'Execute Vector Retrieval'}</span>
            </button>
          </form>

          {ragResults && (
            <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.84rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="badge badge-agent">Agent: {ragResults.routed_agent}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Intent: {ragResults.detected_intent}</span>
              </div>
              <div style={{ lineHeight: 1.5, marginBottom: '10px', color: 'var(--text-primary)' }}>
                {ragResults.response}
              </div>
              {ragResults.tools_executed && ragResults.tools_executed.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                  ✓ Tool Executed: {ragResults.tools_executed.map(t => t.tool).join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
