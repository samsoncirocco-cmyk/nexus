import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildVaultContext } from '@/lib/vault-index';
import { semanticSearch, type SemanticSearchResult } from '../../../../openclaw/skills';

const SYSTEM_PROMPT = `You are the Second Brain AI assistant for Samson Cirocco.

You have access to his personal knowledge vault containing accounts, deals, projects, concepts, journal entries, E-Rate leads, competitive intel, and sales playbooks.
You also have access to a BigQuery datalake with events, NLP enrichment, and AI analyses.

RULES:
- Answer questions based on the vault content AND datalake results. Cite which documents you're referencing by their file path.
- If datalake results are provided, incorporate relevant hits into your answer and cite them as [datalake:source/event_type].
- If the information isn't in the vault or datalake, say so clearly. Don't make things up.
- Be concise and direct. No corporate fluff.
- When referencing vault documents, format citations as [document-path] so the UI can link them.
- When referencing datalake results, format citations as [datalake:source/event_type].
- For questions about deals, accounts, or pipeline: reference the relevant vault docs and datalake events.
- For questions about concepts or strategies: synthesize from the relevant playbooks and frameworks.
- You can cross-reference multiple documents and datalake results to give comprehensive answers.`;

async function tryDatalakeSearch(query: string): Promise<SemanticSearchResult | null> {
  try {
    const result = await semanticSearch({ query, maxResults: 10, timeRangeDays: 30 });
    if (result.error) return null;
    return result;
  } catch {
    return null;
  }
}

function formatDatalakeContext(result: SemanticSearchResult): string {
  if (result.hits.length === 0) return '';
  const hitLines = result.hits.map((hit, i) =>
    `[${i + 1}] source=${hit.source} type=${hit.eventType} time=${hit.timestamp} relevance=${hit.relevanceScore.toFixed(2)}\n    subject: ${hit.subject || '(none)'}\n    snippet: ${hit.snippet || '(none)'}`,
  );
  return `=== DATALAKE RESULTS (${result.totalHits} hits, searched: ${result.tablesSearched.join(', ')}) ===\n\n${hitLines.join('\n\n')}\n\n=== END DATALAKE ===`;
}

export async function POST(request: NextRequest) {
  try {
    const { question, history } = await request.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "question" field' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY environment variable not set' },
        { status: 500 }
      );
    }

    // Load vault content
    const { context, docNames } = buildVaultContext();

    // Datalake semantic search (graceful fallback)
    const datalakeResult = await tryDatalakeSearch(question);
    const datalakeContext = datalakeResult ? formatDatalakeContext(datalakeResult) : '';
    const datalakeSources = datalakeResult
      ? datalakeResult.hits.map((h) => `datalake:${h.source}/${h.eventType}`)
      : [];

    // Build conversation history for follow-up context
    let conversationContext = '';
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-6);
      conversationContext = '\n=== CONVERSATION HISTORY ===\n' +
        recentHistory.map((m: { role: string; content: string }) =>
          `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content.slice(0, 1000)}`
        ).join('\n\n') +
        '\n=== END HISTORY ===\n';
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `${SYSTEM_PROMPT}

=== KNOWLEDGE VAULT (${docNames.length} documents) ===

${context}

=== END VAULT ===
${datalakeContext ? '\n' + datalakeContext + '\n' : ''}${conversationContext}
USER QUESTION: ${question}

Answer the question based on the vault content and datalake results above. Cite vault documents by their file path in brackets like [path/to/doc.md]. Cite datalake results as [datalake:source/event_type].${
  conversationContext ? ' This is a follow-up question — reference the conversation history for context.' : ''
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const answer = response.text();

    // Extract vault source citations from the answer
    const citationRegex = /\[([^\]]+\.md)\]/g;
    const sources: string[] = [];
    let match;
    while ((match = citationRegex.exec(answer)) !== null) {
      const source = match[1];
      if (!sources.includes(source) && docNames.includes(source)) {
        sources.push(source);
      }
    }

    return NextResponse.json({ answer, sources, datalakeSources });
  } catch (error: unknown) {
    console.error('Ask API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
