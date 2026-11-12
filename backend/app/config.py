from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./tip.db"
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_webhook_secret_main: str = ""
    stripe_webhook_secret_connect: str = ""
    resend_api_key: str = ""
    resend_from: str = "Propi <onboarding@resend.dev>"

    # Configuración de tarifas Propi (MVP: 0.10 €)
    propi_fixed_fee_cents: int = 10
    propi_fee_percent: float = 0.0

    # Estimación pasarela Stripe Europa
    stripe_fee_percent: float = 0.015
    stripe_fixed_fee_cents: int = 25

    cors_origins: str = "https://propi-kohl.vercel.app,http://localhost:3000,http://localhost:5173"
    app_url: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
