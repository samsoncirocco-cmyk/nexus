'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const submitPin = useCallback(async (pin: string) => {
    setLoading(true);
    setError(false);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError(true);
        setLoading(false);
        // Clear and refocus
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
  }, [router]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError(false);

    if (digit && index < 3) {
      // Move to next input
      inputRefs[index + 1].current?.focus();
    }

    // Auto-submit when all 4 digits entered
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

  return (
    <div className="login-page min-h-screen flex items-center justify-center bg-bg-dark relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_#fade2908_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,_#15473310_0%,_transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,_#fade2905_0%,_transparent_35%)]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        {/* Branding */}
        <div className="flex flex-col items-center gap-3">
          <div className="size-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary-dark/30 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/5">
            <span className="text-4xl">🧠</span>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Second Brain</h1>
            <p className="text-foreground-muted text-sm mt-1">Enter your PIN to continue</p>
          </div>
        </div>

        {/* PIN Input */}
        <div className={`flex gap-3 ${error ? 'animate-shake' : ''}`}>
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
              onPaste={i === 0 ? handlePaste : undefined}
              disabled={loading}
              className={`
                size-16 text-center text-2xl font-bold rounded-xl
                bg-bg-secondary border-2 outline-none transition-all duration-200
                text-foreground caret-primary
                ${error
                  ? 'border-red-500 bg-red-500/5'
                  : digit
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border hover:border-primary/30 focus:border-primary'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              autoComplete="off"
            />
          ))}
        </div>

        {/* Error message */}
        <div className={`h-6 flex items-center transition-opacity duration-300 ${error ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
            <span>Invalid PIN — try again</span>
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center gap-3">
            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-foreground-muted text-sm">Authenticating…</span>
          </div>
        )}

        {/* Footer */}
        <p className="text-foreground-muted/40 text-xs mt-8">
          Secured with PIN authentication
        </p>
      </div>
    </div>
  );
}
