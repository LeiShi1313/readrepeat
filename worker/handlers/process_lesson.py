"""
Handler for PROCESS_LESSON jobs.

Processes an uploaded audio file with transcription and alignment.
"""

import logging
from typing import Dict, Any

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

        logger.info(f'Processing lesson {lesson["id"]}')

        sentences = process_lesson(
            lesson_id=lesson['id'],
            foreign_text=lesson['foreignTextRaw'],
            translation_text=lesson['translationTextRaw'],
            audio_path=lesson['audioOriginalPath'],
            foreign_lang=lesson.get('foreignLang', 'en'),
            translation_lang=lesson.get('translationLang', 'zh'),
            whisper_model=lesson.get('whisperModel', 'base'),
        )

        return {'sentences': sentences}
