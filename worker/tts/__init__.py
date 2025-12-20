"""
TTS provider registry and factory.

This module provides a unified interface for accessing different TTS providers.
"""

from typing import Dict, List, Optional

from tts.types import TTSProvider
from tts.providers.gemini import GeminiTTSProvider
from tts.providers.chatterbox import ChatterboxTTSProvider

# Provider registry
_providers: Dict[str, TTSProvider] = {}


def _initialize_providers():
    """Initialize all available providers."""
    global _providers
    _providers = {
        "gemini": GeminiTTSProvider(),
        "chatterbox": ChatterboxTTSProvider(),
    }


def get_provider(provider_id: str) -> Optional[TTSProvider]:
    """Get a provider by ID.

    Args:
        provider_id: The provider identifier (e.g., 'gemini', 'chatterbox').

    Returns:
        The provider instance, or None if not found.
    """
    if not _providers:
        _initialize_providers()
    return _providers.get(provider_id)


def get_available_providers() -> List[TTSProvider]:
    """Get all available (configured) providers.

    Returns:
        List of providers that are currently available.
    """
    if not _providers:
        _initialize_providers()
    return [p for p in _providers.values() if p.is_available()]


def get_default_provider() -> Optional[TTSProvider]:
    """Get the first available provider.

    Returns:
        The first available provider, or None if no providers are available.
    """
    available = get_available_providers()
    return available[0] if available else None


# Backward compatibility functions
def generate_tts(
    text: str,
    output_path: str,
    voice_name: str = "Zephyr",
    model: str = "gemini-2.5-flash-preview-tts",
    provider_id: str = "gemini",
) -> str:
    """Generate TTS audio.

    This function provides backward compatibility with the old API.

    Args:
        text: The text to convert to speech.
        output_path: Path where the audio file will be saved.
        voice_name: Name of the voice to use.
        model: TTS model to use.
        provider_id: Provider to use (default: 'gemini').

    Returns:
        Path to the generated audio file.
    """
    provider = get_provider(provider_id)
    if not provider:
        raise ValueError(f"Unknown provider: {provider_id}")
    return provider.generate_tts(text, output_path, voice_name, model)


def generate_tts_dialog(
    text: str,
    output_path: str,
    voice1: str = "Zephyr",
    voice2: str = "Kore",
    model: str = "gemini-2.5-flash-preview-tts",
    provider_id: str = "gemini",
) -> str:
    """Generate dialog TTS audio with 2 speakers.

    This function provides backward compatibility with the old API.

    Args:
        text: The dialog text with optional speaker tags.
        output_path: Path where the audio file will be saved.
        voice1: Voice for Speaker 1.
        voice2: Voice for Speaker 2.
        model: TTS model to use.
        provider_id: Provider to use (default: 'gemini').

    Returns:
        Path to the generated audio file.
    """
    provider = get_provider(provider_id)
    if not provider:
        raise ValueError(f"Unknown provider: {provider_id}")
    return provider.generate_tts_dialog(text, output_path, voice1, voice2, model)


def is_available() -> bool:
    """Check if any TTS provider is available.

    Returns:
        True if at least one provider is available.
    """
    return len(get_available_providers()) > 0


# Re-export commonly used items
__all__ = [
    'TTSProvider',
    'get_provider',
    'get_available_providers',
    'get_default_provider',
    'generate_tts',
    'generate_tts_dialog',
    'is_available',
]
