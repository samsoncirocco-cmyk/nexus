'use client';

import { useState, useRef, useEffect, useCallback, useMemo, Fragment, type ReactNode } from 'react';

/* ============================================================
   TYPES
   ============================================================ */

interface ChatMessage {
  id: string;
  text: string;
  from: 'user' | 'paul';
  timestamp: string;
  status: string;
  reactions?: Record<string, boolean>;
  topic?: string;
  attachments?: Attachment[];
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
}

interface ConversationTopic {
  id: string;
  label: string;
  createdAt: string;
  messageCount: number;
}

/* ============================================================
   CONSTANTS
   ============================================================ */

const STORAGE_KEY = 'second-brain-chat-history';
const TOPICS_KEY = 'second-brain-chat-topics';
const POLL_INTERVAL = 5000;

/* ============================================================
   CODE SYNTAX HIGHLIGHTER — token-based, no dependencies
   ============================================================ */

const KEYWORD_SET = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
  'switch', 'case', 'break', 'continue', 'new', 'this', 'class', 'extends', 'super',
  'import', 'export', 'from', 'default', 'async', 'await', 'try', 'catch', 'throw',
  'finally', 'typeof', 'instanceof', 'in', 'of', 'void', 'delete', 'yield',
  'interface', 'type', 'enum', 'implements', 'public', 'private', 'protected',
  'static', 'readonly', 'abstract', 'as', 'is', 'keyof', 'declare', 'module',
  'def', 'self', 'elif', 'except', 'raise', 'pass', 'with', 'lambda', 'nonlocal',
  'global', 'True', 'False', 'None', 'print', 'and', 'or', 'not',
  'fn', 'pub', 'mut', 'impl', 'struct', 'trait', 'use', 'mod', 'crate', 'match',
  'func', 'package', 'go', 'defer', 'chan', 'select', 'range', 'map',
  'null', 'undefined', 'true', 'false', 'NaN', 'Infinity',
]);

const BUILTIN_SET = new Set([
  'console', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean',
  'Promise', 'Map', 'Set', 'Date', 'Error', 'RegExp', 'Symbol', 'BigInt',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI',
  'fetch', 'Response', 'Request', 'URL', 'Headers', 'FormData',
  'document', 'window', 'navigator', 'setTimeout', 'setInterval', 'clearTimeout',
  'require', 'process', 'Buffer', '__dirname', '__filename',
  'int', 'str', 'float', 'bool', 'list', 'dict', 'tuple', 'set', 'len', 'range',
]);

