#!/usr/bin/env python3
"""
ReadRepeat Worker - Polls for jobs and processes audio lessons.

This is the main entry point for the worker. It polls the API for jobs
and dispatches them to the appropriate handlers.
"""

import os
import time
import logging
from typing import Dict, Any

from api import poll_job, report_job_status
from handlers import get_handler

# Configuration
POLL_INTERVAL = int(os.environ.get('POLL_INTERVAL', '5'))  # seconds

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def process_job(job: Dict[str, Any]) -> None:
    """
    Process a single job by dispatching to the appropriate handler.

    Args:
        job: Job dictionary from the API
    """
    job_id = job['id']
    job_type = job['type']

    logger.info(f'Processing job {job_id} (type: {job_type})')

    handler = get_handler(job_type)
    if not handler:
        logger.error(f'Unknown job type: {job_type}')
        report_job_status(
            job_id=job_id,
            status='FAILED',
            job_type=job_type,
            error=f'Unknown job type: {job_type}'
        )
        return

    handler.handle(job)


def main() -> None:
    """Main worker loop."""
    from api import API_BASE_URL

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
