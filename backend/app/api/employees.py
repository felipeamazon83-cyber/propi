from uuid import UUID

import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import current_user
from ..config import settings
from ..database import get_db
from ..models import Employee
from ..schemas.contracts import EmployeeCreate
from .deps import owned_business
from .employee_onboarding_webhook import (
    process_employee_account_update,
    send_employee_identity_email,
)

stripe.api_key = settings.stripe_secret_key

router = APIRouter(
    prefix="/businesses/{business_id}/employees",
    tags=["employees"],
)


def find_employee(business_id, employee_id: str, db: Session) -> Employee | None:
    try:
        employee_uuid = UUID(employee_id)
    except (ValueError, TypeError):
        return None

    return db.scalar(
        select(Employee).where(
            Employee.business_id == business_id,
            Employee.id == employee_uuid,
        )
    )


@router.get("")
def list_employees(
    business_id: str,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    business = owned_business(business_id, user, db)
    employees = db.scalars(
        select(Employee).where(Employee.business_id == business.id)
    ).all()

    return [
        {
            "id": str(employee.id),
            "name": employee.name,
            "email": employee.email,
            "photo_url": employee.photo_url,
            "active": employee.active,
            "stripe_account_id": employee.stripe_account_id,
            "stripe_onboarding_completed": employee.stripe_status == "active",
            "stripe_status": employee.stripe_status,
        }
        for employee in employees
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_employee(
    business_id: str,
    payload: EmployeeCreate,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    business = owned_business(business_id, user, db)

    try:
        stripe_account = stripe.Account.create(
            type="express",
            country=business.country or "ES",
            business_type="individual",
            capabilities={"transfers": {"requested": True}},
            metadata={
                "business_id": str(business.id),
                "employee_name": payload.name,
            },
        )
        account_link = stripe.AccountLink.create(
            account=stripe_account.id,
            refresh_url=f"{settings.app_url}/dashboard/settings?onboarding=refresh",
            return_url=f"{settings.app_url}/dashboard/settings?onboarding=success",
            type="account_onboarding",
            collection_options={"fields": "currently_due"},
        )
    except stripe.error.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error creando cuenta de Stripe para el empleado: {exc}",
        )

    employee = Employee(
        business_id=business.id,
        stripe_account_id=stripe_account.id,
        stripe_onboarding_completed=False,
        stripe_status="pending",
        active=False,
        **payload.model_dump(),
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

    return {
        "id": str(employee.id),
        "name": employee.name,
        "email": employee.email,
        "photo_url": employee.photo_url,
        "active": employee.active,
        "stripe_account_id": employee.stripe_account_id,
        "stripe_onboarding_completed": False,
        "stripe_status": employee.stripe_status,
        "onboarding_url": account_link.url,
    }


@router.get("/{employee_id}/onboarding-link")
def get_employee_onboarding_link(
    business_id: str,
    employee_id: str,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    business = owned_business(business_id, user, db)
    employee = find_employee(business.id, employee_id, db)
    if not employee:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    if not employee.stripe_account_id:
        raise HTTPException(status_code=400, detail="El empleado no tiene cuenta Stripe asociada")

    try:
        account_link = stripe.AccountLink.create(
            account=employee.stripe_account_id,
            refresh_url=f"{settings.app_url}/dashboard/settings?onboarding=refresh",
            return_url=f"{settings.app_url}/dashboard/settings?onboarding=success",
            type="account_onboarding",
            collection_options={"fields": "currently_due"},
        )
        # Reenvía también el correo vía Gmail SMTP al solicitar un nuevo enlace
        if employee.email:
            try:
                send_employee_identity_email(employee)
            except Exception:
                pass

        return {"onboarding_url": account_link.url}
    except stripe.error.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error generando enlace de Stripe: {exc}",
        )


@router.post("/{employee_id}/sync-stripe-status")
def sync_employee_stripe_status(
    business_id: str,
    employee_id: str,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Refresh Stripe's account state for existing employees and apply its requirements."""
    business = owned_business(business_id, user, db)
    employee = find_employee(business.id, employee_id, db)
    if not employee:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    if not employee.stripe_account_id:
        raise HTTPException(status_code=400, detail="El empleado no tiene cuenta Stripe asociada")

    try:
        stripe.api_key = settings.stripe_secret_key
        account = stripe.Account.retrieve(employee.stripe_account_id)
        process_employee_account_update(account, db)
        db.refresh(employee)
    except stripe.error.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"No se pudo consultar la cuenta de Stripe: {exc}",
        )

    return {
        "id": str(employee.id),
        "email": employee.email,
        "active": employee.active,
        "stripe_status": employee.stripe_status,
        "stripe_onboarding_completed": employee.stripe_status == "active",
    }


@router.patch("/{employee_id}/active")
def set_employee_active(
    business_id: str,
    employee_id: str,
    active: bool,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    business = owned_business(business_id, user, db)
    employee = find_employee(business.id, employee_id, db)
    if not employee:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    if active and employee.stripe_status != "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El empleado solo puede activarse después de completar la verificación de Stripe.",
        )

    employee.active = active
    db.commit()
    return {"id": str(employee.id), "active": employee.active}


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    business_id: str,
    employee_id: str,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    business = owned_business(business_id, user, db)
    employee = find_employee(business.id, employee_id, db)
    if not employee:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    if employee.stripe_account_id:
        try:
            stripe.Account.delete(employee.stripe_account_id)
        except stripe.error.StripeError:
            pass

    db.delete(employee)
    db.commit()
