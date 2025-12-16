"""
Audio transcription using faster-whisper
"""

import os
from typing import List, Dict, Any, Optional

import logging
logger = logging.getLogger(__name__)

# Model cache - stores models by size to allow switching
_models: Dict[str, Any] = {}

# Device configuration from environment
DEVICE = os.environ.get('WHISPER_DEVICE', 'cpu')  # 'cpu', 'cuda', or 'auto'
COMPUTE_TYPE = os.environ.get('WHISPER_COMPUTE_TYPE', 'int8')  # 'int8', 'float16', 'float32'
DEFAULT_MODEL_SIZE = os.environ.get('WHISPER_MODEL', 'base')  # 'tiny', 'base', 'small', 'medium', 'large-v3'

# Model storage directory - persisted via volume mount
MODEL_CACHE_DIR = os.environ.get('WHISPER_MODEL_DIR', '/app/data/models')


def get_model(model_size: str = None):
    """Get or create Whisper model (cached per model size)"""
    global _models

    if model_size is None:
        model_size = DEFAULT_MODEL_SIZE

    if model_size not in _models:
        from faster_whisper import WhisperModel

        device = DEVICE
        compute_type = COMPUTE_TYPE

        # Auto-detect device
        if device == 'auto':
            try:
                import torch
                if torch.cuda.is_available():
                    device = 'cuda'
                    compute_type = 'float16'
                    logger.info('CUDA detected, using GPU acceleration')
                else:
                    device = 'cpu'
                    compute_type = 'int8'
                    logger.info('No CUDA detected, using CPU')
            except ImportError:
                device = 'cpu'
                compute_type = 'int8'
                logger.info('PyTorch not available, using CPU')

        # Ensure model cache directory exists
        os.makedirs(MODEL_CACHE_DIR, exist_ok=True)

        logger.info(f'Loading Whisper model: {model_size} (device={device}, compute_type={compute_type}, cache_dir={MODEL_CACHE_DIR})')

        _models[model_size] = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
            download_root=MODEL_CACHE_DIR
        )

    return _models[model_size]


def transcribe_audio(
    audio_path: str,
    language: Optional[str] = None,
    model_size: str = 'base'
) -> List[Dict[str, Any]]:
    """
    Transcribe audio with word-level timestamps.

    Args:
        audio_path: Path to normalized WAV file
        language: Language code for transcription (None for auto-detect)
        model_size: Whisper model size (tiny, base, small, medium, large-v3)

    Returns:
        List of word dictionaries with:
        - word: str
        - start: float (seconds)
        - end: float (seconds)
        - probability: float
    """
    model = get_model(model_size)

    # Prepare transcribe arguments
    transcribe_args = {
        'word_timestamps': True,
        'vad_filter': False,  # Disabled - VAD can cause timestamp shifts
    }

    if language:
        transcribe_args['language'] = language

    segments, info = model.transcribe(audio_path, **transcribe_args)

    logger.info(f'Detected language: {info.language} (probability: {info.language_probability:.2f})')

    words = []

    # Collect all words with timestamps
    # Need to iterate through segments (it's a generator)
    for segment in segments:
        if segment.words:
            for word in segment.words:
                words.append({
                    'word': word.word.strip(),
                    'start': word.start,
                    'end': word.end,
                    'probability': word.probability,
                })

    logger.info(f'Transcribed {len(words)} words')
    return words


if __name__ == '__main__':
    import sys
    logging.basicConfig(level=logging.INFO)

    if len(sys.argv) > 1:
        audio_file = sys.argv[1]
        lang = sys.argv[2] if len(sys.argv) > 2 else None
        words = transcribe_audio(audio_file, lang)
        for w in words[:20]:
            print(f"{w['start']:.2f}-{w['end']:.2f}: {w['word']}")
