'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface CommandBarProps {
  placeholder?: string;
  variant?: 'full' | 'compact';
}

export default function CommandBar({ placeholder = 'Give Paul a command...', variant = 'full' }: CommandBarProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (res.ok) {
        setText('');
        setSent(true);
        setTimeout(() => setSent(false), 2500);
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to send command:', err);
    } finally {
      setSending(false);
    }
  };

  if (variant === 'compact') {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            disabled={sending}
            className="w-full rounded-xl border border-primary/20 bg-card-dark px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/50 outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(250,222,41,0.1)] transition-all disabled:opacity-50"
          />
          {sent && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-400 text-xs font-bold animate-fade-in">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
              Sent
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="shrink-0 size-11 rounded-xl bg-primary text-bg-dark flex items-center justify-center font-bold hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_16px_rgba(250,222,41,0.2)]"
        >
          {sending ? (
            <span className="material-symbols-outlined animate-spin" style={{ fontSize: 20 }}>progress_activity</span>
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
          )}
        </button>
      </form>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-secondary-dark/60 to-card-dark p-5 shadow-lg">
      {/* Ambient glow */}
      <div className="absolute -right-6 -top-6 size-28 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-4 -bottom-4 size-20 bg-secondary-dark/40 rounded-full blur-2xl pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>bolt</span>
          <h3 className="text-sm font-bold text-primary tracking-wide uppercase">Command Center</h3>
          {sent && (
            <span className="ml-auto flex items-center gap-1 text-emerald-400 text-xs font-bold animate-fade-in">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
              Command sent!
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              disabled={sending}
              className="w-full rounded-xl border border-primary/30 bg-bg-dark/80 px-4 py-3.5 text-sm text-foreground placeholder:text-foreground-muted/50 outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(250,222,41,0.15)] transition-all disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="shrink-0 h-[46px] px-5 rounded-xl bg-primary text-bg-dark flex items-center gap-2 font-bold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(250,222,41,0.25)]"
          >
            {sending ? (
              <>
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>progress_activity</span>
                Sending
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                Send
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
