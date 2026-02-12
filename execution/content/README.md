# Nexus AI Content Adaptation Engine

The core product of Nexus - transforms one idea into platform-native content for LinkedIn, X, Substack, Medium, Instagram, and TikTok.

## Quick Start

```python
import asyncio
from execution.content import adapt_content

async def main():
    result = await adapt_content(
        idea="The biggest mistake in B2B sales is treating every prospect the same",
        platforms=["linkedin", "x", "instagram"],
        user_id="user123",
        voice_style="professional"
    )
    print(result)

asyncio.run(main())
```

## Components

### `adapt_content.py` - Main Engine

**Main Function:**
```python
async def adapt_content(
    idea: str,                    # Core idea to adapt (10+ chars)
    platforms: List[str],         # Target platforms
    user_id: str,                 # User identifier
    voice_profile: Dict = None,   # Analyzed voice characteristics
    voice_style: str = "professional",  # "professional" or "casual"
    include_hooks: bool = True,   # Add attention hooks
    include_ctas: bool = True,    # Add calls-to-action
    context: Dict = None         # Additional context
) -> Dict[str, Any]
```

**Features:**
- Claude 3.5 Sonnet (primary) with GPT-4 fallback
- Parallel processing for all platforms
- SHA256-based caching (1-hour TTL)
- Comprehensive error handling

### `prompt_builder.py` - Prompt Builder

Builds platform-specific prompts with voice and context integration.

```python
from execution.content import build_prompt

prompt = build_prompt(
    idea="Your idea here",
    platform="linkedin",  # linkedin, x, substack, medium, instagram, tiktok
    voice_style="professional",
    context={"industry": "b2b_saas"}
)
```

### `voice_analyzer.py` - Voice Analysis

Analyzes sample posts to extract voice characteristics.

```python
from execution.content import analyze_voice

sample_posts = [
    "Your previous post 1...",
    "Your previous post 2..."
]

profile = analyze_voice(sample_posts)
# Returns: formality, emoji_usage, humor_level, etc.
```

## CLI Usage

### Dry Run (Show Prompts)
```bash
python adapt_content.py \
  --idea "Your idea here" \
  --platforms linkedin,x,instagram \
  --dry-run
```

### Full Adaptation
```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...

python adapt_content.py \
  --idea "AI won't replace humans, but humans using AI will" \
  --platforms linkedin,twitter,substack \
  --voice-style professional
```

### JSON Input
```bash
python adapt_content.py \
  --json-input '{
    "idea": "Remote work is about async communication",
    "platforms": ["linkedin", "x"],
    "user_id": "user123",
    "voice_style": "casual"
  }'
```

## Supported Platforms

| Platform | Format | Target Length | Key Features |
|----------|--------|---------------|--------------|
| **LinkedIn** | Feed post | 800-1,300 chars | Line breaks, hashtags, questions |
| **X (Twitter)** | Tweet/Thread | 280 chars / 5-10 tweets | Punchy, hot takes, threads |
| **Substack** | Article | 1,500-2,500 words | Narrative, frameworks, key takeaways |
| **Medium** | Article | 800-1,500 words | Structured, analytical, citations |
| **Instagram** | Carousel | 100-200 words caption + slides | Visual-first, emoji-heavy |
| **TikTok** | Video script | 15-60 seconds | Hook in 3s, text overlays |

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...   # Required - Claude API
OPENAI_API_KEY=sk-...          # Required - GPT-4 fallback
```

## Response Format

```json
{
  "status": "success",
  "adaptations": {
    "linkedin": {
      "platform": "linkedin",
      "content": "Most B2B sales teams...\n\n#B2BSales",
      "char_count": 1240,
      "estimated_engagement": "high",
      "hashtag_count": 4
    },
    "x": {
      "platform": "x",
      "content": "The biggest mistake...",
      "char_count": 278,
      "estimated_engagement": "high",
      "is_thread": false
    }
  },
  "meta": {
    "processing_time_ms": 2450,
    "platforms_processed": 2,
    "cached": false
  }
}
```

## Architecture

```
┌─────────────────┐
│  User Request   │
└────────┬────────┘
         ▼
┌─────────────────────┐
│  ContentAdaptation  │
│      Engine         │
│  ┌───────────────┐  │
│  │    Cache      │  │ ← SHA256 key, 1hr TTL
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │  AI Adapter   │  │ ← Claude → GPT-4 fallback
│  └───────────────┘  │
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  Parallel Platform  │
│     Processing      │
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  Platform-Specific  │
│      Output         │
└─────────────────────┘
```

## Dependencies

```bash
pip install anthropic openai
```

## Testing

```bash
# Run voice analyzer test
python voice_analyzer.py

# Run prompt builder test
python prompt_builder.py

# Dry run adaptation
python adapt_content.py --idea "Test" --platforms linkedin --dry-run
```

## Documentation

- Full directive: `/directives/content_adaptation.md`
- Platform rules and examples in directive
