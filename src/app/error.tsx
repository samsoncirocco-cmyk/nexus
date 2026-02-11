'use client';

import { useEffect } from 'react';

/**
 * Next.js Error Page
 * Handles errors at the app level
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console
    console.error('App Error:', error);
  }, [error]);

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
            <details className="mb-6 group">
              <summary className="cursor-pointer text-primary/50 text-xs font-medium hover:text-primary/70 transition-colors flex items-center gap-2 justify-center mb-2">
                <span className="material-symbols-outlined group-open:rotate-180 transition-transform" style={{ fontSize: 16 }}>
                  expand_more
                </span>
                Technical Details
              </summary>
              <div className="bg-secondary-dark-deep border border-red-500/20 rounded-lg p-4 mt-2">
                <p className="text-red-300 text-xs font-mono mb-2 font-semibold">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-red-400/60 text-[10px] font-mono">
                    Error ID: {error.digest}
                  </p>
                )}
                {error.stack && (
                  <pre className="text-red-400/60 text-[10px] font-mono overflow-x-auto max-h-32 overflow-y-auto hide-scrollbar mt-2">
                    {error.stack}
                  </pre>
                )}
              </div>
            </details>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={reset}
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
