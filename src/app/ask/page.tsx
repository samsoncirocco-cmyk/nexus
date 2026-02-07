'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: Date;
}

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setInput('');
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: question, timestamp: new Date() },
    ]);
    setLoading(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Error: ${data.error}`,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.answer,
            sources: data.sources,
            timestamp: new Date(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Failed to reach the AI. Check your connection.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const formatContent = (text: string) => {
    // Convert markdown-ish formatting to simple HTML
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-secondary-dark text-primary px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/\[([^\]]+\.md)\]/g, '<span class="text-primary/80 text-sm font-mono">[$1]</span>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Header */}
      <div className="shrink-0 border-b border-border-subtle px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>
              neurology
            </span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Ask Your Brain</h1>
            <p className="text-xs text-foreground-muted">
              AI-powered search across your entire vault
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="size-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-foreground-muted">Gemini 2.0 Flash</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-60">
            <div className="size-20 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 40 }}>
                psychology
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Your Brain is Ready</h2>
              <p className="text-sm text-foreground-muted max-w-md">
                Ask anything about your vault — deals, accounts, projects, concepts, journal entries.
                The AI will search all 50+ documents and give you answers with sources.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
              {[
                'What E-Rate leads are hottest right now?',
                'Summarize my book progress',
                'What are my key objection handling strategies?',
                'What did I work on this week?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    inputRef.current?.focus();
                  }}
                  className="text-left text-xs px-3 py-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 text-foreground-muted hover:text-foreground transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] md:max-w-[70%] ${
                msg.role === 'user'
                  ? 'bg-primary/15 border border-primary/20 rounded-2xl rounded-br-md px-4 py-3'
                  : 'bg-bg-secondary border border-border-subtle rounded-2xl rounded-bl-md px-4 py-3'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>
                    neurology
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60">
                    Second Brain
                  </span>
                </div>
              )}
              <div
                className={`text-sm leading-relaxed ${
                  msg.role === 'user' ? 'text-foreground' : 'text-foreground/90'
                }`}
                dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
              />
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border-subtle">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted mb-1.5">
                    Sources
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((src) => (
                      <a
                        key={src}
                        href={`/doc/${src.replace(/\.md$/, '')}`}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-secondary-dark/40 border border-primary/10 text-primary/80 hover:text-primary hover:border-primary/30 transition-colors font-mono"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                          description
                        </span>
                        {src.replace(/\.md$/, '').split('/').pop()}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-bg-secondary border border-border-subtle rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>
                  neurology
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60">
                  Second Brain
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground-muted">
                <div className="flex gap-1">
                  <div className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs">Searching vault...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border-subtle px-4 md:px-6 py-4 bg-bg-dark/80 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="flex items-center gap-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your brain anything..."
              disabled={loading}
              className="w-full rounded-xl border border-border bg-bg-secondary px-4 py-3 pr-12 text-sm text-foreground placeholder:text-foreground-muted/50 outline-none focus:border-primary/50 focus:shadow-[0_0_0_3px_rgba(250,222,41,0.1)] transition-all disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="size-11 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-primary/20 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-[0_0_12px_rgba(250,222,41,0.2)] hover:shadow-[0_0_20px_rgba(250,222,41,0.3)] disabled:shadow-none"
          >
            <span className="material-symbols-outlined text-bg-dark font-bold" style={{ fontSize: 20 }}>
              {loading ? 'hourglass_top' : 'arrow_upward'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
