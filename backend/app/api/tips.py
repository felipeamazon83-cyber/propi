from datetime import datetime, time
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import current_user
from ..database import get_db
from ..models import Employee, Tip
from .deps import owned_business

router = APIRouter(prefix="/businesses/{business_id}/tips", tags=["tips"])


@router.get("")
def list_tips(
    business_id: str,
    user: str = Depends(current_user),
    db: Session = Depends(get_db),
):
    owned_business(business_id, user, db)
    tips = db.scalars(
        select(Tip)
        .where(Tip.business_id == business_id)
        .order_by(Tip.created_at.desc())
        .limit(100)
    ).all()

    return [
        {
            "id": t.id,
            "amount": float(t.amount),
            "platform_fee": float(t.platform_fixed_fee) + float(t.platform_percentage_fee),
            "payout": float(t.connected_account_payout),
            "status": t.status,
            "employee_id": t.employee_id,
            "location_id": t.location_id,
            "created_at": t.created_at,
        }
        for t in tips
    ]


@router.get("/summary")
def tip_summary(
    business_id: str,
    user: str = Depends(current_user),
    db: Session = Depends(get_db),
):
    owned_business(business_id, user, db)
    today = datetime.combine(datetime.utcnow().date(), time.min)

    count, total = db.execute(
        select(
            func.count(Tip.id),
            func.coalesce(func.sum(Tip.amount), 0),
        ).where(
            Tip.business_id == business_id,
            Tip.status.in_(["paid", "succeeded"]),
            Tip.created_at >= today,
        )
    ).one()

    return {
        "count": count,
        "tip_total": float(total),
        "average": float(total / count) if count else 0,
    }


@router.get("/summary-by-employee")
def tip_summary_by_employee(
    business_id: str,
    user: str = Depends(current_user),
    db: Session = Depends(get_db),
):
    owned_business(business_id, user, db)

    # Consulta que agrupa las propinas recibidas por cada empleado de este negocio
    results = db.execute(
        select(
            Employee.id.label("employee_id"),
            Employee.name.label("employee_name"),
            func.coalesce(func.sum(Tip.amount), 0).label("total_amount"),
            func.count(Tip.id).label("tip_count"),
        )
        .join(Tip, Tip.employee_id == Employee.id)
        .where(
            Tip.business_id == business_id,
            Tip.status.in_(["paid", "succeeded"]),
        )
        .group_by(Employee.id, Employee.name)
        .order_by(func.sum(Tip.amount).desc())
    ).all()

    return [
        {
            "employee_id": str(r.employee_id),
            "employee_name": r.employee_name,
            "total_amount": float(r.total_amount),
            "tip_count": r.tip_count,
        }
        for r in results
    ]
