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
    """Crea/reutiliza la cuenta conectada del negocio y devuelve la URL de onboarding segura de Stripe."""
    business = owned_business(business_id, user, db)

    if not settings.stripe_secret_key:
        raise HTTPException(
            503, "Stripe Connect aún no está configurado"
        )

    stripe.api_key = settings.stripe_secret_key

    # 1. Crear cuenta conectada con la nueva API Accounts v2
    if not business.stripe_account_id:
        account = stripe.v2.core.Accounts.create(
            type="express",
            country=business.country or "ES",
        )
        business.stripe_account_id = account.id
        db.commit()

    # 2. Generar enlace de onboarding
    link = stripe.AccountLink.create(
        account=business.stripe_account_id,
        refresh_url=f"{settings.app_url}/dashboard",
        return_url=f"{settings.app_url}/dashboard",
        type="account_onboarding",
    )

    return {"onboarding_url": link.url}
