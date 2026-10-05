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


# ---------------------------------------------------------
# TEMPORAL: diagnóstico de la base de datos de Render
# ---------------------------------------------------------

@app.get("/debug/db-schema")
def debug_db_schema():
    with engine.connect() as connection:

        database = connection.execute(
            text("SELECT current_database()")
        ).scalar()

        schema = connection.execute(
            text("SELECT current_schema()")
        ).scalar()

        owner_type = connection.execute(
            text("""
                SELECT data_type, udt_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'businesses'
                  AND column_name = 'owner_id'
            """)
        ).fetchone()

        employee_type = connection.execute(
            text("""
                SELECT data_type, udt_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'employees'
                  AND column_name = 'business_id'
            """)
        ).fetchone()

        location_type = connection.execute(
            text("""
                SELECT data_type, udt_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'locations'
                  AND column_name = 'business_id'
            """)
        ).fetchone()

        return {
            "database": database,
            "schema": schema,
            "businesses_owner_id": list(owner_type) if owner_type else None,
            "employees_business_id": list(employee_type) if employee_type else None,
            "locations_business_id": list(location_type) if location_type else None,
        }
