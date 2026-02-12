#!/usr/bin/env python3
"""
Prompt Builder for AI Content Adaptation Engine

Builds platform-specific prompts for LinkedIn, X, Substack, Medium, Instagram, and TikTok.
Each platform has unique formatting, tone, and structural requirements.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class PlatformRules:
    """Rules and guidelines for a specific platform."""
    name: str
    content_type: str
    target_length: str
    style: str
    rules: List[str]
    structure: str
    output_format: str


class PromptBuilder:
    """Builds platform-specific prompts for content adaptation."""
    
    def __init__(self):
        self.platform_rules = self._init_platform_rules()
    
    def _init_platform_rules(self) -> Dict[str, PlatformRules]:
        """Initialize platform-specific rules."""
        return {
            "linkedin": PlatformRules(
                name="LinkedIn",
                content_type="Feed post",
                target_length="800-1,300 characters",
                style="Professional, insight-first, conversational",
                rules=[
                    "Start with a hook (question, bold statement, or data point)",
                    "Lead with insight, not setup",
                    "Use line breaks liberally (every 1-2 sentences)",
                    "End with 1-2 engaging questions",
                    "Include 3-5 relevant hashtags",
                    "Avoid clickbait; prioritize value",
                    "Use first-person stories sparingly but effectively"
                ],
                structure="""[HOOK - 1 line]

[INSIGHT - 2-4 lines]

[CONTEXT/EXAMPLE - 2-3 lines]

[TAKEAWAY - 1-2 lines]

[QUESTION]

[HASHTAGS]""",
                output_format="""{
  "content": "Full post text with line breaks",
  "char_count": 1234,
  "estimated_engagement": "high|medium|low",
  "hashtag_count": 4
}"""
            ),
            
            "x": PlatformRules(
                name="X (Twitter)",
                content_type="Single tweet or thread",
                target_length="200-280 characters (single), 5-10 tweets (thread)",
                style="Punchy, contrarian, concise",
                rules=[
                    "Lead with the punchline, not the setup",
                    "Use line breaks for readability (even mid-sentence)",
                    "Threads: First tweet must standalone as a hook",
                    "Hot takes perform better than balanced takes",
                    "One idea per tweet in threads",
                    "No 'thread' indicators (🧵) in first tweet",
                    "End threads with a CTA or question"
                ],
                structure="""Single Tweet:
[HOOK/TAKE - punchy]
[1-line insight]
[optional data point]

Thread:
Tweet 1: [Bold claim - standalone strong]
Tweet 2: [Context/setup]
Tweet 3-6: [Points - one per tweet]
Tweet 7: [Summary + CTA]""",
                output_format="""{
  "content": "Single tweet text OR first tweet of thread",
  "char_count": 278,
  "is_thread": true|false,
  "thread_options": ["Tweet 1 text", "Tweet 2 text", "..."],
  "estimated_engagement": "high|medium|low"
}"""
            ),
            
            "substack": PlatformRules(
                name="Substack",
                content_type="Deep-dive article",
                target_length="1,500-2,500 words",
                style="Narrative, framework-heavy, educational",
                rules=[
                    "Strong headline (curiosity gap or specific outcome)",
                    "Open with a story or relatable problem",
                    "Use frameworks/models (visual when possible)",
                    "Include subheadings every 200-300 words",
                    "Add 'Key Takeaways' section",
                    "Personal voice is encouraged",
                    "End with clear next steps or reflection"
                ],
                structure="""[HEADLINE - specific, curiosity-driven]

[OPENING STORY - 200-400 words, relatable pain point]

[THE PROBLEM - define it clearly]

[FRAMEWORK - the solution model]
  - Component 1
  - Component 2
  - Component 3

[DEEP DIVE - 800-1200 words on application]

[EXAMPLES - 2-3 real or hypothetical cases]

[KEY TAKEAWAYS - bullet summary]

