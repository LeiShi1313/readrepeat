"""
Sentence segmentation for multiple languages
"""

import re
from typing import List


# Sentence ending patterns by language
SENTENCE_ENDINGS = {
    'en': r'[.!?]+',
    'zh': r'[。！？]+',
    'ja': r'[。！？]+',
    'ko': r'[。！？.!?]+',
    'es': r'[.!?¡¿]+',
    'fr': r'[.!?]+',
    'de': r'[.!?]+',
    'default': r'[.!?。！？]+',
}

# Common abbreviations that shouldn't end sentences
ABBREVIATIONS = {
    'en': ['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'etc', 'e.g', 'i.e', 'no', 'vol'],
    'default': [],
}


def segment_text(text: str, lang: str = 'en') -> List[str]:
    """
    Segment text into sentences using rule-based approach.

    Args:
        text: Raw text to segment
        lang: Language code (en, zh, ja, ko, etc.)

    Returns:
        List of sentence strings
    """
    # Normalize whitespace and newlines
    text = re.sub(r'\n+', ' ', text)
    text = re.sub(r'\s+', ' ', text.strip())

    if not text:
        return []

    # Get pattern for language
    pattern = SENTENCE_ENDINGS.get(lang, SENTENCE_ENDINGS['default'])

    # For Chinese/Japanese, use simpler split
    if lang in ['zh', 'ja']:
        return _segment_cjk(text, pattern)

    # For other languages, handle abbreviations
    return _segment_western(text, pattern, lang)


def _segment_cjk(text: str, pattern: str) -> List[str]:
    """Segment Chinese/Japanese text"""
    # Split on sentence endings but keep the delimiter
    parts = re.split(f'({pattern})', text)

    sentences = []
    current = ''

    for part in parts:
        if not part:
            continue

        current += part

        # If this part matches sentence ending, finalize sentence
        if re.match(pattern, part):
            if current.strip():
                sentences.append(current.strip())
            current = ''

    # Handle any remaining text
    if current.strip():
        sentences.append(current.strip())

    return sentences


def _segment_western(text: str, pattern: str, lang: str) -> List[str]:
    """Segment Western language text with abbreviation handling"""
    abbrevs = ABBREVIATIONS.get(lang, ABBREVIATIONS['default'])

    # Create a pattern that splits on sentence endings
    # but tries to avoid splitting on abbreviations
    sentences = []
    current = ''

    # Split by potential sentence boundaries
    parts = re.split(f'({pattern})', text)

    i = 0
    while i < len(parts):
        part = parts[i]

        if not part:
            i += 1
            continue

        # If this is punctuation
        if re.match(pattern, part):
            current += part

            # Check if the previous word was an abbreviation
            words = current.lower().split()
            is_abbrev = False
            if words:
                last_word = words[-1].rstrip('.!?')
                if last_word in abbrevs or (len(last_word) == 1 and last_word.isalpha()):
                    is_abbrev = True

            # Check if next char is lowercase (continuation)
            next_part = parts[i + 1] if i + 1 < len(parts) else ''
            next_starts_lower = next_part.strip() and next_part.strip()[0].islower()

            if not is_abbrev and not next_starts_lower and current.strip():
                sentences.append(current.strip())
                current = ''
        else:
            current += part

        i += 1

    # Handle any remaining text
    if current.strip():
        sentences.append(current.strip())

    return sentences


def tokenize(text: str, lang: str = 'en') -> List[str]:
    """
    Tokenize text into words for alignment.

    Args:
        text: Text to tokenize
        lang: Language code

    Returns:
        List of word tokens
    """
    # Normalize
    text = text.lower()

    # For CJK languages, split by character
    if lang in ['zh', 'ja', 'ko']:
        # Remove punctuation and split into characters
        text = re.sub(r'[^\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\s]', ' ', text)
        return [char for char in text if not char.isspace()]

    # For Western languages, split by whitespace and remove punctuation
    text = re.sub(r'[^\w\s\']', ' ', text)
    text = re.sub(r'\s+', ' ', text)

    return [w for w in text.split() if w]


if __name__ == '__main__':
    # Test
    test_en = "Hello there! How are you doing? I'm fine, thanks. Dr. Smith said it's okay."
    print("English:", segment_text(test_en, 'en'))

    test_zh = "你好！今天天气真好。我们去散步吧？"
    print("Chinese:", segment_text(test_zh, 'zh'))
