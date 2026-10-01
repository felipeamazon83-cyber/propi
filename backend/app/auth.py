from uuid import UUID

import httpx
from fastapi import Header, HTTPException

from .config import settings


async def current_user(
    authorization: str | None = Header(default=None),
) -> UUID:
    if (
        not authorization
        or not authorization.startswith("Bearer ")
        or not settings.supabase_url
        or not settings.supabase_service_role_key
    ):
        raise HTTPException(
            status_code=401,
            detail="Autenticación requerida",
        )

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
            response = await client.get(
                f"{settings.supabase_url}/auth/v1/user",
                headers={
                    "Authorization": authorization,
                    "apikey": settings.supabase_service_role_key,
                },
            )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=503,
            detail="No se pudo validar la sesión. Inténtalo de nuevo.",
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail="Sesión no válida",
        )

    try:
        user_id = UUID(response.json()["id"])
    except (KeyError, ValueError, TypeError):
        raise HTTPException(
            status_code=401,
            detail="ID de usuario de Supabase no válido",
        )

    return user_id
