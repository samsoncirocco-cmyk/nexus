'use client';

import { useState, useCallback, useEffect } from 'react';

type Platform = 'linkedin' | 'x' | 'substack' | 'medium' | 'instagram' | 'tiktok';

interface Adaptation {
  platform: Platform;
  content: string;
  format: string;
  score: number;
  details: string;
  metadata?: Record<string, unknown>;
}

const PLATFORMS: { id: Platform; label: string; icon: string; color: string; maxChars: number }[] = [
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', color: '#0A66C2', maxChars: 3000 },
  { id: 'x', label: 'X / Twitter', icon: '𝕏', color: '#1DA1F2', maxChars: 280 },
  { id: 'substack', label: 'Substack', icon: '📰', color: '#FF6719', maxChars: 10000 },
  { id: 'medium', label: 'Medium', icon: '📝', color: '#00AB6C', maxChars: 10000 },
  { id: 'instagram', label: 'Instagram', icon: '📸', color: '#E4405F', maxChars: 2200 },
  { id: 'tiktok', label: 'TikTok', icon: '🎵', color: '#FF0050', maxChars: 2200 },
];

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'bold', label: 'Bold & Direct' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'educational', label: 'Educational' },
  { value: 'provocative', label: 'Provocative' },
];

export default function ComposePage() {
  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['linkedin']);
  const [tone, setTone] = useState('professional');
  const [adaptations, setAdaptations] = useState<Record<string, Adaptation>>({});
  const [isAdapting, setIsAdapting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Platform | null>(null);
  const [copiedPlatform, setCopiedPlatform] = useState<Platform | null>(null);
  const [voiceProfile, setVoiceProfile] = useState<Record<string, unknown> | null>(null);
  const [voiceLoaded, setVoiceLoaded] = useState(false);

  // Load Samson's voice profile on mount — powers authentic AI adaptations
  useEffect(() => {
    fetch('/voice-profile.json')
      .then(r => r.ok ? r.json() : null)
      .then(profile => {
        if (profile) {
          setVoiceProfile(profile);
          setVoiceLoaded(true);
        }
      })
      .catch(() => {/* Voice profile optional — adapt will still work */});
  }, []);

  const togglePlatform = useCallback((platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  }, []);

  const handleAdapt = useCallback(async () => {
    if (!content.trim() || selectedPlatforms.length === 0) return;

    setIsAdapting(true);
    setError(null);
    setAdaptations({});

    try {
      const res = await fetch('/api/adapt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          platforms: selectedPlatforms,
          tone,
          voiceProfile: voiceProfile || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `API error: ${res.status}`);
      }

      const data = await res.json();
      setAdaptations(data.adaptations || {});
      setActiveTab(selectedPlatforms[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adapt content');
    } finally {
      setIsAdapting(false);
    }
  }, [content, selectedPlatforms, tone]);

  const handleCopy = useCallback(async (platform: Platform, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedPlatform(platform);
    setTimeout(() => setCopiedPlatform(null), 2000);
  }, []);

  const charCount = content.length;
  const hasContent = content.trim().length > 0;
  const hasResults = Object.keys(adaptations).length > 0;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="material-symbols-rounded text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            edit_note
          </span>
          <h1 className="text-2xl md:text-3xl font-bold font-body text-[var(--text-primary)]">
            Compose & Adapt
          </h1>
        </div>
        <p className="text-[var(--text-secondary)] font-body text-sm">
          Write once → AI adapts for every platform. Powered by Grok-3.
        </p>
        {voiceLoaded && (
          <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-mono
            bg-green-500/10 text-green-400 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Voice profile: Samson ✓
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Input */}
        <div className="space-y-5">
          {/* Content Input */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-lg">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3 font-body">
              Your Content
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Paste your post, article, idea, or thought leadership content here…"
              className="w-full min-h-[220px] bg-transparent border border-[var(--border)] rounded-xl p-4 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] font-body text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
            <div className="flex items-center justify-between mt-2 text-xs text-[var(--text-tertiary)] font-mono">
              <span>{charCount.toLocaleString()} characters</span>
              <span>{content.split(/\s+/).filter(Boolean).length} words</span>
            </div>
          </div>

          {/* Platform Selector */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-lg">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3 font-body">
              Target Platforms
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PLATFORMS.map(p => {
                const selected = selectedPlatforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`
                      flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-200
                      ${selected
                        ? 'bg-primary/15 border-primary/40 text-primary shadow-[0_0_12px_rgba(250,222,41,0.1)]'
                        : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
                      }
                      border
                    `}
                  >
                    <span className="text-base">{p.icon}</span>
                    <span>{p.label}</span>
                    {selected && (
                      <span className="ml-auto material-symbols-rounded text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tone Selector */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-lg">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3 font-body">
              Tone
            </label>
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-body font-medium transition-all duration-200
                    ${tone === t.value
                      ? 'bg-primary/20 text-primary border border-primary/40'
                      : 'bg-[var(--bg)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)]'
                    }
                  `}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Adapt Button */}
          <button
            onClick={handleAdapt}
            disabled={!hasContent || selectedPlatforms.length === 0 || isAdapting}
            className={`
              w-full py-3.5 rounded-xl font-body font-semibold text-sm transition-all duration-300
              flex items-center justify-center gap-2
              ${hasContent && selectedPlatforms.length > 0 && !isAdapting
                ? 'bg-primary text-[#0a0f0c] hover:shadow-[0_0_24px_rgba(250,222,41,0.3)] hover:scale-[1.01] active:scale-[0.99]'
                : 'bg-[var(--border)] text-[var(--text-tertiary)] cursor-not-allowed'
              }
            `}
          >
            {isAdapting ? (
              <>
                <span className="material-symbols-rounded animate-spin text-lg">progress_activity</span>
                Adapting with Grok-3…
              </>
            ) : (
              <>
                <span className="material-symbols-rounded text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                Adapt for {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''}
              </>
            )}
          </button>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm font-body">
              <span className="material-symbols-rounded text-sm mr-1 align-middle">error</span>
              {error}
            </div>
          )}
        </div>

        {/* RIGHT: Output */}
        <div>
          {!hasResults && !isAdapting && (
            <div className="rounded-2xl border border-[var(--border)] border-dashed bg-[var(--card-bg)]/50 p-12 text-center">
              <span className="material-symbols-rounded text-5xl text-[var(--text-tertiary)] mb-4 block">
                draw
              </span>
              <p className="text-[var(--text-secondary)] font-body text-sm">
                Write your content, pick platforms, and hit Adapt.
              </p>
              <p className="text-[var(--text-tertiary)] font-body text-xs mt-2">
                Grok-3 will generate platform-optimized versions instantly.
              </p>
            </div>
          )}

          {isAdapting && (
            <div className="rounded-2xl border border-primary/20 bg-[var(--card-bg)] p-12 text-center">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
                <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                <span className="absolute inset-0 flex items-center justify-center material-symbols-rounded text-2xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  auto_awesome
                </span>
              </div>
              <p className="text-primary font-body font-semibold text-sm">Grok-3 is adapting your content…</p>
              <p className="text-[var(--text-tertiary)] font-body text-xs mt-1">
                {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''} · {tone} tone
              </p>
            </div>
          )}

          {hasResults && (
            <div className="space-y-4">
              {/* Platform Tabs */}
              <div className="flex gap-1 overflow-x-auto pb-1">
                {selectedPlatforms.filter(p => adaptations[p]).map(platform => {
                  const info = PLATFORMS.find(pl => pl.id === platform)!;
                  const adaptation = adaptations[platform];
                  return (
                    <button
                      key={platform}
                      onClick={() => setActiveTab(platform)}
                      className={`
                        flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-body font-medium whitespace-nowrap transition-all duration-200
                        ${activeTab === platform
                          ? 'bg-primary/15 text-primary border border-primary/30'
                          : 'bg-[var(--bg)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)]'
                        }
                      `}
                    >
                      <span>{info.icon}</span>
                      <span>{info.label}</span>
                      <span className={`
                        inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold
                        ${adaptation.score >= 85 ? 'bg-green-500/20 text-green-400' : adaptation.score >= 70 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}
                      `}>
                        {adaptation.score}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Adaptation Card */}
              {activeTab && adaptations[activeTab] && (() => {
                const adaptation = adaptations[activeTab];
                const info = PLATFORMS.find(p => p.id === activeTab)!;
                return (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-lg overflow-hidden">
                    {/* Card Header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{info.icon}</span>
                        <div>
                          <span className="font-body font-semibold text-sm text-[var(--text-primary)]">{info.label}</span>
                          <span className="ml-2 text-xs text-[var(--text-tertiary)] font-mono">{adaptation.format}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-tertiary)] font-body">{adaptation.details}</span>
                        <div className={`
                          px-2 py-0.5 rounded-full text-xs font-bold font-mono
                          ${adaptation.score >= 85 ? 'bg-green-500/15 text-green-400' : adaptation.score >= 70 ? 'bg-yellow-500/15 text-yellow-400' : 'bg-red-500/15 text-red-400'}
                        `}>
                          {adaptation.score}/100
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <pre className="whitespace-pre-wrap font-body text-sm text-[var(--text-primary)] leading-relaxed max-h-[500px] overflow-y-auto">
                        {adaptation.content}
                      </pre>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 px-5 py-3 border-t border-[var(--border)] bg-[var(--bg)]/50">
                      <button
                        onClick={() => handleCopy(activeTab, adaptation.content)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-body font-medium hover:bg-primary/20 transition-all"
                      >
                        <span className="material-symbols-rounded text-sm">
                          {copiedPlatform === activeTab ? 'check' : 'content_copy'}
                        </span>
                        {copiedPlatform === activeTab ? 'Copied!' : 'Copy'}
                      </button>
                      <span className="text-xs text-[var(--text-tertiary)] font-mono ml-auto">
                        {adaptation.content.length.toLocaleString()} / {info.maxChars.toLocaleString()} chars
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Quick Copy All */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)]/50 p-3 flex items-center justify-between">
                <span className="text-xs text-[var(--text-tertiary)] font-body">
                  {Object.keys(adaptations).length} adaptations generated
                </span>
                <button
                  onClick={async () => {
                    const all = selectedPlatforms
                      .filter(p => adaptations[p])
                      .map(p => {
                        const info = PLATFORMS.find(pl => pl.id === p)!;
                        return `=== ${info.label} (${adaptations[p].format}) ===\n\n${adaptations[p].content}`;
                      })
                      .join('\n\n---\n\n');
                    await navigator.clipboard.writeText(all);
                    setCopiedPlatform('linkedin' as Platform); // reuse for "all"
                    setTimeout(() => setCopiedPlatform(null), 2000);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-body font-medium text-[var(--text-secondary)] hover:text-primary hover:bg-primary/10 transition-all"
                >
                  <span className="material-symbols-rounded text-sm">copy_all</span>
                  Copy All
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
