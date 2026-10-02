import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '32px',
          margin: '24px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px',
          textAlign: 'center',
          color: '#f87171'
        }}>
          <AlertTriangle size={32} style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fca5a5', marginBottom: '8px' }}>
            Component Display Exception
          </h3>
          <p style={{ fontSize: '0.84rem', color: '#94a3b8', maxWidth: '500px', margin: '0 auto 16px auto' }}>
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={this.handleReset}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 16px' }}
          >
            <RotateCcw size={14} />
            <span>Reset View</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
