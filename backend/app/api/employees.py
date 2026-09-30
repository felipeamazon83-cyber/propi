from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..auth import current_user
from ..database import get_db
from ..models import Employee
from ..schemas.contracts import EmployeeCreate
from .deps import owned_business
router = APIRouter(prefix='/businesses/{business_id}/employees', tags=['employees'])
@router.get('')
def list_employees(business_id: str, user: str = Depends(current_user), db: Session = Depends(get_db)):
    owned_business(business_id, user, db); return [{'id': e.id, 'name': e.name, 'photo_url': e.photo_url, 'active': e.active} for e in db.scalars(select(Employee).where(Employee.business_id == business_id))]
@router.post('', status_code=201)
def create_employee(business_id: str, payload: EmployeeCreate, user: str = Depends(current_user), db: Session = Depends(get_db)):
    owned_business(business_id, user, db); employee = Employee(business_id=business_id, **payload.model_dump()); db.add(employee); db.commit(); db.refresh(employee); return {'id': employee.id, 'name': employee.name}
@router.patch('/{employee_id}/active')
def set_employee_active(business_id: str, employee_id: str, active: bool, user: str = Depends(current_user), db: Session = Depends(get_db)):
    owned_business(business_id, user, db); employee = db.get(Employee, employee_id)
    if not employee or employee.business_id != business_id: raise HTTPException(404, 'Empleado no encontrado')
    employee.active = active; db.commit(); return {'id': employee.id, 'active': employee.active}
