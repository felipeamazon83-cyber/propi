import stripe
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import current_user
from ..config import settings
from ..database import get_db
from .deps import owned_business

router = APIRouter(prefix="/stripe", tags=["stripe-connect"])


@router.post("/connect")
def create_connect_onboarding(
    business_id: str,
    user: str = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Crea/reutiliza la cuenta conectada con control de aplicación para forzar la verificación de identidad."""
    business = owned_business(business_id, user, db)

    if not settings.stripe_secret_key:
        raise HTTPException(
            503, "Stripe Connect aún no está configurado"
        )

    stripe.api_key = settings.stripe_secret_key

    # 1. Crear cuenta con controlador de aplicación para exigir DNI y requisitos de inmediato
    if not business.stripe_account_id:
        account = stripe.Account.create(
            controller={
                "losses": {"payments": "application"},
                "fees": {"payer": "application"},
                "requirement_collection": "application",
                "stripe_dashboard": {"type": "none"},
            },
            capabilities={
                "transfers": {"requested": True},
            },
            country=business.country or "ES",
            business_type="individual",
        )
        business.stripe_account_id = account.id
        db.commit()

    # 2. Generar enlace de onboarding recopilando todos los campos requeridos
    link = stripe.AccountLink.create(
        account=business.stripe_account_id,
        refresh_url=f"{settings.app_url}/dashboard",
        return_url=f"{settings.app_url}/dashboard",
        type="account_onboarding",
        collection_options={
            "fields": "eventually_due",
        },
    )

    return {"onboarding_url": link.url}
