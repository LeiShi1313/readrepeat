"""
Gemini TTS provider using Google Gemini API.
"""

import os
import logging
from typing import List, Optional

from google import genai
from google.genai import types

from tts.types import TTSProvider
from audio import convert_to_wav

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


class GeminiTTSProvider(TTSProvider):
    """TTS provider using Google Gemini API."""

    @property
    def id(self) -> str:
        return "gemini"

    @property
    def name(self) -> str:
        return "Google Gemini"

    def is_available(self) -> bool:
        """Check if Gemini API key is configured."""
        api_key = os.environ.get("GEMINI_API_KEY")
        return bool(api_key and api_key.strip())

    def get_voices(self) -> List[str]:
        """Return available Gemini voices."""
        return AVAILABLE_VOICES.copy()

    def get_models(self) -> List[str]:
        """Return available Gemini TTS models."""
        return AVAILABLE_MODELS.copy()

    def _get_client(self) -> genai.Client:
        """Get authenticated Gemini client."""
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        return genai.Client(api_key=api_key)

    def generate_tts(
        self,
        text: str,
        output_path: str,
        voice_name: str = DEFAULT_VOICE,
        model: Optional[str] = None,
    ) -> str:
        """Generate audio from text using Google Gemini TTS API."""
        model = model or DEFAULT_MODEL
        logger.info(f"Generating Gemini TTS with voice={voice_name}, model={model}")

        client = self._get_client()

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

        logger.info(f"Gemini TTS audio saved to {output_path}")
        return output_path

    def generate_tts_dialog(
        self,
        text: str,
        output_path: str,
        voice1: str = "Zephyr",
        voice2: str = "Kore",
        model: Optional[str] = None,
    ) -> str:
        """Generate dialog audio with 2 speakers in one pass.

        Uses Gemini's MultiSpeakerVoiceConfig for natural multi-speaker dialog.
        Text should contain "Speaker 1:" and "Speaker 2:" tags.
        """
        model = model or DEFAULT_MODEL
        logger.info(f"Generating Gemini dialog TTS with voice1={voice1}, voice2={voice2}, model={model}")

        client = self._get_client()

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
                multi_speaker_voice_config=types.MultiSpeakerVoiceConfig(
                    speaker_voice_configs=[
                        types.SpeakerVoiceConfig(
                            speaker="Speaker 1",
                            voice_config=types.VoiceConfig(
                                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                    voice_name=voice1
                                )
                            ),
                        ),
                        types.SpeakerVoiceConfig(
                            speaker="Speaker 2",
                            voice_config=types.VoiceConfig(
                                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                    voice_name=voice2
                                )
                            ),
                        ),
                    ]
                ),
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

        logger.info(f"Gemini dialog TTS audio saved to {output_path}")
        return output_path
