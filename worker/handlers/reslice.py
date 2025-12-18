"""
Handler for RESLICE_AUDIO jobs.

Re-slices audio clips when sentence timings are manually adjusted.
"""

import os
import logging
from typing import Dict, Any

from handlers.base import JobHandler
from reslice import reslice_lesson

logger = logging.getLogger(__name__)


class ResliceAudioHandler(JobHandler):
    """Handler for re-slicing audio after timing adjustments."""

    job_type = 'RESLICE_AUDIO'

    def validate(self, job: Dict[str, Any]) -> None:
        """Validate that the job has lesson and sentence data."""
        lesson = job.get('lesson')
        if not lesson:
            raise ValueError('No lesson data in job')

        if 'audioOriginalPath' not in lesson:
            raise ValueError('Missing audioOriginalPath in lesson')

        sentences = job.get('sentences')
        if not sentences:
            raise ValueError('No sentence data for reslice job')

    def process(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """Reslice the audio and return updated sentences."""
        lesson = job['lesson']
        sentences = job['sentences']

        logger.info(f'Re-slicing lesson {lesson["id"]} with {len(sentences)} sentences')

        # Get output directory from audio path
        output_dir = os.path.dirname(lesson['audioOriginalPath'])

        updated_sentences = reslice_lesson(
            lesson_id=lesson['id'],
            audio_path=lesson['audioOriginalPath'],
            sentences=sentences,
            output_dir=output_dir,
        )

        return {'updated_sentences': updated_sentences}
