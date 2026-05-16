"""Application configuration loaded from environment variables.

Railway injects DATABASE_URL automatically when a Postgres plugin is attached.
For local development we fall back to a SQLite file so the app runs with zero setup.
"""
import os


class Settings:
    def __init__(self) -> None:
        self.DATABASE_URL: str = self._normalize_db_url(
            os.getenv("DATABASE_URL", "sqlite:///./taskmanager.db")
        )
        self.JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-secret-change-me-in-production")
        self.JWT_ALGORITHM: str = "HS256"
        self.ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
            os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")  # 24 hours
        )
        # Comma-separated list of allowed CORS origins (only needed for split deploys).
        self.CORS_ORIGINS: list[str] = [
            o.strip()
            for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
            if o.strip()
        ]
        self.ENV: str = os.getenv("ENV", "development")

    @staticmethod
    def _normalize_db_url(url: str) -> str:
        # Some providers (and older Railway templates) hand out the legacy
        # `postgres://` scheme — normalize it first.
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        # Pin SQLAlchemy to the psycopg (v3) driver rather than the default
        # psycopg2, so the URL works with the `psycopg` package we install.
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url


settings = Settings()
