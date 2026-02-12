# Content Adaptation Engine Directive

## Overview

The Content Adaptation Engine transforms a single idea into platform-native content for 6 platforms: LinkedIn, X/Twitter, Substack, Medium, Instagram, and TikTok.

**DOE Layer:** Directive (SOP)  
**Execution Scripts:** 
- `execution/content/adapt_content.py` - Main adaptation engine
- `execution/content/prompt_builder.py` - Platform-specific prompt builder
- `execution/content/voice_analyzer.py` - Voice analysis module

---

## Input Format

```json
{
  "idea": "The biggest mistake in B2B sales is treating every prospect the same instead of segmenting by buying stage",
  "platforms": ["linkedin", "twitter", "substack", "medium", "instagram", "tiktok"],
  "user_id": "uuid",
  "voice_style": "professional",
  "include_hooks": true,
  "include_ctas": true,
  "context": {
    "industry": "b2b_saas",
    "expertise_level": "expert",
    "previous_posts_sample": []
  }
}
```

### Input Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `idea` | Yes | string | Core concept to adapt (1-3 sentences) |
| `platforms` | Yes | array | Target platforms (subset of 6 supported) |
| `user_id` | Yes | string | User identifier for voice matching |
| `voice_style` | No | string | `professional` or `casual` (default: `professional`) |
| `include_hooks` | No | boolean | Add platform-appropriate hooks (default: true) |
| `include_ctas` | No | boolean | Add calls-to-action (default: true) |
| `context` | No | object | Industry, expertise, previous posts |

---

## Output Format

```json
{
  "status": "success",
  "adaptations": {
    "linkedin": {
      "content": "string",
      "char_count": 420,
      "estimated_engagement": "high|medium|low",
      "hashtag_count": 3
    },
    "twitter": {
      "content": "string",
      "char_count": 278,
      "thread_options": ["string"],
      "is_thread": false
    },
    "substack": {
      "title": "string",
      "content": "markdown",
      "word_count": 1240,
      "estimated_read_time": "5 min"
    },
    "medium": {
      "title": "string",
      "content": "markdown",
      "word_count": 890,
      "estimated_read_time": "4 min"
    },
    "instagram": {
      "caption": "string",
      "carousel_slides": ["string"],
      "hashtag_block": "string",
      "char_count": 180
    },
    "tiktok": {
      "hook": "string",
      "script": "string",
      "duration_seconds": 45,
      "cta": "string",
      "trend_suggestion": "string"
    }
  },
  "meta": {
    "processing_time_ms": 2400,
    "platforms_processed": 3,
    "token_usage": {
      "input": 450,
      "output": 2800
    }
  }
}
```

---

## Platform-Specific Rules

### 1. LinkedIn

**Format:** Feed post  
**Target Length:** 800-1,300 characters  
**Style:** Professional, insight-first, conversational

**Rules:**
- Start with a hook (question, bold statement, or data point)
- Lead with insight, not setup
- Use line breaks liberally (every 1-2 sentences)
- End with 1-2 engaging questions
- Include 3-5 relevant hashtags
- Avoid clickbait; prioritize value
- Use first-person stories sparingly but effectively

**Structure:**
```
[HOOK - 1 line]

[INSIGHT - 2-4 lines]

[CONTEXT/EXAMPLE - 2-3 lines]

[TAKEAWAY - 1-2 lines]

[QUESTION]

[HASHTAGS]
```

**Example:**
```
Most B2B sales teams are leaving 40% of revenue on the table.

Not because their product is bad.
Not because their salespeople can't close.

But because they treat a prospect in "awareness" stage the same as one in "decision" stage.

Here's what I mean:

→ Awareness stage: They need education, not a demo
→ Consideration stage: They need comparison, not a pitch  
→ Decision stage: They need proof, not features

The fix? Segment your pipeline by buying stage and match your outreach to where they actually are.

What % of your pipeline do you think is misaligned?

#B2BSales #SaaS #RevenueOperations
```

---

### 2. X (Twitter)

**Format:** Single tweet or thread  
**Target Length:** 200-280 characters (single), 5-10 tweets (thread)  
**Style:** Punchy, contrarian, concise

