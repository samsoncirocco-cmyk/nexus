'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface ChatMessage {
  id: string;
  text: string;
  from: 'user' | 'paul';
  timestamp: string;
  status: string;
}

interface ContextMetadata {
  emailCount: number;
  calendarCount: number;
  taskCount: number;
}

interface GatewayStatus {
  connected: boolean;
  mode: 'gateway' | 'gemini-fallback';
}

const STORAGE_KEY = 'second-brain-chat-history';
const POLL_INTERVAL = 5000;
const STATUS_CHECK_INTERVAL = 30000; // Check gateway status every 30s

function formatTime(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (isToday) return time;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;

  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

function formatContent(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-secondary-dark text-primary px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/\[([^\]]+\.md)\]/g, '<span class="text-primary/70 text-xs font-mono">[$1]</span>')
    .replace(/\n/g, '<br />');
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [contextMetadata, setContextMetadata] = useState<ContextMetadata | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string | null>(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
          if (parsed.length > 0) {
            lastTimestampRef.current = parsed[parsed.length - 1].timestamp;
          }
        }
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (loaded && messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, loaded]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Check gateway status
  const checkGatewayStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/chat');
      if (!res.ok) return;
      const data: GatewayStatus = await res.json();
      setGatewayStatus(data);
    } catch { /* silent */ }
  }, []);

  // Poll for new messages
  const pollMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (lastTimestampRef.current) {
        params.set('since', lastTimestampRef.current);
      }
      const res = await fetch(`/api/chat?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.messages?.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMsgs = data.messages.filter((m: ChatMessage) => !existingIds.has(m.id));
          if (newMsgs.length === 0) return prev;

          const merged = [...prev, ...newMsgs];
          merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          lastTimestampRef.current = merged[merged.length - 1].timestamp;
          return merged;
        });
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const interval = setInterval(pollMessages, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [pollMessages]);

  // Check gateway status on mount and periodically
  useEffect(() => {
    checkGatewayStatus();
    const interval = setInterval(checkGatewayStatus, STATUS_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkGatewayStatus]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      text,
      from: 'user',
      timestamp: new Date().toISOString(),
      status: 'sending',
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          messages: messages.slice(-10), // Send last 10 messages for context
        }),
      });

      const data = await res.json();

      if (data.error) {
        // Replace temp message with error
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
          const errorMsg: ChatMessage = {
            id: `err_${Date.now()}`,
            text: `Error: ${data.error}`,
            from: 'paul',
            timestamp: new Date().toISOString(),
            status: 'error',
          };
          return [...filtered, { ...tempUserMsg, id: data.userMessage?.id || tempUserMsg.id, status: 'sent' }, errorMsg];
        });
      } else {
        // Update context metadata if provided
        if (data.metadata) {
          setContextMetadata(data.metadata);
        }

        // Update gateway status if provided
        if (data.gatewayStatus) {
          setGatewayStatus(data.gatewayStatus);
        }

        // Replace temp with real messages
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
          const newMsgs = [data.userMessage, data.aiResponse].filter(Boolean);
          const existingIds = new Set(filtered.map((m) => m.id));
          const toAdd = newMsgs.filter((m: ChatMessage) => !existingIds.has(m.id));
          const merged = [...filtered, ...toAdd];
          merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          lastTimestampRef.current = merged[merged.length - 1]?.timestamp || null;
          return merged;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          text: 'Failed to send. Check your connection.',
          from: 'paul',
          timestamp: new Date().toISOString(),
          status: 'error',
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearHistory = () => {
    if (window.confirm('Clear all chat history?')) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
      lastTimestampRef.current = null;
      setContextMetadata(null);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Header */}
      <div className="shrink-0 border-b border-border-subtle bg-bg-dark/80 backdrop-blur-md px-4 md:px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-secondary-dark/60 border border-primary/20 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>
              chat_bubble
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-foreground">Paul</h1>
              <div className={`size-2 rounded-full ${
                gatewayStatus?.connected 
                  ? 'bg-emerald-500 animate-pulse' 
                  : 'bg-amber-500'
              }`} />
            </div>
            <p className="text-[11px] text-foreground-muted">
              {gatewayStatus?.connected 
                ? 'Connected via OpenClaw Gateway' 
                : gatewayStatus?.mode === 'gemini-fallback'
                ? 'Fallback mode (Gemini)'
                : 'Connecting...'}
            </p>
          </div>
          <button
            onClick={clearHistory}
            className="size-9 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors"
            title="Clear chat history"
          >
            <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 18 }}>
              delete_sweep
            </span>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-3 md:px-6 py-4 space-y-3"
      >
        {/* Empty State */}
        {loaded && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-5 opacity-70 px-4">
            <div className="size-20 rounded-full bg-secondary-dark/30 border border-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 40 }}>
                waving_hand
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1">Hey Samson 🦆</h2>
              <p className="text-sm text-foreground-muted max-w-sm">
                I&apos;ve got full visibility into your emails, calendar, tasks, and vault. What&apos;s up?
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
              {[
                "What's on my plate today?",
                'Any urgent emails I missed?',
                'What tasks should I tackle first?',
                "What's the latest from my team?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    inputRef.current?.focus();
                  }}
                  className="text-left text-xs px-3 py-2.5 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 text-foreground-muted hover:text-foreground transition-all"
                >
                  💬 {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Bubbles */}
        {messages.map((msg, idx) => {
          const isUser = msg.from === 'user';
          const showTimestamp =
            idx === 0 ||
            new Date(msg.timestamp).getTime() - new Date(messages[idx - 1].timestamp).getTime() > 300000;

          return (
            <div key={msg.id}>
              {/* Timestamp separator */}
              {showTimestamp && (
                <div className="flex justify-center my-3">
                  <span className="text-[10px] text-foreground-muted/50 bg-bg-dark/80 px-3 py-1 rounded-full">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              )}

              <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                {/* Paul avatar */}
                {!isUser && (
                  <div className="shrink-0 mr-2 mt-1">
                    <div className="size-7 rounded-full bg-secondary-dark/60 border border-secondary-dark flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: 14 }}>
                        smart_toy
                      </span>
                    </div>
                  </div>
                )}

                <div
                  className={`max-w-[80%] md:max-w-[65%] ${
                    isUser
                      ? 'bg-primary/12 border border-primary/20 rounded-2xl rounded-br-sm'
                      : 'bg-secondary-dark/20 border border-secondary-dark/40 rounded-2xl rounded-bl-sm'
                  } px-3.5 py-2.5`}
                >
                  {/* Message content */}
                  <div
                    className={`text-sm leading-relaxed ${
                      isUser ? 'text-foreground' : 'text-foreground/90'
                    }`}
                    dangerouslySetInnerHTML={{ __html: formatContent(msg.text) }}
                  />

                  {/* Message meta */}
                  <div className={`flex items-center gap-1.5 mt-1 ${isUser ? 'justify-end' : ''}`}>
                    <span className="text-[10px] text-foreground-muted/40">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    {isUser && msg.status === 'sending' && (
                      <span className="material-symbols-outlined text-foreground-muted/30" style={{ fontSize: 12 }}>
                        schedule
                      </span>
                    )}
                    {isUser && msg.status === 'sent' && (
                      <span className="material-symbols-outlined text-foreground-muted/40" style={{ fontSize: 12 }}>
                        done
                      </span>
                    )}
                    {isUser && msg.status === 'delivered' && (
                      <span className="material-symbols-outlined text-primary/50" style={{ fontSize: 12 }}>
                        done_all
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {sending && (
          <div className="flex justify-start animate-fade-in">
            <div className="shrink-0 mr-2 mt-1">
              <div className="size-7 rounded-full bg-secondary-dark/60 border border-secondary-dark flex items-center justify-center">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 14 }}>
                  smart_toy
                </span>
              </div>
            </div>
            <div className="bg-secondary-dark/20 border border-secondary-dark/40 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="flex gap-1">
                  <div className="size-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="size-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="size-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-foreground-muted/50 ml-1">Paul is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Context Indicator */}
      {contextMetadata && (
        <div className="shrink-0 border-t border-border-subtle bg-bg-dark/60 backdrop-blur-md px-4 md:px-6 py-2">
          <button
            onClick={() => setShowContext(!showContext)}
            className="w-full flex items-center justify-between text-xs text-foreground-muted hover:text-foreground transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {showContext ? 'expand_less' : 'expand_more'}
              </span>
              <span className="font-medium">Context Active</span>
            </div>
            <div className="flex items-center gap-3">
              {contextMetadata.emailCount > 0 && (
                <span className="flex items-center gap-1">
                  <span>📧</span>
                  <span>{contextMetadata.emailCount} emails</span>
                </span>
              )}
              {contextMetadata.calendarCount > 0 && (
                <span className="flex items-center gap-1">
                  <span>📅</span>
                  <span>{contextMetadata.calendarCount} events</span>
                </span>
              )}
              {contextMetadata.taskCount > 0 && (
                <span className="flex items-center gap-1">
                  <span>✅</span>
                  <span>{contextMetadata.taskCount} tasks</span>
                </span>
              )}
            </div>
          </button>
          {showContext && (
            <div className="mt-2 pt-2 border-t border-border-subtle/30 text-[11px] text-foreground-muted space-y-1">
              <p>💡 Paul has real-time access to:</p>
              <ul className="ml-4 space-y-0.5">
                <li>• Your recent emails and who they&apos;re from</li>
                <li>• Upcoming calendar events (next 24 hours)</li>
                <li>• Open tasks and priorities</li>
                <li>• Recent agent activity and analyses</li>
                <li>• Current date and time context</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Input Bar */}
      <div className="shrink-0 border-t border-border-subtle px-3 md:px-6 py-3 bg-bg-dark/90 backdrop-blur-xl">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Paul..."
              disabled={sending}
              rows={1}
              className="w-full rounded-2xl border border-border bg-bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/40 outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_rgba(250,222,41,0.08)] transition-all disabled:opacity-50 resize-none overflow-hidden"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="size-11 shrink-0 rounded-full bg-primary hover:bg-primary/90 disabled:bg-primary/15 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-[0_0_12px_rgba(250,222,41,0.15)] hover:shadow-[0_0_20px_rgba(250,222,41,0.25)] disabled:shadow-none mb-[1px]"
          >
            <span
              className={`material-symbols-outlined font-bold ${
                sending || !input.trim() ? 'text-foreground-muted/30' : 'text-bg-dark'
              }`}
              style={{ fontSize: 20 }}
            >
              {sending ? 'more_horiz' : 'send'}
            </span>
          </button>
        </div>
        <div className="text-center mt-1.5">
          <span className="text-[10px] text-foreground-muted/25">
            {gatewayStatus?.connected 
              ? 'Connected to Paul via OpenClaw · Full context & tools'
              : 'Fallback mode: Gemini 2.0 Flash · Limited context'}
          </span>
        </div>
      </div>
    </div>
  );
}
