from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import current_user
from ..database import get_db
from ..models import Business, TipSetting
from ..schemas.contracts import BusinessCreate, BusinessUpdate
from .deps import owned_business


router = APIRouter(
    prefix="/businesses",
    tags=["businesses"],
)


@router.get("")
def list_businesses(
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    businesses = db.scalars(
        select(Business)
        .where(Business.owner_id == user)
        .order_by(Business.created_at.desc())
    ).all()

    return [
        {
            "id": str(b.id),
            "name": b.name,
        }
        for b in businesses
    ]


@router.post("", status_code=201)
def create_business(
    payload: BusinessCreate,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    business = Business(
        owner_id=user,
        name=payload.name,
        legal_name=payload.legal_name,
        country=payload.country.upper(),
        currency=payload.currency.upper(),
    )

    db.add(business)
    db.flush()

    tip_settings = TipSetting(
        business_id=business.id,
    )

    db.add(tip_settings)

    db.commit()
    db.refresh(business)

    return {
        "id": str(business.id),
        "name": business.name,
    }


@router.get("/{business_id}")
def get_business(
    business_id: str,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    business = owned_business(
        business_id,
        user,
        db,
    )

    return {
        "id": str(business.id),
        "name": business.name,
        "legal_name": business.legal_name,
        "logo_url": business.logo_url,
        "country": business.country,
        "currency": business.currency,
        "stripe_connected": bool(
            business.stripe_account_id
        ),
    }


@router.put("/{business_id}")
def update_business(
    business_id: str,
    payload: BusinessUpdate,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    business = owned_business(
        business_id,
        user,
        db,
    )

    data = payload.model_dump(
        exclude_unset=True,
    )

    for field, value in data.items():
        if field == "country" and value:
            value = value.upper()

        if field == "currency" and value:
            value = value.upper()

        setattr(
            business,
            field,
            value,
        )

    db.commit()
    db.refresh(business)

    return {
        "id": str(business.id),
        "name": business.name,
    }
