"""
Abstract base class for TTS providers.
"""

from abc import ABC, abstractmethod
from typing import List, Optional


class TTSProvider(ABC):
    """Abstract base class for TTS providers."""

    @property
    @abstractmethod
    def id(self) -> str:
        """Unique provider identifier."""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable provider name."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if the provider is configured and available."""
        pass

    @abstractmethod
    def get_voices(self) -> List[str]:
        """Get list of available voices."""
        pass

    @abstractmethod
    def get_models(self) -> List[str]:
        """Get list of available models."""
        pass

    @abstractmethod
    def generate_tts(
        self,
        text: str,
        output_path: str,
        voice_name: str,
        model: Optional[str] = None,
    ) -> str:
        """Generate TTS audio for single speaker.

        Args:
            text: The text to convert to speech.
            output_path: Path where the audio file will be saved.
            voice_name: Name of the voice to use.
            model: Optional model to use (provider-specific).

        Returns:
            Path to the generated audio file.
        """
        pass

    @abstractmethod
    def generate_tts_dialog(
        self,
        text: str,
        output_path: str,
        voice1: str,
        voice2: str,
        model: Optional[str] = None,
    ) -> str:
        """Generate TTS audio for dialog with 2 speakers.

        Args:
            text: The dialog text with optional speaker tags.
            output_path: Path where the audio file will be saved.
            voice1: Voice for Speaker 1.
            voice2: Voice for Speaker 2.
            model: Optional model to use (provider-specific).

        Returns:
            Path to the generated audio file.
        """
        pass
