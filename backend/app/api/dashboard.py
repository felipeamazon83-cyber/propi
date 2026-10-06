from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy import cast, func, select
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Session

from ..auth import current_user
from ..database import get_db
from ..models import Business, Employee, Tip

router = APIRouter(tags=["dashboard"])


@router.get("/tips/summary-by-employee")
def get_tips_summary_by_employee(
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    user_uuid = user if isinstance(user, UUID) else UUID(str(user))

    # 1. Obtener todos los negocios del usuario autenticado
    business_ids = db.scalars(
        select(Business.id).where(cast(Business.owner_id, PG_UUID) == user_uuid)
    ).all()

    if not business_ids:
        return []

    # Convertir a formato UUID seguro
    b_uuids = [b if isinstance(b, UUID) else UUID(str(b)) for b in business_ids]

    # 2. Consultar todos los empleados activos de los negocios del usuario
    employees = db.scalars(
        select(Employee).where(
            cast(Employee.business_id, PG_UUID).in_(b_uuids),
            Employee.active.is_(True),
        )
    ).all()

    summary = []

    # 3. Iterar cada empleado y calcular las métricas desde la tabla Tip (status == 'paid')
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
