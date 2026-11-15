import html
import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import current_user
from ..config import settings
from ..database import get_db
from ..models import Business, Employee
from .deps import owned_business
from .employee_onboarding_webhook import send_employee_identity_email

router = APIRouter(prefix="/stripe", tags=["stripe-connect"])


@router.post("/connect")
def create_connect_onboarding(
    business_id: str,
    user: str = Depends(current_user),
    db: Session = Depends(get_db),
):
    business = owned_business(business_id, user, db)
    if not settings.stripe_secret_key:
        raise HTTPException(503, "Stripe Connect aún no está configurado")

    stripe.api_key = settings.stripe_secret_key
    if not business.stripe_account_id:
        account = stripe.Account.create(
            type="express",
            country=business.country or "ES",
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
        )
        business.stripe_account_id = account.id
        db.commit()

    link = stripe.AccountLink.create(
        account=business.stripe_account_id,
        refresh_url=f"{settings.app_url}/onboarding/exito?status=refresh",
        return_url=f"{settings.app_url}/onboarding/exito?status=completed",
        type="account_onboarding",
        collection_options={"fields": "eventually_due"},
    )
    return {"onboarding_url": link.url}


@router.post("/send-identity-email")
def send_identity_verification_email(
    business_id: str,
    employee_email: str,
    user: str = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Send the identity link for the employee's own connected account."""
    business = owned_business(business_id, user, db)
    employee = db.scalar(
        select(Employee).where(
            Employee.business_id == business.id,
            Employee.email == employee_email,
        )
    )
    if not employee:
        raise HTTPException(status_code=404, detail="No se encontró un empleado con ese correo")
    if not employee.stripe_account_id:
        raise HTTPException(status_code=400, detail="El empleado no tiene una cuenta Stripe asociada")
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe Connect aún no está configurado")

    try:
        send_employee_identity_email(employee)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"No se pudo enviar el enlace de verificación: {exc}",
        )
    return {"message": f"Correo de verificación enviado a {employee.email}"}
