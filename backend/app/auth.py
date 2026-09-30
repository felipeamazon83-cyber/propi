from fastapi import Header,HTTPException
import httpx
from .config import settings
async def current_user(authorization:str|None=Header(default=None)):
 if not authorization or not authorization.startswith('Bearer ') or not settings.supabase_url or not settings.supabase_service_role_key: raise HTTPException(401,'Autenticación requerida')
 async with httpx.AsyncClient() as c:
  r=await c.get(f'{settings.supabase_url}/auth/v1/user',headers={'Authorization':authorization,'apikey':settings.supabase_service_role_key})
 if r.status_code!=200: raise HTTPException(401,'Sesión no válida')
 return r.json()['id']
