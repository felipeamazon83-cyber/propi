from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models import Business


def owned_business(
    business_id: str | UUID,
    user_id: str | UUID,
    db: Session,
) -> Business:

    try:
        business_uuid = (
            business_id
            if isinstance(business_id, UUID)
            else UUID(str(business_id))
        )
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=404,
            detail="Negocio no encontrado",
        )

    business = db.get(Business, business_uuid)

    if not business or business.owner_id != user_id:
        raise HTTPException(
            status_code=404,
            detail="Negocio no encontrado",
        )

    return business
