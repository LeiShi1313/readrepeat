"""
Job handler registry.

This module provides a registry of all available job handlers.
"""

from typing import Dict, Optional

from handlers.base import JobHandler

# Registry of job handlers by type
_handlers: Dict[str, JobHandler] = {}


def register_handler(handler: JobHandler) -> None:
    """Register a job handler."""
    _handlers[handler.job_type] = handler


def get_handler(job_type: str) -> Optional[JobHandler]:
    """Get a handler for the given job type."""
    return _handlers.get(job_type)


def get_all_handlers() -> Dict[str, JobHandler]:
    """Get all registered handlers."""
    return _handlers.copy()


# Import and register all handlers
def _register_all_handlers():
    """Import and register all handler classes."""
    from handlers.process_lesson import ProcessLessonHandler
    from handlers.reslice import ResliceAudioHandler
    from handlers.tts import GenerateTtsLessonHandler

    register_handler(ProcessLessonHandler())
    register_handler(ResliceAudioHandler())
    register_handler(GenerateTtsLessonHandler())


# Auto-register handlers on module import
_register_all_handlers()
