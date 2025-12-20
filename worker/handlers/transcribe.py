"""
Handler for TRANSCRIBE_AUDIO jobs.

Transcribes audio to text using Whisper and stores word-level timings.
"""

import os
import logging
from typing import Dict, Any

from handlers.base import JobHandler
from audio import normalize_audio
from transcribe import transcribe_audio_with_info
from api import update_audio_file

logger = logging.getLogger(__name__)


class TranscribeAudioHandler(JobHandler):
    """Handler for standalone audio transcription."""

    job_type = 'TRANSCRIBE_AUDIO'

    def validate(self, job: Dict[str, Any]) -> None:
        """Validate that the job has required payload data."""
        payload = job.get('payload')
        if not payload:
            raise ValueError('No payload in job')

        if 'audioFileId' not in payload:
            raise ValueError('Missing audioFileId in payload')

    def process(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """Transcribe audio and store word timings."""
        payload = job['payload']
        audio_file_id = payload['audioFileId']
        audio_file = job.get('audioFile')

        if not audio_file:
            raise ValueError('No audio file data in job')

        audio_path = audio_file['filePath']
        language = payload.get('language')
        whisper_model = payload.get('whisperModel', 'base')

        logger.info(f'Transcribing audio: {audio_path}')
        logger.info(f'Language: {language or "auto-detect"}, Model: {whisper_model}')

        # Get the directory for normalized audio
        audio_dir = os.path.dirname(audio_path)

        # Normalize audio (convert to 16kHz mono WAV)
        logger.info('Normalizing audio...')
        normalized_path = normalize_audio(audio_path, audio_dir)

        # Transcribe with Whisper
        logger.info('Running Whisper transcription...')
        words, info = transcribe_audio_with_info(
            normalized_path,
            language=language,
            model_size=whisper_model
        )

        logger.info(f'Transcription complete: {len(words)} words, language: {info["language"]}')

        # Build transcription data with word timings
        transcription = {
            'words': words,  # Each word has: word, start, end, probability
            'language': info['language'],
            'languageProbability': info['languageProbability'],
            'duration': info['duration'],
        }

        # Update audio_files table with transcription
        update_audio_file(
            audio_file_id=audio_file_id,
            transcription=transcription,
            duration_ms=int(info['duration'] * 1000),
            language=info['language'],
        )

        # Return result for job completion
        return {
            'audioFileId': audio_file_id,
        }