**Rules:**
- Lead with the punchline, not the setup
- Use line breaks for readability (even mid-sentence)
- Threads: First tweet must standalone as a hook
- Hot takes perform better than balanced takes
- One idea per tweet in threads
- No "thread" indicators (🧵) in first tweet
- End threads with a CTA or question

**Structure (Single):**
```
[HOOK/TAKE]

[1-line insight]

[optional data point]
```

**Structure (Thread):**
```
Tweet 1: [Bold claim - standalone strong]
Tweet 2: [Context/setup]
Tweet 3: [Point 1]
Tweet 4: [Point 2]
Tweet 5: [Point 3]
Tweet 6: [Counterpoint/depth]
Tweet 7: [Summary + CTA]
```

**Example (Single):**
```
The biggest mistake in B2B sales isn't bad closing.

It's treating all prospects the same.

→ Awareness = education
→ Consideration = comparison  
→ Decision = proof

Match the stage. Close more deals.
```

**Example (Thread):**
```
Tweet 1: Most B2B sales teams are burning pipeline by ignoring one thing.

Tweet 2: Buying stages.

Here's what I mean ↓

Tweet 3: Awareness stage prospects don't want a demo.
They want to understand the problem exists.

Give them education, not pitches.

Tweet 4: Consideration stage prospects don't want features.
They want to compare solutions.

Give them frameworks, not catalogs.

Tweet 5: Decision stage prospects don't want more options.
They want proof you'll deliver.

Give them case studies and ROI data.

Tweet 6: The fix:
• Tag every prospect with their stage
• Match content to stage
• Move them forward gradually

Tweet 7: Most teams blast the same message to everyone.

The ones that segment by stage?
They close 2-3x more.

Which approach are you using?
```

---

### 3. Substack

**Format:** Deep-dive article  
**Target Length:** 1,500-2,500 words  
**Style:** Narrative, framework-heavy, educational

**Rules:**
- Strong headline (curiosity gap or specific outcome)
- Open with a story or relatable problem
- Use frameworks/models (visual when possible)
- Include subheadings every 200-300 words
- Add "Key Takeaways" section
- Personal voice is encouraged
- End with clear next steps or reflection

**Structure:**
```
[HEADLINE - specific, curiosity-driven]

[OPENING STORY - 200-400 words, relatable pain point]

[THE PROBLEM - define it clearly]

[FRAMEWORK - the solution model]
  - Component 1
  - Component 2
  - Component 3

[DEEP DIVE - 800-1200 words on application]

[EXAMPLES - 2-3 real or hypothetical cases]

[KEY TAKEAWAYS - bullet summary]

[CONCLUSION + CTA - subscribe, share, comment]
```

---

### 4. Medium

**Format:** Thought leadership article  
**Target Length:** 800-1,500 words (5-7 min read)  
**Style:** Structured, analytical, professional

**Rules:**
- Clear, descriptive headline (SEO-friendly)
- Structured with H2/H3 headings
- Lead with thesis statement
- Use bullet points for scanability
- Include data or research citations when possible
- More formal than Substack but still accessible
- End with "Call to Action" section

**Structure:**
```
[HEADLINE - clear benefit or insight]

[THESIS - 1 paragraph stating the argument]

[SECTION 1 - Context/Problem]
[SECTION 2 - Analysis/Research]
[SECTION 3 - Solution/Framework]
[SECTION 4 - Implementation]

[CONCLUSION - restate thesis with evidence]

[CALL TO ACTION - what to do next]
```

---

### 5. Instagram

**Format:** Carousel post (preferred) + caption  
**Target Length:** 100-200 words caption, 5-10 slides  
**Style:** Visual-first, punchy, emoji-friendly

**Rules:**
- Carousel slides must each standalone
- One idea per slide
- Use bold text, numbers, or icons
- Caption complements, doesn't repeat, the slides
- Heavy emoji use (3-8 per slide)
- Save-worthy content (reference value)
- Hashtag block (20-30 tags) in caption or first comment

**Structure:**
```
[SLIDE 1 - Hook/Title - bold, attention-grabbing]
[SLIDE 2 - Problem/Context]
[SLIDE 3-6 - Key Points (1 per slide)]
[SLIDE 7 - Solution/Framework]
[SLIDE 8 - Call to Action]
[SLIDE 9 - Your branding/outro]

CAPTION:
[Hook - 1 line]

[Context - 2-3 lines]

[CTA - "Save this for later" / "Tag a friend"]

[Hashtag block]
```

