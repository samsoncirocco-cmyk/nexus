import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildVaultContext } from '@/lib/vault-index';
import { semanticSearch, type SemanticSearchResult } from '../../../../../openclaw/skills';

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
- You can cross-reference multiple documents and datalake results to give comprehensive answers.
- Use markdown formatting: **bold**, *italic*, \`code\`, code blocks with \`\`\`, lists, etc.`;

const DEEP_SEARCH_PROMPT = `You are the Second Brain AI assistant for Samson Cirocco performing a DEEP SEARCH.

You have access to his personal knowledge vault and a BigQuery datalake with events, NLP enrichment, and AI analyses. Perform multi-step reasoning:

STEP 1: Identify all relevant documents and datalake results, then extract key facts.
STEP 2: Cross-reference information across documents and datalake hits to find connections.
STEP 3: Synthesize a comprehensive answer with specific evidence.

RULES:
- Be thorough — check every relevant document and datalake result.
- Show your reasoning by organizing the answer into clear sections.
- Cite vault documents with [document-path.md] references.
- Cite datalake results with [datalake:source/event_type] references.
- If information conflicts between sources, note the discrepancy.
- Provide actionable insights and recommendations when possible.
- Use markdown formatting: **bold**, *italic*, \`code\`, code blocks, lists, headers.`;

/**
 * Attempt datalake semantic search with graceful fallback.
 * Returns null if the datalake is unreachable or errors.
 */
async function tryDatalakeSearch(query: string): Promise<SemanticSearchResult | null> {
  try {
    const result = await semanticSearch({ query, maxResults: 10, timeRangeDays: 30 });
    if (result.error) return null;
    return result;
  } catch {
    return null;
  }
}

/**
 * Format datalake hits into a context string for the Gemini prompt.
 */
function formatDatalakeContext(result: SemanticSearchResult): string {
  if (result.hits.length === 0) return '';
  const hitLines = result.hits.map((hit, i) =>
    `[${i + 1}] source=${hit.source} type=${hit.eventType} time=${hit.timestamp} relevance=${hit.relevanceScore.toFixed(2)}\n    subject: ${hit.subject || '(none)'}\n    snippet: ${hit.snippet || '(none)'}`,
  );
  return `=== DATALAKE RESULTS (${result.totalHits} hits, searched: ${result.tablesSearched.join(', ')}) ===\n\n${hitLines.join('\n\n')}\n\n=== END DATALAKE ===`;
}

/**
 * POST /api/ask/stream
 * Streams AI responses via SSE with conversation memory support.
 * Body: { question: string, history?: { role: string, content: string }[], deepSearch?: boolean }
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const { question, history, deepSearch } = await request.json();

    if (!question || typeof question !== 'string' || !question.trim()) {
      return new Response(
        JSON.stringify({ error: 'Missing "question" field' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not set' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { context, docNames } = buildVaultContext();

    // Datalake semantic search (run in parallel with vault context which is already built)
    const datalakeResult = await tryDatalakeSearch(question.trim());
    const datalakeContext = datalakeResult ? formatDatalakeContext(datalakeResult) : '';
    const datalakeSources = datalakeResult
      ? datalakeResult.hits.map((h) => `datalake:${h.source}/${h.eventType}`)
      : [];

    // Build conversation history for follow-up context
    let conversationContext = '';
    if (Array.isArray(history) && history.length > 0) {
      // Include last 6 messages for context window management
      const recentHistory = history.slice(-6);
      conversationContext = '\n=== CONVERSATION HISTORY ===\n' +
        recentHistory.map((m: { role: string; content: string }) =>
          `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content.slice(0, 1000)}`
        ).join('\n\n') +
        '\n=== END HISTORY ===\n';
    }

    const systemPrompt = deepSearch ? DEEP_SEARCH_PROMPT : SYSTEM_PROMPT;

    const prompt = `${systemPrompt}

=== KNOWLEDGE VAULT (${docNames.length} documents) ===

${context}

=== END VAULT ===
${datalakeContext ? '\n' + datalakeContext + '\n' : ''}${conversationContext}
USER QUESTION: ${question.trim()}

${deepSearch
  ? 'Perform a deep multi-step analysis. Be thorough and cross-reference multiple documents and datalake results. Organize your response with clear sections.'
  : 'Answer the question based on the vault content and datalake results above. Cite vault documents by their file path in brackets like [path/to/doc.md]. Cite datalake results as [datalake:source/event_type].'}${
  conversationContext ? ' This is a follow-up question — reference the conversation history for context.' : ''
}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          if (datalakeContext) {
            send('status', { message: `Datalake: ${datalakeResult!.totalHits} results found` });
          }

          if (deepSearch) {
            send('status', { message: datalakeContext ? 'Deep searching vault + datalake...' : 'Scanning vault documents...' });
          } else if (datalakeContext) {
            send('status', { message: 'Generating answer from vault + datalake...' });
          }

          const result = await model.generateContentStream(prompt);
          let fullText = '';

          if (deepSearch) {
            send('status', { message: 'Analyzing and cross-referencing...' });
          }

          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              fullText += chunkText;
              send('token', { text: chunkText });
            }
          }

          // Extract vault source citations
          const citationRegex = /\[([^\]]+\.md)\]/g;
          const sources: string[] = [];
          let match;
          while ((match = citationRegex.exec(fullText)) !== null) {
            const source = match[1];
            if (!sources.includes(source) && docNames.includes(source)) {
              sources.push(source);
            }
          }

          // Extract datalake citations from the response text
          const dlCitationRegex = /\[datalake:([^\]]+)\]/g;
          const referencedDlSources: string[] = [];
          while ((match = dlCitationRegex.exec(fullText)) !== null) {
            const src = `datalake:${match[1]}`;
            if (!referencedDlSources.includes(src)) {
              referencedDlSources.push(src);
            }
          }

          // Merge: include any datalake sources from search results even if not explicitly cited
          const allDlSources = [...new Set([...referencedDlSources, ...datalakeSources])];

          send('done', { fullText, sources, datalakeSources: allDlSources });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Streaming failed';
          send('error', { error: message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: unknown) {
    console.error('Ask stream error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