function highlightCode(code: string, lang: string): ReactNode[] {
  // Simple token-based highlighter
  const tokens: ReactNode[] = [];
  let k = 0;
  let i = 0;

  while (i < code.length) {
    // Single-line comment
    if ((code[i] === '/' && code[i + 1] === '/') || (code[i] === '#' && lang !== 'css')) {
      const end = code.indexOf('\n', i);
      const commentEnd = end === -1 ? code.length : end;
      tokens.push(
        <span key={k++} className="text-foreground-muted/50 italic">
          {code.slice(i, commentEnd)}
        </span>,
      );
      i = commentEnd;
      continue;
    }

    // Multi-line comment
    if (code[i] === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2);
      const commentEnd = end === -1 ? code.length : end + 2;
      tokens.push(
        <span key={k++} className="text-foreground-muted/50 italic">
          {code.slice(i, commentEnd)}
        </span>,
      );
      i = commentEnd;
      continue;
    }

    // String (double or single quote or backtick)
    if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
      const quote = code[i];
      let j = i + 1;
      while (j < code.length && code[j] !== quote) {
        if (code[j] === '\\') j++; // skip escaped char
        j++;
      }
      j++; // include closing quote
      tokens.push(
        <span key={k++} className="text-emerald-400">
          {code.slice(i, j)}
        </span>,
      );
      i = j;
      continue;
    }

    // Number
    if (/\d/.test(code[i]) && (i === 0 || /[\s,;:=+\-*/<>(![\]{}&|^~%]/.test(code[i - 1]))) {
      let j = i;
      while (j < code.length && /[\d.xXa-fA-FeEoObB_n]/.test(code[j])) j++;
      tokens.push(
        <span key={k++} className="text-amber-400">
          {code.slice(i, j)}
        </span>,
      );
      i = j;
      continue;
    }

    // Word (identifier/keyword)
    if (/[a-zA-Z_$@]/.test(code[i])) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j])) j++;
      const word = code.slice(i, j);

      if (KEYWORD_SET.has(word)) {
        tokens.push(
          <span key={k++} className="text-purple-400 font-medium">
            {word}
          </span>,
        );
      } else if (BUILTIN_SET.has(word)) {
        tokens.push(
          <span key={k++} className="text-sky-400">
            {word}
          </span>,
        );
      } else if (j < code.length && code[j] === '(') {
        // Function call
        tokens.push(
          <span key={k++} className="text-sky-300">
            {word}
          </span>,
        );
      } else if (word.startsWith('@')) {
        // Decorator
        tokens.push(
          <span key={k++} className="text-amber-300">
            {word}
          </span>,
        );
      } else {
        tokens.push(<Fragment key={k++}>{word}</Fragment>);
      }
      i = j;
      continue;
    }

    // Operator / punctuation
    if (/[=<>!+\-*/&|^~%?:]/.test(code[i])) {
      let j = i;
      while (j < code.length && /[=<>!+\-*/&|^~%?:]/.test(code[j])) j++;
      tokens.push(
        <span key={k++} className="text-primary/70">
          {code.slice(i, j)}
        </span>,
      );
      i = j;
      continue;
    }

    // Everything else (whitespace, braces, etc.)
    tokens.push(<Fragment key={k++}>{code[i]}</Fragment>);
    i++;
  }

  return tokens;
}

/* ============================================================
   SAFE MARKDOWN PARSER — returns React elements (no innerHTML)
   ============================================================ */

function parseMarkdown(text: string): ReactNode[] {
  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const codeText = codeLines.join('\n');
      elements.push(
        <div key={key++} className="relative group/code my-2">
          <div className="flex items-center justify-between bg-secondary-dark-deep/80 border border-primary/15 rounded-t-lg px-3.5 py-1.5">
            <span className="text-[10px] text-primary/50 uppercase tracking-wider font-mono">
              {lang || 'code'}
            </span>
            <button
              onClick={() => { navigator.clipboard.writeText(codeText).catch(() => {}); }}
              className="text-[10px] text-foreground-muted/40 hover:text-foreground-muted transition-colors flex items-center gap-1 font-body"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>content_copy</span>
              Copy
            </button>
          </div>
          <pre className="bg-secondary-dark-deep border border-t-0 border-primary/15 rounded-b-lg px-3.5 py-3 overflow-x-auto text-xs font-mono">
            <code className="text-foreground/90">{highlightCode(codeText, lang)}</code>
          </pre>
        </div>,
      );
      continue;
    }

    // Unordered list items (- or *)
    if (/^[\-*]\s/.test(line)) {
      const listItems: ReactNode[] = [];
      while (i < lines.length && /^[\-*]\s/.test(lines[i])) {
        listItems.push(
          <li key={key++} className="flex items-start gap-1.5">
            <span className="text-primary mt-0.5 shrink-0 text-xs">-</span>
            <span>{parseInline(lines[i].replace(/^[\-*]\s/, ''))}</span>
          </li>,
        );
        i++;
      }
      elements.push(
        <ul key={key++} className="space-y-0.5 my-1">{listItems}</ul>,
      );
      continue;
    }

    // Ordered list items
    if (/^\d+\.\s/.test(line)) {
      const listItems: ReactNode[] = [];
      let num = 1;
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        listItems.push(
          <li key={key++} className="flex items-start gap-1.5">
            <span className="text-primary/70 shrink-0 text-xs mt-0.5 font-mono">{num}.</span>
            <span>{parseInline(lines[i].replace(/^\d+\.\s/, ''))}</span>
          </li>,
        );
        i++;
        num++;
      }
      elements.push(
        <ol key={key++} className="space-y-0.5 my-1">{listItems}</ol>,
      );
      continue;
    }

    // Empty line -> small spacer
    if (line.trim() === '') {
      elements.push(<div key={key++} className="h-1" />);
      i++;
      continue;
    }

    // Regular paragraph line
    elements.push(
      <p key={key++} className="my-0.5">{parseInline(line)}</p>,
    );
    i++;
  }

  return elements;
}

