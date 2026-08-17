import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"
DATASETS_DIR = STORAGE_DIR / "datasets"
EXPORTS_DIR = STORAGE_DIR / "exports"

DATASETS_DIR.mkdir(parents=True, exist_ok=True)
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    PROJECT_NAME: str = "Quantura"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("JWT_SECRET", "datalens-ai-super-secret-key-development-mode-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", f"sqlite:///{BASE_DIR}/datalens.db"
    )
    MAX_UPLOAD_SIZE_MB: int = 100
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    N8N_COPILOT_WEBHOOK_URL: str = os.getenv(
        "N8N_COPILOT_WEBHOOK_URL",
        "https://abdxllxh2002.app.n8n.cloud/webhook/quantura-copilot",
    )
    N8N_WEBHOOK_SECRET: str = os.getenv("N8N_WEBHOOK_SECRET", "")
    
    # Storage
    STORAGE_PATH: Path = STORAGE_DIR
    DATASETS_PATH: Path = DATASETS_DIR
    EXPORTS_PATH: Path = EXPORTS_DIR

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )


settings = Settings()
