import os
from datetime import datetime
from typing import Optional
from uuid import UUID

import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import case, cast, func, select
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Session

from ..auth import current_user
from ..database import get_db
from ..models import Business, Employee, Tip

# Configuración de clave API de Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(tags=["dashboard"])


class PayoutRequest(BaseModel):
    amount: float
    currency: Optional[str] = "EUR"


def get_user_business(business_id: UUID, user_id: UUID, db: Session) -> Business:
    business = db.scalar(
        select(Business).where(
            cast(Business.id, PG_UUID) == business_id,
            cast(Business.owner_id, PG_UUID) == user_id,
        )
    )
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Negocio no encontrado o no tienes permisos para acceder.",
        )
    return business


# --------------------------------------------------------------------------
# 1. Endpoint Unificado Dashboard Summary (Optimizado sin bucle N+1)
# --------------------------------------------------------------------------
@router.get("/businesses/{business_id}/dashboard-summary")
def get_dashboard_summary(
    business_id: UUID,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    user_uuid = user if isinstance(user, UUID) else UUID(str(user))
    b_uuid = business_id if isinstance(business_id, UUID) else UUID(str(business_id))

    # 1. Validar propiedad del negocio
    business = get_user_business(b_uuid, user_uuid, db)

    # 2. Métricas globales del negocio en una sola consulta
    global_stats = db.execute(
        select(
            func.coalesce(func.sum(Tip.amount), 0.0).label("total_amount"),
            func.count(Tip.id).label("total_count"),
        ).where(
            cast(Tip.business_id, PG_UUID) == b_uuid,
            Tip.status == "paid",
        )
    ).first()

    total_amount = float(global_stats.total_amount) if global_stats else 0.0
    total_count = global_stats.total_count if global_stats else 0
    average = (total_amount / total_count) if total_count > 0 else 0.0

    # 3. Obtener todos los empleados activos
    employees = db.scalars(
        select(Employee).where(
            cast(Employee.business_id, PG_UUID) == b_uuid,
            Employee.active.is_(True),
        )
    ).all()

    if not employees:
        return {
            "business": {
                "id": str(business.id),
                "name": business.name,
                "currency": getattr(business, "currency", "EUR"),
            },
            "summary": {
                "total_amount": total_amount,
                "total_count": total_count,
                "average": round(average, 2),
            },
            "by_employee": [],
        }

    e_uuids = [emp.id if isinstance(emp.id, UUID) else UUID(str(emp.id)) for emp in employees]

    # 4. CONSULTA UNIFICADA (Evita bucles N+1): Agrupa las estadísticas de todos los empleados de un solo golpe
    tips_stats = db.execute(
        select(
            Tip.employee_id,
            func.count(Tip.id).label("emp_count"),
            func.coalesce(
                func.sum(case((Tip.payout_status == "paid", Tip.amount), else_=0.0)), 0.0
            ).label("paid_total"),
            func.coalesce(
                func.sum(case((Tip.payout_status == "pending", Tip.connected_account_payout), else_=0.0)), 0.0
            ).label("pending_total"),
        )
        .where(
            cast(Tip.business_id, PG_UUID) == b_uuid,
            cast(Tip.employee_id, PG_UUID).in_(e_uuids),
            Tip.status == "paid",
        )
        .group_by(Tip.employee_id)
    ).all()

    # Convertimos los resultados en un diccionario de acceso rápido por employee_id
    stats_map = {
        str(row.employee_id): {
            "emp_count": row.emp_count,
            "paid_total": float(row.paid_total),
            "pending_total": float(row.pending_total),
        }
        for row in tips_stats
    }

    by_employee = []
    for emp in employees:
        emp_id_str = str(emp.id)
        emp_data = stats_map.get(emp_id_str, {"emp_count": 0, "paid_total": 0.0, "pending_total": 0.0})

        by_employee.append(
            {
                "employee_id": emp_id_str,
                "name": emp.name,
                "total_amount": emp_data["paid_total"],
                "tips_count": emp_data["emp_count"],
                "pending_amount": emp_data["pending_total"],
                "stripe_account_id": getattr(emp, "stripe_account_id", None),
                "stripe_onboarding_completed": getattr(emp, "stripe_onboarding_completed", False),
            }
        )

    return {
        "business": {
            "id": str(business.id),
            "name": business.name,
            "currency": getattr(business, "currency", "EUR"),
        },
        "summary": {
            "total_amount": total_amount,
            "total_count": total_count,
            "average": round(average, 2),
        },
        "by_employee": by_employee,
    }


# --------------------------------------------------------------------------
# 2. Endpoint de Transferencia Directa (Payout) vía Stripe Connect
# --------------------------------------------------------------------------
@router.post("/businesses/{business_id}/employees/{employee_id}/payout")
def execute_employee_payout(
    business_id: UUID,
    employee_id: UUID,
    payload: PayoutRequest,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    user_uuid = user if isinstance(user, UUID) else UUID(str(user))
    b_uuid = business_id if isinstance(business_id, UUID) else UUID(str(business_id))
    e_uuid = employee_id if isinstance(employee_id, UUID) else UUID(str(employee_id))

    business = get_user_business(b_uuid, user_uuid, db)

    employee = db.scalar(
        select(Employee).where(
            cast(Employee.id, PG_UUID) == e_uuid,
            cast(Employee.business_id, PG_UUID) == business.id,
        )
    )

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado.",
        )

    stripe_account = getattr(employee, "stripe_account_id", None)
    if not stripe_account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El empleado no posee una cuenta de Stripe/IBAN vinculada.",
        )

    if payload.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El monto a transferir debe ser mayor a 0.",
        )

    amount_in_cents = int(round(payload.amount * 100))
    currency = payload.currency.lower() if payload.currency else "eur"

    try:
        transfer = stripe.Transfer.create(
            amount=amount_in_cents,
            currency=currency,
            destination=stripe_account,
            description=f"Pago de propinas acumuladas - {employee.name}",
        )

        unpaid_tips = db.scalars(
            select(Tip).where(
                cast(Tip.business_id, PG_UUID) == b_uuid,
                cast(Tip.employee_id, PG_UUID) == e_uuid,
                Tip.status == "paid",
                Tip.payout_status == "pending",
            )
        ).all()

        now_utc = datetime.utcnow()
        for tip in unpaid_tips:
            tip.payout_status = "paid"
            tip.stripe_transfer_id = transfer.id
            tip.paid_at = now_utc

        db.commit()

        return {
            "status": "success",
            "message": f"Transferencia de {payload.amount} {currency.upper()} realizada y registrada correctamente.",
            "transfer_id": transfer.id,
            "tips_updated": len(unpaid_tips),
        }
    except stripe.error.StripeError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error en Stripe: {e.user_message or str(e)}",
        )
