#!/usr/bin/env python3
"""
Text-to-Speech generation using Google Gemini API
"""

import os
import struct
import logging
from typing import Optional

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# Available voices for Gemini TTS
AVAILABLE_VOICES = [
    "Zephyr",   # Bright
    "Puck",     # Upbeat
    "Charon",   # Informative
    "Kore",     # Firm
    "Fenrir",   # Excitable
    "Leda",     # Youthful
    "Orus",     # Firm
    "Aoede",    # Breezy
]

# Available TTS models
AVAILABLE_MODELS = [
    "gemini-2.5-flash-preview-tts",
    "gemini-2.5-pro-preview-tts",
]

DEFAULT_VOICE = "Zephyr"
DEFAULT_MODEL = "gemini-2.5-flash-preview-tts"


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


def generate_tts(
    text: str,
    output_path: str,
    voice_name: str = DEFAULT_VOICE,
    model: str = DEFAULT_MODEL,
) -> str:
    """Generate audio from text using Google Gemini TTS API.

    Args:
        text: The text to convert to speech.
        output_path: Path where the WAV file will be saved.
        voice_name: Name of the voice to use (default: Zephyr).
        model: TTS model to use (default: gemini-2.5-flash-preview-tts).

    Returns:
        Path to the generated audio file.

    Raises:
        ValueError: If GEMINI_API_KEY is not set.
        Exception: If TTS generation fails.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")

    logger.info(f"Generating TTS with voice={voice_name}, model={model}")

    client = genai.Client(api_key=api_key)

    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=text)],
        ),
    ]

    generate_content_config = types.GenerateContentConfig(
        temperature=1,
        response_modalities=["audio"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name=voice_name
                )
            )
        ),
    )

    # Collect all audio chunks
    audio_chunks = []
    mime_type = None

    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_content_config,
    ):
        if (
            chunk.candidates is None
            or chunk.candidates[0].content is None
            or chunk.candidates[0].content.parts is None
        ):
            continue

        part = chunk.candidates[0].content.parts[0]
        if part.inline_data and part.inline_data.data:
            audio_chunks.append(part.inline_data.data)
            if mime_type is None:
                mime_type = part.inline_data.mime_type

    if not audio_chunks:
        raise Exception("No audio data received from TTS API")

    # Combine all chunks
    combined_audio = b"".join(audio_chunks)

    # Convert to WAV format
    wav_data = convert_to_wav(combined_audio, mime_type or "audio/L16;rate=24000")

    # Save to file
    with open(output_path, "wb") as f:
        f.write(wav_data)

    logger.info(f"TTS audio saved to {output_path}")
    return output_path


def _generate_tts_single_line(
    client: genai.Client,
    text: str,
    voice_name: str,
    model: str,
) -> tuple[bytes, str]:
    """Generate TTS for a single line of text.

    Returns:
        Tuple of (audio_data, mime_type)
    """
    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=text)],
        ),
    ]

    generate_content_config = types.GenerateContentConfig(
        temperature=1,
        response_modalities=["audio"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name=voice_name
                )
            )
        ),
    )

    audio_chunks = []
    mime_type = None

    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_content_config,
    ):
        if (
            chunk.candidates is None
            or chunk.candidates[0].content is None
            or chunk.candidates[0].content.parts is None
        ):
            continue

        part = chunk.candidates[0].content.parts[0]
        if part.inline_data and part.inline_data.data:
            audio_chunks.append(part.inline_data.data)
            if mime_type is None:
                mime_type = part.inline_data.mime_type

    if not audio_chunks:
        raise Exception(f"No audio data received for line: {text[:50]}...")

    return b"".join(audio_chunks), mime_type or "audio/L16;rate=24000"


def _parse_dialog_lines(text: str) -> list[tuple[int, str]]:
    """Parse text into dialog lines with speaker identification.

    Args:
        text: Text with possible "Speaker 1:" / "Speaker 2:" tags

    Returns:
        List of (speaker_num, clean_text) tuples.
        speaker_num is 1 or 2.
    """
    import re

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


def generate_tts_dialog(
    text: str,
    output_path: str,
    voice1: str = "Zephyr",
    voice2: str = "Kore",
    model: str = DEFAULT_MODEL,
) -> str:
    """Generate dialog audio with 2 speakers.

    Parses text for "Speaker 1:" and "Speaker 2:" tags.
    Generates audio for each line with appropriate voice.
    Concatenates all audio chunks with small silence gaps.

    Args:
        text: The dialog text with optional speaker tags.
        output_path: Path where the WAV file will be saved.
        voice1: Voice for Speaker 1 (default: Zephyr).
        voice2: Voice for Speaker 2 (default: Kore).
        model: TTS model to use.

    Returns:
        Path to the generated audio file.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")

    logger.info(f"Generating dialog TTS with voice1={voice1}, voice2={voice2}, model={model}")

    client = genai.Client(api_key=api_key)
    voices = {1: voice1, 2: voice2}

    # Parse dialog lines
    dialog_lines = _parse_dialog_lines(text)
    if not dialog_lines:
        raise Exception("No dialog lines found in text")

    logger.info(f"Found {len(dialog_lines)} dialog lines")

    # Generate audio for each line
    all_audio = []
    sample_rate = 24000  # Default, will be updated from actual response

    for i, (speaker_num, line_text) in enumerate(dialog_lines):
        voice = voices.get(speaker_num, voice1)
        logger.info(f"Line {i+1}/{len(dialog_lines)}: Speaker {speaker_num} ({voice}): {line_text[:30]}...")

        audio_data, mime_type = _generate_tts_single_line(client, line_text, voice, model)

        # Update sample rate from first response
        if i == 0:
            params = parse_audio_mime_type(mime_type)
            sample_rate = params["rate"]

        all_audio.append(audio_data)

        # Add small silence gap between lines (0.3 seconds)
        if i < len(dialog_lines) - 1:
            silence_samples = int(sample_rate * 0.3)
            silence = b'\x00\x00' * silence_samples  # 16-bit silence
            all_audio.append(silence)

    # Combine all audio
    combined_audio = b"".join(all_audio)

    # Convert to WAV
    wav_data = convert_to_wav(combined_audio, f"audio/L16;rate={sample_rate}")

    # Save to file
    with open(output_path, "wb") as f:
        f.write(wav_data)

    logger.info(f"Dialog TTS audio saved to {output_path}")
    return output_path


def is_available() -> bool:
    """Check if TTS is available (API key is set)."""
    api_key = os.environ.get("GEMINI_API_KEY")
    return bool(api_key and api_key.strip())
