from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import cast, select
from sqlalchemy.dialects.postgresql import insert as pg_insert, UUID as PG_UUID
from sqlalchemy.orm import Session

from ..auth import current_user
from ..database import get_db
from ..models import Business, Employee, Location, TipSetting
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
    return [{"id": str(business_id), "name": name} for business_id, name in businesses]


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
    db.add(TipSetting(business_id=business.id, fee_payer=fee_payer_val))
    db.commit()
    db.refresh(business)
    return {
        "id": str(business.id),
        "name": business.name,
        "legal_name": business.legal_name,
        "logo_url": business.logo_url,
        "country": business.country,
        "currency": business.currency,
        "fee_payer": fee_payer_val,
        "stripe_connected": bool(business.stripe_account_id),
    }


@router.get("/{business_id}")
def get_business(
    business_id: str,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    user_uuid = user if isinstance(user, UUID) else UUID(str(user))
    business = owned_business(business_id, user_uuid, db)
    b_uuid = business.id if isinstance(business.id, UUID) else UUID(str(business.id))
    setting = db.scalar(select(TipSetting).where(cast(TipSetting.business_id, PG_UUID) == b_uuid))
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


@router.get("/{business_id}/settings-summary")
def get_settings_summary(
    business_id: str,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    user_uuid = user if isinstance(user, UUID) else UUID(str(user))
    business = owned_business(business_id, user_uuid, db)
    b_uuid = business.id if isinstance(business.id, UUID) else UUID(str(business.id))

    setting = db.scalar(select(TipSetting).where(cast(TipSetting.business_id, PG_UUID) == b_uuid))
    fee_payer = getattr(setting, "fee_payer", "business") if setting else "business"
    business_data = {
        "id": str(business.id),
        "name": business.name,
        "legal_name": business.legal_name,
        "logo_url": business.logo_url,
        "country": business.country,
        "currency": business.currency,
        "fee_payer": fee_payer or "business",
        "stripe_connected": bool(business.stripe_account_id),
    }

    employees = db.scalars(
        select(Employee)
        .where(cast(Employee.business_id, PG_UUID) == b_uuid)
        .order_by(Employee.created_at if hasattr(Employee, "created_at") else Employee.name)
    ).all()
    employees_data = [
        {
            "id": str(employee.id),
            "name": employee.name,
            "email": employee.email,
            "active": employee.active,
            "stripe_account_id": employee.stripe_account_id,
            # Keep the legacy boolean aligned with the canonical status so an
            # outdated DB flag cannot make the UI show "Activo y listo".
            "stripe_onboarding_completed": employee.stripe_status == "active",
            "stripe_status": employee.stripe_status,
            "onboarding_url": getattr(employee, "onboarding_url", None),
        }
        for employee in employees
    ]

    locations = db.scalars(
        select(Location)
        .where(cast(Location.business_id, PG_UUID) == b_uuid)
        .order_by(Location.name)
    ).all()
    locations_data = [
        {
            "id": str(location.id),
            "name": location.name,
            "url": getattr(location, "url", f"/l/{getattr(location, 'public_token', str(location.id))}"),
            "public_token": getattr(location, "public_token", str(location.id)),
            "distribution_mode": getattr(location, "distribution_mode", "employee"),
            "employee_percentage": float(getattr(location, "employee_percentage", 100) or 100),
            "suggested_amounts": getattr(location, "suggested_amounts", [1, 2, 3, 5]) or [1, 2, 3, 5],
        }
        for location in locations
    ]
    return {"business": business_data, "employees": employees_data, "locations": locations_data}


@router.put("/{business_id}")
def update_business(
    business_id: str,
    payload: BusinessUpdate,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    user_uuid = user if isinstance(user, UUID) else UUID(str(user))
    business = owned_business(business_id, user_uuid, db)
    data = payload.model_dump(exclude_unset=True)
    fee_payer = data.pop("fee_payer", None)
    for field, value in data.items():
        if field == "country" and value:
            value = value.upper()
        if field == "currency" and value:
            value = value.upper()
        if hasattr(business, field):
            setattr(business, field, value)

    b_uuid = business.id if isinstance(business.id, UUID) else UUID(str(business.id))
    if fee_payer:
        stmt = (
            pg_insert(TipSetting)
            .values(business_id=b_uuid, fee_payer=fee_payer)
            .on_conflict_do_update(
                constraint="tip_settings_business_id_key",
                set_={"fee_payer": fee_payer},
            )
        )
        db.execute(stmt)

    db.commit()
    db.refresh(business)
    updated_setting = db.scalar(select(TipSetting).where(cast(TipSetting.business_id, PG_UUID) == b_uuid))
    current_fee_payer = getattr(updated_setting, "fee_payer", "business") if updated_setting else "business"
    return {
        "id": str(business.id),
        "name": business.name,
        "legal_name": business.legal_name,
        "logo_url": business.logo_url,
        "country": business.country,
        "currency": business.currency,
        "fee_payer": current_fee_payer,
        "stripe_connected": bool(business.stripe_account_id),
    }
