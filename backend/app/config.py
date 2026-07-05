from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    gemini_api_key: str
    data_dir: str = "../data"
    chroma_persist_dir: str = "../data/chroma"
    upload_dir: str = "../data/uploads"
    max_upload_mb: int = 50
    database_url: str = "postgresql://postgres:postgres@localhost:5432/campus_assistant"
    # Comma-separated để set qua env khi deploy, ví dụ:
    # CORS_ORIGINS="https://ai-campus.vercel.app,http://localhost:5173"
    cors_origins: str = "http://localhost:5173"

    class Config:
        env_file = ".env"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

settings = Settings()
