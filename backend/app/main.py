import logging
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
        content={"detail": "Error interno en el servidor"},
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


@app.get("/debug/db-values")
def debug_db_values():
    with engine.connect() as connection:
        businesses = connection.execute(
            text("""
                SELECT owner_id
                FROM public.businesses
                WHERE owner_id IS NOT NULL
                LIMIT 20
            """)
        ).fetchall()
        
        employees = connection.execute(
            text("""
                SELECT business_id
                FROM public.employees
                WHERE business_id IS NOT NULL
                LIMIT 20
            """)
        ).fetchall()
        
        locations = connection.execute(
            text("""
                SELECT business_id
                FROM public.locations
                WHERE business_id IS NOT NULL
                LIMIT 20
            """)
        ).fetchall()

        return {
            "businesses_owner_id": [str(row[0]) for row in businesses],
            "employees_business_id": [str(row[0]) for row in employees],
            "locations_business_id": [str(row[0]) for row in locations],
        }


@app.get("/debug/run-migration")
def run_migration():
    migration_sql = text("""
        BEGIN;

        -- 1. Convertir la tabla public.businesses (id y owner_id)
        ALTER TABLE public.businesses 
          ALTER COLUMN id TYPE uuid USING id::uuid,
          ALTER COLUMN owner_id TYPE uuid USING owner_id::uuid;

        -- 2. Convertir la tabla public.locations (id, business_id, fixed_employee_id)
        ALTER TABLE IF EXISTS public.locations 
          ALTER COLUMN id TYPE uuid USING id::uuid,
          ALTER COLUMN business_id TYPE uuid USING business_id::uuid;

        DO $$ 
        BEGIN 
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema='public' AND table_name='locations' AND column_name='fixed_employee_id'
            ) THEN
                ALTER TABLE public.locations ALTER COLUMN fixed_employee_id TYPE uuid USING fixed_employee_id::uuid;
            END IF;
        END $$;

        -- 3. Convertir la tabla public.employees (id, business_id)
        ALTER TABLE IF EXISTS public.employees 
          ALTER COLUMN id TYPE uuid USING id::uuid,
          ALTER COLUMN business_id TYPE uuid USING business_id::uuid;

        -- 4. Convertir la tabla public.tip_settings (id, business_id)
        ALTER TABLE IF EXISTS public.tip_settings 
          ALTER COLUMN id TYPE uuid USING id::uuid,
          ALTER COLUMN business_id TYPE uuid USING business_id::uuid;

        -- 5. Convertir la tabla public.tips (id, business_id, location_id, employee_id)
        DO $$ 
        BEGIN 
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

        COMMIT;
    """)

    with engine.begin() as connection:
        connection.execute(migration_sql)

    return {"status": "Migration completed successfully!"}
