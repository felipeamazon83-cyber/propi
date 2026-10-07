from uuid import UUID
import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import current_user
from ..config import settings
from ..database import get_db
from ..models import Employee
from ..schemas.contracts import EmployeeCreate
from .deps import owned_business

stripe.api_key = settings.stripe_secret_key

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
    business = owned_business(business_id, user, db)

    employees = db.scalars(
        select(Employee).where(Employee.business_id == business.id)
    ).all()

    return [
        {
            "id": str(e.id),
            "name": e.name,
            "photo_url": e.photo_url,
            "active": e.active,
            "stripe_account_id": e.stripe_account_id,
            "stripe_onboarding_completed": e.stripe_onboarding_completed,
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

    # 1. Crear la cuenta Express del empleado en Stripe Connect
    stripe_account_id = None
    onboarding_url = None

    try:
        stripe_account = stripe.Account.create(
            type="express",
            country=business.country or "ES",
            capabilities={"transfers": {"requested": True}},
            metadata={
                "business_id": str(business.id),
                "employee_name": payload.name,
            },
        )
        stripe_account_id = stripe_account.id

        # 2. Generar el enlace de vinculación para que el empleado configure su IBAN
        account_link = stripe.AccountLink.create(
            account=stripe_account.id,
            refresh_url=f"{settings.app_url}/dashboard?onboarding=refresh",
            return_url=f"{settings.app_url}/dashboard?onboarding=success",
            type="account_onboarding",
        )
        onboarding_url = account_link.url
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creando cuenta de Stripe para el empleado: {str(exc)}",
        )

    # 3. Guardar el empleado en la base de datos
    employee = Employee(
        business_id=business.id,
        stripe_account_id=stripe_account_id,
        stripe_onboarding_completed=False,
        **payload.model_dump(),
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

    return {
        "id": str(employee.id),
        "name": employee.name,
        "photo_url": employee.photo_url,
        "active": employee.active,
        "stripe_account_id": employee.stripe_account_id,
        "stripe_onboarding_completed": employee.stripe_onboarding_completed,
        "onboarding_url": onboarding_url,  # Enlace devuelto para compartir con el empleado
    }


@router.get("/{employee_id}/onboarding-link")
def get_employee_onboarding_link(
    business_id: str,
    employee_id: str,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Genera un nuevo enlace de onboarding si el anterior caducó o el empleado lo solicita de nuevo."""
    business = owned_business(business_id, user, db)

    try:
        emp_uuid = UUID(employee_id) if isinstance(employee_id, str) else employee_id
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado",
        )

    employee = db.scalar(
        select(Employee).where(
            Employee.id == emp_uuid,
            Employee.business_id == business.id,
        )
    )

    if not employee or not employee.stripe_account_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado o cuenta de Stripe no encontrada",
        )

    try:
        account_link = stripe.AccountLink.create(
            account=employee.stripe_account_id,
            refresh_url=f"{settings.app_url}/dashboard?onboarding=refresh",
            return_url=f"{settings.app_url}/dashboard?onboarding=success",
            type="account_onboarding",
        )
        return {"onboarding_url": account_link.url}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando enlace de Stripe: {str(exc)}",
        )


@router.patch("/{employee_id}/active")
def set_employee_active(
    business_id: str,
    employee_id: str,
    active: bool,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    business = owned_business(business_id, user, db)

    try:
        emp_uuid = UUID(employee_id) if isinstance(employee_id, str) else employee_id
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado",
        )

    employee = db.scalar(
        select(Employee).where(
            Employee.id == emp_uuid,
            Employee.business_id == business.id,
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


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    business_id: str,
    employee_id: str,
    user: UUID = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Elimina el empleado de la base de datos y su cuenta asociada en Stripe Connect."""
    business = owned_business(business_id, user, db)

    try:
        emp_uuid = UUID(employee_id) if isinstance(employee_id, str) else employee_id
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado",
        )

    employee = db.scalar(
        select(Employee).where(
            Employee.id == emp_uuid,
            Employee.business_id == business.id,
        )
    )

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado",
        )

    # Eliminar o desvincular la cuenta en Stripe Connect si existe
    if employee.stripe_account_id:
        try:
            stripe.Account.delete(employee.stripe_account_id)
        except Exception:
            # Por si ya fue eliminada o no permite borrado físico en modo prueba
            pass

    db.delete(employee)
    db.commit()

    return None
