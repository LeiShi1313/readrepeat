"""
Main processing pipeline for lesson audio
"""

import os
import uuid
from typing import List, Dict, Any

from segment import segment_parallel
from transcribe import transcribe_audio
from align import align_transcript_to_text
from slice import slice_audio, normalize_audio

import logging
logger = logging.getLogger(__name__)


def process_lesson(
    lesson_id: str,
    foreign_text: str,
    translation_text: str,
    audio_path: str,
    foreign_lang: str = 'en',
    translation_lang: str = 'zh',
    whisper_model: str = 'base',
    cached_transcription: Dict[str, Any] = None,
) -> List[Dict[str, Any]]:
    """
    Process a lesson: segment, transcribe, align, slice

    Args:
        cached_transcription: Optional pre-existing transcription with word timings
                            from audio_files table. If provided, skips Whisper.

    Returns list of sentence dictionaries ready for DB insertion
    """
    logger.info(f'Processing lesson {lesson_id}')

    # 1. Segment texts into sentences (parallel to ensure aligned counts)
    logger.info('Step 1: Segmenting texts in parallel')
    foreign_sentences, translation_sentences = segment_parallel(
        foreign_text, translation_text, foreign_lang, translation_lang
    )

    logger.info(f'Foreign: {len(foreign_sentences)} sentences')
    logger.info(f'Translation: {len(translation_sentences)} sentences (aligned)')

    if not foreign_sentences:
        raise ValueError('No sentences found in foreign text')

    # 2. Normalize audio to WAV (mono, 16kHz)
    logger.info('Step 2: Normalizing audio')
    audio_dir = os.path.dirname(audio_path)
    normalized_path = os.path.join(audio_dir, 'normalized.wav')
    normalize_audio(audio_path, normalized_path)

    # 3. Transcribe with word-level timestamps (or reuse cached transcription)
    if cached_transcription and cached_transcription.get('words'):
        logger.info('Step 3: Reusing cached transcription')
        transcript_words = cached_transcription['words']
        logger.info(f'Cached transcription has {len(transcript_words)} words')
    else:
        logger.info(f'Step 3: Transcribing audio (model: {whisper_model})')
        transcript_words = transcribe_audio(normalized_path, foreign_lang, whisper_model)

    logger.info(f'Using {len(transcript_words)} words for alignment')

    if not transcript_words:
        logger.warning('No words transcribed from audio')

    # 4. Align transcript to user's foreign text
    logger.info('Step 4: Aligning transcript to text')
    sentence_timings = align_transcript_to_text(
        foreign_sentences,
        transcript_words
    )

    # 5. Slice audio into sentence clips
    logger.info('Step 5: Slicing audio')
    clips_dir = os.path.join(audio_dir, 'clips')
    os.makedirs(clips_dir, exist_ok=True)

    clip_paths = slice_audio(normalized_path, sentence_timings, clips_dir)

    # 6. Map translation sentences to foreign sentences
    logger.info('Step 6: Mapping translations')
    mapped_translations = map_translations(
        foreign_sentences,
        translation_sentences
    )

    # 7. Build sentence records
    sentences = []
    for idx, (foreign, timing, clip_path, translation) in enumerate(
        zip(foreign_sentences, sentence_timings, clip_paths, mapped_translations)
    ):
        sentences.append({
            'id': str(uuid.uuid4()),
            'idx': idx,
            'foreignText': foreign,
            'translationText': translation,
            'startMs': timing['start_ms'],
            'endMs': timing['end_ms'],
            'clipPath': clip_path,
            'confidence': timing.get('confidence', 0.0),
        })

    logger.info(f'Created {len(sentences)} sentence records')
    return sentences


def map_translations(
    foreign_sentences: List[str],
    translation_sentences: List[str]
) -> List[str]:
    """
    Map translation sentences to foreign sentences.
    If counts match, 1:1 mapping.
    If not, use simple proportional mapping.
    """
    n_foreign = len(foreign_sentences)
    n_trans = len(translation_sentences)

    if n_trans == 0:
        return [''] * n_foreign

    if n_foreign == n_trans:
        return translation_sentences

    # Proportional mapping when counts differ
    mapped = []
    for i in range(n_foreign):
        # Calculate proportional index
        trans_idx = int((i / n_foreign) * n_trans)
        trans_idx = min(trans_idx, n_trans - 1)
        mapped.append(translation_sentences[trans_idx])

    return mapped


if __name__ == '__main__':
    import sys
    logging.basicConfig(level=logging.INFO)

    if len(sys.argv) < 4:
        print("Usage: python pipeline.py <audio_path> <foreign_text> <translation_text>")
        sys.exit(1)

    audio_path = sys.argv[1]
    foreign_text = sys.argv[2]
    translation_text = sys.argv[3]

    sentences = process_lesson(
        lesson_id='test',
        foreign_text=foreign_text,
        translation_text=translation_text,
        audio_path=audio_path,
    )

    print("\nProcessed sentences:")
    for s in sentences:
        print(f"\n[{s['idx']}] {s['foreignText']}")
        print(f"    -> {s['translationText']}")
        print(f"    Time: {s['startMs']}ms - {s['endMs']}ms")
        print(f"    Confidence: {s['confidence']:.2f}")
        print(f"    Clip: {s['clipPath']}")
