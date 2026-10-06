from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import cast, select
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
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
    # Asegurar tipo UUID
    user_uuid = user if isinstance(user, UUID) else UUID(str(user))

    # La vista que abre el selector de negocio solo necesita estos dos campos.
    # No cargar la entidad completa evita que una columna añadida posteriormente
    # en Supabase convierta este GET en un 500 durante un despliegue de migración.
    stmt = (
        select(Business.id, Business.name)
        # Some early deployments stored Supabase UUIDs as varchar. Cast the
        # column while the accompanying migration converts it permanently.
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

    # Si en BusinessCreate viene fee_payer, se asigna al crear TipSetting
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

    # Consultar fee_payer en tip_settings
    setting = db.scalar(
        select(TipSetting).where(TipSetting.business_id == business.id)
    )
    fee_payer = setting.fee_payer if setting and hasattr(setting, "fee_payer") else "business"

    return {
        "id": str(business.id),
        "name": business.name,
        "legal_name": business.legal_name,
        "logo_url": business.logo_url,
        "country": business.country,
        "currency": business.currency,
        "fee_payer": fee_payer,
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

    # Extraer fee_payer para gestionarlo en TipSetting
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

    # Actualizar o crear la configuración fee_payer en TipSetting
    if fee_payer:
        setting = db.scalar(
            select(TipSetting).where(TipSetting.business_id == business.id)
        )
        if setting:
            setting.fee_payer = fee_payer
        else:
            setting = TipSetting(
                business_id=business.id,
                fee_payer=fee_payer,
            )
            db.add(setting)

    db.commit()
    db.refresh(business)

    # Consultar fee_payer final para devolverlo en la respuesta
    setting = db.scalar(
        select(TipSetting).where(TipSetting.business_id == business.id)
    )
    current_fee_payer = setting.fee_payer if setting and hasattr(setting, "fee_payer") else "business"

    return {
        "id": str(business.id),
        "name": business.name,
        "fee_payer": current_fee_payer,
    }