**Example:**
```
SLIDE 1: "3 mistakes killing your B2B pipeline 💀"

SLIDE 2: "❌ Mistake #1: Same pitch to everyone"
Different stages need different messages

SLIDE 3: "❌ Mistake #2: Skipping the education phase"
Awareness prospects need context, not demos

SLIDE 4: "❌ Mistake #3: No stage tracking"
You can't optimize what you don't measure

SLIDE 5: "✅ The Fix: Segment by buying stage"
→ Awareness → Consideration → Decision

SLIDE 6: "📊 Results: 2-3x close rate"
When you match the message to the stage

SLIDE 7: "💾 Save this for your next strategy session"

CAPTION:
Which of these are you guilty of? 👇

I've seen too many great products fail because the team skipped the basics of pipeline segmentation.

The buying stage matters more than you think.

Save this for your next strategy session 📌

#b2bsales #saas #pipeline #salestips #revenue #startup #growth #marketing #salesstrategy
```

---

### 6. TikTok

**Format:** Video script (15-60 seconds)  
**Target Length:** 100-200 words spoken  
**Style:** Hook-first, high energy, trend-aware

**Rules:**
- Hook in first 3 seconds (text on screen + verbal)
- Speak fast but clearly
- Use jump cuts between points
- Include text overlays for key phrases
- Trending audio reference (when possible)
- End with scroll-stopping CTA
- Pattern interrupt every 3-5 seconds

**Structure:**
```
[HOOK - 3 seconds]
"Stop making this B2B sales mistake"
[Text overlay: "40% revenue lost 👇"]

[PROBLEM - 10 seconds]
"Most teams treat every prospect the same"
[Text: "Awareness ≠ Decision"]

[SOLUTION - 30 seconds]
"Instead, segment by buying stage..."
[Text points appearing as you speak]

[PROOF - 10 seconds]
"Companies doing this close 2-3x more deals"

[CTA - 5 seconds]
"Follow for more B2B sales tips"
[Point down / gesture to button]
```

---

## Voice Matching Guidelines

### Style Profiles

**Professional:**
- Formal vocabulary but accessible
- Data-driven claims
- Structured arguments
- Minimal contractions
- Credibility markers ("research shows", "in my experience")

**Casual:**
- Conversational tone
- Personal anecdotes
- Contractions and informal phrasing
- Direct address ("you", "your")
- Emojis and humor where appropriate

### Per-Platform Voice Adaptation

| Platform | Professional | Casual |
|----------|-------------|--------|
| LinkedIn | Executive thought leader | Approachable industry peer |
| X | Industry analyst | Provocative commentator |
| Substack | Expert educator | Relatable practitioner |
| Medium | Research-backed professional | Storytelling founder |
| Instagram | Polished brand voice | Behind-the-scenes creator |
| TikTok | Educational expert | Entertaining educator |

### Voice Learning (Future Feature)

When `context.previous_posts_sample` is provided:
1. Analyze vocabulary patterns
2. Note sentence length preferences
3. Identify emoji usage patterns
4. Detect humor/seriousness ratio
5. Match hook styles

---

## Prompt Templates

### Base Prompt Structure

```
You are an expert content strategist adapting ideas for {platform}.

ORIGINAL IDEA: {idea}

VOICE STYLE: {voice_style}
PLATFORM: {platform}

PLATFORM RULES:
{platform_specific_rules}

Create {content_type} that:
1. Preserves the core insight from the original idea
2. Matches {platform}'s native format and tone
3. Uses {voice_style} voice
4. {hook_instruction}
5. {cta_instruction}

OUTPUT FORMAT:
{output_format}
```

### Platform-Specific Prompt Additions

**LinkedIn:**
```
- Use line breaks every 1-2 sentences for readability
- Include 3-5 relevant hashtags at the end
- End with 1-2 engaging questions
- Target 800-1300 characters
```

**X/Twitter:**
```
- Keep under 280 characters (single) or create 5-10 tweet thread
- Lead with the punchline
- First tweet must standalone as a hook
- One idea per tweet in threads
```

**Substack:**
```
- Write 1500+ words with narrative flow
- Include a framework or model
- Add "Key Takeaways" section
- Use subheadings every 200-300 words
```

