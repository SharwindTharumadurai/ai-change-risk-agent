from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:aichangeriskagent26@db.maanfscmhwevqnfrmfwy.supabase.co:5432/postgres?sslmode=require"

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"  # swap to gpt-4o for final demo

    # Auth
    SECRET_KEY: str = "change-this-to-a-random-32-char-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # App
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000"

    def get_cors_origins(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"

settings = Settings()
