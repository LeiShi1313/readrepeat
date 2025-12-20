"""
Base class for job handlers.

Each job type has its own handler that inherits from JobHandler.
This provides a consistent interface and ensures proper error handling.
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Any

from api import report_job_status

logger = logging.getLogger(__name__)


class JobHandler(ABC):
    """
    Abstract base class for job handlers.

    Subclasses must implement:
    - job_type: class attribute with the job type string
    - validate(): validates the job data
    - process(): processes the job and returns result data
    """

    job_type: str  # Must be set by subclass

    @abstractmethod
    def validate(self, job: Dict[str, Any]) -> None:
        """
        Validate job data before processing.

        Args:
            job: The job dictionary from the API

        Raises:
            ValueError: If validation fails
        """
        pass

    @abstractmethod
    def process(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process the job.

        Args:
            job: The job dictionary from the API

        Returns:
            Result data to include in the completion report
        """
        pass

    def complete(self, job_id: str, result: Dict[str, Any]) -> None:
        """Report job completion to the API."""
        # Pass known parameters directly, rest goes in result
        sentences = result.pop('sentences', None)
        updated_sentences = result.pop('updated_sentences', None)

        report_job_status(
            job_id=job_id,
            status='COMPLETED',
            job_type=self.job_type,
            sentences=sentences,
            updated_sentences=updated_sentences,
            result=result if result else None,
        )

    def fail(self, job_id: str, error: str) -> None:
        """Report job failure to the API."""
        report_job_status(
            job_id=job_id,
            status='FAILED',
            job_type=self.job_type,
            error=error
        )

    def handle(self, job: Dict[str, Any]) -> None:
        """
        Handle a job: validate, process, and report status.

        This is the main entry point called by the worker.
        """
        job_id = job['id']

        try:
            self.validate(job)
            result = self.process(job)
            self.complete(job_id, result)
        except Exception as e:
            logger.exception(f'Error processing {self.job_type} job {job_id}')
            self.fail(job_id, str(e))
