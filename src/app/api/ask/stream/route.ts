import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildVaultContext } from '@/lib/vault-index';

const SYSTEM_PROMPT = `You are the Second Brain AI assistant for Samson Cirocco.

You have access to his personal knowledge vault containing accounts, deals, projects, concepts, journal entries, E-Rate leads, competitive intel, and sales playbooks.

RULES:
- Answer questions based on the vault content. Cite which documents you're referencing by their file path.
- If the information isn't in the vault, say so clearly. Don't make things up.
- Be concise and direct. No corporate fluff.
- When referencing documents, format citations as [document-path] so the UI can link them.
- For questions about deals, accounts, or pipeline: reference the relevant vault docs.
- For questions about concepts or strategies: synthesize from the relevant playbooks and frameworks.
- You can cross-reference multiple documents to give comprehensive answers.
- Use markdown formatting: **bold**, *italic*, \`code\`, code blocks with \`\`\`, lists, etc.`;

const DEEP_SEARCH_PROMPT = `You are the Second Brain AI assistant for Samson Cirocco performing a DEEP SEARCH.

You have access to his personal knowledge vault. Perform multi-step reasoning:

STEP 1: Identify all relevant documents and extract key facts.
STEP 2: Cross-reference information across documents to find connections.
STEP 3: Synthesize a comprehensive answer with specific evidence.

RULES:
- Be thorough — check every relevant document.
- Show your reasoning by organizing the answer into clear sections.
- Cite every claim with [document-path.md] references.
- If information conflicts between documents, note the discrepancy.
- Provide actionable insights and recommendations when possible.
- Use markdown formatting: **bold**, *italic*, \`code\`, code blocks, lists, headers.`;

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
${conversationContext}
USER QUESTION: ${question.trim()}

${deepSearch
  ? 'Perform a deep multi-step analysis. Be thorough and cross-reference multiple documents. Organize your response with clear sections.'
  : 'Answer the question based on the vault content above. Cite documents by their file path in brackets like [path/to/doc.md].'}${
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
          if (deepSearch) {
            send('status', { message: 'Scanning vault documents...' });
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

          // Extract source citations
          const citationRegex = /\[([^\]]+\.md)\]/g;
          const sources: string[] = [];
          let match;
          while ((match = citationRegex.exec(fullText)) !== null) {
            const source = match[1];
            if (!sources.includes(source) && docNames.includes(source)) {
              sources.push(source);
            }
          }

          send('done', { fullText, sources });
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
