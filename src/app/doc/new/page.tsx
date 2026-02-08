'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const categories = [
  { id: 'concepts', name: 'Concepts', icon: 'lightbulb' },
  { id: 'journal', name: 'Journal', icon: 'auto_stories' },
  { id: 'projects', name: 'Projects', icon: 'rocket_launch' },
  { id: 'accounts', name: 'Accounts', icon: 'account_balance' },
  { id: 'erate', name: 'E-Rate', icon: 'bolt' },
  { id: 'intel', name: 'Intel', icon: 'security' },
  { id: 'reports', name: 'Reports', icon: 'analytics' },
  { id: 'marketing', name: 'Marketing', icon: 'campaign' },
  { id: 'repos', name: 'Repositories', icon: 'code' },
];

export default function NewDocumentPage() {
  const router = useRouter();
  const [category, setCategory] = useState('concepts');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const [creating, setCreating] = useState(false);

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async function handleCreate() {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    setCreating(true);

    try {
      const slug = `${category}/${slugify(title)}`;
      
      const tagArray = tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const frontmatter = {
        title: title.trim(),
        ...(description.trim() && { description: description.trim() }),
        date: new Date().toISOString().split('T')[0],
        ...(tagArray.length > 0 && { tags: tagArray }),
      };

      const res = await fetch('/api/vault/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          content: initialContent || '# Getting Started\n\nStart writing your document here...',
          frontmatter,
          createNew: true,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create document');
      }

      // Redirect to the new document's edit page
      router.push(`/doc/edit/${slug}`);
    } catch (error) {
      console.error('Error creating document:', error);
      alert(`Failed to create document: ${(error as Error).message}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-dark">
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">
        {/* Header */}
        <div className="flex items-center gap-2 mb-8">
          <Link
            href="/doc"
            className="text-foreground-muted hover:text-foreground transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
              Knowledge Base
            </span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">
              New Document <span className="text-primary">.</span>
            </h1>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-bold text-foreground-muted uppercase tracking-wider mb-3">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                    category === cat.id
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-card-dark border-white/5 text-foreground-muted hover:border-white/20'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {cat.icon}
                  </span>
                  <span className="text-sm font-medium">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-foreground-muted uppercase tracking-wider mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-card-dark border border-white/10 rounded-xl text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Enter document title"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-foreground-muted uppercase tracking-wider mb-2">
              Description <span className="text-xs font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-card-dark border border-white/10 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Brief description of the document"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-bold text-foreground-muted uppercase tracking-wider mb-2">
              Tags <span className="text-xs font-normal">(optional, comma-separated)</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-4 py-3 bg-card-dark border border-white/10 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. sales, fortinet, strategy"
            />
            {tags && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.split(',').map((tag, i) => {
                  const trimmed = tag.trim();
                  if (!trimmed) return null;
                  return (
                    <span
                      key={i}
                      className="px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs"
                    >
                      {trimmed}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Initial Content */}
          <div>
            <label className="block text-sm font-bold text-foreground-muted uppercase tracking-wider mb-2">
              Initial Content <span className="text-xs font-normal">(optional)</span>
            </label>
            <textarea
              value={initialContent}
              onChange={(e) => setInitialContent(e.target.value)}
              className="w-full h-32 px-4 py-3 bg-card-dark border border-white/10 rounded-xl text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              placeholder="Start with some initial markdown content, or leave blank for a default template"
            />
          </div>

          {/* Preview Slug */}
          {title && (
            <div className="bg-secondary-dark/50 border border-white/5 rounded-xl p-4">
              <p className="text-xs text-foreground-muted uppercase tracking-wider font-bold mb-1">
                Document Path
              </p>
              <p className="text-sm font-mono text-primary">
                vault/{category}/{slugify(title)}.md
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Link
              href="/doc"
              className="flex-1 px-6 py-3 text-center text-sm font-medium text-foreground-muted bg-secondary-dark rounded-xl hover:bg-secondary-dark/80 transition-colors"
            >
              Cancel
            </Link>
            <button
              onClick={handleCreate}
              disabled={creating || !title.trim()}
              className="flex-1 px-6 py-3 text-sm font-bold bg-primary text-bg-dark rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              {creating ? 'Creating...' : 'Create Document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
