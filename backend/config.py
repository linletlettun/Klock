from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Supabase configuration
    SUPABASE_URL: str
    SUPABASE_KEY: str

    # Nacos configuration
    NACOS_MOCK: bool = False  # Set to False to use real Nacos server
    NACOS_SERVER_ADDR: str = "http://localhost:8848"
    NACOS_NAMESPACE: str = "public"
    NACOS_USERNAME: Optional[str] = None
    NACOS_PASSWORD: Optional[str] = None

    # K8s configuration
    K8S_SYSTEM_NAMESPACES: list[str] = [
        "kube-system",
        "kube-public",
        "kube-node-lease",
    ]

    # CORS configuration
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
