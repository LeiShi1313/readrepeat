"""
Slice audio into sentence clips using ffmpeg
"""

import os
import subprocess
from typing import List, Dict, Any

import logging
logger = logging.getLogger(__name__)


def slice_audio(
    audio_path: str,
    timings: List[Dict[str, Any]],
    output_dir: str,
    padding_ms: int = 200
) -> List[str]:
    """
    Slice audio file into clips based on timings.

    Args:
        audio_path: Path to source audio file
        timings: List of dicts with start_ms and end_ms
        output_dir: Directory to save clips
        padding_ms: Padding to add at start/end of clips

    Returns:
        List of clip file paths
    """
    os.makedirs(output_dir, exist_ok=True)

    clip_paths = []

    for idx, timing in enumerate(timings):
        start_ms = max(0, timing['start_ms'] - padding_ms)
        end_ms = timing['end_ms'] + padding_ms
        duration_ms = end_ms - start_ms

        clip_path = os.path.join(output_dir, f'{idx}.wav')

        if duration_ms <= 0 or timing['confidence'] == 0:
            # Create silent placeholder for failed alignments
            clip_path = create_silent_clip(output_dir, idx, 1000)
            logger.warning(f'Created silent placeholder for sentence {idx}')
        else:
            # Use ffmpeg to extract clip
            start_sec = start_ms / 1000.0
            duration_sec = duration_ms / 1000.0

            cmd = [
                'ffmpeg', '-y',
                '-ss', str(start_sec),
                '-i', audio_path,
                '-t', str(duration_sec),
                '-c:a', 'pcm_s16le',
                '-ar', '16000',
                '-ac', '1',
                clip_path
            ]

            try:
                result = subprocess.run(
                    cmd,
                    check=True,
                    capture_output=True,
                    text=True
                )
                logger.debug(f'Created clip {idx}: {start_ms}ms - {end_ms}ms')
            except subprocess.CalledProcessError as e:
                logger.error(f'Failed to create clip {idx}: {e.stderr}')
                clip_path = create_silent_clip(output_dir, idx, 1000)

        clip_paths.append(clip_path)

    return clip_paths


def create_silent_clip(output_dir: str, idx: int, duration_ms: int) -> str:
    """Create a silent audio clip as placeholder"""
    clip_path = os.path.join(output_dir, f'{idx}.wav')
    duration_sec = duration_ms / 1000.0

    cmd = [
        'ffmpeg', '-y',
        '-f', 'lavfi',
        '-i', f'anullsrc=r=16000:cl=mono',
        '-t', str(duration_sec),
        '-c:a', 'pcm_s16le',
        clip_path
    ]

    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        logger.error(f'Failed to create silent clip: {e}')
        # Create an empty file as last resort
        with open(clip_path, 'wb') as f:
            pass

    return clip_path


def normalize_audio(audio_path: str, output_path: str) -> str:
    """
    Normalize audio to WAV format: mono, 16kHz

    Args:
        audio_path: Path to source audio
        output_path: Path for normalized output

    Returns:
        Path to normalized audio
    """
    cmd = [
        'ffmpeg', '-y',
        '-i', audio_path,
        '-ar', '16000',      # 16kHz sample rate
        '-ac', '1',          # Mono
        '-c:a', 'pcm_s16le', # 16-bit PCM
        output_path
    ]

    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        logger.info(f'Normalized audio to {output_path}')
        return output_path
    except subprocess.CalledProcessError as e:
        logger.error(f'Failed to normalize audio: {e.stderr}')
        raise


if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python slice.py <audio_path>")
        sys.exit(1)

    logging.basicConfig(level=logging.INFO)

    # Test with dummy timings
    timings = [
        {'start_ms': 0, 'end_ms': 2000, 'confidence': 0.9},
        {'start_ms': 2000, 'end_ms': 4000, 'confidence': 0.8},
        {'start_ms': 4000, 'end_ms': 6000, 'confidence': 0.7},
    ]

    clips = slice_audio(sys.argv[1], timings, '/tmp/clips')
    print(f'Created {len(clips)} clips:')
    for clip in clips:
        print(f'  {clip}')
