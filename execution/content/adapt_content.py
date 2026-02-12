#!/usr/bin/env python3
"""
AI Content Adaptation Engine - Nexus Core Product

Transforms one idea into platform-native content for LinkedIn, X, Substack, 
Medium, Instagram, and TikTok using Claude API (primary) with GPT-4 fallback.

Usage:
    python adapt_content.py --idea "..." --platforms linkedin,twitter --user-id "abc123"
    python adapt_content.py --json-input '{"idea":"...", "platforms":["linkedin"]}'
"""

import os
import sys
import json
import hashlib
import asyncio
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from pathlib import Path
import argparse

# Handle both module import and direct script execution
try:
    from .prompt_builder import PromptBuilder
    from .voice_analyzer import VoiceAnalyzer
except ImportError:
    # Direct script execution
    sys.path.insert(0, str(Path(__file__).parent))
    from prompt_builder import PromptBuilder
    from voice_analyzer import VoiceAnalyzer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("adapt_content")


@dataclass
class AdaptationRequest:
    """Input request for content adaptation."""
    idea: str
    platforms: List[str]
    user_id: str
    voice_profile: Optional[Dict[str, Any]] = None
    voice_style: str = "professional"
    include_hooks: bool = True
    include_ctas: bool = True
    context: Optional[Dict[str, Any]] = None
    
    def to_cache_key(self) -> str:
        """Generate cache key for this request."""
        key_data = {
            "idea": self.idea,
            "platforms": sorted(self.platforms),
            "voice_style": self.voice_style,
            "include_hooks": self.include_hooks,
            "include_ctas": self.include_ctas
        }
        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.sha256(key_string.encode()).hexdigest()


@dataclass
class PlatformContent:
    """Output structure for a single platform."""
    platform: str
    content: str
    char_count: int
    estimated_engagement: str
    
    # Platform-specific fields
    hashtag_count: Optional[int] = None
    is_thread: Optional[bool] = None
    thread_options: Optional[List[str]] = None
    title: Optional[str] = None
    word_count: Optional[int] = None
    estimated_read_time: Optional[str] = None
    caption: Optional[str] = None
    carousel_slides: Optional[List[str]] = None
    hashtag_block: Optional[str] = None
    hook: Optional[str] = None
    script: Optional[str] = None
    duration_seconds: Optional[int] = None
    cta: Optional[str] = None
    trend_suggestion: Optional[str] = None


@dataclass
class AdaptationResult:
    """Full result from adaptation."""
    status: str
    adaptations: Dict[str, PlatformContent]
    meta: Dict[str, Any]
    error: Optional[str] = None


class ContentCache:
    """Simple in-memory cache for content adaptations."""
    
    def __init__(self, ttl_seconds: int = 3600):
        self._cache: Dict[str, tuple[Dict, datetime]] = {}
        self._ttl = timedelta(seconds=ttl_seconds)
    
    def get(self, key: str) -> Optional[Dict]:
        """Get cached result if not expired."""
        if key in self._cache:
            result, timestamp = self._cache[key]
            if datetime.now() - timestamp < self._ttl:
                logger.debug(f"Cache hit for key: {key[:8]}...")
                return result
            else:
                del self._cache[key]
        return None
    
    def set(self, key: str, value: Dict):
        """Cache a result."""
        self._cache[key] = (value, datetime.now())
        logger.debug(f"Cached result for key: {key[:8]}...")
    
    def clear(self):
        """Clear all cached entries."""
        self._cache.clear()


