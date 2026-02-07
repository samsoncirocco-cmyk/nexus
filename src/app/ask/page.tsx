'use client';

import { useState, useRef, useEffect, useCallback, useMemo, Fragment, type ReactNode } from 'react';

/* ============================================================
   TYPES
   ============================================================ */

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: string;
  pinned?: boolean;
  deepSearch?: boolean;
}

interface SavedAnswer {
  id: string;
  question: string;
  answer: string;
  sources?: string[];
  savedAt: string;
}

/* ============================================================
   CONSTANTS
   ============================================================ */

const HISTORY_KEY = 'second-brain-ask-history';
const SAVED_KEY = 'second-brain-ask-saved';
const QUERIES_KEY = 'second-brain-ask-queries';

/* ============================================================
   CODE SYNTAX HIGHLIGHTER
   ============================================================ */

const KW = new Set([
  'const','let','var','function','return','if','else','for','while','do','switch','case',
  'break','continue','new','this','class','extends','super','import','export','from',
  'default','async','await','try','catch','throw','finally','typeof','instanceof','in',
  'of','void','delete','yield','interface','type','enum','implements','public','private',
  'protected','static','readonly','abstract','as','is','keyof','declare','module',
  'def','self','elif','except','raise','pass','with','lambda','nonlocal','global',
  'True','False','None','print','and','or','not','fn','pub','mut','impl','struct',
  'trait','use','mod','crate','match','func','package','go','defer','chan','select',
  'range','map','null','undefined','true','false','NaN','Infinity',
]);

const BI = new Set([
  'console','Math','JSON','Object','Array','String','Number','Boolean','Promise','Map',
  'Set','Date','Error','RegExp','Symbol','BigInt','parseInt','parseFloat','isNaN',
  'fetch','Response','Request','URL','Headers','document','window','navigator',
  'setTimeout','setInterval','require','process','Buffer',
  'int','str','float','bool','list','dict','tuple','set','len','range',
]);

function highlightCode(code: string, lang: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  let k = 0, i = 0;

  while (i < code.length) {
    if ((code[i] === '/' && code[i+1] === '/') || (code[i] === '#' && lang !== 'css')) {
      const end = code.indexOf('\n', i);
      const ce = end === -1 ? code.length : end;
      tokens.push(<span key={k++} className="text-foreground-muted/50 italic">{code.slice(i, ce)}</span>);
      i = ce; continue;
    }
    if (code[i] === '/' && code[i+1] === '*') {
      const end = code.indexOf('*/', i+2);
      const ce = end === -1 ? code.length : end+2;
      tokens.push(<span key={k++} className="text-foreground-muted/50 italic">{code.slice(i, ce)}</span>);
      i = ce; continue;
    }
    if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
      const q = code[i]; let j = i+1;
      while (j < code.length && code[j] !== q) { if (code[j] === '\\') j++; j++; }
      j++;
      tokens.push(<span key={k++} className="text-emerald-400">{code.slice(i, j)}</span>);
      i = j; continue;
    }
    if (/\d/.test(code[i]) && (i === 0 || /[\s,;:=+\-*/<>(![\]{}&|^~%]/.test(code[i-1]))) {
      let j = i;
      while (j < code.length && /[\d.xXa-fA-FeEoObB_n]/.test(code[j])) j++;
      tokens.push(<span key={k++} className="text-amber-400">{code.slice(i, j)}</span>);
      i = j; continue;
    }
    if (/[a-zA-Z_$@]/.test(code[i])) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j])) j++;
      const w = code.slice(i, j);
      if (KW.has(w)) tokens.push(<span key={k++} className="text-purple-400 font-medium">{w}</span>);
      else if (BI.has(w)) tokens.push(<span key={k++} className="text-sky-400">{w}</span>);
      else if (j < code.length && code[j] === '(') tokens.push(<span key={k++} className="text-sky-300">{w}</span>);
      else tokens.push(<Fragment key={k++}>{w}</Fragment>);
      i = j; continue;
    }
    if (/[=<>!+\-*/&|^~%?:]/.test(code[i])) {
      let j = i;
      while (j < code.length && /[=<>!+\-*/&|^~%?:]/.test(code[j])) j++;
      tokens.push(<span key={k++} className="text-primary/70">{code.slice(i, j)}</span>);
      i = j; continue;
    }
    tokens.push(<Fragment key={k++}>{code[i]}</Fragment>);
    i++;
  }
  return tokens;
}

