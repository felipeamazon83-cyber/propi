import html
import logging

import resend
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Employee

logger = logging.getLogger(__name__)
router = APIRouter(tags=["stripe-connect-webhooks"])


def send_employee_identity_email(employee: Employee) -> None:
    """Send the employee a Stripe-hosted link for outstanding identity requirements."""
    if not settings.resend_api_key:
        logger.error("RESEND_API_KEY is missing; cannot email employee %s", employee.id)
        return
    if not employee.email or not employee.stripe_account_id:
        logger.error("Employee %s is missing email or Stripe account ID", employee.id)
        return

    stripe.api_key = settings.stripe_secret_key
    account_link = stripe.AccountLink.create(
        account=employee.stripe_account_id,
        refresh_url=f"{settings.app_url}/dashboard/settings?onboarding=refresh",
        return_url=f"{settings.app_url}/dashboard/settings?onboarding=success",
        type="account_onboarding",
        collection_options={"fields": "currently_due"},
    )

    resend.api_key = settings.resend_api_key
    name = html.escape(employee.name or "")
    resend.Emails.send({
        "from": settings.resend_from,
        "to": [employee.email],
        "subject": "Completa la verificación de tu cuenta de Stripe",
        "html": (
            f"<p>Hola <strong>{name}</strong>,</p>"
            "<p>Stripe necesita verificar tu identidad para habilitar los pagos. "
            "Completa el proceso de forma segura desde este enlace:</p>"
            f'<p><a href="{html.escape(account_link.url, quote=True)}">'
            "Completar verificación de Stripe</a></p>"
        ),
    })


def process_employee_account_update(account: dict, db: Session) -> None:
    """Apply Stripe's account requirements as the source of truth for employee status."""
    account_id = account.get("id")
    if not account_id:
        return

    employee = db.scalar(
        select(Employee).where(Employee.stripe_account_id == account_id)
    )
    if not employee:
        logger.warning("Stripe account.updated did not match an employee: %s", account_id)
        return

    requirements = account.get("requirements") or {}
    currently_due = requirements.get("currently_due") or []
    past_due = requirements.get("past_due") or []
    pending_verification = requirements.get("pending_verification") or []
    disabled_reason = requirements.get("disabled_reason")

    previous_status = employee.stripe_status
    has_identity_work = bool(
        currently_due or past_due or pending_verification or disabled_reason
    )
    fully_verified = bool(
        account.get("details_submitted")
        and account.get("payouts_enabled")
        and not has_identity_work
    )

    if fully_verified:
        employee.stripe_status = "active"
        employee.stripe_onboarding_completed = True
    elif has_identity_work:
        employee.stripe_status = "identity_pending"
        employee.stripe_onboarding_completed = False
    else:
        # Do not mark the employee active merely because payouts_enabled is true;
        # Stripe must also confirm details_submitted and no outstanding verification.
        employee.stripe_status = "pending"
        employee.stripe_onboarding_completed = False

    db.commit()
    db.refresh(employee)

    # Send the identity link only on the transition into identity_pending.
    if employee.stripe_status == previous_status:
        return

    try:
        if employee.stripe_status == "identity_pending":
            send_employee_identity_email(employee)
        elif employee.stripe_status == "active" and employee.email and settings.resend_api_key:
            resend.api_key = settings.resend_api_key
            resend.Emails.send({
                "from": settings.resend_from,
                "to": [employee.email],
                "subject": "Tu cuenta de Stripe está activa",
                "html": (
                    f"<p>Hola <strong>{html.escape(employee.name or '')}</strong>,</p>"
                    "<p>La verificación de Stripe está completa. Ya puedes recibir propinas.</p>"
                ),
            })
    except Exception:
        # Email failures must be visible in logs but must not cause Stripe retries
        # after the database state has already been committed.
        logger.exception("Could not send onboarding email for employee %s", employee.id)


@router.post("/webhooks/stripe-connect")
async def stripe_connect_webhook(request: Request, db: Session = Depends(get_db)):
    """Process connected-account updates; configure Stripe to send account.updated here."""
    if not settings.stripe_secret_key or not settings.stripe_webhook_secret_connect:
        raise HTTPException(503, "Webhook de Stripe Connect no configurado")

    stripe.api_key = settings.stripe_secret_key
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(
            payload, signature, settings.stripe_webhook_secret_connect
        )
    except (stripe.error.SignatureVerificationError, ValueError):
        raise HTTPException(400, "Firma de webhook inválida")

    if event["type"] == "account.updated":
        process_employee_account_update(event["data"]["object"], db)

    return {"received": True}
