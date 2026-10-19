from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    SYNC_DATABASE_URL: str
    JWT_SECRET_KEY: str
    ALGORITHM: str
    FPL_API_BASE_URL: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    MPESA_CONSUMER_KEY: str
    MPESA_CONSUMER_SECRET: str
    INITIATOR_NAME: str
    INITIATOR_PASSWORD: str
    PARTY_A: str
    PARTY_B: str
    PHONE_NUMBER: str
    BUSINESS_SHORT_CODE: str
    SECURITY_CREDENTIAL: str
    COMMAND_ID: str
    MPESA_SHORTCODE: str
    MPESA_PASSKEY: str
    MPESA_LIVE_URL: str
    B2C_URL: str
    MPESA_SANDBOX_URL: str
    STRIPE_SECRET_KEY: str
    STRIPE_PUBLISHABLE_KEY: str
    STRIPE_WEBHOOK_SECRET: str
    STRIPE_API_KEY: str
    STRIPE_CONNECT: bool = False  # Default to False, can be overridden in .env file
    STRIPE_WEBHOOK_URL: str
    MY_DOMAIN: str
    BACKEND_URL: str
    MPESA_CALLBACK_URL_B2C: str
    MPESA_CALLBACK_URL_STK: str
    # FPL classic league users join to prove they own the team they linked.
    # Create it from your own FPL account; id is in its standings URL, code is its invite code.
    FPL_VERIFICATION_LEAGUE_ID: int | None = None
    FPL_VERIFICATION_LEAGUE_CODE: str | None = None
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    # Where the SPA lives - used to build links in emails (e.g. password reset)
    FRONTEND_URL: str = "http://localhost:3000"
    PASSWORD_RESET_EXPIRE_MINUTES: int = 30
    # Outgoing email. If SMTP_HOST is unset, emails are written to the log instead
    # (dev only - a logged reset link is a usable credential).
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM: str = "Fantasy Fusion <no-reply@localhost>"
    SMTP_STARTTLS: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding='utf-8',
        extra='ignore'
    )

settings = Settings()