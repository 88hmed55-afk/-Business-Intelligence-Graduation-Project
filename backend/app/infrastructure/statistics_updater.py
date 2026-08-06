import logging
import threading

from app.application.services.statistics_service import StatisticsService
from app.core.constants import STATISTICS_REFRESH_INTERVAL_SECONDS
from app.core.database import SessionLocal

logger = logging.getLogger("app.statistics_updater")


class StatisticsUpdater:
    """Background daemon that keeps daily statistics snapshots fresh."""

    def __init__(self, interval: int = STATISTICS_REFRESH_INTERVAL_SECONDS) -> None:
        self.interval = interval
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread is not None and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(
            target=self._run, name="statistics-updater", daemon=True
        )
        self._thread.start()
        logger.info("Statistics updater started (interval=%ss).", self.interval)

    def stop(self) -> None:
        self._stop.set()

    def _run(self) -> None:
        while not self._stop.wait(self.interval):
            try:
                db = SessionLocal()
                try:
                    StatisticsService(db).refresh_today()
                finally:
                    db.close()
            except Exception:  # noqa: BLE001 - keep the loop alive
                logger.exception("Statistics refresh failed")
