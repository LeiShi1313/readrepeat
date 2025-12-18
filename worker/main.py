#!/usr/bin/env python3
"""
ReadRepeat Worker - Polls for jobs and processes audio lessons
"""

import os
import sys
import time
import json
import logging
import requests
from typing import Optional, Dict, Any

from pipeline import process_lesson
from reslice import reslice_lesson
from tts import generate_tts, generate_tts_dialog
from segment import strip_speaker_tags

# Configuration
API_BASE_URL = os.environ.get('API_BASE_URL', 'http://localhost:3000')
POLL_INTERVAL = int(os.environ.get('POLL_INTERVAL', '5'))  # seconds

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def poll_job() -> Optional[Dict[str, Any]]:
    """Poll API for pending jobs"""
    try:
        response = requests.get(f'{API_BASE_URL}/api/jobs/poll', timeout=30)
        response.raise_for_status()
        data = response.json()
        return data.get('job')
    except requests.exceptions.ConnectionError:
        logger.debug('Connection refused, Next.js server may not be running')
        return None
    except Exception as e:
        logger.error(f'Error polling for jobs: {e}')
        return None


def complete_job(job_id: str, sentences: list):
    """Mark job as completed with sentence data"""
    try:
        response = requests.post(
            f'{API_BASE_URL}/api/jobs/poll',
            json={
                'jobId': job_id,
                'status': 'COMPLETED',
                'sentences': sentences,
            },
            timeout=30
        )
        response.raise_for_status()
        logger.info(f'Job {job_id} completed successfully')
    except Exception as e:
        logger.error(f'Error completing job {job_id}: {e}')


def fail_job(job_id: str, error_message: str):
    """Mark job as failed"""
    try:
        response = requests.post(
            f'{API_BASE_URL}/api/jobs/poll',
            json={
                'jobId': job_id,
                'status': 'FAILED',
                'errorMessage': error_message,
            },
            timeout=30
        )
        response.raise_for_status()
        logger.error(f'Job {job_id} failed: {error_message}')
    except Exception as e:
        logger.error(f'Error failing job {job_id}: {e}')


def complete_reslice_job(job_id: str, updated_sentences: list):
    """Mark reslice job as completed with updated clip paths"""
    try:
        response = requests.post(
            f'{API_BASE_URL}/api/jobs/poll',
            json={
                'jobId': job_id,
                'status': 'COMPLETED',
                'jobType': 'RESLICE_AUDIO',
                'updatedSentences': updated_sentences,
            },
            timeout=30
        )
        response.raise_for_status()
        logger.info(f'Reslice job {job_id} completed successfully')
    except Exception as e:
        logger.error(f'Error completing reslice job {job_id}: {e}')


def process_job(job: Dict[str, Any]):
    """Process a single job"""
    job_id = job['id']
    job_type = job['type']
    lesson = job.get('lesson')

    logger.info(f'Processing job {job_id} (type: {job_type})')

    if not lesson:
        fail_job(job_id, 'No lesson data in job')
        return

    if job_type == 'PROCESS_LESSON':
        try:
            sentences = process_lesson(
                lesson_id=lesson['id'],
                foreign_text=lesson['foreignTextRaw'],
                translation_text=lesson['translationTextRaw'],
                audio_path=lesson['audioOriginalPath'],
                foreign_lang=lesson.get('foreignLang', 'en'),
                translation_lang=lesson.get('translationLang', 'zh'),
                whisper_model=lesson.get('whisperModel', 'base'),
            )
            complete_job(job_id, sentences)
        except Exception as e:
            logger.exception(f'Error processing lesson {lesson["id"]}')
            fail_job(job_id, str(e))

    elif job_type == 'RESLICE_AUDIO':
        sentences = job.get('sentences', [])
        if not sentences:
            fail_job(job_id, 'No sentence data for reslice job')
            return

        try:
            # Get output directory from audio path
            output_dir = os.path.dirname(lesson['audioOriginalPath'])

            updated_sentences = reslice_lesson(
                lesson_id=lesson['id'],
                audio_path=lesson['audioOriginalPath'],
                sentences=sentences,
                output_dir=output_dir,
            )
            complete_reslice_job(job_id, updated_sentences)
        except Exception as e:
            logger.exception(f'Error re-slicing lesson {lesson["id"]}')
            fail_job(job_id, str(e))

    elif job_type == 'GENERATE_TTS_LESSON':
        # Get TTS parameters from job payload
        payload = job.get('payload', {})
        voice_name = payload.get('voiceName', 'Zephyr')
        tts_model = payload.get('ttsModel', 'gemini-2.5-flash-preview-tts')
        speaker_mode = payload.get('speakerMode', 'article')
        voice2_name = payload.get('voice2Name', 'Kore')

        try:
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
            complete_job(job_id, sentences)
        except Exception as e:
            logger.exception(f'Error generating TTS for lesson {lesson["id"]}')
            fail_job(job_id, str(e))

    else:
        fail_job(job_id, f'Unknown job type: {job_type}')


def main():
    """Main worker loop"""
    logger.info(f'Worker started, polling {API_BASE_URL} every {POLL_INTERVAL}s')
    logger.info('Press Ctrl+C to stop')

    while True:
        try:
            job = poll_job()

            if job:
                process_job(job)
            else:
                time.sleep(POLL_INTERVAL)
        except KeyboardInterrupt:
            logger.info('Worker stopped by user')
            break
        except Exception as e:
            logger.exception('Unexpected error in main loop')
            time.sleep(POLL_INTERVAL)


if __name__ == '__main__':
    main()
