from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SYNC_DATABASE_URL: str
    JWT_SECRET_KEY: str
    ALGORITHM: str
    FPL_API_BASE_URL: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    CONSUMER_KEY: str
    CONSUMER_SECRET: str
    INITIATOR_NAME: str
    INITIATOR_PASSWORD: str
    SECURITY_CREDENTIAL: str
    MPESA_SHORTCODE: str
    MPESA_PASSKEY: str
    MPESA_LIVE_URL: str
    MPESA_SANDBOX_URL: str
    STRIPE_SECRET_KEY: str
    STRIPE_PUBLISHABLE_KEY: str
    STRIPE_WEBHOOK_SECRET: str
    MY_DOMAIN: str

    class Config:
        env_file = ".env"

settings = Settings()