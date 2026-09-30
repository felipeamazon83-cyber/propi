from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import Base,engine
from .api.routes import router
from .api.webhooks import router as webhook_router
from . import models
app=FastAPI(title='TIP API',version='0.1.0')
app.add_middleware(CORSMiddleware,allow_origins=[x.strip().rstrip('/') for x in settings.cors_origins.split(',') if x.strip()],allow_credentials=True,allow_methods=['*'],allow_headers=['*'])
app.include_router(router,prefix='/api');app.include_router(webhook_router,prefix='/api')
@app.on_event('startup')
def startup(): Base.metadata.create_all(engine)
@app.get('/health')
def health():return {'status':'ok'}
