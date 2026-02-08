import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getContext, getRecentEvents } from '@/app/actions/datalake';

interface ChatMessage {
  id: string;
  text: string;
  from: 'user' | 'paul';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

interface ContextMetadata {
  emailCount: number;
  calendarCount: number;
  taskCount: number;
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function buildSystemPrompt(): Promise<{ prompt: string; metadata: ContextMetadata }> {
  const now = new Date();
  const timeStr = now.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const [context, events] = await Promise.all([
    getContext(),
    getRecentEvents(undefined, 24),
  ]);

  const metadata: ContextMetadata = {
    emailCount: context.recentEmails?.length || 0,
    calendarCount: 0,
    taskCount: context.openTasks?.length || 0,
  };

  let prompt = `You are Paul, Samson's AI assistant. You're direct, practical, and get things done. You have opinions, not corporate fluff.

CURRENT TIME: ${timeStr}

=== SAMSON'S CURRENT STATE ===

`;

  if (context.recentEmails && context.recentEmails.length > 0) {
    prompt += `📧 RECENT EMAILS (last ${context.recentEmails.length}):\n`;
    context.recentEmails.forEach((email: any) => {
      const subject = email.subject || '(no subject)';
      const sender = email.sender || email.from || 'Unknown';
      const timestamp = email.timestamp || email.sent_at;
      prompt += `  • "${subject}" from ${sender}${timestamp ? ` (${new Date(timestamp).toLocaleDateString()})` : ''}\n`;
    });
    prompt += '\n';
  }

  const calendarEvents = events.events.filter((e: any) => 
    e.source === 'calendar' || e.event_type === 'calendar'
  );
  if (calendarEvents.length > 0) {
    metadata.calendarCount = calendarEvents.length;
    prompt += `📅 UPCOMING CALENDAR (next 24h):\n`;
    calendarEvents.slice(0, 10).forEach((event: any) => {
      const title = event.title || event.subject || 'Untitled';
      const start = event.start_time || event.timestamp;
      prompt += `  • ${title}${start ? ` at ${new Date(start).toLocaleString()}` : ''}\n`;
    });
    prompt += '\n';
  }

  if (context.openTasks && context.openTasks.length > 0) {
    prompt += `✅ OPEN TASKS (${context.openTasks.length}):\n`;
    context.openTasks.slice(0, 15).forEach((task: any) => {
      const title = task.title || task.task || 'Untitled';
      const priority = task.priority ? ` [${task.priority}]` : '';
      prompt += `  • ${title}${priority}\n`;
    });
    prompt += '\n';
  }

  if (context.recentAnalyses && context.recentAnalyses.length > 0) {
    prompt += `🔍 RECENT AGENT ACTIVITY:\n`;
    context.recentAnalyses.slice(0, 5).forEach((analysis: any) => {
      const topic = analysis.topic || analysis.title || 'Analysis';
      const timestamp = analysis.timestamp || analysis.created_at;
      prompt += `  • ${topic}${timestamp ? ` (${new Date(timestamp).toLocaleDateString()})` : ''}\n`;
    });
    prompt += '\n';
  }

  prompt += `=== YOUR ROLE ===

- You have full visibility into Samson's current state (emails, tasks, calendar)
- Be proactive: if you notice something needs attention, mention it
- Keep responses concise and actionable
- You're a partner, not a servant — have opinions and push back when needed

Answer questions naturally, referencing the context above when relevant.`;

  return { prompt, metadata };
}

// GET — return empty (chat history is client-side only on Vercel)
export async function GET() {
  return NextResponse.json({ messages: [] });
}

// POST — context-aware conversational chat with Gemini
export async function POST(request: NextRequest) {
  try {
    const { text, messages: conversationHistory } = await request.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Missing "text" field' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GOOGLE_API_KEY environment variable not set' },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: generateId(),
      text: text.trim(),
      from: 'user',
      timestamp: now,
      status: 'sent',
    };

    const { prompt: systemPrompt, metadata } = await buildSystemPrompt();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-10);
      recentHistory.forEach((msg: ChatMessage) => {
        history.push({
          role: msg.from === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        });
      });
    }

    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    let aiResponseText: string;
    try {
      const result = await chat.sendMessage(`${systemPrompt}\n\nUser: ${text.trim()}`);
      aiResponseText = result.response.text();
    } catch (aiError: unknown) {
      console.error('Gemini API error:', aiError);
      aiResponseText = "I'm having trouble thinking right now. Give me a sec and try again. 🦆";
    }

    const aiResponse: ChatMessage = {
      id: generateId(),
      text: aiResponseText,
      from: 'paul',
      timestamp: new Date().toISOString(),
      status: 'delivered',
    };

    return NextResponse.json({
      userMessage,
      aiResponse,
      metadata,
    });
  } catch (error: unknown) {
    console.error('Chat POST error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
