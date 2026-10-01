from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import cast, select
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Session

from ..auth import current_user
from ..database import get_db
from ..models import Employee
from ..schemas.contracts import EmployeeCreate
from .deps import owned_business

router = APIRouter(
    prefix="/businesses/{business_id}/employees",
    tags=["employees"],
)


@router.get("")
def list_employees(
    business_id: str,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    # 1. Validar permisos de acceso al negocio
    business = owned_business(business_id, user, db)

    # 2. Consultar casteando business_id a UUID explícitamente
    employees = db.scalars(
        select(Employee).where(
            cast(Employee.business_id, PG_UUID) == cast(business.id, PG_UUID)
        )
    ).all()

    return [
        {
            "id": str(e.id),
            "name": e.name,
            "photo_url": e.photo_url,
            "active": e.active,
        }
        for e in employees
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_employee(
    business_id: str,
    payload: EmployeeCreate,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    business = owned_business(business_id, user, db)

    employee = Employee(
        business_id=business.id,  # Usa el UUID ya parseado de business
        **payload.model_dump(),
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

    return {
        "id": str(employee.id),
        "name": employee.name,
    }


@router.patch("/{employee_id}/active")
def set_employee_active(
    business_id: str,
    employee_id: str,
    active: bool,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    business = owned_business(business_id, user, db)

    # Normalizar employee_id a UUID
    try:
        emp_uuid = UUID(employee_id) if isinstance(employee_id, str) else employee_id
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado",
        )

    # Buscar empleado con cast explícito
    employee = db.scalar(
        select(Employee).where(
            cast(Employee.id, PG_UUID) == cast(emp_uuid, PG_UUID),
            cast(Employee.business_id, PG_UUID) == cast(business.id, PG_UUID),
        )
    )

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado",
        )

    employee.active = active
    db.commit()

    return {
        "id": str(employee.id),
        "active": employee.active,
    }
