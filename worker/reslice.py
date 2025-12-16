"""
Re-slice audio clips using updated timing boundaries.
This is a lighter operation than full processing - no transcription or alignment needed.
"""

import os
import shutil
from typing import List, Dict, Any

import logging
logger = logging.getLogger(__name__)

from slice import slice_audio, normalize_audio


def reslice_lesson(
    lesson_id: str,
    audio_path: str,
    sentences: List[Dict[str, Any]],
    output_dir: str,
) -> List[Dict[str, Any]]:
    """
    Re-slice audio using updated timings from sentences.

    Args:
        lesson_id: Lesson ID
        audio_path: Path to original audio file
        sentences: List of sentence dicts with id, idx, startMs, endMs
        output_dir: Directory for lesson files (parent of clips/)

    Returns:
        List of updated sentence dicts with new clipPath values
    """
    logger.info(f'Re-slicing audio for lesson {lesson_id}')

    # Ensure normalized audio exists
    normalized_path = os.path.join(output_dir, 'normalized.wav')
    if not os.path.exists(normalized_path):
        logger.info('Normalizing audio...')
        normalize_audio(audio_path, normalized_path)

    # Delete existing clips directory
    clips_dir = os.path.join(output_dir, 'clips')
    if os.path.exists(clips_dir):
        logger.info('Removing old clips...')
        shutil.rmtree(clips_dir)

    # Prepare timings for slice_audio
    timings = []
    for sent in sentences:
        timings.append({
            'start_ms': sent['startMs'],
            'end_ms': sent['endMs'],
            'confidence': sent.get('confidence', 1.0),
        })

    # Slice audio with new timings
    logger.info(f'Creating {len(timings)} new clips...')
    clip_paths = slice_audio(normalized_path, timings, clips_dir)

    # Update sentences with new clip paths
    updated_sentences = []
    for i, sent in enumerate(sentences):
        updated_sentences.append({
            'id': sent['id'],
            'clipPath': clip_paths[i] if i < len(clip_paths) else None,
        })

    logger.info(f'Re-slicing complete for lesson {lesson_id}')
    return updated_sentences


if __name__ == '__main__':
    import sys
    logging.basicConfig(level=logging.INFO)

    # Test with dummy data
    if len(sys.argv) < 3:
        print("Usage: python reslice.py <audio_path> <output_dir>")
        sys.exit(1)

    test_sentences = [
        {'id': 'test-1', 'idx': 0, 'startMs': 0, 'endMs': 2000, 'confidence': 0.9},
        {'id': 'test-2', 'idx': 1, 'startMs': 2000, 'endMs': 4000, 'confidence': 0.8},
        {'id': 'test-3', 'idx': 2, 'startMs': 4000, 'endMs': 6000, 'confidence': 0.7},
    ]

    result = reslice_lesson(
        lesson_id='test',
        audio_path=sys.argv[1],
        sentences=test_sentences,
        output_dir=sys.argv[2],
    )

    print('Result:')
    for sent in result:
        print(f'  {sent}')