class AIAdapter:
    """Handles AI API calls with Claude primary and GPT-4 fallback."""
    
    def __init__(self):
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.primary_model = "claude-3-5-sonnet-20241022"
        self.fallback_model = "gpt-4"
        
    async def generate(self, prompt: str, platform: str) -> Dict[str, Any]:
        """Generate content using Claude, fallback to GPT-4."""
        try:
            return await self._call_claude(prompt, platform)
        except Exception as e:
            logger.warning(f"Claude failed for {platform}: {e}. Falling back to GPT-4.")
            try:
                return await self._call_gpt4(prompt, platform)
            except Exception as e2:
                logger.error(f"GPT-4 also failed for {platform}: {e2}")
                return {"error": str(e2), "platform": platform}
    
    async def _call_claude(self, prompt: str, platform: str) -> Dict[str, Any]:
        """Call Anthropic Claude API."""
        try:
            import anthropic
        except ImportError:
            raise ImportError("anthropic package required. Run: pip install anthropic")
        
        client = anthropic.Anthropic(api_key=self.anthropic_api_key)
        
        response = await asyncio.to_thread(
            client.messages.create,
            model=self.primary_model,
            max_tokens=4000,
            temperature=0.7,
            system="You are an expert content strategist who adapts ideas into platform-native content. Return valid JSON only.",
            messages=[{"role": "user", "content": prompt}]
        )
        
        content = response.content[0].text if response.content else ""
        return self._parse_response(content, platform, "claude")
    
    async def _call_gpt4(self, prompt: str, platform: str) -> Dict[str, Any]:
        """Call OpenAI GPT-4 API."""
        try:
            import openai
        except ImportError:
            raise ImportError("openai package required. Run: pip install openai")
        
        client = openai.AsyncOpenAI(api_key=self.openai_api_key)
        
        response = await client.chat.completions.create(
            model=self.fallback_model,
            messages=[
                {"role": "system", "content": "You are an expert content strategist who adapts ideas into platform-native content. Return valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=4000,
            temperature=0.7
        )
        
        content = response.choices[0].message.content or ""
        return self._parse_response(content, platform, "gpt4")
    
    def _parse_response(self, content: str, platform: str, model: str) -> Dict[str, Any]:
        """Parse API response, extracting JSON."""
        content = content.strip()
        
        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        
        content = content.strip()
        
        try:
            parsed = json.loads(content)
            parsed["_model"] = model
            parsed["_platform"] = platform
            return parsed
        except json.JSONDecodeError as e:
            # Return raw content wrapped in error
            return {
                "error": f"JSON parse error: {e}",
                "raw_content": content,
                "platform": platform
            }


class ContentAdaptationEngine:
    """Main engine for adapting content across platforms."""
    
    SUPPORTED_PLATFORMS = ["linkedin", "twitter", "x", "substack", "medium", "instagram", "tiktok"]
    
    def __init__(self):
        self.cache = ContentCache()
        self.ai_adapter = AIAdapter()
        self.prompt_builder = PromptBuilder()
        self.voice_analyzer = VoiceAnalyzer()
        
    async def adapt_content(
        self,
        idea: str,
        platforms: List[str],
        user_id: str,
        voice_profile: Optional[Dict[str, Any]] = None,
        voice_style: str = "professional",
        include_hooks: bool = True,
        include_ctas: bool = True,
        context: Optional[Dict[str, Any]] = None
    ) -> AdaptationResult:
        """
        Main entry point: adapt content for multiple platforms.
        
        Args:
            idea: The core idea to adapt
            platforms: List of target platform names
            user_id: Unique identifier for the user
            voice_profile: Optional pre-analyzed voice characteristics
            voice_style: "professional" or "casual"
            include_hooks: Whether to include attention-grabbing hooks
            include_ctas: Whether to include calls-to-action
            context: Additional context (industry, previous posts, etc.)
            
        Returns:
            AdaptationResult containing all platform adaptations
        """
        start_time = datetime.now()
        
        # Normalize platform names
        platforms = self._normalize_platforms(platforms)
        
        # Validate inputs
        validation_error = self._validate_inputs(idea, platforms, user_id)
        if validation_error:
            return AdaptationResult(
                status="error",
                adaptations={},
                meta={},
                error=validation_error
            )
        
        # Check cache
        request = AdaptationRequest(
            idea=idea,
            platforms=platforms,
            user_id=user_id,
            voice_profile=voice_profile,
            voice_style=voice_style,
            include_hooks=include_hooks,
            include_ctas=include_ctas,
            context=context
        )
        
        cache_key = request.to_cache_key()
        cached = self.cache.get(cache_key)
        if cached:
            cached["meta"]["cached"] = True
            return AdaptationResult(**cached)
        
        # Load voice profile if not provided but we have sample posts
        if not voice_profile and context and context.get("previous_posts_sample"):
            voice_profile = await asyncio.to_thread(
                self.voice_analyzer.analyze_voice,
                context["previous_posts_sample"]
            )
        
        # Process all platforms concurrently
        tasks = [
            self._adapt_for_platform(
                idea=idea,
                platform=platform,
                voice_style=voice_style,
                voice_profile=voice_profile,
                include_hooks=include_hooks,
                include_ctas=include_ctas,
                context=context
            )
            for platform in platforms
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Build response
        adaptations = {}
        errors = []
        
        for platform, result in zip(platforms, results):
            if isinstance(result, Exception):
                logger.error(f"Error adapting for {platform}: {result}")
                errors.append(f"{platform}: {str(result)}")
            else:
                adaptations[platform] = result
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        result = AdaptationResult(
            status="success" if adaptations else "error",
            adaptations=adaptations,
            meta={
                "processing_time_ms": round(processing_time, 2),
                "platforms_processed": len(adaptations),
                "platforms_requested": len(platforms),
                "cached": False,
                "errors": errors if errors else None
            },
            error="; ".join(errors) if errors and not adaptations else None
        )
        
        # Cache successful results
        if adaptations:
            self.cache.set(cache_key, {
                "status": result.status,
                "adaptations": {k: asdict(v) for k, v in adaptations.items()},
                "meta": result.meta,
                "error": result.error
            })
        
        return result
    
    def _normalize_platforms(self, platforms: List[str]) -> List[str]:
        """Normalize platform names (twitter -> x, etc.)."""
        normalized = []
        for p in platforms:
            p = p.lower().strip()
            if p == "twitter":
                p = "x"
            normalized.append(p)
        return list(set(normalized))  # Remove duplicates
    
    def _validate_inputs(self, idea: str, platforms: List[str], user_id: str) -> Optional[str]:
        """Validate inputs, return error message if invalid."""
        if not idea or len(idea.strip()) < 10:
            return "Idea too short (minimum 10 characters)"
        
        if not platforms:
            return "At least one platform required"
        
        invalid = [p for p in platforms if p not in self.SUPPORTED_PLATFORMS]
        if invalid:
            return f"Unsupported platforms: {', '.join(invalid)}"
        
        if not user_id:
            return "User ID required"
        
        return None
    
    async def _adapt_for_platform(
        self,
        idea: str,
        platform: str,
        voice_style: str,
        voice_profile: Optional[Dict],
        include_hooks: bool,
        include_ctas: bool,
        context: Optional[Dict]
    ) -> PlatformContent:
        """Adapt content for a single platform."""
        # Build prompt
        prompt = self.prompt_builder.build_prompt(
            idea=idea,
            platform=platform,
            voice_style=voice_style,
            voice_profile=voice_profile,
            include_hooks=include_hooks,
            include_ctas=include_ctas,
            context=context
        )
        
        # Generate content
        result = await self.ai_adapter.generate(prompt, platform)
        
        if "error" in result:
            raise Exception(result["error"])
        
        # Parse into PlatformContent
        return self._build_platform_content(result, platform)
    
    def _build_platform_content(self, data: Dict, platform: str) -> PlatformContent:
        """Build PlatformContent from API response."""
        content = data.get("content", data.get("caption", data.get("script", "")))
        
        base = PlatformContent(
            platform=platform,
            content=content,
            char_count=len(content),
            estimated_engagement=data.get("estimated_engagement", "medium")
        )
        
        # Platform-specific fields
        if platform == "linkedin":
            base.hashtag_count = data.get("hashtag_count", content.count("#"))
            
        elif platform == "x":
            base.is_thread = data.get("is_thread", False)
            base.thread_options = data.get("thread_options", [])
            
        elif platform in ["substack", "medium"]:
            base.title = data.get("title", "")
            base.word_count = data.get("word_count", len(content.split()))
            base.estimated_read_time = data.get("estimated_read_time", "")
            
        elif platform == "instagram":
            base.caption = data.get("caption", "")
            base.carousel_slides = data.get("carousel_slides", [])
            base.hashtag_block = data.get("hashtag_block", "")
            base.char_count = len(base.caption) if base.caption else len(content)
            
        elif platform == "tiktok":
            base.hook = data.get("hook", "")
            base.script = data.get("script", "")
            base.duration_seconds = data.get("duration_seconds", 45)
            base.cta = data.get("cta", "")
            base.trend_suggestion = data.get("trend_suggestion", "")
        
        return base


# Global engine instance
_engine: Optional[ContentAdaptationEngine] = None


def get_engine() -> ContentAdaptationEngine:
    """Get or create the adaptation engine."""
    global _engine
    if _engine is None:
        _engine = ContentAdaptationEngine()
    return _engine


async def adapt_content(
    idea: str,
    platforms: List[str],
    user_id: str,
    voice_profile: Optional[Dict[str, Any]] = None,
    voice_style: str = "professional",
    include_hooks: bool = True,
    include_ctas: bool = True,
    context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Convenience function: adapt content and return dict.
    
    This is the main public API for the content adaptation engine.
    """
    engine = get_engine()
    result = await engine.adapt_content(
        idea=idea,
        platforms=platforms,
        user_id=user_id,
        voice_profile=voice_profile,
        voice_style=voice_style,
        include_hooks=include_hooks,
        include_ctas=include_ctas,
        context=context
    )
    
    # Convert to dict for JSON serialization
    return {
        "status": result.status,
        "adaptations": {
            k: asdict(v) for k, v in result.adaptations.items()
        },
        "meta": result.meta,
        "error": result.error
    }


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="AI Content Adaptation Engine")
    parser.add_argument("--idea", required=True, help="The idea to adapt")
    parser.add_argument("--platforms", required=True, help="Comma-separated platform list")
    parser.add_argument("--user-id", default="cli-user", help="User ID")
    parser.add_argument("--voice-style", default="professional", choices=["professional", "casual"])
    parser.add_argument("--no-hooks", action="store_true", help="Exclude hooks")
    parser.add_argument("--no-ctas", action="store_true", help="Exclude CTAs")
    parser.add_argument("--json-input", help="JSON input (overrides other args)")
    parser.add_argument("--dry-run", action="store_true", help="Show prompts without calling API")
    
    args = parser.parse_args()
    
    # Parse input
    if args.json_input:
        data = json.loads(args.json_input)
        idea = data["idea"]
        platforms = data["platforms"]
        user_id = data.get("user_id", "cli-user")
        voice_style = data.get("voice_style", "professional")
        include_hooks = data.get("include_hooks", True)
        include_ctas = data.get("include_ctas", True)
        context = data.get("context")
    else:
        idea = args.idea
        platforms = [p.strip() for p in args.platforms.split(",")]
        user_id = args.user_id
        voice_style = args.voice_style
        include_hooks = not args.no_hooks
        include_ctas = not args.no_ctas
        context = None
    
    # Dry run: just show prompt
    if args.dry_run:
        builder = PromptBuilder()
        for platform in platforms:
            prompt = builder.build_prompt(
                idea=idea,
                platform=platform,
                voice_style=voice_style,
                include_hooks=include_hooks,
                include_ctas=include_ctas
            )
            print(f"\n{'='*60}")
            print(f"Platform: {platform}")
            print(f"{'='*60}")
            print(prompt[:2000] + "..." if len(prompt) > 2000 else prompt)
        return
    
    # Run adaptation
    result = asyncio.run(adapt_content(
        idea=idea,
        platforms=platforms,
        user_id=user_id,
        voice_style=voice_style,
        include_hooks=include_hooks,
        include_ctas=include_ctas,
        context=context
    ))
    
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()