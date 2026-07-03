from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    gemini_api_key: str
    chroma_persist_dir: str = "../data/chroma"
    upload_dir: str = "../data/uploads"
    database_url: str = "postgresql://postgres:postgres@localhost:5432/campus_assistant"
    cors_origins: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"

settings = Settings()