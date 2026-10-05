import logging
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from . import models
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


app.include_router(router, prefix="/api")
app.include_router(webhook_router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/debug/db-schema")
def debug_db_schema():
    with engine.connect() as connection:
        query = text("""
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND column_name IN ('id', 'owner_id', 'business_id', 'employee_id', 'location_id', 'fixed_employee_id')
        """)
        result = connection.execute(query).fetchall()
        
        schema_info = {}
        for row in result:
            key = f"{row[0]}_{row[1]}"
            schema_info[key] = row[2]
                
        return schema_info


@app.get("/debug/run-migration")
def run_migration():
    statements = [
        # 1. Eliminar temporalmente claves foráneas que puedan bloquear el cambio
        "ALTER TABLE IF EXISTS public.locations DROP CONSTRAINT IF EXISTS locations_business_id_fkey;",
        "ALTER TABLE IF EXISTS public.employees DROP CONSTRAINT IF EXISTS employees_business_id_fkey;",
        "ALTER TABLE IF EXISTS public.tip_settings DROP CONSTRAINT IF EXISTS tip_settings_business_id_fkey;",
        "ALTER TABLE IF EXISTS public.tips DROP CONSTRAINT IF EXISTS tips_business_id_fkey;",
        "ALTER TABLE IF EXISTS public.tips DROP CONSTRAINT IF EXISTS tips_location_id_fkey;",
        "ALTER TABLE IF EXISTS public.tips DROP CONSTRAINT IF EXISTS tips_employee_id_fkey;",

        # 2. Convertir businesses (PK id y owner_id)
        "ALTER TABLE public.businesses ALTER COLUMN id TYPE uuid USING id::uuid;",
        "ALTER TABLE public.businesses ALTER COLUMN owner_id TYPE uuid USING owner_id::uuid;",

        # 3. Convertir locations
        "ALTER TABLE IF EXISTS public.locations ALTER COLUMN id TYPE uuid USING id::uuid;",
        "ALTER TABLE IF EXISTS public.locations ALTER COLUMN business_id TYPE uuid USING business_id::uuid;",

        # 4. Convertir employees
        "ALTER TABLE IF EXISTS public.employees ALTER COLUMN id TYPE uuid USING id::uuid;",
        "ALTER TABLE IF EXISTS public.employees ALTER COLUMN business_id TYPE uuid USING business_id::uuid;",

        # 5. Convertir tip_settings
        "ALTER TABLE IF EXISTS public.tip_settings ALTER COLUMN id TYPE uuid USING id::uuid;",
        "ALTER TABLE IF EXISTS public.tip_settings ALTER COLUMN business_id TYPE uuid USING business_id::uuid;",
    ]

    try:
        with engine.begin() as connection:
            for stmt in statements:
                connection.execute(text(stmt))

            # Bloque especial para columnas condicionales que podrían o no existir
            connection.execute(text("""
                DO $$ 
                BEGIN 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='locations' AND column_name='fixed_employee_id') THEN
                        ALTER TABLE public.locations ALTER COLUMN fixed_employee_id TYPE uuid USING fixed_employee_id::uuid;
                    END IF;

                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tips') THEN
                        ALTER TABLE public.tips ALTER COLUMN id TYPE uuid USING id::uuid;
                        ALTER TABLE public.tips ALTER COLUMN business_id TYPE uuid USING business_id::uuid;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tips' AND column_name='location_id') THEN
                            ALTER TABLE public.tips ALTER COLUMN location_id TYPE uuid USING location_id::uuid;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tips' AND column_name='employee_id') THEN
                            ALTER TABLE public.tips ALTER COLUMN employee_id TYPE uuid USING employee_id::uuid;
                        END IF;
                    END IF;
                END $$;
            """))

        return {"status": "Migration completed successfully!"}
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }
