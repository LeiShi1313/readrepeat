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


def report_job_status(
    job_id: str,
    status: Literal['COMPLETED', 'FAILED'],
    job_type: str,
    *,
    sentences: Optional[List[Dict[str, Any]]] = None,
    updated_sentences: Optional[List[Dict[str, Any]]] = None,
    error: Optional[str] = None,
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
