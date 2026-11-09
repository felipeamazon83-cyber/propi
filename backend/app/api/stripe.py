import os
import stripe
import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import current_user
from ..config import settings
from ..database import get_db
from .deps import owned_business

router = APIRouter(prefix="/stripe", tags=["stripe-connect"])


def send_email_to_employee(to_email: str, subject: str, html_content: str):
    """Función auxiliar para enviar correos de forma segura usando Resend."""
    resend_api_key = os.getenv("RESEND_API_KEY") or getattr(settings, "resend_api_key", None)
    
    if resend_api_key:
        try:
            response = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": "Propi <onboarding@resend.dev>",
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content,
                },
            )
            print("Respuesta de Resend:", response.status_code, response.text)
            return response.json()
        except Exception as e:
            print(f"Error enviando correo con Resend: {e}")
    
    # Fallback en logs si no hay API key configurada
    print(f"--- SIMULACIÓN DE CORREO A {to_email} ---")
    print(f"Asunto: {subject}")
    print(f"Contenido: {html_content}")
    print("------------------------------------------")


@router.post("/connect")
def create_connect_onboarding(
    business_id: str,
    user: str = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Crea la cuenta Express estándar y genera la URL redirigiendo al empleado fuera de los dashboards."""
    business = owned_business(business_id, user, db)

    if not settings.stripe_secret_key:
        raise HTTPException(
            503, "Stripe Connect aún no está configurado"
        )

    stripe.api_key = settings.stripe_secret_key

    # 1. Crear cuenta Express estándar con la capacidad de verificación solicitada
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

    # 2. Generar enlace redirigiendo a una pantalla pública de agradecimiento/éxito
    link = stripe.AccountLink.create(
        account=business.stripe_account_id,
        refresh_url=f"{settings.app_url}/onboarding/exito?status=refresh",
        return_url=f"{settings.app_url}/onboarding/exito?status=completed",
        type="account_onboarding",
        collection_options={
            "fields": "eventually_due",
        },
    )

    return {"onboarding_url": link.url}


@router.post("/send-identity-email")
def send_identity_verification_email(
    business_id: str,
    employee_email: str,
    user: str = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Envía un correo al empleado con el enlace exclusivo para subir su DNI."""
    business = owned_business(business_id, user, db)

    if not business.stripe_account_id:
        raise HTTPException(400, "El negocio no tiene una cuenta de Stripe asociada")

    stripe.api_key = settings.stripe_secret_key

    # Genera enlace directo a la verificación de identidad (currently_due)
    link = stripe.AccountLink.create(
        account=business.stripe_account_id,
        refresh_url=f"{settings.app_url}/onboarding/exito",
        return_url=f"{settings.app_url}/onboarding/exito",
        type="account_onboarding",
        collection_options={
            "fields": "currently_due",
        },
    )

    subject = "Acción requerida: Completa la verificación de tu cuenta en Propi"
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Verificación de Identidad</h2>
        <p>Hola,</p>
        <p>Para poder habilitar la recepción de tus pagos y propinas, Stripe necesita verificar tu documento de identidad (DNI/NIE).</p>
        <p style="margin: 30px 0;">
            <a href="{link.url}" style="background-color: #635bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Subir documento de identidad</a>
        </p>
        <p style="color: #666; font-size: 14px;">Este proceso es seguro y gestionado directamente por Stripe.</p>
    </div>
    """

    send_email_to_employee(employee_email, subject, html_content)

    return {"message": "Correo de verificación enviado correctamente al empleado"}
