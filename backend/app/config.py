from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "Pokemon Tower Defense"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # База данных - исправленный путь
    SQLALCHEMY_DATABASE_URL: str = "sqlite:///./game.db4"  # Упрощенный путь

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"  # Замените!
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        case_sensitive = True


settings = Settings()
