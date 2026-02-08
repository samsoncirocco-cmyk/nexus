import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildVaultContext } from '@/lib/vault-index';
import { searchDataLake } from '@/app/actions/datalake';

const SYSTEM_PROMPT = `You are the Second Brain AI assistant for Samson Cirocco.

You have access to two powerful knowledge sources:
1. Personal knowledge vault — accounts, deals, projects, concepts, journal entries, E-Rate leads, competitive intel, and sales playbooks (markdown documents)
2. BigQuery datalake — email history, calendar events, logged decisions, and AI analyses (structured event data)

RULES:
- Answer questions based on BOTH the vault content and datalake search results. Cite sources clearly.
- For vault docs: format citations as [document-path] so the UI can link them.
- For datalake results: reference by source (e.g., "from your email on [date]" or "calendar event on [date]").
- If the information isn't in either source, say so clearly. Don't make things up.
- Be concise and direct. No corporate fluff.
- For questions about deals, accounts, or pipeline: reference the relevant vault docs.
- For questions about concepts or strategies: synthesize from the relevant playbooks and frameworks.
- For questions about recent activities, emails, or meetings: use the datalake search results.
- You can cross-reference multiple sources to give comprehensive answers.`;

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "question" field' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GOOGLE_API_KEY environment variable not set' },
        { status: 500 }
      );
    }

    // Load vault content
    const { context, docNames } = buildVaultContext();

    // Search BigQuery datalake (don't fail if it errors)
    let datalakeContext = '';
    try {
      const searchResults = await searchDataLake(question, { 
        maxResults: 10, 
        timeRangeDays: 30 
      });
      
      if (searchResults.error) {
        console.warn('Datalake search error:', searchResults.error);
      } else if (searchResults.totalHits > 0) {
        datalakeContext = `\n=== DATA LAKE RESULTS (${searchResults.totalHits} hits from ${searchResults.tablesSearched.join(', ')}) ===\n\n`;
        searchResults.hits.forEach((hit, idx) => {
          datalakeContext += `[${idx + 1}] ${hit.source} | ${hit.eventType} | ${hit.timestamp}\n`;
          if (hit.subject) datalakeContext += `    Subject: ${hit.subject}\n`;
          if (hit.snippet) datalakeContext += `    ${hit.snippet}\n`;
          datalakeContext += `    Relevance: ${(hit.relevanceScore * 100).toFixed(0)}%\n\n`;
        });
        datalakeContext += '=== END DATA LAKE ===\n';
      }
    } catch (err) {
      console.error('Datalake search failed:', err);
      // Continue with vault-only context
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `${SYSTEM_PROMPT}

=== KNOWLEDGE VAULT (${docNames.length} documents) ===

${context}

=== END VAULT ===
${datalakeContext}

USER QUESTION: ${question}

Answer the question based on the vault content and datalake search results above. Cite vault documents by their file path in brackets like [path/to/doc.md]. Reference datalake results by source and date.`;

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
