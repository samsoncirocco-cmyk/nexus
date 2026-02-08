'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * Catches React errors and displays a themed fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Could also log to external service here
    // e.g., Sentry, LogRocket, etc.
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state if resetKeys change
    if (this.state.hasError && prevProps.resetKeys !== this.props.resetKeys) {
      this.setState({ hasError: false, error: null });
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <ErrorFallback 
          error={this.state.error} 
          resetError={this.resetErrorBoundary} 
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default Error Fallback UI
 * Themed error display with retry functionality
 */
interface ErrorFallbackProps {
  error: Error | null;
  resetError: () => void;
}

function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Error Card */}
        <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-2xl p-8 border border-red-500/20 relative overflow-hidden animate-scale-in">
          {/* Background glow effect */}
          <div className="absolute -right-8 -top-8 size-32 bg-red-500/10 rounded-full blur-3xl" />
          <div className="absolute -left-8 -bottom-8 size-24 bg-primary/5 rounded-full blur-2xl" />
          
          <div className="relative z-10">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="size-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center animate-shake">
                <span 
                  className="material-symbols-outlined text-red-400" 
                  style={{ fontSize: 48, fontVariationSettings: "'FILL' 1" }}
                >
                  error
                </span>
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-center text-2xl md:text-3xl font-bold text-white mb-3 font-display">
              Something Went Wrong
            </h1>
            
            <p className="text-center text-primary/70 text-sm mb-6">
              The application encountered an unexpected error. Don&apos;t worry, your data is safe.
            </p>

            {/* Error details (collapsible) */}
            {error && (
              <details className="mb-6 group">
                <summary className="cursor-pointer text-primary/50 text-xs font-medium hover:text-primary/70 transition-colors flex items-center gap-2 justify-center mb-2">
                  <span className="material-symbols-outlined group-open:rotate-180 transition-transform" style={{ fontSize: 16 }}>
                    expand_more
                  </span>
                  Technical Details
                </summary>
                <div className="bg-secondary-dark-deep border border-red-500/20 rounded-lg p-4 mt-2">
                  <p className="text-red-300 text-xs font-mono mb-2 font-semibold">
                    {error.name}: {error.message}
                  </p>
                  {error.stack && (
                    <pre className="text-red-400/60 text-[10px] font-mono overflow-x-auto max-h-32 overflow-y-auto hide-scrollbar">
                      {error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={resetError}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-bg-dark rounded-xl font-semibold text-sm hover:bg-primary-muted transition-all active:scale-95 shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  refresh
                </span>
                Try Again
              </button>
              
              <button
                onClick={handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-secondary-dark border border-primary/20 text-white rounded-xl font-semibold text-sm hover:bg-secondary-dark/80 hover:border-primary/30 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  restart_alt
                </span>
                Reload Page
              </button>
            </div>

            {/* Go home link */}
            <button
              onClick={handleGoHome}
              className="w-full mt-3 flex items-center justify-center gap-1 text-primary/60 text-xs font-medium hover:text-primary transition-colors group"
            >
              <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform" style={{ fontSize: 14 }}>
                arrow_back
              </span>
              Return to Dashboard
            </button>
          </div>
        </div>

        {/* Help text */}
        <div className="mt-6 text-center">
          <p className="text-primary/40 text-xs">
            If this issue persists, check the browser console or contact support.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Page Error Boundary
 * Lighter version for page-level errors (doesn't take over full screen)
 */
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-6 max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-6 border border-red-500/20 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 size-20 bg-red-500/10 rounded-full blur-2xl" />
            
            <div className="relative z-10 flex items-start gap-4">
              <div className="size-12 shrink-0 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <span 
                  className="material-symbols-outlined text-red-400" 
                  style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}
                >
                  error
                </span>
              </div>
              
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-1">
                  Page Error
                </h3>
                <p className="text-primary/70 text-sm mb-4">
                  This page encountered an error. Try refreshing or return to the dashboard.
                </p>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-bg-dark rounded-lg font-semibold text-sm hover:bg-primary-muted transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      refresh
                    </span>
                    Refresh Page
                  </button>
                  
                  <button
                    onClick={() => window.location.href = '/'}
                    className="flex items-center gap-1.5 px-4 py-2 bg-secondary-dark border border-primary/20 text-white rounded-lg font-semibold text-sm hover:border-primary/30 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      home
                    </span>
                    Go Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
