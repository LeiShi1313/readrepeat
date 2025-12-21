"""
Audio processing utilities.

This module provides audio processing functions with safer interfaces
that are harder to misuse.
"""

import os
import struct
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


def parse_audio_mime_type(mime_type: str) -> dict:
    """Parse bits per sample and rate from an audio MIME type string.

    Args:
        mime_type: The audio MIME type string (e.g., "audio/L16;rate=24000").

    Returns:
        A dictionary with "bits_per_sample" and "rate" keys.
    """
    bits_per_sample = 16
    rate = 24000

    parts = mime_type.split(";")
    for param in parts:
        param = param.strip()
        if param.lower().startswith("rate="):
            try:
                rate_str = param.split("=", 1)[1]
                rate = int(rate_str)
            except (ValueError, IndexError):
                pass
        elif param.startswith("audio/L"):
            try:
                bits_per_sample = int(param.split("L", 1)[1])
            except (ValueError, IndexError):
                pass

    return {"bits_per_sample": bits_per_sample, "rate": rate}


def convert_to_wav(audio_data: bytes, mime_type: str) -> bytes:
    """Convert raw audio data to WAV format with proper header.

    Args:
        audio_data: The raw audio data as bytes.
        mime_type: MIME type of the audio data.

    Returns:
        WAV file bytes with proper header.
    """
    parameters = parse_audio_mime_type(mime_type)
    bits_per_sample = parameters["bits_per_sample"]
    sample_rate = parameters["rate"]
    num_channels = 1
    data_size = len(audio_data)
    bytes_per_sample = bits_per_sample // 8
    block_align = num_channels * bytes_per_sample
    byte_rate = sample_rate * block_align
    chunk_size = 36 + data_size

    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",          # ChunkID
        chunk_size,       # ChunkSize
        b"WAVE",          # Format
        b"fmt ",          # Subchunk1ID
        16,               # Subchunk1Size (16 for PCM)
        1,                # AudioFormat (1 for PCM)
        num_channels,     # NumChannels
        sample_rate,      # SampleRate
        byte_rate,        # ByteRate
        block_align,      # BlockAlign
        bits_per_sample,  # BitsPerSample
        b"data",          # Subchunk2ID
        data_size         # Subchunk2Size
    )
    return header + audio_data
