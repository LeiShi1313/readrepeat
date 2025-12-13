"""
Align transcript words to user's text sentences using dynamic programming
"""

import re
from typing import List, Dict, Any, Tuple, Optional
import Levenshtein

import logging
logger = logging.getLogger(__name__)


def normalize_for_comparison(text: str) -> str:
    """Normalize text for comparison (lowercase, remove punctuation)"""
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def word_similarity(word1: str, word2: str) -> float:
    """
    Calculate similarity between two words (0-1).
    Uses normalized Levenshtein distance.
    """
    w1 = normalize_for_comparison(word1)
    w2 = normalize_for_comparison(word2)

    if not w1 or not w2:
        return 0.0

    max_len = max(len(w1), len(w2))
    if max_len == 0:
        return 1.0

    distance = Levenshtein.distance(w1, w2)
    return 1.0 - (distance / max_len)


def tokenize_for_alignment(text: str) -> List[str]:
    """Tokenize text for alignment (split into words)"""
    # Normalize and split
    text = text.lower()
    text = re.sub(r'[^\w\s\']', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return [w for w in text.split() if w]


def align_transcript_to_text(
    sentences: List[str],
    transcript_words: List[Dict[str, Any]],
    similarity_threshold: float = 0.6
) -> List[Dict[str, Any]]:
    """
    Align transcript words to user-provided sentences.

    Uses greedy sequential alignment to find best word windows for each sentence.

    Args:
        sentences: List of user's sentences
        transcript_words: List of word dicts from transcription
        similarity_threshold: Minimum similarity for word match

    Returns:
        List of timing dicts for each sentence:
        - start_ms: int
        - end_ms: int
        - confidence: float
    """
    if not transcript_words:
        logger.warning('No transcript words, returning empty timings')
        return [{'start_ms': 0, 'end_ms': 0, 'confidence': 0.0} for _ in sentences]

    if not sentences:
        return []

    # Tokenize sentences into words
    sentence_word_lists = [tokenize_for_alignment(sent) for sent in sentences]

    # Get transcript word list
    trans_words = [w['word'] for w in transcript_words]

    # Sequential alignment - for each sentence, find best matching window
    timings = []
    current_trans_idx = 0

    for sent_idx, sent_words in enumerate(sentence_word_lists):
        if not sent_words:
            timings.append({'start_ms': 0, 'end_ms': 0, 'confidence': 0.0})
            continue

        # Find the best window for this sentence
        best_result = find_best_window(
            sent_words,
            trans_words,
            transcript_words,
            current_trans_idx
        )

        if best_result['start_idx'] is not None:
            timings.append({
                'start_ms': best_result['start_ms'],
                'end_ms': best_result['end_ms'],
                'confidence': best_result['confidence'],
            })
            # Move current position forward
            current_trans_idx = best_result['end_idx'] + 1
        else:
            # No good alignment found, use previous end or 0
            prev_end = timings[-1]['end_ms'] if timings else 0
            timings.append({
                'start_ms': prev_end,
                'end_ms': prev_end,
                'confidence': 0.0,
            })

    return timings


def find_best_window(
    sent_words: List[str],
    trans_words: List[str],
    transcript_words: List[Dict[str, Any]],
    start_from: int
) -> Dict[str, Any]:
    """
    Find the best matching window in transcript for a sentence.

    Args:
        sent_words: Words in the sentence
        trans_words: All transcript words (strings only)
        transcript_words: Full transcript word dicts with timestamps
        start_from: Index to start searching from

    Returns:
        Dict with start_idx, end_idx, start_ms, end_ms, confidence
    """
    n_sent = len(sent_words)
    n_trans = len(trans_words)

    if start_from >= n_trans:
        return {'start_idx': None, 'end_idx': None, 'start_ms': 0, 'end_ms': 0, 'confidence': 0.0}

    best_score = -1
    best_start = None
    best_end = None

    # Search window: from current position, look ahead up to 3x sentence length
    search_end = min(start_from + n_sent * 3 + 10, n_trans)

    # Try different starting positions (allow some flexibility)
    for start_pos in range(start_from, min(start_from + n_sent + 5, search_end)):
        # Try different window sizes
        for window_size in range(max(1, n_sent - 2), n_sent * 2 + 3):
            end_pos = start_pos + window_size - 1

            if end_pos >= n_trans:
                break

            # Calculate alignment score for this window
            window_words = trans_words[start_pos:end_pos + 1]
            score = calculate_alignment_score(sent_words, window_words)

            if score > best_score:
                best_score = score
                best_start = start_pos
                best_end = end_pos

    if best_start is None or best_score < 0.3:
        return {'start_idx': None, 'end_idx': None, 'start_ms': 0, 'end_ms': 0, 'confidence': 0.0}

    return {
        'start_idx': best_start,
        'end_idx': best_end,
        'start_ms': int(transcript_words[best_start]['start'] * 1000),
        'end_ms': int(transcript_words[best_end]['end'] * 1000),
        'confidence': best_score,
    }


def calculate_alignment_score(
    sent_words: List[str],
    trans_words: List[str]
) -> float:
    """
    Calculate alignment score between sentence words and transcript window.
    Uses greedy matching with word similarity.
    """
    if not sent_words or not trans_words:
        return 0.0

    n = len(sent_words)

    # Greedy matching: for each sentence word, find best match in transcript
    total_sim = 0.0
    matched = 0
    used_trans = set()

    for sw in sent_words:
        best_sim = 0.0
        best_idx = -1

        for i, tw in enumerate(trans_words):
            if i in used_trans:
                continue

            sim = word_similarity(sw, tw)
            if sim > best_sim:
                best_sim = sim
                best_idx = i

        if best_idx >= 0 and best_sim > 0.5:
            used_trans.add(best_idx)
            total_sim += best_sim
            matched += 1

    if n == 0:
        return 0.0

    # Score considers both coverage and similarity quality
    coverage = matched / n
    avg_sim = total_sim / n if n > 0 else 0

    # Penalize very different window sizes
    size_ratio = len(trans_words) / n if n > 0 else 1
    size_penalty = 1.0 if 0.5 <= size_ratio <= 2.0 else 0.8

    return (coverage * 0.5 + avg_sim * 0.5) * size_penalty


if __name__ == '__main__':
    # Test
    sentences = [
        "Hello, how are you today?",
        "I am doing well, thank you.",
        "The weather is nice."
    ]

    # Simulated transcript words
    transcript = [
        {'word': 'Hello', 'start': 0.0, 'end': 0.5, 'probability': 0.9},
        {'word': 'how', 'start': 0.6, 'end': 0.8, 'probability': 0.9},
        {'word': 'are', 'start': 0.9, 'end': 1.0, 'probability': 0.9},
        {'word': 'you', 'start': 1.1, 'end': 1.3, 'probability': 0.9},
        {'word': 'today', 'start': 1.4, 'end': 1.8, 'probability': 0.9},
        {'word': 'I', 'start': 2.0, 'end': 2.1, 'probability': 0.9},
        {'word': 'am', 'start': 2.2, 'end': 2.3, 'probability': 0.9},
        {'word': 'doing', 'start': 2.4, 'end': 2.7, 'probability': 0.9},
        {'word': 'well', 'start': 2.8, 'end': 3.0, 'probability': 0.9},
        {'word': 'thank', 'start': 3.1, 'end': 3.3, 'probability': 0.9},
        {'word': 'you', 'start': 3.4, 'end': 3.5, 'probability': 0.9},
        {'word': 'The', 'start': 4.0, 'end': 4.2, 'probability': 0.9},
        {'word': 'weather', 'start': 4.3, 'end': 4.7, 'probability': 0.9},
        {'word': 'is', 'start': 4.8, 'end': 4.9, 'probability': 0.9},
        {'word': 'nice', 'start': 5.0, 'end': 5.3, 'probability': 0.9},
    ]

    timings = align_transcript_to_text(sentences, transcript)
    for i, (sent, timing) in enumerate(zip(sentences, timings)):
        print(f"{i}: {sent}")
        print(f"   {timing['start_ms']}ms - {timing['end_ms']}ms (conf: {timing['confidence']:.2f})")