/* ============================================================
   SAFE MARKDOWN PARSER
   ============================================================ */

function parseMarkdown(text: string): ReactNode[] {
  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let key = 0, i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++; }
      i++;
      const codeText = codeLines.join('\n');
      elements.push(
        <div key={key++} className="relative group/code my-2.5">
          <div className="flex items-center justify-between bg-secondary-dark-deep/80 border border-primary/15 rounded-t-lg px-3.5 py-1.5">
            <span className="text-[10px] text-primary/50 uppercase tracking-wider font-mono">{lang || 'code'}</span>
            <button onClick={() => { navigator.clipboard.writeText(codeText).catch(() => {}); }}
              className="text-[10px] text-foreground-muted/40 hover:text-foreground-muted transition-colors flex items-center gap-1 font-body">
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>content_copy</span>Copy
            </button>
          </div>
          <pre className="bg-secondary-dark-deep border border-t-0 border-primary/15 rounded-b-lg px-3.5 py-3 overflow-x-auto text-xs font-mono">
            <code className="text-foreground/90">{highlightCode(codeText, lang)}</code>
          </pre>
        </div>,
      );
      continue;
    }

    // Headings
    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^(#+)/)?.[1].length || 1;
      const text = line.replace(/^#+\s/, '');
      const cls = level === 1 ? 'text-base font-bold text-foreground mt-3 mb-1.5'
        : level === 2 ? 'text-sm font-bold text-foreground/90 mt-2.5 mb-1'
        : 'text-sm font-semibold text-foreground/80 mt-2 mb-0.5';
      elements.push(<div key={key++} className={cls}>{parseInline(text)}</div>);
      i++; continue;
    }

    // Unordered list
    if (/^[-*]\s/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(
          <li key={key++} className="flex items-start gap-1.5">
            <span className="text-primary mt-0.5 shrink-0 text-xs">-</span>
            <span>{parseInline(lines[i].replace(/^[-*]\s/, ''))}</span>
          </li>,
        );
        i++;
      }
      elements.push(<ul key={key++} className="space-y-0.5 my-1">{items}</ul>);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: ReactNode[] = [];
      let num = 1;
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(
          <li key={key++} className="flex items-start gap-1.5">
            <span className="text-primary/70 shrink-0 text-xs mt-0.5 font-mono">{num}.</span>
            <span>{parseInline(lines[i].replace(/^\d+\.\s/, ''))}</span>
          </li>,
        );
        i++; num++;
      }
      elements.push(<ol key={key++} className="space-y-0.5 my-1">{items}</ol>);
      continue;
    }

    if (line.trim() === '') { elements.push(<div key={key++} className="h-1.5" />); i++; continue; }

    elements.push(<p key={key++} className="my-0.5">{parseInline(line)}</p>);
    i++;
  }
  return elements;
}

