#!/usr/bin/env python3
"""
Voice Analyzer for AI Content Adaptation Engine

Analyzes sample posts to extract voice characteristics:
- Formality level
- Sentence length patterns
- Emoji usage
- Humor detection
- Vocabulary patterns
- Punctuation style

Usage:
    from voice_analyzer import VoiceAnalyzer
    analyzer = VoiceAnalyzer()
    profile = analyzer.analyze_voice(sample_posts)
"""

import re
import json
import logging
from typing import List, Dict, Any, Optional
from collections import Counter
from dataclasses import dataclass, asdict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voice_analyzer")


@dataclass
class VoiceCharacteristics:
    """Structured voice characteristics."""
    formality: float  # 0.0-1.0
    avg_sentence_length: float
    emoji_usage: str  # "none", "minimal", "moderate", "heavy"
    humor_level: float  # 0.0-1.0
    contraction_usage: float  # 0.0-1.0
    question_frequency: float  # Questions per 100 sentences
    exclamation_frequency: float  # Exclamations per 100 sentences
    capitalization_style: str  # "standard", "title_case", "lowercase", "mixed"
    common_phrases: List[str]
    vocabulary_richness: float  # Type-token ratio
    preferred_transitions: List[str]
    tone_descriptors: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


class VoiceAnalyzer:
    """Analyzes writing voice from sample posts."""
    
    # Formality markers
    FORMAL_WORDS = {
        "therefore", "furthermore", "however", "consequently", "nevertheless",
        "additionally", "subsequently", "in addition", "with regard to",
        "in accordance", "pursuant", "herein", "aforementioned", "utilize",
        "implement", "leverage", "optimize", "strategize", "facilitate",
        "demonstrate", "indicate", "suggest", "establish", "determine"
    }
    
    INFORMAL_WORDS = {
        "gonna", "wanna", "kinda", "sorta", "lots", "tons", "super", "really",
        "actually", "basically", "literally", "honestly", "seriously",
        "anyway", "whatever", "stuff", "things", "guys", "folks", "y'all"
    }
    
    CONTRACTIONS_PATTERN = re.compile(r"\b\w+'(?:m|s|d|ll|ve|re|t)\b", re.IGNORECASE)
    
    HUMOR_MARKERS = {
        "😂", "😅", "😆", "🤣", "💀", "🤔", "lol", "haha", "jokes", "funny",
        "ridiculous", "absurd", "sarcasm", "ironic", "plot twist", "hot take"
    }
    
    TRANSITION_WORDS = [
        "however", "therefore", "furthermore", "meanwhile", "consequently",
        "additionally", "similarly", "conversely", "alternatively", "specifically",
        "particularly", "essentially", "basically", "obviously", "interestingly",
        "surprisingly", "fortunately", "unfortunately", "importantly", "notably"
    ]
    
    def __init__(self):
        self.emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"  # emoticons
            "\U0001F300-\U0001F5FF"  # symbols & pictographs
            "\U0001F680-\U0001F6FF"  # transport & map symbols
            "\U0001F1E0-\U0001F1FF"  # flags
            "\U00002702-\U000027B0"
            "\U000024C2-\U0001F251"
            "]+", 
            flags=re.UNICODE
        )
    
    def analyze_voice(self, sample_posts: List[str]) -> Dict[str, Any]:
        """
        Analyze voice characteristics from sample posts.
        
        Args:
            sample_posts: List of previous posts/content samples
            
        Returns:
            Dictionary of voice characteristics
        """
        if not sample_posts:
            logger.warning("No sample posts provided, returning default voice")
            return self._default_voice()
        
        # Combine all posts for analysis
        combined_text = " ".join(sample_posts)
        
        # Extract characteristics
        characteristics = VoiceCharacteristics(
            formality=self._calculate_formality(combined_text, sample_posts),
            avg_sentence_length=self._calculate_avg_sentence_length(combined_text),
            emoji_usage=self._calculate_emoji_usage(combined_text),
            humor_level=self._calculate_humor_level(combined_text, sample_posts),
            contraction_usage=self._calculate_contraction_usage(combined_text),
            question_frequency=self._calculate_question_frequency(combined_text),
            exclamation_frequency=self._calculate_exclamation_frequency(combined_text),
            capitalization_style=self._detect_capitalization_style(sample_posts),
            common_phrases=self._extract_common_phrases(combined_text),
            vocabulary_richness=self._calculate_vocabulary_richness(combined_text),
            preferred_transitions=self._extract_transitions(combined_text),
            tone_descriptors=self._generate_tone_descriptors(combined_text)
        )
        
        logger.info(f"Voice analysis complete: formality={characteristics.formality:.2f}, "
                   f"emoji={characteristics.emoji_usage}, humor={characteristics.humor_level:.2f}")
        
        return characteristics.to_dict()
    
    def _calculate_formality(self, text: str, posts: List[str]) -> float:
        """Calculate formality score (0.0-1.0)."""
        words = self._tokenize(text.lower())
        
        if not words:
            return 0.5
        
        formal_count = sum(1 for w in words if w in self.FORMAL_WORDS)
        informal_count = sum(1 for w in words if w in self.INFORMAL_WORDS)
        
        # Also check for contractions
        contraction_count = len(self.CONTRACTIONS_PATTERN.findall(text))
        
        # Calculate base score
        total_markers = formal_count + informal_count + (contraction_count * 0.5)
        if total_markers == 0:
            return 0.5  # Neutral
        
        formal_ratio = formal_count / total_markers if total_markers > 0 else 0.5
        
        # Adjust for sentence structure
        avg_sent_len = self._calculate_avg_sentence_length(text)
        if avg_sent_len > 20:
            formal_ratio += 0.1
        elif avg_sent_len < 10:
            formal_ratio -= 0.1
        
        # Clamp to 0-1
        return max(0.0, min(1.0, formal_ratio))
    
    def _calculate_avg_sentence_length(self, text: str) -> float:
        """Calculate average sentence length in words."""
        sentences = self._split_sentences(text)
        if not sentences:
            return 15.0
        
        word_counts = [len(self._tokenize(s)) for s in sentences]
        return sum(word_counts) / len(word_counts)
    
    def _calculate_emoji_usage(self, text: str) -> str:
        """Calculate emoji usage level."""
        emoji_count = len(self.emoji_pattern.findall(text))
        word_count = len(self._tokenize(text))
        
        if word_count == 0:
            return "none"
        
        emoji_ratio = emoji_count / word_count
        
        if emoji_ratio == 0:
            return "none"
        elif emoji_ratio < 0.01:
            return "minimal"
        elif emoji_ratio < 0.03:
            return "moderate"
        else:
            return "heavy"
    
    def _calculate_humor_level(self, text: str, posts: List[str]) -> float:
        """Calculate humor level (0.0-1.0)."""
        text_lower = text.lower()
        
        # Count humor markers
        humor_count = sum(1 for marker in self.HUMOR_MARKERS if marker in text_lower)
        
        # Check for question/exclamation balance (humor often uses both)
        questions = text.count("?")
        exclamations = text.count("!")
        
        # Check for self-deprecating patterns
        self_deprecating = len(re.findall(r"\b(I\s+(?:always|never|constantly)\s+|I'm\s+(?:terrible|awful|bad)\s+at)", text_lower))
        
        # Calculate score
        score = min(1.0, (humor_count * 0.1) + (self_deprecating * 0.2))
        
        # Boost for funny punctuation balance
        if questions > 0 and exclamations > 0:
            score += 0.1
        
        return min(1.0, score)
    
    def _calculate_contraction_usage(self, text: str) -> float:
        """Calculate contraction usage ratio."""
        contractions = len(self.CONTRACTIONS_PATTERN.findall(text))
        words = len(self._tokenize(text))
        
        if words == 0:
            return 0.0
        
        return min(1.0, contractions / (words * 0.1))  # Normalize to reasonable max
    
    def _calculate_question_frequency(self, text: str) -> float:
        """Calculate questions per 100 sentences."""
        sentences = self._split_sentences(text)
        if not sentences:
            return 0.0
        
        questions = text.count("?")
        return (questions / len(sentences)) * 100
    
    def _calculate_exclamation_frequency(self, text: str) -> float:
        """Calculate exclamations per 100 sentences."""
        sentences = self._split_sentences(text)
        if not sentences:
            return 0.0
        
        exclamations = text.count("!")
        return (exclamations / len(sentences)) * 100
    
    def _detect_capitalization_style(self, posts: List[str]) -> str:
        """Detect preferred capitalization style."""
        styles = Counter()
        
        for post in posts:
            if not post.strip():
                continue
                
            # Check first 200 chars for style detection
            sample = post[:200]
            
            if sample.isupper():
                styles["all_caps"] += 1
            elif sample.islower():
                styles["lowercase"] += 1
            elif sample.istitle():
                styles["title_case"] += 1
            else:
                # Check for mixed/inconsistent
                words = sample.split()
                caps_count = sum(1 for w in words if w and w[0].isupper())
                if caps_count / len(words) > 0.7:
                    styles["standard"] += 1
                else:
                    styles["mixed"] += 1
        
        if not styles:
            return "standard"
        
        # Map to return values
        style_map = {
            "standard": "standard",
            "mixed": "mixed",
            "all_caps": "standard",  # Normalize
            "lowercase": "lowercase",
            "title_case": "title_case"
        }
        
        most_common = styles.most_common(1)[0][0]
        return style_map.get(most_common, "standard")
    
    def _extract_common_phrases(self, text: str, top_n: int = 5) -> List[str]:
        """Extract commonly used phrases (2-3 words)."""
        words = self._tokenize(text.lower())
        
        # Generate 2-grams and 3-grams
        phrases = []
        for n in [2, 3]:
            for i in range(len(words) - n + 1):
                phrase = " ".join(words[i:i+n])
                # Filter out phrases with stop words at start/end
                phrases.append(phrase)
        
        # Count and filter
        phrase_counts = Counter(phrases)
        
        # Filter common stop phrases
        stop_phrases = {"it is", "i am", "you are", "this is", "that is", "there is"}
        
        common = [
            phrase for phrase, count in phrase_counts.most_common(top_n * 2)
            if phrase not in stop_phrases and count > 1
        ][:top_n]
        
        return common
    
    def _calculate_vocabulary_richness(self, text: str) -> float:
        """Calculate type-token ratio (vocabulary diversity)."""
        words = self._tokenize(text.lower())
        if not words:
            return 0.5
        
        unique_words = set(words)
        return len(unique_words) / len(words)
    
    def _extract_transitions(self, text: str, top_n: int = 5) -> List[str]:
        """Extract commonly used transition words."""
        text_lower = text.lower()
        found_transitions = [
            word for word in self.TRANSITION_WORDS
            if word in text_lower
        ]
        
        # Count occurrences
        transition_counts = Counter()
        for transition in found_transitions:
            transition_counts[transition] = text_lower.count(transition)
        
        return [word for word, _ in transition_counts.most_common(top_n)]
    
    def _generate_tone_descriptors(self, text: str) -> List[str]:
        """Generate descriptive tone labels."""
        descriptors = []
        
        # Analyze various aspects
        formality = self._calculate_formality(text, [text])
        emoji_usage = self._calculate_emoji_usage(text)
        humor = self._calculate_humor_level(text, [text])
        question_freq = self._calculate_question_frequency(text)
        exclamation_freq = self._calculate_exclamation_frequency(text)
        
        # Formality descriptors
        if formality > 0.7:
            descriptors.append("formal")
        elif formality < 0.4:
            descriptors.append("casual")
        else:
            descriptors.append("balanced")
        
        # Engagement descriptors
        if question_freq > 15:
            descriptors.append("inquisitive")
        if exclamation_freq > 10:
            descriptors.append("enthusiastic")
        
        # Style descriptors
        if emoji_usage in ["moderate", "heavy"]:
            descriptors.append("expressive")
        if humor > 0.5:
            descriptors.append("witty")
        
        # Sentence structure
        avg_len = self._calculate_avg_sentence_length(text)
        if avg_len > 20:
            descriptors.append("complex")
        elif avg_len < 10:
            descriptors.append("punchy")
        else:
            descriptors.append("conversational")
        
        return descriptors
    
    def _tokenize(self, text: str) -> List[str]:
        """Simple word tokenization."""
        # Remove URLs, mentions, hashtags for cleaner analysis
        text = re.sub(r'http\S+|www\S+|@\w+|#\w+', '', text)
        # Extract words
        words = re.findall(r'\b[a-zA-Z]+\b', text)
        return words
    
    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences."""
        # Simple sentence splitting
        sentences = re.split(r'[.!?]+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _default_voice(self) -> Dict[str, Any]:
        """Return default voice characteristics."""
        return VoiceCharacteristics(
            formality=0.6,
            avg_sentence_length=15.0,
            emoji_usage="minimal",
            humor_level=0.3,
            contraction_usage=0.4,
            question_frequency=10.0,
            exclamation_frequency=5.0,
            capitalization_style="standard",
            common_phrases=[],
            vocabulary_richness=0.6,
            preferred_transitions=[],
            tone_descriptors=["professional", "balanced", "conversational"]
        ).to_dict()
    
    def compare_voices(self, voice1: Dict, voice2: Dict) -> float:
        """
        Compare two voice profiles and return similarity score (0.0-1.0).
        
        Args:
            voice1: First voice characteristics
            voice2: Second voice characteristics
            
        Returns:
            Similarity score where 1.0 = identical, 0.0 = completely different
        """
        scores = []
        
        # Formality similarity
        scores.append(1.0 - abs(voice1.get("formality", 0.5) - voice2.get("formality", 0.5)))
        
        # Sentence length similarity
        len1 = voice1.get("avg_sentence_length", 15)
        len2 = voice2.get("avg_sentence_length", 15)
        scores.append(1.0 - min(1.0, abs(len1 - len2) / 20))
        
        # Humor similarity
        scores.append(1.0 - abs(voice1.get("humor_level", 0.3) - voice2.get("humor_level", 0.3)))
        
        # Emoji usage similarity
        emoji_map = {"none": 0, "minimal": 1, "moderate": 2, "heavy": 3}
        emoji_diff = abs(
            emoji_map.get(voice1.get("emoji_usage", "minimal"), 1) - 
            emoji_map.get(voice2.get("emoji_usage", "minimal"), 1)
        )
        scores.append(1.0 - (emoji_diff / 3))
        
        # Contraction usage
        scores.append(1.0 - abs(
            voice1.get("contraction_usage", 0.4) - voice2.get("contraction_usage", 0.4)
        ))
        
        return sum(scores) / len(scores)


def analyze_voice(sample_posts: List[str]) -> Dict[str, Any]:
    """Convenience function to analyze voice."""
    analyzer = VoiceAnalyzer()
    return analyzer.analyze_voice(sample_posts)


def main():
    """Test the voice analyzer."""
    test_posts = [
        "Just finished a great meeting with the team! Really excited about our Q4 roadmap 🚀",
        "Here's the thing about B2B sales... most people are doing it wrong. Let me explain.",
        "If you're not segmenting your pipeline by buying stage, you're leaving money on the table. Period.",
        "Quick tip: Stop sending demos to awareness-stage prospects. They need education, not features!",
        "Honestly? The best sales teams I know focus on one thing: matching the message to the moment."
    ]
    
    analyzer = VoiceAnalyzer()
    profile = analyzer.analyze_voice(test_posts)
    
    print("Voice Analysis Results:")
    print("=" * 50)
    print(json.dumps(profile, indent=2))


if __name__ == "__main__":
    main()