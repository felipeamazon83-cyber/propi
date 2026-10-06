from collections import defaultdict, deque
import secrets
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session
import stripe

from ..auth import current_user
from ..config import settings
from ..database import get_db
from ..models import Business, Employee, Location, Tip, TipSetting
from ..schemas.contracts import (
    BusinessCreate,
    BusinessUpdate,
    CheckoutCreate,
    EmployeeCreate,
    LocationCreate,
    LocationUpdate,
)

router = APIRouter(tags=["payments"])


@router.post("/payments/checkout")
def checkout(payload: CheckoutCreate, db: Session = Depends(get_db)):
    l = db.scalar(
        select(Location).where(
            Location.public_token == payload.public_token,
            Location.active.is_(True),
        )
    )
    if not l:
        raise HTTPException(404, "Ubicación no disponible")

    b = db.get(Business, l.business_id)
    e = db.get(Employee, payload.employee_id)
    s = db.scalar(
        select(TipSetting).where(TipSetting.business_id == l.business_id)
    )

    if (
        not e
        or e.business_id != l.business_id
        or not e.active
        or (l.fixed_employee_id and e.id != l.fixed_employee_id)
    ):
        raise HTTPException(422, "Empleado no válido")

    if (
        payload.amount < float(s.minimum_amount)
        or payload.amount > float(s.maximum_amount)
    ):
        raise HTTPException(422, "Importe fuera de los límites permitidos")

    if not settings.stripe_secret_key:
        raise HTTPException(503, "Los pagos aún no están configurados")

    if not b.stripe_account_id:
        raise HTTPException(409, "Este negocio aún no ha conectado Stripe")

    from ..services.stripe_service import calculate_fee

    fee = calculate_fee(
        payload.amount,
        settings.propi_fee_percent,
        settings.propi_fixed_fee_cents,
    )

    stripe.api_key = settings.stripe_secret_key

    metadata = {
        "business_id": str(l.business_id),
        "employee_id": str(e.id),
        "location_id": str(l.id),
        "tip_cents": str(fee.tip_cents),
        "propi_fixed_fee_cents": str(fee.fixed_fee_cents),
        "propi_percentage_fee_cents": str(fee.percentage_fee_cents),
        "payout_cents": str(fee.connected_account_payout_cents),
    }

    # Solo mostramos el importe de la propina al cliente (sin la tarifa explícita de Propi)
    items = [
        {
            "price_data": {
                "currency": b.currency.lower(),
                "product_data": {"name": f"Propina para {e.name}"},
                "unit_amount": fee.tip_cents,
            },
            "quantity": 1,
        }
    ]

    # Retenemos la comisión de Propi internamente usando application_fee_amount
    session = stripe.checkout.Session.create(
        mode="payment",
        payment_method_types=["card"],
        line_items=items,
        metadata=metadata,
        payment_intent_data={
            "metadata": metadata,
            "application_fee_amount": fee.propi_fee_cents,
            "transfer_data": {
                "destination": b.stripe_account_id,
            },
        },
        success_url=f"{settings.app_url}/thank-you?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.app_url}/r/{payload.public_token}",
    )

    return {
        "checkout_url": session.url,
        "tip_amount": fee.tip_cents / 100,
        "propi_fee": fee.propi_fee_cents / 100,
        "total": fee.tip_cents / 100,
    }
