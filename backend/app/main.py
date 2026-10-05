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
              AND column_name IN ('owner_id', 'business_id')
        """)
        result = connection.execute(query).fetchall()
        
        schema_info = {
            "database": engine.url.database,
            "schema": "public",
            "businesses_owner_id": [],
            "employees_business_id": [],
            "locations_business_id": [],
        }
        
        for row in result:
            key = f"{row[0]}_{row[1]}"
            if key in schema_info:
                schema_info[key].append(row[2])
                
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
