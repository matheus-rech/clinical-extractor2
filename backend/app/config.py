"""
Configuration settings for the backend application
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    GEMINI_API_KEY: str
    ANTHROPIC_API_KEY: str = ""

    GEMINI_MODEL: str = "gemini-2.5-flash"
    ANTHROPIC_MODEL: str = "claude-sonnet-4-5-20250929"

    LLM_PRIMARY: str = "anthropic"
    LLM_FALLBACK: str = "gemini"
    FORCE_FALLBACK: bool = False

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # 30 minutes for better security

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    RATE_LIMIT_PER_MINUTE: int = 100
    AI_RATE_LIMIT_PER_MINUTE: int = 10

    APP_NAME: str = "La Consulta Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False  # False by default for security

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()