import html
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Employee

logger = logging.getLogger(__name__)
router = APIRouter(tags=["stripe-connect-webhooks"])


def send_gmail_smtp(to_email: str, subject: str, html_body: str) -> None:
    """Envía correos reales desde soportepropi@gmail.com usando SMTP de Google."""
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_email or not smtp_password:
        raise RuntimeError("SMTP_EMAIL o SMTP_PASSWORD no están configurados")
    if not to_email:
        raise ValueError("El empleado no tiene un correo asignado")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Propi <{smtp_email}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(smtp_email, smtp_password)
        server.sendmail(smtp_email, to_email, msg.as_string())


def send_employee_identity_email(employee: Employee) -> None:
    """Send the employee a Stripe-hosted link for outstanding identity requirements."""
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
        collection_options={"fields": "currently_due"},
    )

    name = html.escape(employee.name or "")
    html_content = (
        f"<p>Hola <strong>{name}</strong>,</p>"
        "<p>Stripe necesita verificar tu identidad para habilitar los pagos. "
        "Completa el proceso de forma segura desde este enlace:</p>"
        f'<p><a href="{html.escape(account_link.url, quote=True)}">'
        "Completar verificación de Stripe</a></p>"
    )
    send_gmail_smtp(
        to_email=employee.email,
        subject="Completa la verificación de tu cuenta de Stripe",
        html_body=html_content,
    )
    logger.info("Identity email sent via Gmail SMTP for employee %s", employee.id)


def process_employee_account_update(account: dict, db: Session) -> None:
    """Apply Stripe's account requirements as the source of truth for employee status."""
    account_id = account.get("id")
    if not account_id:
        return

    employee = db.scalar(select(Employee).where(Employee.stripe_account_id == account_id))
    if not employee:
        logger.warning("Stripe account.updated did not match an employee: %s", account_id)
        return

    requirements = account.get("requirements") or {}
    currently_due = requirements.get("currently_due") or []
    past_due = requirements.get("past_due") or []
    pending_verification = requirements.get("pending_verification") or []
    disabled_reason = requirements.get("disabled_reason")
    previous_status = employee.stripe_status

    needs_identity_action = bool(currently_due or past_due or disabled_reason)
    is_verification_pending = bool(pending_verification)
    fully_verified = bool(
        account.get("details_submitted")
        and account.get("payouts_enabled")
        and not needs_identity_action
        and not is_verification_pending
    )

    if fully_verified:
        employee.stripe_status = "active"
        employee.stripe_onboarding_completed = True
        employee.active = True
    elif needs_identity_action or is_verification_pending:
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
        "Synced employee Stripe status: employee_id=%s account_id=%s previous=%s current=%s "
        "currently_due=%s past_due=%s pending_verification=%s disabled_reason=%s",
        employee.id,
        account_id,
        previous_status,
        employee.stripe_status,
        currently_due,
        past_due,
        pending_verification,
        disabled_reason,
    )

    # Enviar correo automático al pasar a identity_pending o active
    if employee.stripe_status == "identity_pending" and previous_status != "identity_pending" and employee.email:
        try:
            send_employee_identity_email(employee)
        except Exception:
            logger.exception("Could not send identity email for employee %s", employee.id)
    elif employee.stripe_status == "active" and previous_status != "active" and employee.email:
        try:
            html_content = (
                f"<p>Hola <strong>{html.escape(employee.name or '')}</strong>,</p>"
                "<p>La verificación de Stripe está completa. Ya puedes recibir propinas.</p>"
            )
            send_gmail_smtp(
                to_email=employee.email,
                subject="Tu cuenta de Stripe está activa",
                html_body=html_content,
            )
            logger.info("Activation email sent via Gmail SMTP for employee %s", employee.id)
        except Exception:
            logger.exception("Could not send activation email for employee %s", employee.id)


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
        logger.info("Received Stripe Connect account.updated event %s", event.get("id"))
        process_employee_account_update(event["data"]["object"], db)
    return {"received": True}
