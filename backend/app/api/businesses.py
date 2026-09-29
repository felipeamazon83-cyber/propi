from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..auth import current_user
from ..database import get_db
from ..models import Business, TipSetting
from ..schemas.contracts import BusinessCreate, BusinessUpdate
from .deps import owned_business
router = APIRouter(prefix='/businesses', tags=['businesses'])
@router.get('')
def list_businesses(user: str = Depends(current_user), db: Session = Depends(get_db)):
    return [{'id': b.id, 'name': b.name} for b in db.scalars(select(Business).where(Business.owner_id == user))]
@router.post('', status_code=201)
def create_business(payload: BusinessCreate, user: str = Depends(current_user), db: Session = Depends(get_db)):
    business = Business(owner_id=user, **payload.model_dump()); db.add(business); db.flush(); db.add(TipSetting(business_id=business.id)); db.commit(); db.refresh(business); return {'id': business.id, 'name': business.name}
@router.get('/{business_id}')
def get_business(business_id: str, user: str = Depends(current_user), db: Session = Depends(get_db)):
    b = owned_business(business_id, user, db); return {'id': b.id, 'name': b.name, 'legal_name': b.legal_name, 'logo_url': b.logo_url, 'country': b.country, 'currency': b.currency, 'stripe_connected': bool(b.stripe_account_id)}
@router.put('/{business_id}')
def update_business(business_id: str, payload: BusinessUpdate, user: str = Depends(current_user), db: Session = Depends(get_db)):
    b = owned_business(business_id, user, db)
    for field, value in payload.model_dump().items(): setattr(b, field, value)
    db.commit(); return {'id': b.id, 'name': b.name}
