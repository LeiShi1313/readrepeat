"""
Chatterbox TTS provider using OpenAI-compatible API.
"""

import os
import logging
from typing import List, Optional

import requests

from tts.types import TTSProvider
from audio import convert_to_wav
from segment import parse_dialog_lines

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "chatterbox"


class ChatterboxTTSProvider(TTSProvider):
    """TTS provider using Chatterbox API (OpenAI-compatible)."""

    def __init__(self):
        self._voices_cache: Optional[List[str]] = None

    @property
    def id(self) -> str:
        return "chatterbox"

    @property
    def name(self) -> str:
        return "Chatterbox"

    def _get_base_url(self) -> Optional[str]:
        """Get the Chatterbox API base URL from environment."""
        return os.environ.get("CHATTERBOX_API_URL")

    def is_available(self) -> bool:
        """Check if Chatterbox is configured and reachable."""
        base_url = self._get_base_url()
        if not base_url:
            return False
        try:
            response = requests.get(f"{base_url}/voices", timeout=5)
            return response.ok
        except Exception:
            return False

    def get_voices(self) -> List[str]:
        """Return default voice for Chatterbox (uses voice cloning with default sample)."""
        # Chatterbox uses voice cloning, so we just provide a default voice name
        return ["default"]

    def get_models(self) -> List[str]:
        """Chatterbox uses a single model."""
        return [DEFAULT_MODEL]

    def generate_tts(
        self,
        text: str,
        output_path: str,
        voice_name: str,
        model: Optional[str] = None,
    ) -> str:
        """Generate TTS using Chatterbox API."""
        base_url = self._get_base_url()
        if not base_url:
            raise ValueError("CHATTERBOX_API_URL environment variable not set")

        logger.info(f"Generating Chatterbox TTS with voice={voice_name}")

        response = requests.post(
            f"{base_url}/v1/audio/speech",
            json={
                "model": model or DEFAULT_MODEL,
                "voice": voice_name,
                "input": text,
                "response_format": "wav",
            },
            timeout=300,  # TTS can take a while for long text
        )
        response.raise_for_status()

        # Response is WAV audio directly
        with open(output_path, "wb") as f:
            f.write(response.content)

        logger.info(f"Chatterbox TTS audio saved to {output_path}")
        return output_path

    def generate_tts_dialog(
        self,
        text: str,
        output_path: str,
        voice1: str,
        voice2: str,
        model: Optional[str] = None,
    ) -> str:
        """Generate dialog audio with 2 speakers."""
        base_url = self._get_base_url()
        if not base_url:
            raise ValueError("CHATTERBOX_API_URL environment variable not set")

        logger.info(f"Generating Chatterbox dialog TTS with voice1={voice1}, voice2={voice2}")

        voices = {1: voice1, 2: voice2}
        dialog_lines = parse_dialog_lines(text)

        if not dialog_lines:
            raise Exception("No dialog lines found in text")

        logger.info(f"Found {len(dialog_lines)} dialog lines")

        all_audio = []
        sample_rate = 24000  # Default WAV sample rate

        for i, (speaker_num, line_text) in enumerate(dialog_lines):
            voice = voices.get(speaker_num, voice1)
            logger.info(f"Line {i+1}/{len(dialog_lines)}: Speaker {speaker_num} ({voice})")

            response = requests.post(
                f"{base_url}/v1/audio/speech",
                json={
                    "model": model or DEFAULT_MODEL,
                    "voice": voice,
                    "input": line_text,
                    "response_format": "wav",
                },
                timeout=120,
            )
            response.raise_for_status()

            # Parse WAV to extract raw audio (skip 44-byte header)
            wav_data = response.content
            if len(wav_data) > 44:
                raw_audio = wav_data[44:]
                all_audio.append(raw_audio)

            # Add silence gap between lines (0.3 seconds)
            if i < len(dialog_lines) - 1:
                silence_samples = int(sample_rate * 0.3)
                silence = b'\x00\x00' * silence_samples
                all_audio.append(silence)

        combined_audio = b"".join(all_audio)
        wav_data = convert_to_wav(combined_audio, f"audio/L16;rate={sample_rate}")

        with open(output_path, "wb") as f:
            f.write(wav_data)

        logger.info(f"Chatterbox dialog TTS saved to {output_path}")
        return output_path
