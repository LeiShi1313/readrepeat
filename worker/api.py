"""
API communication utilities for the worker.

This module provides a unified interface for communicating with the web API,
including polling for jobs and reporting job status.
"""

import os
import logging
from typing import Optional, Dict, Any, List, Literal

import requests

logger = logging.getLogger(__name__)

# Configuration
API_BASE_URL = os.environ.get('API_BASE_URL', 'http://localhost:3000')


def poll_job() -> Optional[Dict[str, Any]]:
    """
    Poll the API for a pending job.

    Returns:
        Job dictionary if a job is available, None otherwise.
    """
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


def update_audio_file(
    audio_file_id: str,
    *,
    transcription: Optional[Dict[str, Any]] = None,
    duration_ms: Optional[int] = None,
    language: Optional[str] = None,
    status: Optional[str] = None,
    error: Optional[str] = None,
) -> bool:
    """
    Update an audio file record with transcription data.

    Args:
        audio_file_id: The audio file ID
        transcription: Word-level transcription data
        duration_ms: Audio duration in milliseconds
        language: Detected language
        status: New status (COMPLETED, FAILED, etc.)
        error: Error message if failed

    Returns:
        True if the update was successful, False otherwise.
    """
    payload: Dict[str, Any] = {
        'audioFileId': audio_file_id,
    }

    if transcription is not None:
        payload['transcription'] = transcription
    if duration_ms is not None:
        payload['durationMs'] = duration_ms
    if language is not None:
        payload['language'] = language
    if status is not None:
        payload['status'] = status
    if error is not None:
        payload['errorMessage'] = error

    try:
        response = requests.patch(
            f'{API_BASE_URL}/api/audio-files/{audio_file_id}',
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        logger.info(f'Updated audio file {audio_file_id}')
        return True
    except Exception as e:
        logger.error(f'Error updating audio file {audio_file_id}: {e}')
        return False


def report_job_status(
    job_id: str,
    status: Literal['COMPLETED', 'FAILED'],
    job_type: str,
    *,
    sentences: Optional[List[Dict[str, Any]]] = None,
    updated_sentences: Optional[List[Dict[str, Any]]] = None,
    error: Optional[str] = None,
    result: Optional[Dict[str, Any]] = None,
) -> bool:
    """
    Report job status to the API.

    This is the single source of truth for all job status updates.
    Always includes jobType to prevent 404 errors.

    Args:
        job_id: The job ID
        status: Either 'COMPLETED' or 'FAILED'
        job_type: The job type (e.g., 'PROCESS_LESSON', 'RESLICE_AUDIO')
        sentences: New sentences for PROCESS_LESSON/GENERATE_TTS_LESSON completion
        updated_sentences: Updated sentences for RESLICE_AUDIO completion
        error: Error message for failed jobs
        result: Result data for TRANSCRIBE_AUDIO jobs

    Returns:
        True if the status was reported successfully, False otherwise.
    """
    payload: Dict[str, Any] = {
        'jobId': job_id,
        'status': status,
        'jobType': job_type,
    }

    if sentences is not None:
        payload['sentences'] = sentences
    if updated_sentences is not None:
        payload['updatedSentences'] = updated_sentences
    if error is not None:
        payload['errorMessage'] = error
    if result is not None:
        payload['result'] = result

    try:
        response = requests.post(
            f'{API_BASE_URL}/api/jobs/poll',
            json=payload,
            timeout=30
        )
        response.raise_for_status()

        if status == 'COMPLETED':
            logger.info(f'Job {job_id} ({job_type}) completed successfully')
        else:
            logger.error(f'Job {job_id} ({job_type}) failed: {error}')

        return True
    except Exception as e:
        logger.error(f'Error reporting job status for {job_id}: {e}')
        return False
