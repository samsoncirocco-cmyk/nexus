import { getDirectivesByCategory, getAllDirectives } from '@/lib/directives';
import DirectivesBrowser from './DirectivesBrowser';

export const dynamic = 'force-dynamic';

const CATEGORY_ICONS: Record<string, string> = {
  operations: 'settings',
  development: 'code',
  data: 'database',
  content: 'edit_note',
  meta: 'auto_awesome',
};

const CATEGORY_LABELS: Record<string, string> = {
  operations: 'Operations',
  development: 'Development',
  data: 'Data',
  content: 'Content',
  meta: 'Meta',
};

export default function DirectivesPage() {
  const directivesByCategory = getDirectivesByCategory();
  const allDirectives = getAllDirectives();

  // Serialize dates for client component
  const serializedDirectives = allDirectives.map(d => ({
    ...d,
    lastModified: d.lastModified.toISOString(),
  }));

  const categories = Object.keys(directivesByCategory).sort();

  return (
    <div className="max-w-5xl mx-auto px-4 pt-8 pb-24">
      {/* Header */}
      <div className="mb-8">
        <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold font-body">
          DOE Framework
        </span>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1 font-display">
          Directives <span className="text-primary">.</span>
        </h1>
        <p className="text-foreground-muted text-sm mt-2 font-body">
          {allDirectives.length} operational directives across {categories.length} categories
        </p>
      </div>

      <DirectivesBrowser
        directives={serializedDirectives}
        categories={categories}
        categoryIcons={CATEGORY_ICONS}
        categoryLabels={CATEGORY_LABELS}
      />
    </div>
  );
}
