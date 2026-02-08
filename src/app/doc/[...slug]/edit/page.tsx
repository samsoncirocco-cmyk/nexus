'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { remark } from 'remark';
import html from 'remark-html';

export default function EditDocumentPage() {
  const router = useRouter();
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug.join('/') : params.slug;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [date, setDate] = useState('');
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  // Load document on mount
  useEffect(() => {
    async function loadDocument() {
      try {
        const res = await fetch(`/api/vault/read?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error('Failed to load document');
        
        const doc = await res.json();
        setTitle(doc.frontmatter?.title || '');
        setDescription(doc.frontmatter?.description || '');
        setTags(doc.frontmatter?.tags?.join(', ') || '');
        setDate(doc.frontmatter?.date || '');
        setContent(doc.content || '');
      } catch (error) {
        console.error('Error loading document:', error);
        alert('Failed to load document');
      } finally {
        setLoading(false);
      }
    }

    loadDocument();
  }, [slug]);

  // Update preview when content changes
  useEffect(() => {
    async function updatePreview() {
      if (!content) {
        setPreview('');
        return;
      }

      try {
        const processed = await remark().use(html).process(content);
        setPreview(processed.toString());
      } catch (error) {
        console.error('Error rendering preview:', error);
        setPreview('<p class="text-red-500">Error rendering markdown</p>');
      }
    }

    updatePreview();
  }, [content]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [title, description, tags, date, content]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  async function handleSave() {
    setSaving(true);
    
    try {
      const frontmatter = {
        title,
        ...(description && { description }),
        ...(date && { date }),
        ...(tags && { tags: tags.split(',').map(t => t.trim()).filter(Boolean) }),
      };

      const res = await fetch('/api/vault/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, content, frontmatter }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save');
      }

      setHasUnsavedChanges(false);
      router.push(`/doc/${slug}`);
    } catch (error) {
      console.error('Error saving document:', error);
      alert(`Failed to save: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (hasUnsavedChanges && !confirm('Discard unsaved changes?')) {
      return;
    }
    router.push(`/doc/${slug}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <div className="text-foreground-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card-dark border-b border-white/5 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={handleCancel}
              className="text-foreground-muted hover:text-foreground transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h1 className="text-lg font-bold truncate">
              Edit: {title || 'Untitled'}
            </h1>
            {hasUnsavedChanges && (
              <span className="text-xs text-yellow-500 font-semibold">● Unsaved</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-bold bg-primary text-bg-dark rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Mobile Tabs */}
        <div className="lg:hidden flex border-b border-white/5 bg-card-dark sticky top-[57px] z-10">
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'edit'
                ? 'text-primary border-b-2 border-primary'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            <span className="material-symbols-outlined text-sm mr-2">edit</span>
            Edit
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'preview'
                ? 'text-primary border-b-2 border-primary'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            <span className="material-symbols-outlined text-sm mr-2">visibility</span>
            Preview
          </button>
        </div>

        {/* Editor Panel */}
        <div
          className={`flex-1 overflow-y-auto ${
            activeTab === 'preview' ? 'hidden lg:flex' : 'flex'
          } flex-col`}
        >
          <div className="max-w-3xl mx-auto w-full p-4 space-y-4">
            {/* Frontmatter Fields */}
            <div className="bg-secondary-dark border border-white/5 rounded-xl p-4 space-y-4">
              <h2 className="text-sm font-bold text-foreground-muted uppercase tracking-wider">
                Document Metadata
              </h2>

              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-dark border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Document title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-dark border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Brief description"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-dark border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-1">
                    Tags <span className="text-xs">(comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-dark border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
              </div>
            </div>

            {/* Content Editor */}
            <div>
              <label className="block text-sm font-bold text-foreground-muted uppercase tracking-wider mb-2">
                Markdown Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-[calc(100vh-400px)] min-h-[400px] px-4 py-3 bg-bg-dark border border-white/10 rounded-xl text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Write your markdown content here..."
              />
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div
          className={`flex-1 overflow-y-auto border-l border-white/5 bg-secondary-dark/30 ${
            activeTab === 'edit' ? 'hidden lg:flex' : 'flex'
          } flex-col`}
        >
          <div className="max-w-3xl mx-auto w-full p-4">
            <div className="sticky top-0 bg-secondary-dark/50 backdrop-blur-sm pb-2 mb-4 border-b border-white/5">
              <h2 className="text-sm font-bold text-foreground-muted uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">visibility</span>
                Preview
              </h2>
            </div>
            
            {/* Preview Title */}
            {title && (
              <h1 className="text-white tracking-tight text-3xl font-bold leading-tight pb-6 pt-2">
                {title} <span className="text-primary">.</span>
              </h1>
            )}

            {/* Preview Description */}
            {description && (
              <p className="text-zinc-300 text-lg font-light leading-relaxed italic border-l-2 border-primary/40 pl-4 py-1 mb-8">
                {description}
              </p>
            )}

            {/* Preview Content */}
            <div
              className="document-content prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          </div>
        </div>
      </div>

      {/* Mobile Save Bar */}
      <div className="lg:hidden sticky bottom-0 left-0 right-0 bg-card-dark border-t border-white/5 p-4 flex gap-2">
        <button
          onClick={handleCancel}
          className="flex-1 px-4 py-3 text-sm font-medium text-foreground-muted bg-secondary-dark rounded-lg hover:bg-secondary-dark/80 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 px-4 py-3 text-sm font-bold bg-primary text-bg-dark rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">save</span>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
