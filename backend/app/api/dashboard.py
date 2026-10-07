import os
from typing import Optional
from uuid import UUID

import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import cast, func, select
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Session

from ..auth import current_user
from ..database import get_db
from ..models import Business, Employee, Tip

# Configuración de clave API de Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(tags=["dashboard"])


# Schemas para el Payout
class PayoutRequest(BaseModel):
    amount: float
    currency: Optional[str] = "EUR"


# Función auxiliar para validar la propiedad del negocio
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
# 1. Endpoint Unificado Dashboard Summary
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

    # 2. Métricas globales del negocio (Propinas confirmadas/paid)
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

    # 3. Obtener todos los empleados del negocio
    employees = db.scalars(
        select(Employee).where(
            cast(Employee.business_id, PG_UUID) == b_uuid,
            Employee.active.is_(True),
        )
    ).all()

    by_employee = []
    for emp in employees:
        e_uuid = emp.id if isinstance(emp.id, UUID) else UUID(str(emp.id))

        # Sumar propinas del empleado
        emp_stats = db.execute(
            select(
                func.coalesce(func.sum(Tip.amount), 0.0).label("emp_total"),
                func.count(Tip.id).label("emp_count"),
            ).where(
                cast(Tip.employee_id, PG_UUID) == e_uuid,
                Tip.status == "paid",
            )
        ).first()

        by_employee.append(
            {
                "employee_id": str(emp.id),
                "name": emp.name,
                "total_amount": float(emp_stats.emp_total) if emp_stats else 0.0,
                "tips_count": emp_stats.emp_count if emp_stats else 0,
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

    # 1. Validar propiedad del negocio
    business = get_user_business(b_uuid, user_uuid, db)

    # 2. Obtener el empleado
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

    # 3. Verificar que el empleado tenga cuenta de Stripe configurada
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

    # 4. Convertir monto a céntimos (Stripe trabaja en la unidad monetaria más pequeña)
    amount_in_cents = int(round(payload.amount * 100))
    currency = payload.currency.lower() if payload.currency else "eur"

    try:
        # Transferencia Stripe Connect
        transfer = stripe.Transfer.create(
            amount=amount_in_cents,
            currency=currency,
            destination=stripe_account,
            description=f"Pago de propinas acumuladas - {employee.name}",
        )
        return {
            "status": "success",
            "message": f"Transferencia de {payload.amount} {currency.upper()} realizada correctamente.",
            "transfer_id": transfer.id,
        }
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error en Stripe: {e.user_message or str(e)}",
        )


# --------------------------------------------------------------------------
# Métodos antiguos (mantenidos opcionalmente por compatibilidad)
# --------------------------------------------------------------------------
@router.get("/tips/summary")
def get_tip_summary(
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    user_uuid = user if isinstance(user, UUID) else UUID(str(user))
    business_ids = db.scalars(
        select(Business.id).where(cast(Business.owner_id, PG_UUID) == user_uuid)
    ).all()

    if not business_ids:
        return {"count": 0, "tip_total": 0.0, "average": 0.0}

    b_uuids = [b if isinstance(b, UUID) else UUID(str(b)) for b in business_ids]

    stats = db.execute(
        select(
            func.coalesce(func.sum(Tip.amount), 0.0).label("tip_total"),
            func.count(Tip.id).label("count"),
            func.coalesce(func.avg(Tip.amount), 0.0).label("average"),
        ).where(
            cast(Tip.business_id, PG_UUID).in_(b_uuids),
            Tip.status == "paid",
        )
    ).first()

    return {
        "tip_total": float(stats.tip_total) if stats else 0.0,
        "count": stats.count if stats else 0,
        "average": float(stats.average) if stats else 0.0,
    }


@router.get("/tips/summary-by-employee")
def get_tips_summary_by_employee(
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    user_uuid = user if isinstance(user, UUID) else UUID(str(user))
    business_ids = db.scalars(
        select(Business.id).where(cast(Business.owner_id, PG_UUID) == user_uuid)
    ).all()

    if not business_ids:
        return []

    b_uuids = [b if isinstance(b, UUID) else UUID(str(b)) for b in business_ids]
    employees = db.scalars(
        select(Employee).where(
            cast(Employee.business_id, PG_UUID).in_(b_uuids),
            Employee.active.is_(True),
        )
    ).all()

    summary = []
    for emp in employees:
        e_uuid = emp.id if isinstance(emp.id, UUID) else UUID(str(emp.id))
        stats = db.execute(
            select(
                func.coalesce(func.sum(Tip.amount), 0.0).label("total_amount"),
                func.count(Tip.id).label("tip_count"),
                func.max(Tip.created_at).label("last_tip_at"),
            ).where(
                cast(Tip.employee_id, PG_UUID) == e_uuid,
                Tip.status == "paid",
            )
        ).first()

        summary.append(
            {
                "employee_id": str(emp.id),
                "employee_name": emp.name,
                "total_amount": float(stats.total_amount) if stats else 0.0,
                "tip_count": stats.tip_count if stats else 0,
                "last_tip_at": stats.last_tip_at.isoformat() if stats and stats.last_tip_at else None,
            }
        )

    return summary
