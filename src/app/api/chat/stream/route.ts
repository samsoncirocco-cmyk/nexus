import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildVaultContext } from '@/lib/vault-index';
import { readJsonFile, writeJsonFile, getVaultFilePath } from '@/lib/vault-io';
import { buildContext, ContextSnapshot } from '../../../../../openclaw/skills/context-awareness/index';

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

function formatContextSnapshot(snapshot: ContextSnapshot): string {
  const sections: string[] = [];

  if (snapshot.recentEmails.length > 0) {
    const emailLines = snapshot.recentEmails.map(
      (e) => `- [${e.timestamp}] From: ${e.from || 'unknown'} — "${e.subject || '(no subject)'}"`
    );
    sections.push(`RECENT EMAILS (${snapshot.recentEmails.length}):\n${emailLines.join('\n')}`);
  }

  if (snapshot.openTasks.length > 0) {
    const taskLines = snapshot.openTasks.map(
      (t) => `- [${t.status}] ${t.title} (assigned: ${t.assignee}, due: ${t.dueDate || 'none'})`
    );
    sections.push(`OPEN TASKS (${snapshot.openTasks.length}):\n${taskLines.join('\n')}`);
  }

  if (snapshot.contacts.length > 0) {
    const contactLines = snapshot.contacts.map(
      (c) => `- ${c.name} <${c.email}> — ${c.role}${c.notes ? ` (${c.notes})` : ''}`
    );
    sections.push(`CONTACTS (${snapshot.contacts.length}):\n${contactLines.join('\n')}`);
  }

  if (snapshot.recentAnalyses.length > 0) {
    const analysisLines = snapshot.recentAnalyses.map(
      (a) => `- [${a.timestamp}] ${a.analysisType}: ${a.inputSummary} (confidence: ${a.confidence})`
    );
    sections.push(`RECENT AI ANALYSES (${snapshot.recentAnalyses.length}):\n${analysisLines.join('\n')}`);
  }

  return sections.join('\n\n');
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

    // Build vault context
    const { context, docNames } = buildVaultContext();

    // Build live context from OpenClaw (emails, tasks, contacts) with graceful fallback
    let liveContextSection = '';
    try {
      const snapshot = await buildContext({ agentId: 'second-brain-chat', emailCount: 10, taskCount: 20 });
      if (!snapshot.error) {
        const formatted = formatContextSnapshot(snapshot);
        if (formatted) {
          liveContextSection = `\n=== LIVE CONTEXT (as of ${snapshot.timestamp}) ===\n\n${formatted}\n\n=== END LIVE CONTEXT ===\n`;
        }
      }
    } catch {
      // Graceful fallback: continue with vault-only context
    }

    const prompt = `${SYSTEM_PROMPT}

=== KNOWLEDGE VAULT (${docNames.length} documents) ===

${context}

=== END VAULT ===${liveContextSection}

USER QUESTION: ${text.trim()}

Answer the question based on the vault content and live context above. Cite documents by their file path in brackets like [path/to/doc.md].`;

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