**Medium:**
```
- Write 800-1500 words in structured format
- Use H2/H3 headings
- Include data points or citations
- End with clear CTA section
```

**Instagram:**
```
- Create 5-10 carousel slides (one idea per slide)
- Write 100-200 word caption
- Include emoji recommendations
- Add hashtag block (20-30 tags)
```

**TikTok:**
```
- Write 15-60 second script
- Include hook (first 3 seconds)
- Add text overlay suggestions
- End with scroll-stopping CTA
- Suggest trending audio if applicable
```

---

## Error Handling

### Content Too Long

**Detection:**
- LinkedIn: >3000 chars → trim or split
- X: >280 chars (single) → convert to thread
- Instagram caption: >2200 chars → truncate with "see comments"

**Remediation:**
1. Identify core insight
2. Remove supporting examples
3. Shorten transitions
4. For X: auto-convert to thread

### API Failures

**Claude/GPT Timeout:**
- Retry with exponential backoff (1s, 2s, 4s)
- Fall back to simpler prompt
- Return partial results with error flag

**Rate Limiting:**
- Queue for retry
- Return cached similar content if available
- Notify user of delay

### Invalid Input

| Error | Detection | Response |
|-------|-----------|----------|
| Empty idea | `len(idea) < 10` | HTTP 400: "Idea too short" |
| Invalid platform | `platform not in SUPPORTED` | HTTP 400: "Unsupported platform" |
| Missing user_id | `user_id is None` | HTTP 400: "User ID required" |
| All platforms failed | `success_count == 0` | HTTP 500: "Adaptation failed" |

---

## Quality Checks

### Pre-Flight Checks

1. **Idea Quality:**
   - Minimum 10 characters
   - Contains substantive content (not just "test")
   - Clear topic or insight

2. **Platform Validity:**
   - All requested platforms in supported list
   - At least one platform specified
   - No duplicates

### Post-Generation Checks

1. **Character Limits:**
   - LinkedIn: <3000 chars
   - X: <280 chars (single) or all tweets <280
   - Instagram caption: <2200 chars

2. **Content Quality:**
   - No placeholder text ("[insert]", "XXX")
   - Contains core idea from input
   - Platform-appropriate formatting

3. **Engagement Potential:**
   - Hook present in first 2 lines
   - CTA included (if requested)
   - Proper hashtag count

### Scoring

```python
engagement_score = calculate_engagement_potential(content, platform)
# Returns: "high", "medium", "low"

# Criteria:
# High: Strong hook, clear value, appropriate CTA, optimal length
# Medium: Good content but missing one element
# Low: Weak hook, poor formatting, or off-platform tone
```

---

## Performance Requirements

- **Target:** <3 seconds for all 6 platforms
- **Parallel Processing:** Generate all adaptations concurrently
- **Caching:** Cache results for 1 hour (same idea + platform combination)
- **Token Efficiency:** Target <3000 input tokens, <4000 output tokens

---

## Testing Commands

```bash
# Test single platform
cd execution/content
python adapt_content.py \
  --idea "The biggest mistake in B2B sales is treating every prospect the same" \
  --platforms linkedin \
  --voice professional \
  --dry-run

# Test all platforms
python adapt_content.py \
  --idea "Remote work isn't about location, it's about async communication" \
  --platforms linkedin,twitter,substack,medium,instagram,tiktok \
  --voice casual \
  --include-hooks \
  --include-ctas

# Test with JSON input
python adapt_content.py \
  --json-input '{"idea":"AI won't replace humans, but humans using AI will","platforms":["twitter","linkedin"],"voice_style":"professional"}'

# Validate output only (no API calls)
python adapt_content.py --validate-only --idea "test" --platforms linkedin
```

---

## Integration Points

### Called By:
- Next.js API route: `/api/content/adapt`
- Content creation UI
- Bulk content operations

### Calls:
- Claude API (primary)
- OpenAI GPT-4 (fallback)
- `execution/utils/supabase_client.py` (for voice learning)

---

## Self-Annealing

When adaptation quality degrades:
1. Log failed output with input parameters
2. Analyze pattern (hook missing? wrong tone?)
3. Update prompt template
4. Add example to few-shot learning
5. Retest with same input

---

## Execution Layer Reference

### Module Structure

