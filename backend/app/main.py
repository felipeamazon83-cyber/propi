import logging
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from . import models
from .api.dashboard import router as dashboard_router
from .api.routes import router
from .api.webhooks import router as webhook_router
from .config import settings
from .database import engine

app = FastAPI(title="TIP API", version="0.1.0")
logger = logging.getLogger(__name__)


def cors_headers(request: Request) -> dict[str, str]:
    """Return CORS headers for an allowed browser origin, including 500s."""
    origin = request.headers.get("origin")
    if origin in settings.cors_origins_list:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Vary": "Origin",
        }
    return {}


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=86400,
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "Unhandled request error: %s %s",
        request.method,
        request.url.path,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno en el servidor", "error": str(exc)},
        headers=cors_headers(request),
    )


# Inclusión de Routers
app.include_router(router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(webhook_router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/debug/fix-locations-columns")
def fix_locations_columns():
    statements = [
        # Agregar columnas faltantes a locations si no existen
        "ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS distribution_mode VARCHAR DEFAULT 'direct';",
        "ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS fixed_employee_id UUID NULL;",
        "ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS employee_percentage NUMERIC DEFAULT 0;",
        "ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS suggested_amounts JSONB DEFAULT '[]'::jsonb;",
    ]

    try:
        with engine.begin() as connection:
            for stmt in statements:
                connection.execute(text(stmt))

        return {"status": "Locations table columns created successfully!"}
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc(),
        }


@app.get("/debug/setup-db")
def setup_db():
    statements = [
        # Eliminar constraints si existen
        "ALTER TABLE IF EXISTS public.locations DROP CONSTRAINT IF EXISTS locations_business_id_fkey;",
        "ALTER TABLE IF EXISTS public.employees DROP CONSTRAINT IF EXISTS employees_business_id_fkey;",
        "ALTER TABLE IF EXISTS public.tip_settings DROP CONSTRAINT IF EXISTS tip_settings_business_id_fkey;",
        "ALTER TABLE IF EXISTS public.tips DROP CONSTRAINT IF EXISTS tips_business_id_fkey;",

        # Convertir/Asegurar columnas de UUIDs
        "ALTER TABLE IF EXISTS public.businesses ALTER COLUMN id TYPE uuid USING id::uuid;",
        "ALTER TABLE IF EXISTS public.businesses ALTER COLUMN owner_id TYPE uuid USING owner_id::uuid;",

        "ALTER TABLE IF EXISTS public.locations ALTER COLUMN id TYPE uuid USING id::uuid;",
        "ALTER TABLE IF EXISTS public.locations ALTER COLUMN business_id TYPE uuid USING business_id::uuid;",
        "ALTER TABLE IF EXISTS public.locations ADD COLUMN IF NOT EXISTS distribution_mode VARCHAR DEFAULT 'direct';",
        "ALTER TABLE IF EXISTS public.locations ADD COLUMN IF NOT EXISTS fixed_employee_id UUID NULL;",
        "ALTER TABLE IF EXISTS public.locations ADD COLUMN IF NOT EXISTS employee_percentage NUMERIC DEFAULT 0;",
        "ALTER TABLE IF EXISTS public.locations ADD COLUMN IF NOT EXISTS suggested_amounts JSONB DEFAULT '[]'::jsonb;",

        "ALTER TABLE IF EXISTS public.employees ALTER COLUMN id TYPE uuid USING id::uuid;",
        "ALTER TABLE IF EXISTS public.employees ALTER COLUMN business_id TYPE uuid USING business_id::uuid;",

        "ALTER TABLE IF EXISTS public.tip_settings ALTER COLUMN id TYPE uuid USING id::uuid;",
        "ALTER TABLE IF EXISTS public.tip_settings ALTER COLUMN business_id TYPE uuid USING business_id::uuid;",
    ]

    try:
        with engine.begin() as connection:
            for stmt in statements:
                connection.execute(text(stmt))

        return {"status": "Database setup completed on project qxdzkqnjufvgbdxpdtrf!"}
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc(),
        }
