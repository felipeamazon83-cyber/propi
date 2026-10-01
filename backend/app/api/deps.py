from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import cast, select
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Session

from ..models import Business


def owned_business(
    business_id: str | UUID,
    user_id: str | UUID,
    db: Session,
) -> Business:
    # 1. Normalizar business_id a UUID
    try:
        b_uuid = (
            business_id
            if isinstance(business_id, UUID)
            else UUID(str(business_id))
        )
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Negocio no encontrado",
        )

    # 2. Normalizar user_id a UUID
    try:
        u_uuid = (
            user_id
            if isinstance(user_id, UUID)
            else UUID(str(user_id))
        )
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no válido",
        )

    # 3. Consulta directa con cast explícito a nivel de PostgreSQL Engine
    stmt = select(Business).where(
        cast(Business.id, PG_UUID) == cast(b_uuid, PG_UUID),
        cast(Business.owner_id, PG_UUID) == cast(u_uuid, PG_UUID),
    )

    business = db.scalar(stmt)

    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Negocio no encontrado",
        )

    return business
