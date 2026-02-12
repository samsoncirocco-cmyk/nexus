"""
Nexus Content Adaptation Engine

Core module for transforming one idea into platform-native content.

Usage:
    from execution.content.adapt_content import adapt_content
    from execution.content.prompt_builder import PromptBuilder
    from execution.content.voice_analyzer import VoiceAnalyzer
    
    # Adapt content
    result = await adapt_content(
        idea="Your idea here",
        platforms=["linkedin", "x", "substack"],
        user_id="user123"
    )
"""

from .adapt_content import adapt_content, AdaptationResult, ContentAdaptationEngine
from .prompt_builder import PromptBuilder, build_prompt
from .voice_analyzer import VoiceAnalyzer, analyze_voice

__all__ = [
    "adapt_content",
    "AdaptationResult", 
    "ContentAdaptationEngine",
    "PromptBuilder",
    "build_prompt",
    "VoiceAnalyzer",
    "analyze_voice"
]