function parseInline(text: string): ReactNode[] {
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[([^\]]+)\]\(([^)]+)\)|\[([^\]]+\.md)\])/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0, match: RegExpExecArray | null, k = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(<Fragment key={k++}>{text.slice(lastIndex, match.index)}</Fragment>);
    if (match[2] !== undefined) nodes.push(<strong key={k++} className="font-semibold text-foreground">{match[2]}</strong>);
    else if (match[3] !== undefined) nodes.push(<em key={k++}>{match[3]}</em>);
    else if (match[4] !== undefined) nodes.push(<code key={k++} className="bg-secondary-dark text-primary px-1.5 py-0.5 rounded text-xs font-mono">{match[4]}</code>);
    else if (match[5] !== undefined && match[6] !== undefined) nodes.push(<a key={k++} href={match[6]} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary transition-colors">{match[5]}</a>);
    else if (match[7] !== undefined) nodes.push(<span key={k++} className="text-primary/70 text-xs font-mono">[{match[7]}]</span>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(<Fragment key={k++}>{text.slice(lastIndex)}</Fragment>);
  return nodes.length > 0 ? nodes : [text];
}

/* ============================================================
   TIME FORMATTING
   ============================================================ */

function formatTime(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `Yesterday ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

/* ============================================================
   SAVED ANSWERS PANEL
   ============================================================ */

function SavedPanel({
  open,
  saved,
  onClose,
  onLoad,
  onRemove,
}: {
  open: boolean;
  saved: SavedAnswer[];
  onClose: () => void;
  onLoad: (s: SavedAnswer) => void;
  onRemove: (id: string) => void;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/40 md:hidden animate-fade-in" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-40 w-80 bg-bg-secondary border-l border-border flex flex-col animate-slide-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>bookmark</span>
            <h3 className="text-sm font-bold text-foreground font-display">Saved Answers</h3>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {saved.length === 0 && (
            <div className="text-center py-8 text-sm text-foreground-muted/50 font-body">
              No saved answers yet. Pin answers you want to keep.
            </div>
          )}
          {saved.map((s) => (
            <div key={s.id} className="bg-bg-tertiary border border-border-subtle rounded-xl p-3 hover:border-primary/20 transition-colors group">
              <div className="text-xs text-primary/70 font-medium mb-1 truncate font-body">{s.question}</div>
              <div className="text-[11px] text-foreground-muted line-clamp-3 font-body">{s.answer.slice(0, 150)}...</div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle/50">
                <span className="text-[10px] text-foreground-muted/40 font-body">{formatTime(s.savedAt)}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => onLoad(s)}
                    className="text-[10px] text-primary/60 hover:text-primary transition-colors flex items-center gap-0.5 font-body">
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>open_in_new</span>View
                  </button>
                  <button onClick={() => onRemove(s.id)}
                    className="text-[10px] text-foreground-muted/40 hover:text-red-400 transition-colors flex items-center gap-0.5 font-body opacity-0 group-hover:opacity-100">
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ============================================================
   MAIN ASK PAGE
   ============================================================ */

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [deepSearch, setDeepSearch] = useState(false);

  // Streaming
  const [streamingText, setStreamingText] = useState('');
  const [streamingStatus, setStreamingStatus] = useState('');

  // Query history
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Saved answers
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswer[]>([]);
  const [savedPanelOpen, setSavedPanelOpen] = useState(false);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Scroll
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load persisted data
  useEffect(() => {
    try {
      const h = localStorage.getItem(HISTORY_KEY);
      if (h) { const p = JSON.parse(h); if (Array.isArray(p)) setMessages(p); }
    } catch { /* */ }
    try {
      const s = localStorage.getItem(SAVED_KEY);
      if (s) { const p = JSON.parse(s); if (Array.isArray(p)) setSavedAnswers(p); }
    } catch { /* */ }
    try {
      const q = localStorage.getItem(QUERIES_KEY);
      if (q) { const p = JSON.parse(q); if (Array.isArray(p)) setRecentQueries(p); }
    } catch { /* */ }
  }, []);

  // Persist messages
  useEffect(() => {
    if (messages.length > 0) localStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
  }, [messages]);

  // Persist saved
  useEffect(() => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(savedAnswers));
  }, [savedAnswers]);

  // Persist queries
  useEffect(() => {
    localStorage.setItem(QUERIES_KEY, JSON.stringify(recentQueries));
  }, [recentQueries]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Scroll tracking
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const h = () => setShowScrollBtn(c.scrollHeight - c.scrollTop - c.clientHeight > 200);
    c.addEventListener('scroll', h, { passive: true });
    return () => c.removeEventListener('scroll', h);
  }, []);

  // Build conversation history for API
  const conversationHistory = useMemo(() => {
    return messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setInput('');
    setShowHistory(false);

    // Add to recent queries
    setRecentQueries((prev) => {
      const filtered = prev.filter((q) => q !== question);
      return [question, ...filtered].slice(0, 20);
    });

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
      deepSearch,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setStreamingText('');
    setStreamingStatus('');

    try {
      const res = await fetch('/api/ask/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          history: conversationHistory,
          deepSearch,
        }),
      });

      if (!res.ok || !res.body) throw new Error('Stream unavailable');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let sources: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              switch (eventType) {
                case 'token':
                  fullText += data.text;
                  setStreamingText(fullText);
                  break;
                case 'status':
                  setStreamingStatus(data.message);
                  break;
                case 'done':
                  sources = data.sources || [];
                  break;
                case 'error':
                  throw new Error(data.error);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
            eventType = '';
          }
        }
      }

      setStreamingText('');
      setStreamingStatus('');

      if (fullText) {
        const aiMsg: Message = {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: fullText,
          sources,
          timestamp: new Date().toISOString(),
          deepSearch,
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch {
      // Fallback to non-streaming
      try {
        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, history: conversationHistory }),
        });
        const data = await res.json();
        const aiMsg: Message = {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: data.error ? `Error: ${data.error}` : data.answer,
          sources: data.sources,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch {
        setMessages((prev) => [...prev, {
          id: `e_${Date.now()}`,
          role: 'assistant',
          content: 'Failed to reach the AI. Check your connection.',
          timestamp: new Date().toISOString(),
        }]);
      }
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const copyAnswer = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* */ }
  };

  const pinAnswer = (msg: Message) => {
    // Find the user question that preceded this answer
    const idx = messages.findIndex((m) => m.id === msg.id);
    const questionMsg = idx > 0 ? messages[idx - 1] : null;
    const saved: SavedAnswer = {
      id: `saved_${Date.now()}`,
      question: questionMsg?.role === 'user' ? questionMsg.content : 'Unknown question',
      answer: msg.content,
      sources: msg.sources,
      savedAt: new Date().toISOString(),
    };
    setSavedAnswers((prev) => [...prev, saved]);
    // Mark as pinned in messages
    setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, pinned: true } : m));
  };

  const unpinAnswer = (msgId: string) => {
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, pinned: false } : m));
  };

  const removeSaved = (id: string) => {
    setSavedAnswers((prev) => prev.filter((s) => s.id !== id));
  };

  const loadSaved = (s: SavedAnswer) => {
    setMessages((prev) => [
      ...prev,
      { id: `u_${Date.now()}`, role: 'user', content: s.question, timestamp: new Date().toISOString() },
      { id: `a_${Date.now()}`, role: 'assistant', content: s.answer, sources: s.sources, timestamp: new Date().toISOString(), pinned: true },
    ]);
    setSavedPanelOpen(false);
  };

  const clearConversation = () => {
    setMessages([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Filtered queries for autocomplete
  const filteredQueries = useMemo(() => {
    if (!input.trim()) return recentQueries.slice(0, 5);
    const q = input.toLowerCase();
    return recentQueries.filter((r) => r.toLowerCase().includes(q)).slice(0, 5);
  }, [input, recentQueries]);

  const ALL_SUGGESTIONS = useMemo(() => [
    { icon: 'trending_up', text: 'What E-Rate leads are hottest right now?', color: 'text-emerald-400' },
    { icon: 'menu_book', text: 'Summarize my book progress', color: 'text-sky-400' },
    { icon: 'psychology', text: 'What are my key objection handling strategies?', color: 'text-amber-400' },
    { icon: 'calendar_today', text: 'What did I work on this week?', color: 'text-purple-400' },
    { icon: 'analytics', text: 'Cross-reference my deals with recent activity', color: 'text-rose-400' },
    { icon: 'lightbulb', text: 'What patterns emerge from my journal entries?', color: 'text-cyan-400' },
    { icon: 'handshake', text: 'Which accounts need follow-up this week?', color: 'text-orange-400' },
    { icon: 'compare_arrows', text: 'How does our pricing compare to competitors?', color: 'text-teal-400' },
    { icon: 'school', text: 'What concepts have I been studying recently?', color: 'text-indigo-400' },
    { icon: 'rocket_launch', text: 'What are my top active projects?', color: 'text-pink-400' },
    { icon: 'groups', text: 'Who are my key contacts across deals?', color: 'text-lime-400' },
    { icon: 'savings', text: 'What is the total value of my pipeline?', color: 'text-yellow-400' },
  ], []);

  // Randomize 6 suggestions on mount
  const [suggestionSeed] = useState(() => Math.random());
  const suggestions = useMemo(() => {
    const shuffled = [...ALL_SUGGESTIONS];
    // Seeded Fisher-Yates shuffle
    let seed = suggestionSeed * 2147483647;
    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      const j = seed % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 6);
  }, [ALL_SUGGESTIONS, suggestionSeed]);

  return (
    <div className="flex flex-col h-screen max-h-screen font-body">
      {/* Saved Panel */}
      <SavedPanel
        open={savedPanelOpen}
        saved={savedAnswers}
        onClose={() => setSavedPanelOpen(false)}
        onLoad={loadSaved}
        onRemove={removeSaved}
      />

      {/* Header */}
      <div className="shrink-0 border-b border-border-subtle bg-bg-dark/80 backdrop-blur-md px-4 md:px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>neurology</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-foreground">Ask Your Brain</h1>
              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-foreground-muted font-body">
              {loading && streamingStatus ? streamingStatus : 'AI-powered search across your entire vault'}
            </p>
          </div>
          <button onClick={() => setSavedPanelOpen(true)}
            className="size-9 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors relative" title="Saved answers">
            <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 18 }}>bookmark</span>
            {savedAnswers.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-primary text-bg-dark text-[9px] font-bold flex items-center justify-center">
                {savedAnswers.length}
              </span>
            )}
          </button>
          {messages.length > 0 && (
            <button onClick={clearConversation}
              className="size-9 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors" title="Clear conversation">
              <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 18 }}>delete_sweep</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-3 md:px-6 py-4 space-y-4 relative">
        {/* Empty State */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 px-4">
            <div className="relative">
              <div className="absolute -inset-5 rounded-2xl bg-primary/5 animate-breathe" />
              <div className="relative size-20 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 40 }}>psychology</span>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Your Brain is Ready</h2>
              <p className="text-sm text-foreground-muted max-w-md font-body">
                Ask anything about your vault — deals, accounts, projects, concepts, journal entries.
                The AI will search all documents and give you answers with sources.
              </p>
            </div>

            {/* Deep search toggle in empty state */}
            <button onClick={() => setDeepSearch((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-all font-body ${
                deepSearch
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'border-border text-foreground-muted hover:border-primary/20 hover:text-foreground'
              }`}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>explore</span>
              <span className="font-medium">Deep Search</span>
              <span className="text-[10px] opacity-60">{deepSearch ? 'ON' : 'OFF'}</span>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-w-2xl w-full">
              {suggestions.map((q, idx) => (
                <button key={q.text} onClick={() => { setInput(q.text); inputRef.current?.focus(); }}
                  className="group text-left text-xs px-3.5 py-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 hover:shadow-[0_0_16px_rgba(250,222,41,0.06)] text-foreground-muted hover:text-foreground transition-all animate-slide-up font-body"
                  style={{ animationDelay: `${idx * 60 + 100}ms` }}>
                  <div className="flex items-start gap-2">
                    <span className={`material-symbols-outlined ${q.color} group-hover:text-primary transition-colors shrink-0`} style={{ fontSize: 16 }}>
                      {q.icon}
                    </span>
                    <span>{q.text}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`group flex animate-slide-up ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="shrink-0 mr-2.5 mt-1">
                  <div className="size-8 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>
                      {msg.deepSearch ? 'explore' : 'neurology'}
                    </span>
                  </div>
                </div>
              )}

              <div className={`max-w-[85%] md:max-w-[70%] ${
                isUser
                  ? 'bg-primary/12 border border-primary/20 rounded-2xl rounded-br-sm px-4 py-3'
                  : 'bg-bg-secondary border border-border-subtle rounded-2xl rounded-bl-sm px-4 py-3'
              }`}>
                {/* AI header */}
                {!isUser && (
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60 font-display">
                        Second Brain
                      </span>
                      {msg.deepSearch && (
                        <span className="text-[9px] bg-primary/10 text-primary/70 px-1.5 py-0.5 rounded font-body">DEEP</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => copyAnswer(msg.content, msg.id)} title="Copy answer"
                        className="size-6 rounded-md hover:bg-white/5 flex items-center justify-center transition-colors">
                        <span className={`material-symbols-outlined ${copiedId === msg.id ? 'text-emerald-400' : 'text-foreground-muted/40'}`}
                          style={{ fontSize: 14 }}>
                          {copiedId === msg.id ? 'check' : 'content_copy'}
                        </span>
                      </button>
                      <button onClick={() => msg.pinned ? unpinAnswer(msg.id) : pinAnswer(msg)} title={msg.pinned ? 'Unpin' : 'Pin answer'}
                        className="size-6 rounded-md hover:bg-white/5 flex items-center justify-center transition-colors">
                        <span className={`material-symbols-outlined ${msg.pinned ? 'text-primary' : 'text-foreground-muted/40'}`}
                          style={{ fontSize: 14, fontVariationSettings: msg.pinned ? "'FILL' 1" : undefined }}>
                          bookmark
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className={`text-sm leading-relaxed font-body ${isUser ? 'text-foreground' : 'text-foreground/90'}`}>
                  {parseMarkdown(msg.content)}
                </div>

                {/* User deep search badge */}
                {isUser && msg.deepSearch && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="material-symbols-outlined text-primary/50" style={{ fontSize: 12 }}>explore</span>
                    <span className="text-[10px] text-primary/50 font-body">Deep Search</span>
                  </div>
                )}

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border-subtle">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="material-symbols-outlined text-foreground-muted/50" style={{ fontSize: 14 }}>source</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted/50 font-display">
                        {msg.sources.length} Source{msg.sources.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src) => {
                        const name = src.replace(/\.md$/, '').split('/').pop() || src;
                        const category = src.split('/')[0] || '';
                        return (
                          <a key={src} href={`/doc/${src.replace(/\.md$/, '')}`}
                            className="group/src inline-flex items-center gap-1.5 text-[11px] pl-2 pr-2.5 py-1.5 rounded-lg bg-secondary-dark/30 border border-primary/10 hover:border-primary/30 hover:bg-primary/5 transition-all font-body">
                            <span className="material-symbols-outlined text-primary/60 group-hover/src:text-primary" style={{ fontSize: 14 }}>description</span>
                            <div>
                              <div className="text-foreground/80 group-hover/src:text-foreground font-medium">{name}</div>
                              {category && category !== name && (
                                <div className="text-[9px] text-foreground-muted/40">{category}</div>
                              )}
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div className={`mt-1.5 ${isUser ? 'text-right' : ''}`}>
                  <span className="text-[10px] text-foreground-muted/30 font-body">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Ask follow-up prompt */}
        {messages.length >= 2 && !loading && !streamingText && messages[messages.length - 1]?.role === 'assistant' && (
          <div className="flex justify-start pl-[42px] animate-slide-up">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => inputRef.current?.focus()}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-primary/80 hover:bg-primary/10 hover:border-primary/30 transition-all font-body">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>reply</span>
                Ask a follow-up
              </button>
              <button onClick={() => { setInput('Tell me more about this'); inputRef.current?.focus(); }}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:border-primary/20 hover:bg-white/3 text-foreground-muted/60 hover:text-foreground-muted transition-all font-body">
                Tell me more
              </button>
              <button onClick={() => { setInput('Can you give specific examples?'); inputRef.current?.focus(); }}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:border-primary/20 hover:bg-white/3 text-foreground-muted/60 hover:text-foreground-muted transition-all font-body">
                Give examples
              </button>
            </div>
          </div>
        )}

        {/* Streaming response */}
        {streamingText && (
          <div className="flex justify-start animate-slide-up">
            <div className="shrink-0 mr-2.5 mt-1">
              <div className="size-8 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>
                  {deepSearch ? 'explore' : 'neurology'}
                </span>
              </div>
            </div>
            <div className="max-w-[85%] md:max-w-[70%] bg-bg-secondary border border-border-subtle rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60 font-display">Second Brain</span>
                {deepSearch && <span className="text-[9px] bg-primary/10 text-primary/70 px-1.5 py-0.5 rounded font-body">DEEP</span>}
              </div>
              <div className="text-sm leading-relaxed font-body text-foreground/90">
                {parseMarkdown(streamingText)}
                <span className="inline-block w-0.5 h-4 bg-primary/80 ml-0.5 animate-pulse align-text-bottom" />
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator (before streaming starts) */}
        {loading && !streamingText && (
          <div className="flex justify-start animate-slide-up">
            <div className="shrink-0 mr-2.5 mt-1">
              <div className="size-8 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>
                  {deepSearch ? 'explore' : 'neurology'}
                </span>
              </div>
            </div>
            <div className="bg-bg-secondary border border-border-subtle rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60 font-display">Second Brain</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground-muted">
                <div className="flex gap-1">
                  <div className="size-2 rounded-full bg-primary animate-wave" />
                  <div className="size-2 rounded-full bg-primary animate-wave" style={{ animationDelay: '150ms' }} />
                  <div className="size-2 rounded-full bg-primary animate-wave" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs font-body">
                  {streamingStatus || (deepSearch ? 'Deep searching vault...' : 'Searching vault...')}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />

        {/* Scroll to bottom */}
        {showScrollBtn && (
          <button onClick={scrollToBottom}
            className="sticky bottom-4 left-1/2 -translate-x-1/2 z-10 size-10 rounded-full bg-bg-secondary border border-border shadow-lg flex items-center justify-center hover:border-primary/30 hover:shadow-[0_0_16px_rgba(250,222,41,0.1)] transition-all animate-scale-in"
            title="Scroll to bottom">
            <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 20 }}>keyboard_arrow_down</span>
          </button>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border-subtle px-4 md:px-6 py-3 bg-bg-dark/90 backdrop-blur-xl relative">
        {/* Query history dropdown */}
        {showHistory && filteredQueries.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 md:left-6 md:right-6 mb-1 max-w-4xl mx-auto">
            <div className="bg-bg-secondary border border-border rounded-xl shadow-xl overflow-hidden animate-scale-in">
              <div className="px-3 py-1.5 border-b border-border-subtle flex items-center justify-between">
                <span className="text-[10px] text-foreground-muted/50 font-body">Recent searches</span>
                <button onClick={() => { setRecentQueries([]); setShowHistory(false); }}
                  className="text-[10px] text-foreground-muted/40 hover:text-foreground-muted transition-colors font-body">Clear</button>
              </div>
              {filteredQueries.map((q, idx) => (
                <button key={idx} onClick={() => { setInput(q); setShowHistory(false); inputRef.current?.focus(); }}
                  className="w-full text-left px-3 py-2 text-sm text-foreground-muted hover:bg-white/5 hover:text-foreground transition-colors flex items-center gap-2 font-body">
                  <span className="material-symbols-outlined text-foreground-muted/30" style={{ fontSize: 14 }}>history</span>
                  <span className="truncate">{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-4xl mx-auto">
          {/* Deep search toggle */}
          <button type="button" onClick={() => setDeepSearch((v) => !v)}
            className={`size-10 shrink-0 rounded-xl flex items-center justify-center transition-all ${
              deepSearch
                ? 'bg-primary/15 border border-primary/30 text-primary'
                : 'hover:bg-white/5 text-foreground-muted'
            }`}
            title={`Deep Search: ${deepSearch ? 'ON' : 'OFF'}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>explore</span>
          </button>

          <div className="flex-1 relative">
            <input ref={inputRef} type="text" value={input}
              onChange={(e) => { setInput(e.target.value); setShowHistory(true); }}
              onFocus={() => setShowHistory(true)}
              onBlur={() => setTimeout(() => setShowHistory(false), 200)}
              placeholder={deepSearch ? 'Deep search your vault...' : 'Ask your brain anything...'}
              disabled={loading}
              className="w-full rounded-xl border border-border bg-bg-secondary px-4 py-3 pr-12 text-sm text-foreground placeholder:text-foreground-muted/40 outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_rgba(250,222,41,0.08)] transition-all disabled:opacity-50 font-body" />
            {messages.length > 0 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-foreground-muted/30 font-body">
                {messages.filter((m) => m.role === 'user').length} queries
              </div>
            )}
          </div>

          <button type="submit" disabled={loading || !input.trim()}
            className="size-11 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-primary/20 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-[0_0_12px_rgba(250,222,41,0.2)] hover:shadow-[0_0_20px_rgba(250,222,41,0.3)] disabled:shadow-none">
            <span className="material-symbols-outlined text-bg-dark font-bold" style={{ fontSize: 20 }}>
              {loading ? 'hourglass_top' : 'arrow_upward'}
            </span>
          </button>
        </form>
        <div className="text-center mt-1.5">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-px bg-border-subtle/40" />
            <span className="text-[10px] text-foreground-muted/30 font-body">
              Gemini 2.0 Flash · {deepSearch ? 'Deep Search' : 'Standard'} · Streaming
            </span>
            <div className="w-8 h-px bg-border-subtle/40" />
          </div>
        </div>
      </div>
    </div>
  );
}
