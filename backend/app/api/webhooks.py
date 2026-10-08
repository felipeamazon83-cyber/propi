import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Employee, Tip

router = APIRouter(tags=["webhooks"])


def cents(metadata: dict, key: str) -> float:
    return int(metadata.get(key, "0")) / 100


def get_stripe_fee_cents(intent: stripe.PaymentIntent) -> int:
    """Extrae la comisión real cobrada por Stripe expandiendo balance_transaction."""
    if not intent.latest_charge:
        return 0

    charge = intent.latest_charge
    if isinstance(charge, str):
        stripe.api_key = settings.stripe_secret_key
        charge = stripe.Charge.retrieve(charge, expand=["balance_transaction"])

    if charge and charge.balance_transaction:
        if isinstance(charge.balance_transaction, str):
            stripe.api_key = settings.stripe_secret_key
            txn = stripe.BalanceTransaction.retrieve(charge.balance_transaction)
            return txn.fee
        return charge.balance_transaction.fee

    return 0


def record_paid_tip(
    *,
    intent: stripe.PaymentIntent,
    checkout_session_id: str | None,
    transfer_id: str | None,
    db: Session,
) -> None:
    """Persiste e idénticamente procesa la propina aplicando las reglas dinámicas de comisiones."""
    payment_intent_id = intent.id
    metadata = intent.metadata or {}

    # 1. Comprobación de Idempotencia
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

    # 2. Validación de metadatos requeridos
    required = ("business_id", "location_id", "tip_cents", "fee_payer")
    if not all(metadata.get(key) for key in required):
        raise ValueError("Missing Propi payment metadata")

    # 3. Datos base de la transacción
    fee_payer = metadata.get("fee_payer", "business")
    tip_cents = int(metadata.get("tip_cents", 0))
    customer_total_cents = intent.amount  # Cobro real en la pasarela

    # 4. Obtención de comisión real de Stripe
    stripe_fee_cents = get_stripe_fee_cents(intent)
    propi_base_fee_cents = settings.propi_fixed_fee_cents  # 10 céntimos

    # 5. Aplicación del modelo de negocio acordado
    if fee_payer == "customer":
        # EL EMPLEADO RECIBE EL 100% DE SU PROPINA
        connected_payout_cents = tip_cents
        # PROPI ABSORBE CUALQUIER VARIACIÓN DE LA TARJETA
        propi_net_margin_cents = customer_total_cents - tip_cents - stripe_fee_cents
    else:
        # PROPI GARANTIZA SUS 10 CÉNTIMOS
        propi_net_margin_cents = propi_base_fee_cents
        # EL EMPLEADO/NEGOCIO ABSORBE STRIPE Y PROPI
        connected_payout_cents = max(
            0, tip_cents - propi_base_fee_cents - stripe_fee_cents
        )

    # 6. Guardado en BD
    db.add(
        Tip(
            business_id=metadata["business_id"],
            employee_id=metadata.get("employee_id"),
            location_id=metadata["location_id"],
            amount=tip_cents / 100.0,
            customer_total=customer_total_cents / 100.0,
            connected_account_payout=connected_payout_cents / 100.0,
            platform_fixed_fee=propi_net_margin_cents / 100.0,
            platform_percentage_fee=stripe_fee_cents / 100.0,
            currency=intent.currency.upper(),
            status="paid",
            stripe_checkout_session_id=checkout_session_id,
            stripe_payment_intent_id=payment_intent_id,
            stripe_transfer_id=transfer_id,
        )
    )
    db.commit()


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    stripe.api_key = settings.stripe_secret_key

    # Recopilar secretos de webhook
    webhook_secrets = []
    secret_main = getattr(settings, "stripe_webhook_secret_main", None)
    secret_connect = getattr(settings, "stripe_webhook_secret_connect", None)
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
    for secret in webhook_secrets:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, secret)
            break
        except (stripe.error.SignatureVerificationError, ValueError):
            continue

    if not event:
        raise HTTPException(400, "Firma de webhook inválida")

    obj, kind = event["data"]["object"], event["type"]

    try:
        # 1. Actualización de onboarding de Empleado (Connect)
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

        # 2. Checkout Session completado
        elif kind == "checkout.session.completed" and obj.get("payment_status") == "paid":
            payment_intent_id = obj.get("payment_intent")
            if payment_intent_id:
                # Recuperamos el intent expandiendo latest_charge para tener la tarifa real
                intent = stripe.PaymentIntent.retrieve(
                    payment_intent_id,
                    expand=["latest_charge.balance_transaction"],
                )
                record_paid_tip(
                    intent=intent,
                    checkout_session_id=obj["id"],
                    transfer_id=None,
                    db=db,
                )

        # 3. PaymentIntent exitoso
        elif kind == "payment_intent.succeeded":
            intent = stripe.PaymentIntent.retrieve(
                obj["id"],
                expand=["latest_charge.balance_transaction"],
            )
            transfer = obj.get("transfer_data") or {}
            record_paid_tip(
                intent=intent,
                checkout_session_id=None,
                transfer_id=transfer.get("id"),
                db=db,
            )

        # 4. Errores de Pago
        elif kind == "payment_intent.payment_failed":
            tip = db.scalar(select(Tip).where(Tip.stripe_payment_intent_id == obj["id"]))
            if tip:
                tip.status = "failed"
                db.commit()

        # 5. Reembolsos
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
