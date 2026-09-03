import logging
import os
import sys


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        ))
        logger.addHandler(handler)
        logger.propagate = False
        log_level = os.getenv("LOG_LEVEL", "info").upper()
        logger.setLevel(getattr(logging, log_level, logging.INFO))
    return logger