```
execution/content/
├── __init__.py              # Module exports
├── adapt_content.py         # Main adaptation engine (19KB)
├── prompt_builder.py        # Platform-specific prompts (14KB)
└── voice_analyzer.py        # Voice analysis module (17KB)
```

### `adapt_content.py` - Main Engine

**Key Classes:**
- `AdaptationRequest` - Input request dataclass with cache key generation
- `AdaptationResult` - Output result dataclass
- `PlatformContent` - Per-platform content structure
- `ContentCache` - In-memory LRU cache with TTL (default 1 hour)
- `AIAdapter` - Claude primary / GPT-4 fallback handler
- `ContentAdaptationEngine` - Main orchestration class

**Main Function:**
```python
async def adapt_content(
    idea: str,
    platforms: List[str],
    user_id: str,
    voice_profile: Optional[Dict] = None,
    voice_style: str = "professional",
    include_hooks: bool = True,
    include_ctas: bool = True,
    context: Optional[Dict] = None
) -> Dict[str, Any]
```

**Features:**
- Parallel processing for all platforms
- SHA256-based caching for identical requests
- Claude 3.5 Sonnet primary, GPT-4 fallback
- Input validation and error handling
- Comprehensive platform content structures

### `prompt_builder.py` - Prompt Builder

**Key Classes:**
- `PlatformRules` - Platform-specific rules dataclass
- `PromptBuilder` - Prompt construction with voice/context integration

**Usage:**
```python
builder = PromptBuilder()
prompt = builder.build_prompt(
    idea="Your idea",
    platform="linkedin",
    voice_style="professional",
    voice_profile=None,
    include_hooks=True,
    include_ctas=True,
    context={"industry": "b2b_saas"}
)
```

**Supported Platforms:**
- `linkedin` - Professional feed posts, 800-1300 chars
- `x` / `twitter` - Punchy tweets or threads
- `substack` - Long-form narrative (1500-2500 words)
- `medium` - Structured analytical (800-1500 words)
- `instagram` - Carousel + caption format
- `tiktok` - 15-60 second video scripts

### `voice_analyzer.py` - Voice Analysis

**Key Classes:**
- `VoiceCharacteristics` - Structured voice profile
- `VoiceAnalyzer` - Analysis engine

**Extracted Characteristics:**
| Metric | Range | Description |
|--------|-------|-------------|
| `formality` | 0.0-1.0 | Formal vs casual language |
| `avg_sentence_length` | words | Average sentence length |
| `emoji_usage` | none/minimal/moderate/heavy | Emoji frequency |
| `humor_level` | 0.0-1.0 | Detected humor markers |
| `contraction_usage` | 0.0-1.0 | Contraction frequency |
| `question_frequency` | per 100 sentences | Question usage |
| `exclamation_frequency` | per 100 sentences | Exclamation usage |
| `capitalization_style` | standard/title/lower/mixed | Cap preferences |
| `vocabulary_richness` | 0.0-1.0 | Type-token ratio |
| `tone_descriptors` | list | Auto-generated labels |

**Usage:**
```python
analyzer = VoiceAnalyzer()
profile = analyzer.analyze_voice(sample_posts)
# Returns: Dict with all characteristics

# Compare two voices
similarity = analyzer.compare_voices(profile1, profile2)
# Returns: 0.0-1.0 similarity score
```

### Environment Variables

Required:
```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

### API Response Example

```json
{
  "status": "success",
  "adaptations": {
    "linkedin": {
      "platform": "linkedin",
      "content": "Most B2B sales teams...\n\n#B2BSales #SaaS",
      "char_count": 1240,
      "estimated_engagement": "high",
      "hashtag_count": 4
    },
    "x": {
      "platform": "x",
      "content": "The biggest mistake...",
      "char_count": 278,
      "estimated_engagement": "high",
      "is_thread": false,
      "thread_options": []
    }
  },
  "meta": {
    "processing_time_ms": 2450,
    "platforms_processed": 2,
    "platforms_requested": 2,
    "cached": false,
    "errors": null
  },
  "error": null
}
```

### Error Handling

The engine handles:
- **API timeouts**: Exponential backoff (1s, 2s, 4s), then fallback
- **Rate limits**: Automatic queue with retry
- **Invalid inputs**: Validation before API calls
- **Partial failures**: Returns successful platforms with error list

---

**Last Updated:** 2026-02-11  
**Version:** 1.1
