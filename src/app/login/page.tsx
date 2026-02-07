'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/* ── Floating geometric shapes rendered via CSS ── */
function FloatingShapes() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Large diamond */}
      <div
        className="absolute w-40 h-40 border border-primary/[0.06] rotate-45 rounded-md animate-float-slow"
        style={{ top: '8%', left: '12%' }}
      />
      {/* Small square */}
      <div
        className="absolute w-16 h-16 border border-primary/[0.08] rounded-sm rotate-12 animate-float-medium"
        style={{ top: '25%', right: '18%' }}
      />
      {/* Circle ring */}
      <div
        className="absolute w-28 h-28 border border-emerald-500/[0.05] rounded-full animate-float-reverse"
        style={{ bottom: '20%', left: '8%' }}
      />
      {/* Hexagon-ish */}
      <div
        className="absolute w-24 h-24 border border-primary/[0.07] rounded-xl rotate-[30deg] animate-float-slow"
        style={{ bottom: '15%', right: '12%' }}
      />
      {/* Tiny dots */}
      <div
        className="absolute w-3 h-3 bg-primary/[0.12] rounded-full animate-float-medium"
        style={{ top: '40%', left: '25%' }}
      />
      <div
        className="absolute w-2 h-2 bg-primary/[0.10] rounded-full animate-float-reverse"
        style={{ top: '60%', right: '30%' }}
      />
      <div
        className="absolute w-4 h-4 bg-emerald-500/[0.06] rounded-full animate-float-slow"
        style={{ top: '15%', right: '40%' }}
      />
      {/* Line accent */}
      <div
        className="absolute w-px h-32 bg-gradient-to-b from-transparent via-primary/[0.08] to-transparent animate-float-medium"
        style={{ top: '30%', left: '45%' }}
      />
      <div
        className="absolute w-32 h-px bg-gradient-to-r from-transparent via-primary/[0.06] to-transparent animate-float-reverse"
        style={{ bottom: '35%', right: '20%' }}
      />

      {/* Bokeh blobs */}
      <div className="absolute w-64 h-64 rounded-full bg-primary/[0.03] blur-3xl top-[10%] left-[15%] animate-breathe" />
      <div className="absolute w-48 h-48 rounded-full bg-emerald-500/[0.03] blur-3xl top-[60%] right-[10%] animate-breathe delay-2" />
      <div className="absolute w-32 h-32 rounded-full bg-primary/[0.04] blur-2xl bottom-[20%] left-[40%] animate-breathe delay-4" />
      <div className="absolute w-40 h-40 rounded-full bg-secondary-dark/20 blur-3xl bottom-[10%] right-[30%] animate-breathe delay-3" />
    </div>
  );
}

const REMEMBER_KEY = 'sb-remember-session';

export default function LoginPage() {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(REMEMBER_KEY) === '1';
  });
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const router = useRouter();

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs[0].current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist remember-me preference
  useEffect(() => {
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
  }, [remember]);

  const submitPin = useCallback(async (pin: string) => {
    setLoading(true);
    setError(false);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, remember }),
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError(true);
        setLoading(false);
        setTimeout(() => {
          setDigits(['', '', '', '']);
          inputRefs[0].current?.focus();
        }, 600);
      }
    } catch {
      setError(true);
      setLoading(false);
      setTimeout(() => {
        setDigits(['', '', '', '']);
        inputRefs[0].current?.focus();
      }, 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, remember]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError(false);

    if (digit && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    if (digit && index === 3) {
      const pin = newDigits.join('');
      if (pin.length === 4) {
        submitPin(pin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
    if (e.key === 'Enter') {
      const pin = digits.join('');
      if (pin.length === 4) {
        submitPin(pin);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      const newDigits = pasted.split('');
      setDigits(newDigits);
      inputRefs[3].current?.focus();
      submitPin(pasted);
    }
  };

  // Count filled digits for progress indicator
  const filledCount = digits.filter(Boolean).length;

  return (
    <div className="login-page min-h-screen flex items-center justify-center bg-bg-dark relative overflow-hidden">
      {/* Ambient radial glows */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_#fade2908_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,_#15473310_0%,_transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,_#fade2905_0%,_transparent_35%)]" />
      </div>

      {/* Floating geometric shapes */}
      <FloatingShapes />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 animate-scale-in">
        {/* Branding */}
        <div className="flex flex-col items-center gap-4">
          <div className="size-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary-dark/30 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/5 animate-glow-pulse relative">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 40 }}>psychology</span>
            {/* Subtle ring animation */}
            <div className="absolute inset-0 rounded-2xl border border-primary/10 animate-pulse-gold" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground tracking-tight font-display">Second Brain</h1>
            <p className="text-foreground-muted text-sm mt-1.5 font-body">Enter your PIN to continue</p>
          </div>
        </div>

        {/* PIN progress dots */}
        <div className="flex items-center gap-2" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`size-1.5 rounded-full transition-all duration-300 ${
                i < filledCount
                  ? 'bg-primary scale-125 shadow-[0_0_6px_rgba(250,222,41,0.4)]'
                  : 'bg-border'
              }`}
            />
          ))}
        </div>

        {/* PIN Input */}
        <div className={`flex gap-3 ${error ? 'animate-shake' : ''}`} role="group" aria-label="PIN input">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onFocus={() => setFocusedIdx(i)}
              onBlur={() => setFocusedIdx(null)}
              onPaste={i === 0 ? handlePaste : undefined}
              disabled={loading}
              aria-label={`PIN digit ${i + 1}`}
              className={`
                size-16 sm:size-18 text-center text-2xl font-bold rounded-xl
                bg-bg-secondary border-2 outline-none
                text-foreground caret-primary
                transition-all duration-300 ease-out
                ${error
                  ? 'border-red-500 bg-red-500/5 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                  : digit
                    ? 'border-primary/50 bg-primary/5 shadow-[0_0_16px_rgba(250,222,41,0.12)] scale-[1.02]'
                    : focusedIdx === i
                      ? 'border-primary shadow-[0_0_20px_rgba(250,222,41,0.15)] scale-105 bg-primary/[0.03]'
                      : 'border-border hover:border-primary/30'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              autoComplete="off"
            />
          ))}
        </div>

        {/* Error message */}
        <div className={`h-6 flex items-center transition-all duration-300 ${error ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}>
          <div className="flex items-center gap-2 text-red-400 text-sm font-body">
            <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>error</span>
            <span>Invalid PIN -- try again</span>
          </div>
        </div>

        {/* Remember me toggle */}
        <button
          onClick={() => setRemember((r) => !r)}
          className="flex items-center gap-3 group"
          type="button"
          aria-pressed={remember}
        >
          <div
            className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 ${
              remember ? 'bg-primary/80' : 'bg-border'
            }`}
          >
            <div
              className={`absolute top-0.5 size-5 rounded-full bg-white shadow-md transition-all duration-200 ${
                remember ? 'translate-x-[18px]' : 'translate-x-0.5'
              }`}
            />
          </div>
          <span className="text-foreground-muted text-sm font-body group-hover:text-foreground transition-colors">
            Remember me
          </span>
        </button>

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-foreground-muted text-sm font-body">Authenticating...</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col items-center gap-2 mt-6">
          <div className="flex items-center gap-2 text-foreground-muted/30 text-xs font-body">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>lock</span>
            <span>Secured with PIN authentication</span>
          </div>
          <div className="flex items-center gap-1 text-foreground-muted/20 text-[10px] font-body">
            <span>Press</span>
            <kbd className="px-1 py-0.5 rounded bg-white/5 border border-border font-mono text-[9px]">Enter</kbd>
            <span>to submit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
