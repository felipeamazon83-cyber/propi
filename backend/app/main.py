from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import models
from .api.routes import router
from .api.webhooks import router as webhook_router
from .database import Base, engine

app = FastAPI(title="TIP API", version="0.1.0")

# 1. Definir orígenes permitidos explícitamente
origins = [
    "https://propi-kohl.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
]

# 2. Configurar CORS con credentials habilitado
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 3. Handler global para capturar errores 500 y devolver siempre headers CORS
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Error interno en el servidor: {str(exc)}"},
    )


app.include_router(router, prefix="/api")
app.include_router(webhook_router, prefix="/api")


@app.on_event("startup")
def startup():
    Base.metadata.create_all(engine)


@app.get("/health")
def health():
    return {"status": "ok"}
