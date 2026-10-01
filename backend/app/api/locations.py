import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import current_user
from ..config import settings
from ..database import get_db
from ..models import Employee, Location
from ..schemas.contracts import LocationCreate, LocationUpdate
from .deps import owned_business

router = APIRouter(tags=["locations"])


def serialize(location: Location):
    return {
        "id": str(location.id),
        "name": location.name,
        "type": location.type,
        "active": location.active,
        "public_token": location.public_token,
        "distribution_mode": location.distribution_mode,
        "fixed_employee_id": (
            str(location.fixed_employee_id)
            if location.fixed_employee_id
            else None
        ),
        "employee_percentage": float(location.employee_percentage),
        "suggested_amounts": location.suggested_amounts,
        "url": f"{settings.app_url}/r/{location.public_token}",
    }


@router.get("/businesses/{business_id}/locations")
def list_locations(
    business_id: str,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    business = owned_business(business_id, user, db)

    # Comparación limpia directa entre UUIDs sin CAST explicito
    locations = db.scalars(
        select(Location).where(Location.business_id == business.id)
    ).all()

    return [serialize(x) for x in locations]


@router.post("/businesses/{business_id}/locations", status_code=status.HTTP_201_CREATED)
def create_location(
    business_id: str,
    payload: LocationCreate,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    business = owned_business(business_id, user, db)

    fixed_emp_uuid = None
    if payload.fixed_employee_id:
        try:
            fixed_emp_uuid = (
                payload.fixed_employee_id
                if isinstance(payload.fixed_employee_id, UUID)
                else UUID(str(payload.fixed_employee_id))
            )
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Empleado no válido",
            )

        e = db.scalar(
            select(Employee).where(
                Employee.id == fixed_emp_uuid,
                Employee.business_id == business.id,
            )
        )
        if not e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Empleado no válido para este negocio",
            )

    data = payload.model_dump()
    data.pop("fixed_employee_id", None)

    location = Location(
        business_id=business.id,
        fixed_employee_id=fixed_emp_uuid,
        public_token=secrets.token_urlsafe(24),
        **data,
    )
    db.add(location)
    db.commit()
    db.refresh(location)

    return serialize(location)


@router.put("/locations/{location_id}")
def update_location(
    location_id: str,
    payload: LocationUpdate,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    try:
        loc_uuid = UUID(location_id) if isinstance(location_id, str) else location_id
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ubicación no encontrada",
        )

    location = db.scalar(
        select(Location).where(Location.id == loc_uuid)
    )
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ubicación no encontrada",
        )

    owned_business(location.business_id, user, db)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(location, field, value)

    db.commit()
    return serialize(location)


@router.post("/locations/{location_id}/regenerate-token")
def regenerate_token(
    location_id: str,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    try:
        loc_uuid = UUID(location_id) if isinstance(location_id, str) else location_id
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ubicación no encontrada",
        )

    location = db.scalar(
        select(Location).where(Location.id == loc_uuid)
    )
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ubicación no encontrada",
        )

    owned_business(location.business_id, user, db)

    location.public_token = secrets.token_urlsafe(24)
    db.commit()

    return serialize(location)
