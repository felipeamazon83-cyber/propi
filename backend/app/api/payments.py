import math
import stripe
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Business, Employee, Location, TipSetting
from ..schemas.contracts import CheckoutCreate

router = APIRouter(tags=["payments"])


@router.post("/payments/checkout")
def checkout(payload: CheckoutCreate, db: Session = Depends(get_db)):
    # 1. Obtener ubicación activa
    l = db.scalar(
        select(Location).where(
            Location.public_token == payload.public_token,
            Location.active.is_(True),
        )
    )
    if not l:
        raise HTTPException(404, "Ubicación no disponible")

    # 2. Obtener entidad de Negocio y Empleado
    b = db.get(Business, l.business_id)
    e = db.get(Employee, payload.employee_id)

    # 3. Consultar la configuración de propinas
    s = db.scalar(
        select(TipSetting).where(TipSetting.business_id == l.business_id)
    )

    # 4. Validar disponibilidad del empleado
    if (
        not e
        or e.business_id != l.business_id
        or not e.active
        or (l.fixed_employee_id and e.id != l.fixed_employee_id)
    ):
        raise HTTPException(422, "Empleado no válido")

    # 5. Validar rangos de importe permitido
    if s and (
        payload.amount < float(s.minimum_amount)
        or payload.amount > float(s.maximum_amount)
    ):
        raise HTTPException(422, "Importe fuera de los límites permitidos")

    # 6. Validar configuración de Stripe
    if not settings.stripe_secret_key:
        raise HTTPException(503, "Los pagos aún no están configurados")

    if not b or not b.stripe_account_id:
        raise HTTPException(409, "Este negocio aún no ha conectado Stripe")

    stripe.api_key = settings.stripe_secret_key

    # 7. Normalización estricta de quién asume las comisiones
    raw_fee_payer = getattr(s, "fee_payer", "business") if s else "business"
    fee_payer = "customer" if raw_fee_payer in ["customer", "CLIENT"] else "business"

    # 8. Importe base de la propina en céntimos
    tip_cents = int(round(payload.amount * 100))

    # 9. Cálculo del total cobrado al cliente según el modelo de comisión
    if fee_payer == "customer":
        propi_fixed = settings.propi_fixed_fee_cents  # Ej: 10 céntimos
        stripe_fixed = getattr(settings, "stripe_fixed_fee_cents", 25)  # 25 céntimos
        stripe_pct = getattr(settings, "stripe_fee_percent", 0.015)      # 1.5%

        # Recargo dinámico para garantizar propina completa + 0,10 € Propi tras pagar la pasarela
        customer_total_cents = math.ceil(
            (tip_cents + propi_fixed + stripe_fixed) / (1 - stripe_pct)
        )
    else:
        # El restaurante asume gastos: el cliente paga únicamente la propina
        customer_total_cents = tip_cents

    # 10. Único ítem unificado para eliminar fricción en la pasarela Stripe Checkout
    unit_amount = customer_total_cents if fee_payer == "customer" else tip_cents

    items = [
        {
            "price_data": {
                "currency": b.currency.lower(),
                "product_data": {
                    "name": f"Propina para {e.name}",
                },
                "unit_amount": unit_amount,
            },
            "quantity": 1,
        }
    ]

    # 11. Metadatos de auditoría para el Webhook
    metadata = {
        "business_id": str(l.business_id),
        "employee_id": str(e.id),
        "location_id": str(l.id),
        "fee_payer": fee_payer,
        "tip_cents": str(tip_cents),
        "propi_fixed_fee_cents": str(settings.propi_fixed_fee_cents),
        "customer_total_cents": str(customer_total_cents),
    }

    # 12. Creación de la sesión de Checkout
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=items,
        metadata=metadata,
        payment_intent_data={
            "metadata": metadata,
            "transfer_data": {
                "destination": b.stripe_account_id,
            },
        },
        success_url=f"{settings.app_url}/thank-you?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.app_url}/l/{payload.public_token}",
    )

    return {
        "checkout_url": session.url,
        "fee_payer": fee_payer,
        "tip_amount": tip_cents / 100.0,
        "total": customer_total_cents / 100.0,
    }