[CONCLUSION + CTA - subscribe, share, comment]""",
                output_format="""{
  "title": "Article headline",
  "content": "Full markdown article",
  "word_count": 1840,
  "estimated_read_time": "7 min"
}"""
            ),
            
            "medium": PlatformRules(
                name="Medium",
                content_type="Thought leadership article",
                target_length="800-1,500 words (5-7 min read)",
                style="Structured, analytical, professional",
                rules=[
                    "Clear, descriptive headline (SEO-friendly)",
                    "Structured with H2/H3 headings",
                    "Lead with thesis statement",
                    "Use bullet points for scanability",
                    "Include data or research citations when possible",
                    "More formal than Substack but still accessible",
                    "End with 'Call to Action' section"
                ],
                structure="""[HEADLINE - clear benefit or insight]

[THESIS - 1 paragraph stating the argument]

[SECTION 1 - Context/Problem]
[SECTION 2 - Analysis/Research]
[SECTION 3 - Solution/Framework]
[SECTION 4 - Implementation]

[CONCLUSION - restate thesis with evidence]

[CALL TO ACTION - what to do next]""",
                output_format="""{
  "title": "Article headline",
  "content": "Full markdown article",
  "word_count": 1200,
  "estimated_read_time": "5 min"
}"""
            ),
            
            "instagram": PlatformRules(
                name="Instagram",
                content_type="Carousel post (preferred) + caption",
                target_length="100-200 words caption, 5-10 slides",
                style="Visual-first, punchy, emoji-friendly",
                rules=[
                    "Carousel slides must each standalone",
                    "One idea per slide",
                    "Use bold text, numbers, or icons",
                    "Caption complements, doesn't repeat, the slides",
                    "Heavy emoji use (3-8 per slide)",
                    "Save-worthy content (reference value)",
                    "Hashtag block (20-30 tags) in caption or first comment"
                ],
                structure="""[SLIDE 1 - Hook/Title - bold, attention-grabbing]
[SLIDE 2 - Problem/Context]
[SLIDE 3-6 - Key Points (1 per slide)]
[SLIDE 7 - Solution/Framework]
[SLIDE 8 - Call to Action]
[SLIDE 9 - Your branding/outro]

CAPTION:
[Hook - 1 line]

[Context - 2-3 lines]

[CTA - "Save this for later" / "Tag a friend"]

[Hashtag block]""",
                output_format="""{
  "caption": "Caption text (100-200 words)",
  "carousel_slides": ["Slide 1 text", "Slide 2 text", "..."],
  "hashtag_block": "#tag1 #tag2 #tag3...",
  "char_count": 180
}"""
            ),
            
            "tiktok": PlatformRules(
                name="TikTok",
                content_type="Video script (15-60 seconds)",
                target_length="100-200 words spoken",
                style="Hook-first, high energy, trend-aware",
                rules=[
                    "Hook in first 3 seconds (text on screen + verbal)",
                    "Speak fast but clearly",
                    "Use jump cuts between points",
                    "Include text overlays for key phrases",
                    "Trending audio reference (when possible)",
                    "End with scroll-stopping CTA",
                    "Pattern interrupt every 3-5 seconds"
                ],
                structure="""[HOOK - 3 seconds]
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
[Point down / gesture to button]""",
                output_format="""{
  "hook": "Hook text (first 3 seconds)",
  "script": "Full spoken script (100-200 words)",
  "duration_seconds": 45,
  "cta": "Call to action",
  "trend_suggestion": "Suggested trending audio or format"
}"""
            )
        }
    
    def build_prompt(
        self,
        idea: str,
        platform: str,
        voice_style: str = "professional",
        voice_profile: Optional[Dict] = None,
        include_hooks: bool = True,
        include_ctas: bool = True,
        context: Optional[Dict] = None
    ) -> str:
        """
        Build a platform-specific prompt for content adaptation.
        
        Args:
            idea: The core idea to adapt
            platform: Target platform name
            voice_style: "professional" or "casual"
            voice_profile: Optional analyzed voice characteristics
            include_hooks: Whether to include attention hooks
            include_ctas: Whether to include calls-to-action
            context: Additional context (industry, expertise, etc.)
            
        Returns:
            Complete prompt string for the AI
        """
        rules = self.platform_rules.get(platform)
        if not rules:
            raise ValueError(f"Unknown platform: {platform}")
        
        # Build voice guidance
        voice_guidance = self._build_voice_guidance(voice_style, voice_profile)
        
        # Build context section
        context_section = self._build_context_section(context)
        
        # Build hook/CTA instructions
        hook_instruction = "Include an attention-grabbing hook in the first 1-2 lines" if include_hooks else "No hook needed"
        cta_instruction = "Include a call-to-action at the end" if include_ctas else "No CTA needed"
        
        prompt = f"""You are an expert content strategist adapting ideas for {rules.name}.

