'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Frontmatter {
  title?: string;
  description?: string;
  date?: string;
  tags?: string[];
}

export default function DocumentEditPage() {
  const router = useRouter();
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug.join('/') : params.slug;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState('');
  const [frontmatter, setFrontmatter] = useState<Frontmatter>({});
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load the document
  useEffect(() => {
    async function loadDocument() {
      try {
        const res = await fetch(`/api/vault/read?slug=${encodeURIComponent(slug)}`);
        
        if (!res.ok) {
          throw new Error('Failed to load document');
        }

        const data = await res.json();
        setContent(data.content || '');
        setFrontmatter(data.frontmatter || {});
      } catch (err) {
        console.error('Error loading document:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadDocument();
    }
  }, [slug]);

  async function handleSave() {
    setSaving(true);
    setSaveSuccess(false);
    setError('');

    try {
      const res = await fetch('/api/vault/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          content,
          frontmatter,
          createNew: false,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save document');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving document:', err);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    router.push(`/doc/${slug}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-foreground-muted text-sm">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error && !content) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <span className="material-symbols-outlined text-primary text-5xl mb-4">error</span>
          <h1 className="text-xl font-bold mb-2">Failed to Load Document</h1>
          <p className="text-foreground-muted mb-6">{error}</p>
          <Link
            href={`/doc/${slug}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-bg-dark rounded-xl font-bold hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Document
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark">
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-24">
        {/* Header */}
        <header className="sticky top-0 bg-bg-dark/95 backdrop-blur-sm z-10 pb-4 mb-6 border-b border-white/5">
          <div className="flex items-center justify-between gap-4 pt-4">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                href={`/doc/${slug}`}
                className="text-foreground-muted hover:text-foreground transition-colors shrink-0"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold block">
                  Editing
                </span>
                <h1 className="text-lg md:text-xl font-bold tracking-tight truncate">
                  {frontmatter.title || slug.split('/').pop()}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-foreground-muted bg-secondary-dark/30 rounded-lg hover:bg-secondary-dark/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-bold bg-primary text-bg-dark rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Success/Error Messages */}
          {saveSuccess && (
            <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg">
              <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
              <span className="text-sm text-primary font-medium">Document saved successfully!</span>
            </div>
          )}
          {error && (
            <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <span className="material-symbols-outlined text-red-400 text-sm">error</span>
              <span className="text-sm text-red-400 font-medium">{error}</span>
            </div>
          )}
        </header>

        {/* Metadata Fields */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-foreground-muted uppercase tracking-wider mb-2">
              Title
            </label>
            <input
              type="text"
              value={frontmatter.title || ''}
              onChange={(e) => setFrontmatter({ ...frontmatter, title: e.target.value })}
              className="w-full px-4 py-2 bg-card-dark border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Document title"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground-muted uppercase tracking-wider mb-2">
              Description
            </label>
            <input
              type="text"
              value={frontmatter.description || ''}
              onChange={(e) => setFrontmatter({ ...frontmatter, description: e.target.value })}
              className="w-full px-4 py-2 bg-card-dark border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Brief description (optional)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground-muted uppercase tracking-wider mb-2">
                Date
              </label>
              <input
                type="date"
                value={frontmatter.date || ''}
                onChange={(e) => setFrontmatter({ ...frontmatter, date: e.target.value })}
                className="w-full px-4 py-2 bg-card-dark border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground-muted uppercase tracking-wider mb-2">
                Tags <span className="text-[10px] font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={frontmatter.tags?.join(', ') || ''}
                onChange={(e) => setFrontmatter({
                  ...frontmatter,
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                })}
                className="w-full px-4 py-2 bg-card-dark border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>
        </div>

        {/* Content Editor */}
        <div>
          <label className="block text-xs font-bold text-foreground-muted uppercase tracking-wider mb-2">
            Markdown Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-[60vh] px-4 py-3 bg-card-dark border border-white/10 rounded-lg text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            placeholder="Write your markdown content here..."
            spellCheck={false}
          />
          <p className="text-xs text-foreground-muted mt-2">
            {content.split('\n').length} lines · {content.length} characters
          </p>
        </div>

        {/* Mobile Save Button (fixed at bottom) */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-bg-dark/95 backdrop-blur-sm border-t border-white/5 md:hidden">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-6 py-3 text-sm font-bold bg-primary text-bg-dark rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
