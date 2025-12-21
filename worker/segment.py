"""
Sentence segmentation for multiple languages
"""

import re
from typing import List, Tuple


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


def merge_short_sentences(sentences: List[str], min_words: int = 2) -> List[str]:
    """Merge sentences with fewer than min_words with the next sentence.

    This helps balance sentence counts across languages where one language
    produces short single-word sentences (e.g., German "Ja.") that get
    translated as part of a longer sentence in another language.

    Args:
        sentences: List of sentences to potentially merge
        min_words: Minimum word count; shorter sentences get merged forward

    Returns:
        List of sentences with short ones merged into following sentences
    """
    if len(sentences) <= 1:
        return sentences

    result = []
    i = 0
    while i < len(sentences):
        sent = sentences[i]
        word_count = len(sent.split())

        # If short and not last, merge with next
        if word_count < min_words and i + 1 < len(sentences):
            sentences[i + 1] = sent + " " + sentences[i + 1]
        else:
            result.append(sent)
        i += 1

    return result


def _force_merge_to_count(sentences: List[str], target: int) -> List[str]:
    """Force merge sentences until we have exactly target count.

    Merges shortest sentences first to minimize information loss.

    Args:
        sentences: List of sentences to merge
        target: Target number of sentences

    Returns:
        List of exactly target sentences (or fewer if input was smaller)
    """
    if len(sentences) <= target:
        return sentences

    # Make a copy to avoid mutating the input
    sentences = sentences.copy()

    # Merge shortest sentences first
    while len(sentences) > target:
        # Find shortest sentence (not last, so we can merge forward)
        min_len = float('inf')
        min_idx = 0
        for i, s in enumerate(sentences[:-1]):
            if len(s) < min_len:
                min_len = len(s)
                min_idx = i

        # Merge with next
        sentences[min_idx] = sentences[min_idx] + " " + sentences[min_idx + 1]
        sentences.pop(min_idx + 1)

    return sentences


def segment_parallel(
    foreign_text: str,
    translation_text: str,
    foreign_lang: str,
    translation_lang: str,
    min_words: int = 2
) -> Tuple[List[str], List[str]]:
    """Segment two texts in parallel, ensuring equal sentence counts per line.

    This function handles the common problem where different languages produce
    different sentence counts for the same content. For example:
    - German: "Ja. Wir können..." → 2 sentences
    - English: "Yes, we can..." → 1 sentence

    The algorithm:
    1. Split both texts by newlines (preserving line correspondence)
    2. For each line pair, segment independently
    3. If counts differ, merge short sentences in the one with more
    4. If still unequal, force merge to the smaller count
    5. Flatten all line segments into final lists

    Args:
        foreign_text: Text in the foreign language
        translation_text: Text in the translation language
        foreign_lang: Language code for foreign text
        translation_lang: Language code for translation text
        min_words: Minimum words for a sentence; shorter ones may be merged

    Returns:
        Tuple of (foreign_sentences, translation_sentences) with equal lengths
    """
    foreign_lines = foreign_text.strip().split('\n')
    trans_lines = translation_text.strip().split('\n')

    # Pad shorter list with empty strings
    max_lines = max(len(foreign_lines), len(trans_lines))
    foreign_lines += [''] * (max_lines - len(foreign_lines))
    trans_lines += [''] * (max_lines - len(trans_lines))

    all_foreign = []
    all_trans = []

    for f_line, t_line in zip(foreign_lines, trans_lines):
        f_line = f_line.strip()
        t_line = t_line.strip()

        # Skip empty line pairs
        if not f_line and not t_line:
            continue

        # Handle case where one line is empty
        if not f_line:
            # Foreign is empty, add translation as-is with empty foreign placeholder
            t_sents = segment_text(t_line, translation_lang)
            for t_sent in t_sents:
                all_foreign.append('')
                all_trans.append(t_sent)
            continue
        if not t_line:
            # Translation is empty, add foreign as-is with empty translation placeholder
            f_sents = segment_text(f_line, foreign_lang)
            for f_sent in f_sents:
                all_foreign.append(f_sent)
                all_trans.append('')
            continue

        # Segment both lines
        f_sents = segment_text(f_line, foreign_lang)
        t_sents = segment_text(t_line, translation_lang)

        # Balance by merging short sentences (try foreign first)
        prev_f_count = -1
        while len(f_sents) > len(t_sents) and len(f_sents) > 1:
            if len(f_sents) == prev_f_count:
                break  # No more merging possible
            prev_f_count = len(f_sents)
            f_sents = merge_short_sentences(f_sents, min_words)

        # Then try translation
        prev_t_count = -1
        while len(t_sents) > len(f_sents) and len(t_sents) > 1:
            if len(t_sents) == prev_t_count:
                break  # No more merging possible
            prev_t_count = len(t_sents)
            t_sents = merge_short_sentences(t_sents, min_words)

        # Force to smaller count if still unequal
        target = min(len(f_sents), len(t_sents))
        if target == 0:
            target = max(len(f_sents), len(t_sents))

        f_sents = _force_merge_to_count(f_sents, target)
        t_sents = _force_merge_to_count(t_sents, target)

        all_foreign.extend(f_sents)
        all_trans.extend(t_sents)

    return all_foreign, all_trans


