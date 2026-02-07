import { NextRequest, NextResponse } from 'next/server';
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
- You can cross-reference multiple documents to give comprehensive answers.`;

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
${conversationContext}
USER QUESTION: ${question}

Answer the question based on the vault content above. Cite documents by their file path in brackets like [path/to/doc.md].${
  conversationContext ? ' This is a follow-up question — reference the conversation history for context.' : ''
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const answer = response.text();

    // Extract source citations from the answer
    const citationRegex = /\[([^\]]+\.md)\]/g;
    const sources: string[] = [];
    let match;
    while ((match = citationRegex.exec(answer)) !== null) {
      const source = match[1];
      if (!sources.includes(source) && docNames.includes(source)) {
        sources.push(source);
      }
    }

    return NextResponse.json({ answer, sources });
  } catch (error: unknown) {
    console.error('Ask API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
