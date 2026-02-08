import { NextResponse } from 'next/server';
import { loadVaultDocs, VaultDoc } from '@/lib/vault-index';

interface GraphNode {
  id: string;
  title: string;
  category: string;
  tags: string[];
  connections: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'tag' | 'reference';
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildGraph(docs: VaultDoc[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  const addEdge = (a: string, b: string, type: 'tag' | 'reference') => {
    if (a === b) return;
    const key = [a, b].sort().join('::') + '::' + type;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push({ source: a, target: b, type });
  };

  // Build tag → doc index
  const tagIndex = new Map<string, string[]>();
  for (const doc of docs) {
    for (const tag of doc.tags) {
      const t = tag.toLowerCase().trim();
      if (!t) continue;
      if (!tagIndex.has(t)) tagIndex.set(t, []);
      tagIndex.get(t)!.push(doc.slug);
    }
  }

  // Create edges for shared tags (skip ultra-common tags that connect everything)
  const SKIP_TAGS = new Set(['sled', 'account']); // too many connections
  for (const [tag, slugs] of tagIndex.entries()) {
    if (SKIP_TAGS.has(tag)) continue;
    if (slugs.length > 20) continue; // skip tags that connect too many docs
    for (let i = 0; i < slugs.length; i++) {
      for (let j = i + 1; j < slugs.length; j++) {
        addEdge(slugs[i], slugs[j], 'tag');
      }
    }
  }

  // Cross-reference detection: look for [[wikilinks]] and markdown links to other docs
  const slugSet = new Set(docs.map(d => d.slug));
  const titleToSlug = new Map<string, string>();
  for (const doc of docs) {
    titleToSlug.set(doc.title.toLowerCase(), doc.slug);
    // Also map filename
    const filename = doc.slug.split('/').pop()!;
    titleToSlug.set(filename.toLowerCase(), doc.slug);
  }

  for (const doc of docs) {
    // [[wikilink]] pattern
    const wikilinks = doc.content.matchAll(/\[\[([^\]]+)\]\]/g);
    for (const m of wikilinks) {
      const target = slugify(m[1]);
      // Try to find matching doc
      for (const [key, slug] of titleToSlug.entries()) {
        if (slugify(key) === target || key.includes(target)) {
          addEdge(doc.slug, slug, 'reference');
          break;
        }
      }
    }

    // Markdown link to other vault docs: [text](/doc/slug)
    const mdLinks = doc.content.matchAll(/\[([^\]]*)\]\(\/doc\/([^)]+)\)/g);
    for (const m of mdLinks) {
      const targetSlug = m[2];
      if (slugSet.has(targetSlug)) {
        addEdge(doc.slug, targetSlug, 'reference');
      }
    }
  }

  // Count connections per node
  const connectionCount = new Map<string, number>();
  for (const edge of edges) {
    connectionCount.set(edge.source, (connectionCount.get(edge.source) || 0) + 1);
    connectionCount.set(edge.target, (connectionCount.get(edge.target) || 0) + 1);
  }

  const nodes: GraphNode[] = docs.map(doc => ({
    id: doc.slug,
    title: doc.title,
    category: doc.category,
    tags: doc.tags,
    connections: connectionCount.get(doc.slug) || 0,
  }));

  return { nodes, edges };
}

export async function GET() {
  try {
    const docs = loadVaultDocs(true);
    const graph = buildGraph(docs);

    // Add synthetic data source nodes
    const dataSources = [
      { id: 'data-source:gmail', title: 'Gmail', category: 'data-source', tags: ['email', 'data'], connections: 0 },
      { id: 'data-source:bigquery', title: 'BigQuery', category: 'data-source', tags: ['data', 'events', 'memory'], connections: 0 },
      { id: 'data-source:calendar', title: 'Calendar', category: 'data-source', tags: ['calendar', 'data'], connections: 0 },
      { id: 'data-source:agents', title: 'Agents', category: 'data-source', tags: ['agents', 'automation'], connections: 0 },
    ];

    // Connect data sources to relevant docs
    const journalDocs = docs.filter(d => d.category === 'journal').map(d => d.slug);
    const projectDocs = docs.filter(d => d.category === 'project').map(d => d.slug);

    // Gmail connects to journal docs
    for (const slug of journalDocs.slice(0, 5)) { // limit connections to avoid clutter
      graph.edges.push({ source: 'data-source:gmail', target: slug, type: 'reference' });
      dataSources[0].connections++;
    }

    // BigQuery connects to bigquery-datalake concept doc if exists
    const bqDoc = docs.find(d => d.slug.includes('bigquery'));
    if (bqDoc) {
      graph.edges.push({ source: 'data-source:bigquery', target: bqDoc.slug, type: 'reference' });
      dataSources[1].connections++;
    }

    // Calendar connects to journal docs
    for (const slug of journalDocs.slice(0, 3)) {
      graph.edges.push({ source: 'data-source:calendar', target: slug, type: 'reference' });
      dataSources[2].connections++;
    }

    // Agents connects to all project docs
    for (const slug of projectDocs) {
      graph.edges.push({ source: 'data-source:agents', target: slug, type: 'reference' });
      dataSources[3].connections++;
    }

    // Add data source nodes to graph
    graph.nodes.push(...dataSources);

    return NextResponse.json(graph);
  } catch (error) {
    console.error('Graph API error:', error);
    return NextResponse.json({ error: 'Failed to build graph' }, { status: 500 });
  }
}
