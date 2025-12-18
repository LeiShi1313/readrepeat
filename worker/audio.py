"""
Audio processing utilities.

This module provides audio processing functions with safer interfaces
that are harder to misuse.
"""

import os
import subprocess
import logging

logger = logging.getLogger(__name__)


def normalize_audio(input_path: str, output_dir: str) -> str:
    """
    Normalize audio to WAV format: mono, 16kHz.

    The output file is always named 'normalized.wav' to prevent callers
    from forgetting the file extension.

    Args:
        input_path: Path to source audio file
        output_dir: Directory where normalized.wav will be created

    Returns:
        Path to normalized audio file (output_dir/normalized.wav)

    Raises:
        subprocess.CalledProcessError: If ffmpeg fails
        FileNotFoundError: If input file doesn't exist
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f'Audio file not found: {input_path}')

    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, 'normalized.wav')

    cmd = [
        'ffmpeg', '-y',
        '-i', input_path,
        '-ar', '16000',      # 16kHz sample rate
        '-ac', '1',          # Mono
        '-c:a', 'pcm_s16le', # 16-bit PCM
        output_path
    ]

    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        logger.info(f'Normalized audio: {input_path} -> {output_path}')
        return output_path
    except subprocess.CalledProcessError as e:
        logger.error(f'Failed to normalize audio: {e.stderr}')
        raise
