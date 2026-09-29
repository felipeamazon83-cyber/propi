import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..auth import current_user
from ..config import settings
from ..database import get_db
from ..models import Employee, Location
from ..schemas.contracts import LocationCreate, LocationUpdate
from .deps import owned_business
router = APIRouter(tags=['locations'])
def serialize(location: Location): return {'id':location.id,'name':location.name,'type':location.type,'active':location.active,'public_token':location.public_token,'distribution_mode':location.distribution_mode,'fixed_employee_id':location.fixed_employee_id,'employee_percentage':float(location.employee_percentage),'suggested_amounts':location.suggested_amounts,'url':f'{settings.app_url}/r/{location.public_token}'}
@router.get('/businesses/{business_id}/locations')
def list_locations(business_id: str,user: str=Depends(current_user),db: Session=Depends(get_db)):
    owned_business(business_id,user,db); return [serialize(x) for x in db.scalars(select(Location).where(Location.business_id==business_id))]
@router.post('/businesses/{business_id}/locations',status_code=201)
def create_location(business_id: str,payload: LocationCreate,user: str=Depends(current_user),db: Session=Depends(get_db)):
    owned_business(business_id,user,db)
    if payload.fixed_employee_id:
        e=db.get(Employee,payload.fixed_employee_id)
        if not e or e.business_id!=business_id: raise HTTPException(422,'Empleado no válido')
    location=Location(business_id=business_id,public_token=secrets.token_urlsafe(24),**payload.model_dump());db.add(location);db.commit();db.refresh(location);return serialize(location)
@router.put('/locations/{location_id}')
def update_location(location_id: str,payload: LocationUpdate,user: str=Depends(current_user),db: Session=Depends(get_db)):
    location=db.get(Location,location_id)
    if not location: raise HTTPException(404,'Ubicación no encontrada')
    owned_business(location.business_id,user,db)
    for field,value in payload.model_dump().items(): setattr(location,field,value)
    db.commit();return serialize(location)
@router.post('/locations/{location_id}/regenerate-token')
def regenerate_token(location_id: str,user: str=Depends(current_user),db: Session=Depends(get_db)):
    location=db.get(Location,location_id)
    if not location: raise HTTPException(404,'Ubicación no encontrada')
    owned_business(location.business_id,user,db);location.public_token=secrets.token_urlsafe(24);db.commit();return serialize(location)
