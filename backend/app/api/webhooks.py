import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Employee, Tip

router = APIRouter()


def cents(metadata: dict, key: str) -> float:
    return int(metadata.get(key, "0")) / 100


def record_paid_tip(
    *,
    metadata: dict,
    payment_intent_id: str | None,
    checkout_session_id: str | None,
    currency: str,
    transfer_id: str | None,
    db: Session,
) -> None:
    """Idempotently persist a successful one-off payment and its payout breakdown."""
    existing = None
    if checkout_session_id:
        existing = db.scalar(
            select(Tip).where(Tip.stripe_checkout_session_id == checkout_session_id)
        )
    if not existing and payment_intent_id:
        existing = db.scalar(
            select(Tip).where(Tip.stripe_payment_intent_id == payment_intent_id)
        )

    if existing:
        existing.status = "paid"
        existing.stripe_payment_intent_id = (
            payment_intent_id or existing.stripe_payment_intent_id
        )
        existing.stripe_checkout_session_id = (
            checkout_session_id or existing.stripe_checkout_session_id
        )
        existing.stripe_transfer_id = transfer_id or existing.stripe_transfer_id
        db.commit()
        return

    required = ("business_id", "location_id", "tip_cents", "payout_cents")
    if not all(metadata.get(key) for key in required):
        raise ValueError("Missing Propi payment metadata")

    db.add(
        Tip(
            business_id=metadata["business_id"],
            employee_id=metadata.get("employee_id"),
            location_id=metadata["location_id"],
            amount=cents(metadata, "tip_cents"),
            platform_fixed_fee=cents(metadata, "propi_fixed_fee_cents"),
            platform_percentage_fee=cents(metadata, "propi_percentage_fee_cents"),
            customer_total=cents(metadata, "tip_cents")
            + cents(metadata, "propi_fixed_fee_cents")
            + cents(metadata, "propi_percentage_fee_cents"),
            connected_account_payout=cents(metadata, "payout_cents"),
            currency=currency.upper(),
            status="paid",
            stripe_checkout_session_id=checkout_session_id,
            stripe_payment_intent_id=payment_intent_id,
            stripe_transfer_id=transfer_id,
        )
    )
    db.commit()


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    # Recopilar todos los secretos disponibles de la configuración
    webhook_secrets = []
    
    # Soporte para las variables duales
    secret_main = getattr(settings, "stripe_webhook_secret_main", None)
    secret_connect = getattr(settings, "stripe_webhook_secret_connect", None)
    
    # Fallback al secreto original si no se hubieran definido las duales
    secret_default = getattr(settings, "stripe_webhook_secret", None)

    if secret_main:
        webhook_secrets.append(secret_main)
    if secret_connect:
        webhook_secrets.append(secret_connect)
    if secret_default and secret_default not in webhook_secrets:
        webhook_secrets.append(secret_default)

    if not webhook_secrets:
        raise HTTPException(503, "Webhook no configurado")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    event = None
    # Iterar sobre los secretos configurados hasta encontrar el que valida la firma
    for secret in webhook_secrets:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, secret)
            break  # Firma verificada con éxito
        except (stripe.error.SignatureVerificationError, ValueError):
            continue

    if not event:
        raise HTTPException(400, "Firma de webhook inválida")

    obj, kind = event["data"]["object"], event["type"]

    try:
        # 1. Evento de actualización de cuenta Connect (Empleado)
        if kind == "account.updated":
            account_id = obj.get("id")
            details_submitted = obj.get("details_submitted", False)
            payouts_enabled = obj.get("payouts_enabled", False)

            if details_submitted or payouts_enabled:
                employee = db.scalar(
                    select(Employee).where(Employee.stripe_account_id == account_id)
                )
                if employee and not employee.stripe_onboarding_completed:
                    employee.stripe_onboarding_completed = True
                    db.commit()

        # 2. Eventos de cobros y propinas (Tip)
        elif kind == "checkout.session.completed" and obj.get("payment_status") == "paid":
            record_paid_tip(
                metadata=obj.get("metadata", {}),
                payment_intent_id=obj.get("payment_intent"),
                checkout_session_id=obj["id"],
                currency=obj["currency"],
                transfer_id=None,
                db=db,
            )
        elif kind == "payment_intent.succeeded":
            transfer = obj.get("transfer_data") or {}
            record_paid_tip(
                metadata=obj.get("metadata", {}),
                payment_intent_id=obj["id"],
                checkout_session_id=None,
                currency=obj["currency"],
                transfer_id=transfer.get("id"),
                db=db,
            )
        elif kind == "payment_intent.payment_failed":
            tip = db.scalar(select(Tip).where(Tip.stripe_payment_intent_id == obj["id"]))
            if tip:
                tip.status = "failed"
                db.commit()
        elif kind == "charge.refunded":
            tip = db.scalar(
                select(Tip).where(Tip.stripe_payment_intent_id == obj.get("payment_intent"))
            )
            if tip:
                tip.status = "refunded"
                db.commit()

    except ValueError as error:
        raise HTTPException(400, str(error))

    return {"received": True}
