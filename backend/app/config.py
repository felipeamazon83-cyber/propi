from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    database_url:str='sqlite:///./tip.db'; supabase_url:str=''; supabase_service_role_key:str=''; stripe_secret_key:str=''; stripe_webhook_secret:str=''; stripe_starter_price_id:str=''; stripe_business_price_id:str=''; tip_platform_fee_percent:float=1; cors_origins:str='http://localhost:3000'; app_url:str='http://localhost:3000'
    model_config=SettingsConfigDict(env_file='.env', extra='ignore')
settings=Settings()
