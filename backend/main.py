#!/usr/bin/env python3
"""
RestoBill AI - Production Server Runner
"""

import logging
import os
import signal
import subprocess
import sys
from pathlib import Path

import uvicorn
from dotenv import load_dotenv

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    print("Warning: .env file not found. Using environment variables or defaults.")

# Import the FastAPI app
try:
    from server import app
except ImportError as e:
    print(f"Error importing server: {e}")
    sys.exit(1)

# Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 10000))  # Render uses port 10000 by default
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
LOG_LEVEL = os.getenv("LOG_LEVEL", "info").lower()
ENVIRONMENT = os.getenv("ENVIRONMENT", "production")

# SSL Configuration
SSL_CERT_PATH = os.getenv("SSL_CERT_PATH")
SSL_KEY_PATH = os.getenv("SSL_KEY_PATH")


def setup_logging():
    """Setup logging configuration"""
    log_level = getattr(logging, LOG_LEVEL.upper(), logging.INFO)

    # Create logs directory if it doesn't exist
    logs_dir = Path(__file__).parent / "logs"
    logs_dir.mkdir(exist_ok=True)

    # Configure logging
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(logs_dir / "app.log"),
        ],
    )

    # Suppress some verbose logs in production
    if ENVIRONMENT == "production":
        # Routine access and health-check requests should not flood application logs.
        for logger_name in ("uvicorn.access", "uvicorn.error", "httpx", "httpcore", "motor"):
            logging.getLogger(logger_name).setLevel(logging.WARNING)
        logging.getLogger("uvicorn.access").disabled = os.getenv("LOG_ACCESS", "false").lower() != "true"


def validate_environment():
    """Validate required environment variables"""
    required_vars = ["MONGO_URL", "DB_NAME", "JWT_SECRET"]
    missing_vars = []

    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)

    if missing_vars:
        print(f"Warning: Missing environment variables: {', '.join(missing_vars)}")
        print("Using default values where possible...")

        # Set defaults for missing variables
        if "JWT_SECRET" in missing_vars:
            os.environ["JWT_SECRET"] = "default-jwt-secret-please-change-in-production"
            print(
                "Warning: Using default JWT secret. Please set JWT_SECRET environment variable."
            )

        if "DB_NAME" in missing_vars:
            os.environ["DB_NAME"] = "restrobill"

        if "MONGO_URL" in missing_vars and ENVIRONMENT == "production":
            print("Error: MONGO_URL is required in production")
            sys.exit(1)
        elif "MONGO_URL" in missing_vars:
            os.environ["MONGO_URL"] = "mongodb://localhost:27017/restrobill"


def create_directories():
    """Create necessary directories"""
    directories = [
        Path(__file__).parent / "logs",
        Path(__file__).parent / "uploads",
        Path(__file__).parent / "backups",
    ]

    for directory in directories:
        directory.mkdir(exist_ok=True)


def print_startup_info():
    """Print startup information"""
    print("=" * 60)
    print("🍽️  BillByteKOT Server Starting...")
    print("=" * 60)
    print(f"Environment: {ENVIRONMENT}")
    print(f"Host: {HOST}")
    print(f"Port: {PORT}")
    print(f"Debug: {DEBUG}")
    print(f"Log Level: {LOG_LEVEL}")
    mongo_url = os.getenv("MONGO_URL", "")
    if mongo_url:
        # Hide sensitive parts of URL
        safe_url = (
            mongo_url.replace(
                mongo_url.split("@")[0].split("://")[-1] + "@", "***:***@"
            )
            if "@" in mongo_url
            else mongo_url
        )
        print(f"MongoDB: {safe_url}")
    else:
        print("MongoDB: Not configured")

    jwt_secret = os.getenv("JWT_SECRET", "")
    print(
        f"JWT Secret: {'Configured' if jwt_secret and jwt_secret != 'default-jwt-secret-please-change-in-production' else 'Using default (please change!)'}"
    )

    if SSL_CERT_PATH and SSL_KEY_PATH:
        print("SSL: Enabled")
    else:
        print("SSL: Disabled")
    print("=" * 60)


def _is_gunicorn_available() -> bool:
    """Check if gunicorn is available (Linux/Mac only)."""
    if sys.platform == "win32":
        return False
    try:
        import gunicorn  # noqa: F401
        return True
    except ImportError:
        return False


def run_server():
    """Run the server - gunicorn on Linux/Mac production, uvicorn everywhere else."""
    if ENVIRONMENT == "production" and _is_gunicorn_available():
        _run_gunicorn()
    else:
        if ENVIRONMENT == "production" and sys.platform == "win32":
            print("ℹ️  Windows detected: gunicorn not supported. Using uvicorn with multiple workers.")
        _run_uvicorn()


def _run_gunicorn():
    """Launch gunicorn with UvicornWorker for production (Linux/Mac)."""
    gunicorn_config = Path(__file__).parent / "gunicorn_config.py"
    cmd = [
        sys.executable, "-m", "gunicorn",
        "server:app",
        "-c", str(gunicorn_config),
    ]
    print("Starting Gunicorn (production mode)...")
    proc = subprocess.Popen(cmd, cwd=str(Path(__file__).parent))

    def _shutdown(signum, frame):
        print(f"\nShutting down Gunicorn (signal {signum})...")
        proc.terminate()
        proc.wait(timeout=30)
        sys.exit(0)

    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT, _shutdown)
    proc.wait()


def _run_uvicorn():
    """Launch uvicorn - single worker for dev, multiple for production on Windows."""
    import multiprocessing
    # On Windows production: use multiple workers for concurrency
    if ENVIRONMENT == "production" and sys.platform == "win32":
        worker_count = (2 * multiprocessing.cpu_count()) + 1
    else:
        worker_count = 1

    print(f"Starting Uvicorn with {worker_count} worker(s)...")
    config = {
        "app": "server:app",
        "host": HOST,
        "port": PORT,
        "log_level": LOG_LEVEL,
        "access_log": True,
        "reload": DEBUG and worker_count == 1,  # reload only works with 1 worker
        "workers": worker_count,
    }
    if SSL_CERT_PATH and SSL_KEY_PATH:
        config.update({"ssl_keyfile": SSL_KEY_PATH, "ssl_certfile": SSL_CERT_PATH})
    uvicorn.run(**config)


def main():
    """Main function"""
    try:
        # Setup
        setup_logging()
        validate_environment()
        create_directories()
        print_startup_info()

        # Run server
        run_server()

    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        sys.exit(0)
    except Exception as e:
        logging.error(f"Failed to start server: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