ORIGINAL IDEA:
{idea}

PLATFORM: {rules.name}
CONTENT TYPE: {rules.content_type}
TARGET LENGTH: {rules.target_length}
STYLE: {rules.style}

VOICE GUIDANCE:
{voice_guidance}
{context_section}

PLATFORM RULES:
{chr(10).join(f"- {rule}" for rule in rules.rules)}

STRUCTURE:
{rules.structure}

INSTRUCTIONS:
1. Preserve the core insight from the original idea
2. Match {rules.name}'s native format and tone exactly
3. {hook_instruction}
4. {cta_instruction}
5. Follow the structure above precisely

OUTPUT FORMAT (JSON only):
{rules.output_format}

IMPORTANT: Return ONLY valid JSON. No markdown, no explanations, no code blocks."""
        
        return prompt
    
    def _build_voice_guidance(self, voice_style: str, voice_profile: Optional[Dict]) -> str:
        """Build voice guidance section."""
        if voice_profile:
            # Use analyzed voice profile
            formality = voice_profile.get("formality", 0.7)
            avg_sentence_length = voice_profile.get("avg_sentence_length", 15)
            emoji_usage = voice_profile.get("emoji_usage", "minimal")
            humor_level = voice_profile.get("humor_level", 0.3)
            
            guidance = f"""Use the user's established voice:
- Formality level: {formality:.1f}/1.0 ({'formal' if formality > 0.6 else 'casual'})
- Average sentence length: {avg_sentence_length} words
- Emoji usage: {emoji_usage}
- Humor level: {humor_level:.1f}/1.0
- Match vocabulary patterns from previous posts"""
            return guidance
        
        # Use style preset
        if voice_style == "professional":
            return """Use a professional voice:
- Formal vocabulary but accessible
- Data-driven claims
- Structured arguments
- Minimal contractions
- Credibility markers ("research shows", "in my experience")
- Executive thought leader tone"""
        else:  # casual
            return """Use a casual voice:
- Conversational tone
- Personal anecdotes welcome
- Contractions and informal phrasing
- Direct address ("you", "your")
- Emojis and humor where appropriate
- Approachable industry peer tone"""
    
    def _build_context_section(self, context: Optional[Dict]) -> str:
        """Build context section if context provided."""
        if not context:
            return ""
        
        sections = []
        
        if context.get("industry"):
            sections.append(f"Industry: {context['industry']}")
        
        if context.get("expertise_level"):
            sections.append(f"Expertise level: {context['expertise_level']}")
        
        if context.get("target_audience"):
            sections.append(f"Target audience: {context['target_audience']}")
        
        if sections:
            return "\n\nCONTEXT:\n" + "\n".join(sections)
        return ""


# Convenience function for direct import
def build_prompt(
    idea: str,
    platform: str,
    voice_style: str = "professional",
    voice_profile: Optional[Dict] = None,
    include_hooks: bool = True,
    include_ctas: bool = True,
    context: Optional[Dict] = None
) -> str:
    """Build a platform-specific prompt."""
    builder = PromptBuilder()
    return builder.build_prompt(
        idea=idea,
        platform=platform,
        voice_style=voice_style,
        voice_profile=voice_profile,
        include_hooks=include_hooks,
        include_ctas=include_ctas,
        context=context
    )


if __name__ == "__main__":
    # Test the prompt builder
    builder = PromptBuilder()
    
    test_idea = "The biggest mistake in B2B sales is treating every prospect the same instead of segmenting by buying stage"
    
    for platform in ["linkedin", "x", "substack", "medium", "instagram", "tiktok"]:
        print(f"\n{'='*60}")
        print(f"Platform: {platform.upper()}")
        print(f"{'='*60}")
        prompt = builder.build_prompt(
            idea=test_idea,
            platform=platform,
            voice_style="professional"
        )
        print(prompt[:1500] + "..." if len(prompt) > 1500 else prompt)