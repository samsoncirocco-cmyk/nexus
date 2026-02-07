import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildVaultContext } from '@/lib/vault-index';
import { readJsonFile, writeJsonFile, getVaultFilePath } from '@/lib/vault-io';

const QUEUE_PATH = getVaultFilePath('chat-queue.json');
const RESPONSES_PATH = getVaultFilePath('chat-responses.json');

interface ChatMessage {
  id: string;
  text: string;
  from: 'user' | 'paul';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  topic?: string;
}

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

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * POST /api/chat/stream
 * Streams AI response via SSE (Server-Sent Events).
 * Sends: event:token (incremental text), event:sources, event:done, event:error
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const { text, topic } = await request.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return new Response(
        JSON.stringify({ error: 'Missing "text" field' }),
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

    // Save user message
    const now = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: generateId(),
      text: text.trim(),
      from: 'user',
      timestamp: now,
      status: 'sent',
      topic: topic || undefined,
    };

    const queue = await readJsonFile<ChatMessage[]>(QUEUE_PATH, []);
    queue.push(userMessage);
    await writeJsonFile(QUEUE_PATH, queue);

    // Build prompt
    const { context, docNames } = buildVaultContext();
    const prompt = `${SYSTEM_PROMPT}

=== KNOWLEDGE VAULT (${docNames.length} documents) ===

${context}

=== END VAULT ===

USER QUESTION: ${text.trim()}

Answer the question based on the vault content above. Cite documents by their file path in brackets like [path/to/doc.md].`;

    // Initialize Gemini streaming
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

    const aiMessageId = generateId();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        // Send user message confirmation
        send('user_confirmed', { userMessage });

        try {
          const result = await model.generateContentStream(prompt);
          let fullText = '';

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

          if (sources.length > 0) {
            send('sources', { sources });
          }

          // Persist AI response
          const aiResponse: ChatMessage = {
            id: aiMessageId,
            text: fullText,
            from: 'paul',
            timestamp: new Date().toISOString(),
            status: 'delivered',
            topic: topic || undefined,
          };

          const responses = await readJsonFile<ChatMessage[]>(RESPONSES_PATH, []);
          responses.push(aiResponse);
          await writeJsonFile(RESPONSES_PATH, responses);

          send('done', { id: aiMessageId, fullText });
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
    console.error('Chat stream error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
