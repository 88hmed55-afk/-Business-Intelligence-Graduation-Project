import logging
import os
import sys
import tempfile
from logging.handlers import RotatingFileHandler

from app.core.config import get_settings

_configured = False

LOG_DIR = "logs"


def _resolve_log_dir() -> str:
    """Return a writable directory for log files.

    On serverless (read-only) filesystems the project-root ``logs``
    directory cannot be created, so fall back to the system temp dir.
    """
    try:
        os.makedirs(LOG_DIR, exist_ok=True)
        test_file = os.path.join(LOG_DIR, ".write_test")
        with open(test_file, "w") as fh:
            fh.write("ok")
        os.remove(test_file)
        return LOG_DIR
    except OSError:
        return tempfile.gettempdir()


def setup_logging() -> None:
    """Configure root logging once: console + rotating file handler."""
    global _configured
    if _configured:
        return

    settings = get_settings()

    log_dir = _resolve_log_dir()

    root = logging.getLogger()
    root.setLevel(settings.LOG_LEVEL.upper())

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root.addHandler(console_handler)

    file_handler = RotatingFileHandler(
        os.path.join(log_dir, "app.log"),
        maxBytes=5 * 1024 * 1024,
        backupCount=3,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)

    _configured = True
