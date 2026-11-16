import html
import json
import logging
import os
import urllib.request

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Employee

logger = logging.getLogger(__name__)
router = APIRouter(tags=["stripe-connect-webhooks"])


def send_brevo_email(to_email: str, subject: str, html_body: str) -> None:
    """Envía correos vía API HTTP (puerto 443, sin bloqueo en Render) desde soportepropi@gmail.com."""
    brevo_api_key = os.getenv("BREVO_API_KEY")
    sender_email = os.getenv("SMTP_EMAIL", "soportepropi@gmail.com")

    if not brevo_api_key:
        raise RuntimeError("Falta la variable BREVO_API_KEY en Render")
    if not to_email:
        raise ValueError("El empleado no tiene un correo asignado")

    payload = json.dumps({
        "sender": {"name": "Propi", "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_body,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=payload,
        headers={
            "accept": "application/json",
            "api-key": brevo_api_key,
            "content-type": "application/json",
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=10) as response:
        if response.status not in (200, 201, 202):
            raise RuntimeError(f"Brevo devolvió estado HTTP {response.status}")


def send_employee_identity_email(employee: Employee) -> str:
    """Genera el enlace de Stripe incluyendo requisitos futuros (DNI/Documento) y lo envía por correo."""
    if not employee.email:
        raise ValueError("El empleado no tiene un correo asignado")
    if not employee.stripe_account_id:
        raise ValueError("El empleado no tiene una cuenta Stripe asociada")

    stripe.api_key = settings.stripe_secret_key
    account_link = stripe.AccountLink.create(
        account=employee.stripe_account_id,
        refresh_url=f"{settings.app_url}/dashboard/settings?onboarding=refresh",
        return_url=f"{settings.app_url}/dashboard/settings?onboarding=success",
        type="account_onboarding",
        collection_options={
            "fields": "eventually_due",
            "future_requirements": "include",
        },
    )

    name = html.escape(employee.name or "")
    html_content = (
        f"<p>Hola <strong>{name}</strong>,</p>"
        "<p>Stripe necesita verificar tu documento de identidad para habilitar los pagos y transferencias. "
        "Completa este último paso de forma segura desde el siguiente enlace:</p>"
        f'<p><a href="{html.escape(account_link.url, quote=True)}">'
        "Subir documento de identidad en Stripe</a></p>"
    )
    send_brevo_email(
        to_email=employee.email,
        subject="Acción requerida: Verifica tu documento de identidad en Stripe",
        html_body=html_content,
    )
    logger.info("Identity email sent via Brevo for employee %s (%s)", employee.id, employee.email)
    return account_link.url


def process_employee_account_update(account: dict, db: Session) -> None:
    """Evalúa requisitos actuales y futuros de Stripe para evitar falsos activos."""
    account_id = account.get("id")
    if not account_id:
        return

    employee = db.scalar(select(Employee).where(Employee.stripe_account_id == account_id))
    if not employee:
        logger.warning("Stripe account.updated did not match an employee: %s", account_id)
        return

    requirements = account.get("requirements") or {}
    future_req = account.get("future_requirements") or {}

    currently_due = requirements.get("currently_due") or []
    past_due = requirements.get("past_due") or []
    eventually_due = requirements.get("eventually_due") or []
    pending_verification = requirements.get("pending_verification") or []
    disabled_reason = requirements.get("disabled_reason")

    future_currently_due = future_req.get("currently_due") or []
    future_eventually_due = future_req.get("eventually_due") or []
    future_pending = future_req.get("pending_verification") or []

    previous_status = employee.stripe_status

    has_pending_requirements = bool(
        currently_due
        or past_due
        or eventually_due
        or disabled_reason
        or future_currently_due
        or future_eventually_due
    )
    is_under_review = bool(pending_verification or future_pending)

    fully_verified = bool(
        account.get("details_submitted")
        and account.get("payouts_enabled")
        and not has_pending_requirements
        and not is_under_review
    )

    if fully_verified:
        employee.stripe_status = "active"
        employee.stripe_onboarding_completed = True
        employee.active = True
    elif account.get("details_submitted") or has_pending_requirements or is_under_review:
        employee.stripe_status = "identity_pending"
        employee.stripe_onboarding_completed = False
        employee.active = False
    else:
        employee.stripe_status = "pending"
        employee.stripe_onboarding_completed = False
        employee.active = False

    db.commit()
    db.refresh(employee)
    logger.info(
        "Synced employee Stripe status: employee_id=%s previous=%s current=%s "
        "currently_due=%s eventually_due=%s future_eventually_due=%s pending=%s",
        employee.id,
        previous_status,
        employee.stripe_status,
        currently_due,
        eventually_due,
        future_eventually_due,
        pending_verification,
    )

    # Dispara el correo cuando entra en identity_pending (para subir el DNI) o cuando pasa a active
    if employee.stripe_status == "identity_pending" and previous_status != "identity_pending" and employee.email:
        try:
            send_employee_identity_email(employee)
        except Exception:
            logger.exception("Could not send identity email for employee %s", employee.id)
    elif employee.stripe_status == "active" and previous_status != "active" and employee.email:
        try:
            html_content = (
                f"<p>Hola <strong>{html.escape(employee.name or '')}</strong>,</p>"
                "<p>Tu documento de identidad ha sido verificado por Stripe. Ya puedes recibir propinas.</p>"
            )
            send_brevo_email(
                to_email=employee.email,
                subject="Tu cuenta de Stripe está activa",
                html_body=html_content,
            )
            logger.info("Activation email sent via Brevo for employee %s", employee.id)
        except Exception:
            logger.exception("Could not send activation email for employee %s", employee.id)


@router.post("/webhooks/stripe-connect")
async def stripe_connect_webhook(request: Request, db: Session = Depends(get_db)):
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
        logger.info("Received Stripe Connect account.updated event %s", event.get("id"))
        process_employee_account_update(event["data"]["object"], db)
    return {"received": True}
