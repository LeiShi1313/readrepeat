"""
Handler for PROCESS_LESSON jobs.

Processes an uploaded audio file with transcription and alignment.
"""

import json
import logging
from typing import Dict, Any, Optional

from handlers.base import JobHandler
from pipeline import process_lesson

logger = logging.getLogger(__name__)


class ProcessLessonHandler(JobHandler):
    """Handler for processing new lessons with audio."""

    job_type = 'PROCESS_LESSON'

    def validate(self, job: Dict[str, Any]) -> None:
        """Validate that the job has all required lesson data."""
        lesson = job.get('lesson')
        if not lesson:
            raise ValueError('No lesson data in job')

        required_fields = ['id', 'foreignTextRaw', 'translationTextRaw', 'audioOriginalPath']
        for field in required_fields:
            if field not in lesson:
                raise ValueError(f'Missing required field: {field}')

    def process(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """Process the lesson and return sentences."""
        lesson = job['lesson']
        audio_file = job.get('audioFile')

        logger.info(f'Processing lesson {lesson["id"]}')

        # Check for cached transcription from audio_files
        cached_transcription: Optional[Dict[str, Any]] = None
        if audio_file and audio_file.get('transcriptionJson'):
            try:
                cached_transcription = json.loads(audio_file['transcriptionJson'])
                logger.info(f'Found cached transcription with {len(cached_transcription.get("words", []))} words')
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f'Failed to parse cached transcription: {e}')

        sentences = process_lesson(
            lesson_id=lesson['id'],
            foreign_text=lesson['foreignTextRaw'],
            translation_text=lesson['translationTextRaw'],
            audio_path=lesson['audioOriginalPath'],
            foreign_lang=lesson.get('foreignLang', 'en'),
            translation_lang=lesson.get('translationLang', 'zh'),
            whisper_model=lesson.get('whisperModel', 'base'),
            cached_transcription=cached_transcription,
        )

        return {'sentences': sentences}