def strip_speaker_tags(text: str) -> str:
    """
    Remove 'Speaker 1:' / 'Speaker 2:' tags from start of lines.

    Used in dialog mode to clean up text before segmentation.

    Args:
        text: Raw text with possible speaker tags

    Returns:
        Text with speaker tags removed
    """
    lines = text.split('\n')
    cleaned = []
    for line in lines:
        # Remove "Speaker 1:", "Speaker 2:", etc. from start of line
        line = re.sub(r'^Speaker\s*\d+\s*:\s*', '', line.strip(), flags=re.IGNORECASE)
        if line:
            cleaned.append(line)
    return '\n'.join(cleaned)


def parse_dialog_lines(text: str) -> List[Tuple[int, str]]:
    """Parse text into dialog lines with speaker identification.

    Args:
        text: Text with possible "Speaker 1:" / "Speaker 2:" tags

    Returns:
        List of (speaker_num, clean_text) tuples.
        speaker_num is 1 or 2.
    """
    lines = text.strip().split('\n')
    result = []
    current_speaker = 1

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Check for speaker tag
        match = re.match(r'^Speaker\s*(\d+)\s*:\s*(.*)$', line, re.IGNORECASE)
        if match:
            speaker_num = int(match.group(1))
            clean_text = match.group(2).strip()
            if speaker_num in (1, 2) and clean_text:
                result.append((speaker_num, clean_text))
                current_speaker = speaker_num
        else:
            # No tag - alternate speakers
            result.append((current_speaker, line))
            current_speaker = 2 if current_speaker == 1 else 1

    return result


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

    test_de = """
Einwohnerkontrolle, Gemeinde Zug, guten Tag.
Guten Tag, ich möchte mich anmelden. Ich bin neu umgezogen.
Alles klar. Wann sind Sie eingezogen?
Am 1. des Monats, also vor zwei Wochen.
Dann brauchen wir einen Termin. Es geht nächsten Montag um 10:30 oder Dienstag um 14:00.
Dienstag um 14:00 passt mir besser.
Gut. Bitte bringen Sie Pass, Aufenthaltstitel, Mietvertrag und, wenn möglich, eine Krankenversicherungskarte mit.
Muss ich auch ein Formular ausfüllen?
Ja, vor Ort. Das dauert ungefähr 15 Minuten.
Wo genau ist das Gemeindehaus?
In der Altstadt, beim Bahnhof. Eingang rechts, erster Stock.
Und die Öffnungszeiten?
Wir sind vormittags ab 8 Uhr geöffnet, am Dienstag auch nachmittags.
Super. Bekomme ich eine Bestätigung für den Termin?
Ja, ich sende Ihnen gleich eine E-Mail mit allen Unterlagen.
Vielen Dank, auf Wiederhören."""
    print("German:", segment_text(test_de, 'de'))


