"""
Handler for GENERATE_TTS_LESSON jobs.

Generates audio using TTS, then processes the lesson.
"""

import os
import logging
from typing import Dict, Any

from handlers.base import JobHandler
from pipeline import process_lesson
from tts import get_provider

logger = logging.getLogger(__name__)


def add_speaker_tags(text: str) -> str:
    """Add alternating Speaker 1/Speaker 2 tags to each line.

    Used to format plain text for Gemini's multi-speaker TTS API.
    The tags tell Gemini which voice to use for each line.
    """
    lines = text.strip().split('\n')
    result = []
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        speaker = 1 if i % 2 == 0 else 2
        result.append(f'Speaker {speaker}: {line}')
    return '\n'.join(result)


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
        provider_id = payload.get('provider', 'gemini')
        voice_name = payload.get('voiceName', 'Zephyr')
        tts_model = payload.get('ttsModel')
        speaker_mode = payload.get('speakerMode', 'article')
        voice2_name = payload.get('voice2Name', 'Kore')

        # Get the provider
        provider = get_provider(provider_id)
        if not provider:
            raise ValueError(f'Unknown TTS provider: {provider_id}')

        # Determine output directory and path
        data_dir = os.environ.get('DATA_DIR', '/app/data')
        lesson_dir = os.path.join(data_dir, 'uploads', 'lessons', lesson['id'])
        os.makedirs(lesson_dir, exist_ok=True)
        audio_path = os.path.join(lesson_dir, 'original.wav')

        # Get the text to process
        foreign_text = lesson['foreignTextRaw']
        translation_text = lesson['translationTextRaw']

        # Generate audio using TTS provider
        if speaker_mode == 'dialog':
            # Add speaker tags for Gemini's multi-speaker TTS API
            # The tags tell Gemini which voice to use, they're not read aloud
            tagged_text = add_speaker_tags(foreign_text)
            logger.info(f'Generating dialog TTS for lesson {lesson["id"]} with provider={provider_id}, voice1={voice_name}, voice2={voice2_name}')
            provider.generate_tts_dialog(
                text=tagged_text,
                output_path=audio_path,
                voice1=voice_name,
                voice2=voice2_name,
                model=tts_model,
            )
            # foreign_text and translation_text remain unchanged (no tags to strip)
        else:
            logger.info(f'Generating TTS for lesson {lesson["id"]} with provider={provider_id}, voice={voice_name}')
            provider.generate_tts(
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
