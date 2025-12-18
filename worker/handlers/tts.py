"""
Handler for GENERATE_TTS_LESSON jobs.

Generates audio using TTS, then processes the lesson.
"""

import os
import logging
from typing import Dict, Any

from handlers.base import JobHandler
from pipeline import process_lesson
from tts import generate_tts, generate_tts_dialog
from segment import strip_speaker_tags

logger = logging.getLogger(__name__)


class GenerateTtsLessonHandler(JobHandler):
    """Handler for generating TTS audio and processing lessons."""

    job_type = 'GENERATE_TTS_LESSON'

    def validate(self, job: Dict[str, Any]) -> None:
        """Validate that the job has all required lesson data."""
        lesson = job.get('lesson')
        if not lesson:
            raise ValueError('No lesson data in job')

        required_fields = ['id', 'foreignTextRaw', 'translationTextRaw']
        for field in required_fields:
            if field not in lesson:
                raise ValueError(f'Missing required field: {field}')

    def process(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """Generate TTS audio and process the lesson."""
        lesson = job['lesson']
        payload = job.get('payload', {})

        # Get TTS parameters
        voice_name = payload.get('voiceName', 'Zephyr')
        tts_model = payload.get('ttsModel', 'gemini-2.5-flash-preview-tts')
        speaker_mode = payload.get('speakerMode', 'article')
        voice2_name = payload.get('voice2Name', 'Kore')

        # Determine output directory and path
        data_dir = os.environ.get('DATA_DIR', '/app/data')
        lesson_dir = os.path.join(data_dir, 'uploads', 'lessons', lesson['id'])
        os.makedirs(lesson_dir, exist_ok=True)
        audio_path = os.path.join(lesson_dir, 'original.wav')

        # Get the text to process
        foreign_text = lesson['foreignTextRaw']
        translation_text = lesson['translationTextRaw']

        # Generate audio using TTS
        if speaker_mode == 'dialog':
            logger.info(f'Generating dialog TTS for lesson {lesson["id"]} with voice1={voice_name}, voice2={voice2_name}')
            generate_tts_dialog(
                text=foreign_text,
                output_path=audio_path,
                voice1=voice_name,
                voice2=voice2_name,
                model=tts_model,
            )
            # Strip speaker tags from text before processing
            foreign_text = strip_speaker_tags(foreign_text)
            translation_text = strip_speaker_tags(translation_text)
        else:
            logger.info(f'Generating TTS for lesson {lesson["id"]} with voice={voice_name}')
            generate_tts(
                text=foreign_text,
                output_path=audio_path,
                voice_name=voice_name,
                model=tts_model,
            )

        # Now process the lesson with the generated audio
        sentences = process_lesson(
            lesson_id=lesson['id'],
            foreign_text=foreign_text,
            translation_text=translation_text,
            audio_path=audio_path,
            foreign_lang=lesson.get('foreignLang', 'en'),
            translation_lang=lesson.get('translationLang', 'zh'),
            whisper_model=lesson.get('whisperModel', 'base'),
        )

        return {'sentences': sentences}
