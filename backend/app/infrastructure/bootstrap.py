import logging
import time

from sqlalchemy import text

from app.core.database import engine

logger = logging.getLogger("app.bootstrap")


def wait_for_database(retries: int = 30, delay: float = 2.0) -> None:
    """Poll until PostgreSQL accepts connections or the retry budget is exhausted."""
    for attempt in range(1, retries + 1):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            logger.info("Database is ready.")
            return
        except Exception as exc:  # noqa: BLE001 - any connection error is expected here
            logger.warning("Waiting for database (attempt %s/%s): %s", attempt, retries, exc)
            time.sleep(delay)
    raise RuntimeError("Database did not become ready in time.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    wait_for_database()