/** Parse inline markdown: **bold**, *italic*, `code`, [links](url), [file.md] refs */
function parseInline(text: string): ReactNode[] {
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[([^\]]+)\]\(([^)]+)\)|\[([^\]]+\.md)\])/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let k = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={k++}>{text.slice(lastIndex, match.index)}</Fragment>);
    }

    if (match[2] !== undefined) {
      nodes.push(<strong key={k++} className="font-semibold text-foreground">{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      nodes.push(<em key={k++}>{match[3]}</em>);
    } else if (match[4] !== undefined) {
      nodes.push(
        <code key={k++} className="bg-secondary-dark text-primary px-1.5 py-0.5 rounded text-xs font-mono">
          {match[4]}
        </code>,
      );
    } else if (match[5] !== undefined && match[6] !== undefined) {
      nodes.push(
        <a key={k++} href={match[6]} target="_blank" rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary transition-colors">
          {match[5]}
        </a>,
      );
    } else if (match[7] !== undefined) {
      nodes.push(
        <span key={k++} className="text-primary/70 text-xs font-mono">[{match[7]}]</span>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={k++}>{text.slice(lastIndex)}</Fragment>);
  }

  return nodes.length > 0 ? nodes : [text];
}

/* ============================================================
   TIME FORMATTING
   ============================================================ */

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ============================================================
   CLEAR CONFIRMATION MODAL
   ============================================================ */

function ConfirmModal({
  open,
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  body,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  body: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onCancel} />
      <div className="relative bg-bg-secondary border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-scale-in">
        <div className="flex items-center gap-3 mb-4">
          <div className={`size-10 rounded-full ${iconBg} flex items-center justify-center`}>
            <span className={`material-symbols-outlined ${iconColor}`} style={{ fontSize: 22 }}>{icon}</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground font-display">{title}</h3>
            <p className="text-xs text-foreground-muted font-body">{subtitle}</p>
          </div>
        </div>
        <p className="text-sm text-foreground-muted mb-6 font-body">{body}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-border text-foreground-muted hover:bg-white/5 transition-colors font-body">
            Cancel
          </button>
          <button onClick={onConfirm} className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors font-body ${confirmClass}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   EXPORT MODAL
   ============================================================ */

function ExportModal({
  open,
  messages,
  onClose,
}: {
  open: boolean;
  messages: ChatMessage[];
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const exportAsText = () => {
    const text = messages
      .map((m) => `[${new Date(m.timestamp).toLocaleString()}] ${m.from === 'user' ? 'You' : 'Paul'}: ${m.text}`)
      .join('\n\n');
    return text;
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(exportAsText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  };

  const handleDownloadText = () => {
    const blob = new Blob([exportAsText()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-bg-secondary border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-scale-in">
        <div className="flex items-center gap-3 mb-5">
          <div className="size-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>ios_share</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground font-display">Export Chat</h3>
            <p className="text-xs text-foreground-muted font-body">{messages.length} messages</p>
          </div>
        </div>
        <div className="space-y-2">
          <button onClick={handleCopyText}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all font-body text-sm text-left">
            <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 20 }}>
              {copied ? 'check' : 'content_copy'}
            </span>
            <div>
              <div className="text-foreground font-medium">{copied ? 'Copied!' : 'Copy to clipboard'}</div>
              <div className="text-[11px] text-foreground-muted">Plain text format</div>
            </div>
          </button>
          <button onClick={handleDownloadText}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all font-body text-sm text-left">
            <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 20 }}>download</span>
            <div>
              <div className="text-foreground font-medium">Download .txt</div>
              <div className="text-[11px] text-foreground-muted">Human-readable text file</div>
            </div>
          </button>
          <button onClick={handleDownloadJSON}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all font-body text-sm text-left">
            <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 20 }}>data_object</span>
            <div>
              <div className="text-foreground font-medium">Download .json</div>
              <div className="text-[11px] text-foreground-muted">Structured data with metadata</div>
            </div>
          </button>
        </div>
        <button onClick={onClose}
          className="w-full mt-4 px-4 py-2.5 text-sm font-medium rounded-xl border border-border text-foreground-muted hover:bg-white/5 transition-colors font-body">
          Close
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   TOPIC SIDEBAR
   ============================================================ */

function TopicSidebar({
  open,
  topics,
  activeTopic,
  onSelectTopic,
  onNewTopic,
  onClose,
}: {
  open: boolean;
  topics: ConversationTopic[];
  activeTopic: string | null;
  onSelectTopic: (id: string | null) => void;
  onNewTopic: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/40 md:hidden animate-fade-in" onClick={onClose} />
      <div className="fixed left-0 top-0 bottom-0 z-40 w-72 bg-bg-secondary border-r border-border flex flex-col animate-slide-in md:static md:animate-none">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <h3 className="text-sm font-bold text-foreground font-display">Topics</h3>
          <div className="flex items-center gap-1">
            <button onClick={onNewTopic}
              className="size-8 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors" title="New topic">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>add</span>
            </button>
            <button onClick={onClose}
              className="size-8 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors md:hidden">
              <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button
            onClick={() => onSelectTopic(null)}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all font-body ${
              activeTopic === null
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-foreground-muted hover:bg-white/5 hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>forum</span>
              <span className="font-medium">All Messages</span>
            </div>
          </button>
          {topics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => onSelectTopic(topic.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all font-body ${
                activeTopic === topic.id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-foreground-muted hover:bg-white/5 hover:text-foreground'
              }`}
            >
              <div className="font-medium truncate">{topic.label}</div>
              <div className="text-[10px] mt-0.5 opacity-60">
                {topic.messageCount} msgs · {formatTime(topic.createdAt)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/* ============================================================
   MAIN CHAT PAGE
   ============================================================ */

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // Streaming state
  const [streamingText, setStreamingText] = useState('');
  const [streamingId, setStreamingId] = useState<string | null>(null);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Topic/thread state
  const [topics, setTopics] = useState<ConversationTopic[]>([]);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [topicSidebarOpen, setTopicSidebarOpen] = useState(false);

  // Modal state
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Scroll-to-bottom state
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Attachment state
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string | null>(null);

  // Load messages and topics from localStorage on mount
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
    try {
      const storedTopics = localStorage.getItem(TOPICS_KEY);
      if (storedTopics) {
        const parsed = JSON.parse(storedTopics);
        if (Array.isArray(parsed)) setTopics(parsed);
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (loaded && messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, loaded]);

  // Save topics to localStorage
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(TOPICS_KEY, JSON.stringify(topics));
    }
  }, [topics, loaded]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, streamingText]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Focus search input when search opens
  useEffect(() => { if (searchOpen) searchInputRef.current?.focus(); }, [searchOpen]);

  // Track scroll position
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Poll for new messages
  const pollMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (lastTimestampRef.current) params.set('since', lastTimestampRef.current);
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

  // Compute topics with message counts
  const topicsWithCounts = useMemo(() => {
    return topics.map((t) => ({
      ...t,
      messageCount: messages.filter((m) => m.topic === t.id).length,
    }));
  }, [topics, messages]);

  // Filtered messages (by topic + search)
  const filteredMessages = useMemo(() => {
    let filtered = messages;
    if (activeTopic) {
      filtered = filtered.filter((m) => m.topic === activeTopic);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => m.text.toLowerCase().includes(q));
    }
    return filtered;
  }, [messages, activeTopic, searchQuery]);

  // Create a new topic
  const createNewTopic = () => {
    const id = `topic_${Date.now()}`;
    const label = `Topic ${topics.length + 1}`;
    setTopics((prev) => [...prev, { id, label, createdAt: new Date().toISOString(), messageCount: 0 }]);
    setActiveTopic(id);
  };

  // Handle streaming send
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);
    setPendingAttachments([]);

    const tempUserMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      text,
      from: 'user',
      timestamp: new Date().toISOString(),
      status: 'sending',
      topic: activeTopic || undefined,
      attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    // Try streaming first, fall back to non-streaming
    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, topic: activeTopic }),
      });

      if (!res.ok || !res.body) {
        throw new Error('Stream unavailable');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let aiId = '';

      setStreamingText('');
      setStreamingId(`streaming_${Date.now()}`);

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
                case 'user_confirmed':
                  // Replace temp user message with confirmed one
                  setMessages((prev) =>
                    prev.map((m) => m.id === tempUserMsg.id
                      ? { ...data.userMessage, attachments: tempUserMsg.attachments }
                      : m),
                  );
                  break;
                case 'token':
                  fullText += data.text;
                  setStreamingText(fullText);
                  break;
                case 'done':
                  aiId = data.id;
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

      // Streaming complete — add final AI message
      setStreamingText('');
      setStreamingId(null);

      if (fullText) {
        const aiMessage: ChatMessage = {
          id: aiId || `ai_${Date.now()}`,
          text: fullText,
          from: 'paul',
          timestamp: new Date().toISOString(),
          status: 'delivered',
          topic: activeTopic || undefined,
        };
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          if (existingIds.has(aiMessage.id)) return prev;
          return [...prev, aiMessage];
        });
        lastTimestampRef.current = aiMessage.timestamp;
      }
    } catch {
      // Fallback to non-streaming
      setStreamingText('');
      setStreamingId(null);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        if (data.error) {
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
            return [
              ...filtered,
              { ...tempUserMsg, id: data.userMessage?.id || tempUserMsg.id, status: 'sent' },
              {
                id: `err_${Date.now()}`,
                text: `Error: ${data.error}`,
                from: 'paul' as const,
                timestamp: new Date().toISOString(),
                status: 'error',
              },
            ];
          });
        } else {
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
            from: 'paul' as const,
            timestamp: new Date().toISOString(),
            status: 'error',
          },
        ]);
      }
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

  const confirmClear = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    lastTimestampRef.current = null;
    setClearModalOpen(false);
  };

  const copyMessage = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* */ }
  };

  const toggleReaction = (msgId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const reactions = { ...(m.reactions || {}) };
        reactions[emoji] = !reactions[emoji];
        return { ...m, reactions };
      }),
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: Attachment[] = Array.from(files).map((f) => ({
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: f.name,
      type: f.type,
      size: f.size,
      previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
    }));
    setPendingAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att?.previewUrl) URL.revokeObjectURL(att.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  const suggestions = [
    { icon: 'handshake', text: 'What deals need attention this week?', color: 'text-emerald-400' },
    { icon: 'auto_stories', text: 'Summarize my recent journal entries', color: 'text-sky-400' },
    { icon: 'cell_tower', text: 'What E-Rate leads are active?', color: 'text-amber-400' },
    { icon: 'assignment', text: "What's the status of all my projects?", color: 'text-purple-400' },
  ];

  const getAttachmentIcon = (type: string) => {
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'movie';
    if (type.includes('pdf')) return 'picture_as_pdf';
    if (type.includes('spreadsheet') || type.includes('csv') || type.includes('excel')) return 'table_chart';
    return 'description';
  };

  return (
    <div className="flex h-screen max-h-screen font-body">
      {/* Topic Sidebar */}
      <TopicSidebar
        open={topicSidebarOpen}
        topics={topicsWithCounts}
        activeTopic={activeTopic}
        onSelectTopic={(id) => { setActiveTopic(id); setTopicSidebarOpen(false); }}
        onNewTopic={createNewTopic}
        onClose={() => setTopicSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Modals */}
        <ConfirmModal
          open={clearModalOpen}
          icon="delete_forever"
          iconColor="text-red-400"
          iconBg="bg-red-500/10 border border-red-500/20"
          title="Clear Chat"
          subtitle="This cannot be undone"
          body="All messages will be permanently deleted from this device. Your vault data is not affected."
          confirmLabel="Clear All"
          confirmClass="bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25"
          onConfirm={confirmClear}
          onCancel={() => setClearModalOpen(false)}
        />
        <ExportModal open={exportModalOpen} messages={filteredMessages} onClose={() => setExportModalOpen(false)} />

        {/* Header */}
        <div className="shrink-0 border-b border-border-subtle bg-bg-dark/80 backdrop-blur-md px-4 md:px-6 py-3">
          {searchOpen ? (
            <div className="flex items-center gap-3 animate-fade-in">
              <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                className="size-9 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors shrink-0">
                <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 20 }}>arrow_back</span>
              </button>
              <div className="flex-1 relative">
                <input ref={searchInputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full rounded-xl border border-border bg-bg-secondary px-4 py-2 text-sm text-foreground placeholder:text-foreground-muted/40 outline-none focus:border-primary/40 font-body" />
                {searchQuery && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-muted/50 font-body">
                    {filteredMessages.length} found
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={() => setTopicSidebarOpen(true)}
                className="size-9 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors"
                title="Conversation topics">
                <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 20 }}>menu</span>
              </button>
              <div className="size-10 bg-secondary-dark/60 border border-primary/20 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>chat_bubble</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-foreground">Paul</h1>
                  <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  {activeTopic && (
                    <span className="text-[10px] text-primary/60 bg-primary/10 px-2 py-0.5 rounded-full font-body">
                      {topics.find((t) => t.id === activeTopic)?.label || 'Topic'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-foreground-muted font-body">
                  {sending && streamingText ? 'Responding...' : 'Your AI assistant · Second Brain'}
                </p>
              </div>
              <button onClick={() => setSearchOpen(true)}
                className="size-9 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors" title="Search messages">
                <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 18 }}>search</span>
              </button>
              <button onClick={() => setExportModalOpen(true)}
                className="size-9 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors" title="Export chat">
                <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 18 }}>ios_share</span>
              </button>
              <button onClick={() => setClearModalOpen(true)}
                className="size-9 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors" title="Clear chat history">
                <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 18 }}>delete_sweep</span>
              </button>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-3 md:px-6 py-4 space-y-3 relative">
          {/* Empty State */}
          {loaded && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 px-4">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-primary/5 animate-breathe" />
                <div className="relative size-20 rounded-full bg-secondary-dark/30 border border-primary/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 40 }}>waving_hand</span>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground mb-1">Hey Samson</h2>
                <p className="text-sm text-foreground-muted max-w-sm font-body">
                  Ask me anything about your vault, deals, projects, or whatever&apos;s on your mind.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg w-full">
                {suggestions.map((q, i) => (
                  <button key={q.text} onClick={() => { setInput(q.text); inputRef.current?.focus(); }}
                    className="group text-left text-xs px-3.5 py-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 hover:shadow-[0_0_16px_rgba(250,222,41,0.06)] text-foreground-muted hover:text-foreground transition-all animate-slide-up font-body"
                    style={{ animationDelay: `${i * 75 + 150}ms` }}>
                    <div className="flex items-start gap-2.5">
                      <span className={`material-symbols-outlined ${q.color} group-hover:text-primary transition-colors shrink-0`} style={{ fontSize: 18 }}>
                        {q.icon}
                      </span>
                      <span>{q.text}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message Bubbles */}
          {filteredMessages.map((msg, idx) => {
            const isUser = msg.from === 'user';
            const prevMsg = idx > 0 ? filteredMessages[idx - 1] : null;
            const showTimestamp = !prevMsg ||
              new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() > 300000;

            return (
              <div key={msg.id}>
                {showTimestamp && (
                  <div className="flex items-center justify-center gap-3 my-3">
                    <div className="flex-1 h-px bg-border-subtle/50" />
                    <span className="text-[10px] text-foreground-muted/50 bg-bg-dark/80 px-3 py-1 rounded-full shrink-0 font-body">
                      {formatTime(msg.timestamp)}
                    </span>
                    <div className="flex-1 h-px bg-border-subtle/50" />
                  </div>
                )}

                <div className={`group flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both, scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
                  {!isUser && (
                    <div className="shrink-0 mr-2 mt-1">
                      <div className="size-7 rounded-full bg-secondary-dark/60 border border-secondary-dark flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: 14 }}>smart_toy</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col max-w-[80%] md:max-w-[65%]">
                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className={`flex flex-wrap gap-1.5 mb-1.5 ${isUser ? 'justify-end' : ''}`}>
                        {msg.attachments.map((att) => (
                          <div key={att.id} className="flex items-center gap-1.5 bg-secondary-dark/30 border border-border rounded-lg px-2.5 py-1.5 text-[11px]">
                            {att.previewUrl ? (
                              <img src={att.previewUrl} alt={att.name} className="size-8 rounded object-cover" />
                            ) : (
                              <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 16 }}>{getAttachmentIcon(att.type)}</span>
                            )}
                            <div>
                              <div className="text-foreground/80 truncate max-w-[120px]">{att.name}</div>
                              <div className="text-foreground-muted/50">{formatFileSize(att.size)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={`${
                      isUser
                        ? 'bg-primary/12 border border-primary/20 rounded-2xl rounded-br-sm'
                        : 'bg-secondary-dark/20 border border-secondary-dark/40 rounded-2xl rounded-bl-sm'
                    } px-3.5 py-2.5 relative`}>
                      <div className={`text-sm leading-relaxed font-body ${isUser ? 'text-foreground' : 'text-foreground/90'}`}>
                        {parseMarkdown(msg.text)}
                      </div>

                      <div className={`flex items-center gap-1.5 mt-1 ${isUser ? 'justify-end' : ''}`}>
                        <span className="text-[10px] text-foreground-muted/40 font-body">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        {isUser && msg.status === 'sending' && (
                          <span className="material-symbols-outlined text-foreground-muted/30" style={{ fontSize: 12 }}>schedule</span>
                        )}
                        {isUser && msg.status === 'sent' && (
                          <span className="material-symbols-outlined text-foreground-muted/40" style={{ fontSize: 12 }}>done</span>
                        )}
                        {isUser && msg.status === 'delivered' && (
                          <span className="material-symbols-outlined text-primary/50" style={{ fontSize: 12 }}>done_all</span>
                        )}
                        <button onClick={() => copyMessage(msg.text, msg.id)}
                          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Copy message">
                          <span className={`material-symbols-outlined transition-colors ${
                            copiedId === msg.id ? 'text-emerald-400' : 'text-foreground-muted/40 hover:text-foreground-muted'
                          }`} style={{ fontSize: 12 }}>
                            {copiedId === msg.id ? 'check' : 'content_copy'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Reactions — AI messages only */}
                    {!isUser && (
                      <div className="flex items-center gap-1 mt-1 ml-1">
                        {(['thumb_up', 'thumb_down'] as const).map((emoji) => {
                          const active = msg.reactions?.[emoji];
                          return (
                            <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] transition-all ${
                                active
                                  ? 'bg-primary/15 border border-primary/25'
                                  : 'opacity-0 group-hover:opacity-60 hover:!opacity-100 border border-transparent hover:border-border'
                              }`}
                              title={emoji === 'thumb_up' ? 'Helpful' : 'Not helpful'}>
                              <span className={`material-symbols-outlined ${active ? 'text-primary' : 'text-foreground-muted'}`}
                                style={{ fontSize: 12, fontVariationSettings: active ? "'FILL' 1" : undefined }}>
                                {emoji}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Streaming AI Response */}
          {streamingId && streamingText && (
            <div className="flex justify-start animate-slide-up">
              <div className="shrink-0 mr-2 mt-1">
                <div className="size-7 rounded-full bg-secondary-dark/60 border border-secondary-dark flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 14 }}>smart_toy</span>
                </div>
              </div>
              <div className="flex flex-col max-w-[80%] md:max-w-[65%]">
                <div className="bg-secondary-dark/20 border border-secondary-dark/40 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                  <div className="text-sm leading-relaxed font-body text-foreground/90">
                    {parseMarkdown(streamingText)}
                    <span className="inline-block w-0.5 h-4 bg-primary/80 ml-0.5 animate-pulse align-text-bottom" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Typing Indicator (when sending but no streaming text yet) */}
          {sending && !streamingText && (
            <div className="flex justify-start animate-slide-up">
              <div className="shrink-0 mr-2 mt-1">
                <div className="size-7 rounded-full bg-secondary-dark/60 border border-secondary-dark flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 14 }}>smart_toy</span>
                </div>
              </div>
              <div className="bg-secondary-dark/20 border border-secondary-dark/40 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-1">
                    <div className="size-2 rounded-full bg-primary/60 animate-wave" style={{ animationDelay: '0ms' }} />
                    <div className="size-2 rounded-full bg-primary/60 animate-wave" style={{ animationDelay: '150ms' }} />
                    <div className="size-2 rounded-full bg-primary/60 animate-wave" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-foreground-muted/50 ml-1 animate-shimmer font-body">Paul is thinking...</span>
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

        {/* Attachment Preview */}
        {pendingAttachments.length > 0 && (
          <div className="shrink-0 border-t border-border-subtle px-3 md:px-6 py-2 bg-bg-dark/90">
            <div className="flex items-center gap-2 overflow-x-auto max-w-4xl mx-auto hide-scrollbar">
              {pendingAttachments.map((att) => (
                <div key={att.id} className="relative shrink-0 flex items-center gap-2 bg-secondary-dark/30 border border-border rounded-lg px-2.5 py-1.5 text-[11px] animate-scale-in">
                  {att.previewUrl ? (
                    <img src={att.previewUrl} alt={att.name} className="size-10 rounded object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 20 }}>{getAttachmentIcon(att.type)}</span>
                  )}
                  <div>
                    <div className="text-foreground/80 truncate max-w-[100px]">{att.name}</div>
                    <div className="text-foreground-muted/50">{formatFileSize(att.size)}</div>
                  </div>
                  <button onClick={() => removeAttachment(att.id)}
                    className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-bg-dark border border-border flex items-center justify-center hover:border-red-500/50 transition-colors">
                    <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 12 }}>close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="shrink-0 border-t border-border-subtle px-3 md:px-6 py-3 bg-bg-dark/90 backdrop-blur-xl">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            {/* Attachment button */}
            <button onClick={() => fileInputRef.current?.click()}
              className="size-10 shrink-0 rounded-xl hover:bg-white/5 flex items-center justify-center transition-colors mb-[2px]"
              title="Attach file">
              <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 20 }}>attach_file</span>
            </button>
            <input ref={fileInputRef} type="file" multiple className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md" onChange={handleFileSelect} />

            <div className="flex-1 relative">
              <div className="absolute -inset-[1px] rounded-2xl transition-opacity duration-300 pointer-events-none"
                style={{
                  opacity: inputFocused ? 1 : 0,
                  background: 'linear-gradient(90deg, rgba(250,222,41,0.3), transparent, rgba(250,222,41,0.3))',
                  backgroundSize: '200% 100%',
                  animation: inputFocused ? 'gradientShift 3s ease-in-out infinite' : 'none',
                }} />
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown} onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}
                placeholder="Message Paul..." disabled={sending} rows={1}
                className="w-full rounded-2xl border border-border bg-bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/40 outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_rgba(250,222,41,0.08)] transition-all disabled:opacity-50 resize-none overflow-hidden relative z-10 font-body"
                style={{ minHeight: '44px', maxHeight: '120px' }} />
            </div>
            <button onClick={handleSend} disabled={sending || !input.trim()}
              className="size-11 shrink-0 rounded-full bg-primary hover:bg-primary/90 disabled:bg-primary/15 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-[0_0_12px_rgba(250,222,41,0.15)] hover:shadow-[0_0_24px_rgba(250,222,41,0.35)] hover:animate-glow-pulse disabled:shadow-none mb-[1px]">
              <span className={`material-symbols-outlined font-bold ${
                sending || !input.trim() ? 'text-foreground-muted/30' : 'text-bg-dark'
              }`} style={{ fontSize: 20 }}>
                {sending ? 'more_horiz' : 'send'}
              </span>
            </button>
          </div>
          <div className="text-center mt-1.5">
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-px bg-border-subtle/40" />
              <span className="text-[10px] text-foreground-muted/30 font-body">
                Powered by Gemini 2.0 Flash · Vault-aware · Streaming
              </span>
              <div className="w-8 h-px bg-border-subtle/40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
