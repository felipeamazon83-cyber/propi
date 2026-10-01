import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import models
from .api.routes import router
from .api.webhooks import router as webhook_router
from .config import settings

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
    logger.exception("Unhandled request error: %s %s", request.method, request.url.path)
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
