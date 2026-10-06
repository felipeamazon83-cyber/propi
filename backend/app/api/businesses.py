from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import cast, select
from sqlalchemy.dialects.postgresql import insert as pg_insert, UUID as PG_UUID
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
    user_uuid = user if isinstance(user, UUID) else UUID(str(user))

    stmt = (
        select(Business.id, Business.name)
        .where(cast(Business.owner_id, PG_UUID) == user_uuid)
        .order_by(Business.name)
    )
    businesses = db.execute(stmt).all()

    return [
        {
            "id": str(business_id),
            "name": name,
        }
        for business_id, name in businesses
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_business(
    payload: BusinessCreate,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    user_uuid = user if isinstance(user, UUID) else UUID(str(user))

    business = Business(
        owner_id=user_uuid,
        name=payload.name,
        legal_name=payload.legal_name,
        country=payload.country.upper() if payload.country else "ES",
        currency=payload.currency.upper() if payload.currency else "EUR",
    )

    db.add(business)
    db.flush()

    fee_payer_val = getattr(payload, "fee_payer", "business") or "business"

    tip_settings = TipSetting(
        business_id=business.id,
        fee_payer=fee_payer_val,
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
    user_uuid = user if isinstance(user, UUID) else UUID(str(user))

    business = owned_business(
        business_id,
        user_uuid,
        db,
    )

    b_uuid = business.id if isinstance(business.id, UUID) else UUID(str(business.id))

    setting = db.scalar(
        select(TipSetting).where(cast(TipSetting.business_id, PG_UUID) == b_uuid)
    )
    fee_payer = getattr(setting, "fee_payer", "business") if setting else "business"

    return {
        "id": str(business.id),
        "name": business.name,
        "legal_name": business.legal_name,
        "logo_url": business.logo_url,
        "country": business.country,
        "currency": business.currency,
        "fee_payer": fee_payer or "business",
        "stripe_connected": bool(business.stripe_account_id),
    }


@router.put("/{business_id}")
def update_business(
    business_id: str,
    payload: BusinessUpdate,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    user_uuid = user if isinstance(user, UUID) else UUID(str(user))

    business = owned_business(
        business_id,
        user_uuid,
        db,
    )

    data = payload.model_dump(
        exclude_unset=True,
    )

    # Extraer fee_payer para gestionarlo en TipSetting mediante UPSERT
    fee_payer = data.pop("fee_payer", None)

    for field, value in data.items():
        if field == "country" and value:
            value = value.upper()

        if field == "currency" and value:
            value = value.upper()

        if hasattr(business, field):
            setattr(
                business,
                field,
                value,
            )

    b_uuid = business.id if isinstance(business.id, UUID) else UUID(str(business.id))

    if fee_payer:
        stmt = (
            pg_insert(TipSetting)
            .values(
                business_id=b_uuid,
                fee_payer=fee_payer,
            )
            .on_conflict_do_update(
                constraint="tip_settings_business_id_key",
                set_={"fee_payer": fee_payer},
            )
        )
        db.execute(stmt)

    db.commit()
    db.refresh(business)

    # Consultar valor final persistido para la respuesta
    updated_setting = db.scalar(
        select(TipSetting).where(cast(TipSetting.business_id, PG_UUID) == b_uuid)
    )
    current_fee_payer = getattr(updated_setting, "fee_payer", "business") if updated_setting else "business"

    return {
        "id": str(business.id),
        "name": business.name,
        "fee_payer": current_fee_payer,
    }
