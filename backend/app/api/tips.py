from datetime import datetime, time
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ..auth import current_user
from ..database import get_db
from ..models import Tip
from .deps import owned_business
router = APIRouter(prefix='/businesses/{business_id}/tips', tags=['tips'])
@router.get('')
def list_tips(business_id: str, user: str = Depends(current_user), db: Session = Depends(get_db)):
    owned_business(business_id, user, db)
    tips = db.scalars(select(Tip).where(Tip.business_id == business_id).order_by(Tip.created_at.desc()).limit(100)).all()
    return [{'id':t.id,'amount':float(t.amount),'platform_fee':float(t.platform_fixed_fee)+float(t.platform_percentage_fee),'payout':float(t.connected_account_payout),'status':t.status,'employee_id':t.employee_id,'location_id':t.location_id,'created_at':t.created_at} for t in tips]
@router.get('/summary')
def tip_summary(business_id: str, user: str = Depends(current_user), db: Session = Depends(get_db)):
    owned_business(business_id, user, db); today = datetime.combine(datetime.utcnow().date(), time.min)
    count, total = db.execute(select(func.count(Tip.id), func.coalesce(func.sum(Tip.amount), 0)).where(Tip.business_id == business_id, Tip.status == 'paid', Tip.created_at >= today)).one()
    return {'count':count,'tip_total':float(total),'average':float(total / count) if count else 0}
