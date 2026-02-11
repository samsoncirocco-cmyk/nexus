'use client';

import { useEffect } from 'react';

/**
 * Global Error Page
 * Handles errors in the root layout
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global Error:', error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased overflow-x-hidden bg-[#0a0f0c] text-white font-sans">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            {/* Error Card */}
            <div 
              className="rounded-2xl p-8 border relative overflow-hidden"
              style={{
                background: 'linear-gradient(to bottom right, #154733, #0a0f0c)',
                borderColor: 'rgba(239, 68, 68, 0.2)',
              }}
            >
              {/* Background glow effect */}
              <div 
                className="absolute -right-8 -top-8 rounded-full blur-3xl"
                style={{
                  width: '8rem',
                  height: '8rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                }}
              />
              <div 
                className="absolute -left-8 -bottom-8 rounded-full blur-2xl"
                style={{
                  width: '6rem',
                  height: '6rem',
                  background: 'rgba(250, 222, 41, 0.05)',
                }}
              />
              
              <div className="relative z-10">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div 
                    className="rounded-2xl border flex items-center justify-center"
                    style={{
                      width: '5rem',
                      height: '5rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderColor: 'rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    <span 
                      className="material-symbols-outlined"
                      style={{ 
                        fontSize: 48, 
                        color: '#f87171',
                        fontVariationSettings: "'FILL' 1",
                      }}
                    >
                      error
                    </span>
                  </div>
                </div>

                {/* Heading */}
                <h1 
                  className="text-center text-2xl md:text-3xl font-bold mb-3"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Critical Error
                </h1>
                
                <p className="text-center text-sm mb-6" style={{ color: 'rgba(250, 222, 41, 0.7)' }}>
                  A critical error occurred in the application. This is a root-level error.
                </p>

                {/* Error message */}
                <div 
                  className="border rounded-lg p-4 mb-6"
                  style={{
                    background: '#004F27',
                    borderColor: 'rgba(239, 68, 68, 0.2)',
                  }}
                >
                  <p 
                    className="text-xs font-mono mb-2 font-semibold"
                    style={{ color: '#fca5a5' }}
                  >
                    {error.message}
                  </p>
                  {error.digest && (
                    <p 
                      className="text-[10px] font-mono"
                      style={{ color: 'rgba(248, 113, 113, 0.6)' }}
                    >
                      Error ID: {error.digest}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={reset}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
                    style={{
                      background: '#fade29',
                      color: '#0a0f0c',
                      boxShadow: '0 10px 30px rgba(250, 222, 41, 0.2)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      refresh
                    </span>
                    Try Again
                  </button>
                  
                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border rounded-xl font-semibold text-sm transition-all"
                    style={{
                      background: '#154733',
                      borderColor: 'rgba(250, 222, 41, 0.2)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      restart_alt
                    </span>
                    Reload Page
                  </button>
                </div>
              </div>
            </div>

            {/* Help text */}
            <div className="mt-6 text-center">
              <p className="text-xs" style={{ color: 'rgba(250, 222, 41, 0.4)' }}>
                If this issue persists, contact support.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
