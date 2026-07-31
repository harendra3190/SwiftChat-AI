import React, { Component } from 'react';
import { AlertTriangle, Home } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-sc-bg text-sc-text p-4">
          <AlertTriangle className="text-red-500 mb-4" size={64} />
          <h1 className="text-3xl font-bold mb-2">Oops! Something went wrong.</h1>
          <p className="text-sc-muted mb-6 text-center max-w-md">
            We've encountered an unexpected error. Our system has logged the issue, but for now, you can try refreshing the page or returning home.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="bg-sc-hover text-sc-text px-6 py-3 rounded-lg hover:bg-sc- transition flex items-center justify-center"
            >
              Refresh Page
            </button>
            <button 
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              <Home size={20} /> Return Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
