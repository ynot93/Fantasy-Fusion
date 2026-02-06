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
    PESAPAL_BASE_URL : str
    PESAPAL_CONSUMER_KEY : str
    PESAPAL_CONSUMER_SECRET : str
    PESAPAL_CALLBACK_URL : str
    PESAPAL_ACCOUNT_REFERENCE_PREFIX : str
    PESAPAL_CURRENCY : str
    PESAPAL_LIVE_URL : str
    FPL_EMAIL: str
    FPL_PWD: str
    FPL_LOGIN_URL: str
    FPL_TEAM_URL: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding='utf-8',
        extra='ignore'
    )

settings = Settings()