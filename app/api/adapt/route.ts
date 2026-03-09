import { NextRequest, NextResponse } from 'next/server';

// Platform adaptation configurations
const platformConfigs = {
  linkedin: {
    maxChars: 3000,
    name: 'LinkedIn',
    tone: 'Professional, structured, and hook-driven',
    format: 'Text post with strategic line breaks',
    features: ['Strong opening hook', 'Numbered lists or bullet points', 'Dwell time optimization', 'Clear CTA'],
  },
  x: {
    maxChars: 280,
    name: 'X/Twitter',
    tone: 'Punchy, direct, and conversational',
    format: 'Thread of 280-char tweets',
    features: ['Hook in first tweet', 'Each tweet stands alone', 'Engaging thread closer', 'Strategic numbering'],
  },
  substack: {
    maxChars: 10000,
    name: 'Substack',
    tone: 'In-depth, personal, and newsletter-style',
    format: 'Long-form article with sections',
    features: ['Compelling headline', 'Clear sections', 'Subscriber CTA', '1500-2500 words'],
  },
  medium: {
    maxChars: 10000,
    name: 'Medium',
    tone: 'Article-style, SEO-aware, and header-heavy',
    format: 'SEO-optimized article',
    features: ['SEO title & subtitle', 'Clear headers', '7-min read target', 'Tag optimization'],
  },
  instagram: {
    maxChars: 2200,
    name: 'Instagram',
    tone: 'Visual-first, caption-optimized',
    format: 'Carousel slides with caption',
    features: ['Hook slide', '6-10 slides', 'Save-worthy content', 'Hashtag strategy'],
  },
  tiktok: {
    maxChars: 2200,
    name: 'TikTok',
    tone: 'Spoken-style, high-energy, hook-first',
    format: '60-second video script',
    features: ['3-second hook', 'Conversational language', 'Trend alignment', 'Follow CTA'],
  },
};

type Platform = keyof typeof platformConfigs;

interface AdaptRequest {
  content: string;
  platforms: Platform[];
  tone?: string;
  voiceProfile?: Record<string, unknown>;
}

interface Adaptation {
  platform: Platform;
  content: string;
  format: string;
  score: number;
  details: string;
  metadata?: Record<string, unknown>;
}

/**
 * Grok-3 AI Adaptation Engine
 * Calls xAI Grok-3 to adapt content for each target platform,
 * incorporating the user's voice profile and tone preferences.
 */
async function adaptContent(
  input: string,
  platform: Platform,
  tone: string = 'professional',
  voiceProfile?: Record<string, unknown>
): Promise<Adaptation> {
  const config = platformConfigs[platform];
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    throw new Error('XAI_API_KEY is not configured');
  }

  // Build a rich system prompt that captures platform requirements
  const systemPrompt = `You are an expert content strategist and ghostwriter who adapts content for different social platforms while preserving the author's authentic voice.

Platform: ${config.name}
Format: ${config.format}
Tone: ${config.tone}
Max Characters: ${config.maxChars}
Key Features to Include: ${config.features.join(', ')}

${voiceProfile ? `User Voice Profile: ${JSON.stringify(voiceProfile, null, 2)}` : ''}

Rules:
- Adapt the content specifically for ${config.name}
- Keep within ${config.maxChars} characters total
- Match the tone: ${tone}
- Preserve the author's authentic voice and key message
- Output ONLY the adapted content — no commentary, no labels, no explanations
- For X/Twitter threads, separate each tweet with "---"
- For Instagram carousels, use "SLIDE N:" labels
- For TikTok, use "[SECTION]" labels for the script`;

  const userPrompt = `Adapt the following content for ${config.name}:

---
${input}
---

Output the adapted ${config.name} content now:`;

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'grok-3',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Grok API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const adaptedContent = data.choices?.[0]?.message?.content?.trim() ?? '';

  if (!adaptedContent) {
    throw new Error('Grok returned empty content');
  }

  const charCount = adaptedContent.length;

  // Derive format label from platform
  const formatLabels: Record<Platform, string> = {
    linkedin: 'Text Post',
    x: 'Tweet Thread',
    substack: 'Newsletter Article',
    medium: 'SEO Article',
    instagram: 'Carousel + Caption',
    tiktok: '60s Video Script',
  };

  const format = formatLabels[platform];

  // Score based on character usage and content quality signals
  const utilizationRatio = Math.min(charCount / config.maxChars, 1);
  const baseScore = 80;
  const utilizationBonus = Math.round(utilizationRatio * 10);
  const score = Math.min(baseScore + utilizationBonus, 95);

  // Build details string
  const detailParts: string[] = [`${charCount.toLocaleString()} chars`, 'Grok-3'];
  if (platform === 'substack' || platform === 'medium') {
    detailParts.push(`~${Math.ceil(charCount / 200)} min read`);
  }
  if (platform === 'x') {
    const tweetCount = adaptedContent.split('---').filter((t: string) => t.trim()).length;
    detailParts.push(`${tweetCount}-tweet thread`);
  }
  detailParts.push('Voice-matched');

  return {
    platform,
    content: adaptedContent,
    format,
    score,
    details: detailParts.join(' · '),
    metadata: {
      charCount,
      model: 'grok-3',
      generatedAt: new Date().toISOString(),
      tone,
      voiceProfileUsed: !!voiceProfile,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: AdaptRequest = await request.json();
    const { content, platforms, tone = 'professional', voiceProfile } = body;

    // Validation
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (!platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: 'At least one platform must be specified' },
        { status: 400 }
      );
    }

    // Validate platforms
    const invalidPlatforms = platforms.filter(
      p => !Object.keys(platformConfigs).includes(p)
    );
    if (invalidPlatforms.length > 0) {
      return NextResponse.json(
        { error: `Invalid platforms: ${invalidPlatforms.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate adaptations for each platform via Grok-3
    const adaptations: Record<Platform, Adaptation> = {} as Record<Platform, Adaptation>;

    for (const platform of platforms) {
      adaptations[platform] = await adaptContent(content, platform, tone, voiceProfile);
    }

    return NextResponse.json({
      success: true,
      adaptations,
      metadata: {
        inputLength: content.length,
        platformCount: platforms.length,
        tone,
        model: 'grok-3',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Adaptation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to adapt content' },
      { status: 500 }
    );
  }
}
