from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import Base, engine
from app.api.routes import router
from app.api.webhooks import router as webhook_router
from app import models

app = FastAPI(title='TIP API', version='0.1.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[x.strip() for x in settings.cors_origins.split(',')],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)

app.include_router(router, prefix='/api')
app.include_router(webhook_router, prefix='/api')

@app.on_event('startup')
def startup(): 
    Base.metadata.create_all(engine)

@app.get('/health')
def health():
    return {'status': 'ok'}
