import re
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Business, Employee, Location, TipSetting
from ..services.qr_service import generate_table_card_png, png

router = APIRouter(tags=['public-qr'])


@router.get('/public/locations/{token}')
def public_location(token: str, db: Session = Depends(get_db)):
    location = db.scalar(
        select(Location).where(
            Location.public_token == token, Location.active.is_(True)
        )
    )
    if not location:
        raise HTTPException(404, 'Este código QR no está disponible')

    business = db.get(Business, location.business_id)
    settings_db = db.scalar(
        select(TipSetting).where(TipSetting.business_id == business.id)
    )
    employees = db.scalars(
        select(Employee).where(
            Employee.business_id == business.id, Employee.active.is_(True)
        )
    ).all()

    if location.fixed_employee_id:
        employees = [
            employee
            for employee in employees
            if employee.id == location.fixed_employee_id
        ]

    return {
        'business_name': business.name,
        'logo_url': business.logo_url,
        'location_name': location.name,
        'employees': [
            {
                'id': e.id,
                'name': e.name,
                'photo_url': (
                    e.photo_url if settings_db.show_employee_photos else None
                ),
            }
            for e in employees
        ],
        'suggested_amounts': [float(x) for x in location.suggested_amounts],
        'minimum_amount': float(settings_db.minimum_amount),
        'maximum_amount': float(settings_db.maximum_amount),
    }


@router.get('/public/locations/{token}/qr.png')
def download_qr(token: str, db: Session = Depends(get_db)):
    location = db.scalar(
        select(Location).where(
            Location.public_token == token, Location.active.is_(True)
        )
    )
    if not location:
        raise HTTPException(404, 'Este código QR no está disponible')

    base_url = settings.app_url.rstrip('/')
    qr_target_url = f"{base_url}/r/{token}"

    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', location.name)
    filename = f"qr-{safe_name}.png"

    return Response(
        content=png(qr_target_url),
        media_type='image/png',
        headers={
            'Content-Disposition': f'attachment; filename="{filename}"'
        },
    )


@router.get('/public/locations/{token}/card.png')
def download_table_card(token: str, db: Session = Depends(get_db)):
    location = db.scalar(
        select(Location).where(
            Location.public_token == token, Location.active.is_(True)
        )
    )
    if not location:
        raise HTTPException(404, 'Este código QR no está disponible')

    business = db.get(Business, location.business_id)
    base_url = settings.app_url.rstrip('/')
    qr_target_url = f"{base_url}/r/{token}"

    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', location.name)
    filename = f"tarjeta-mesa-{safe_name}.png"

    card_bytes = generate_table_card_png(
        url=qr_target_url,
        location_name=location.name,
        business_name=business.name,
    )

    return Response(
        content=card_bytes,
        media_type='image/png',
        headers={
            'Content-Disposition': f'attachment; filename="{filename}"'
        },
    )
