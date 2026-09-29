import secrets,time
from collections import defaultdict,deque
from fastapi import APIRouter,Depends,HTTPException,Request
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Business,Employee,Location,Tip,TipSetting
from ..schemas.contracts import BusinessCreate,BusinessUpdate,EmployeeCreate,LocationCreate,LocationUpdate,CheckoutCreate
from ..auth import current_user
from ..config import settings
import stripe
router=APIRouter(); hits=defaultdict(deque)
def owned(business_id:str,user:str,db:Session):
 b=db.get(Business,business_id)
 if not b or b.owner_id!=user: raise HTTPException(404,'Negocio no encontrado')
 return b
@router.post('/businesses')
def create_business(payload:BusinessCreate,user:str=Depends(current_user),db:Session=Depends(get_db)):
 b=Business(owner_id=user,**payload.model_dump());db.add(b);db.flush();db.add(TipSetting(business_id=b.id));db.commit();return {'id':b.id,'name':b.name}
@router.get('/businesses')
def businesses(user:str=Depends(current_user),db:Session=Depends(get_db)): return [{'id':b.id,'name':b.name} for b in db.scalars(select(Business).where(Business.owner_id==user))]
@router.post('/businesses/{business_id}/employees')
def employee(business_id:str,payload:EmployeeCreate,user:str=Depends(current_user),db:Session=Depends(get_db)):
 owned(business_id,user,db); e=Employee(business_id=business_id,**payload.model_dump());db.add(e);db.commit();return {'id':e.id,'name':e.name}
@router.get('/businesses/{business_id}/employees')
def employees(business_id:str,user:str=Depends(current_user),db:Session=Depends(get_db)):
 owned(business_id,user,db);return [{'id':e.id,'name':e.name,'active':e.active} for e in db.scalars(select(Employee).where(Employee.business_id==business_id))]
@router.post('/businesses/{business_id}/locations')
def location(business_id:str,payload:LocationCreate,user:str=Depends(current_user),db:Session=Depends(get_db)):
 owned(business_id,user,db)
 if payload.fixed_employee_id:
  e=db.get(Employee,payload.fixed_employee_id)
  if not e or e.business_id!=business_id: raise HTTPException(422,'Empleado no válido')
 l=Location(business_id=business_id,public_token=secrets.token_urlsafe(24),**payload.model_dump());db.add(l);db.commit();return {'id':l.id,'name':l.name,'public_token':l.public_token,'url':f'{settings.app_url}/r/{l.public_token}'}
@router.get('/public/locations/{token}')
def public_location(token:str,request:Request,db:Session=Depends(get_db)):
 now=time.time(); q=hits[request.client.host];
 while q and q[0]<now-60:q.popleft()
 if len(q)>=60: raise HTTPException(429,'Demasiadas solicitudes')
 q.append(now); l=db.scalar(select(Location).where(Location.public_token==token,Location.active.is_(True))); 
 if not l: raise HTTPException(404,'Este código QR no está disponible')
 b=db.get(Business,l.business_id); s=db.scalar(select(TipSetting).where(TipSetting.business_id==b.id)); es=db.scalars(select(Employee).where(Employee.business_id==b.id,Employee.active.is_(True))).all()
 if l.fixed_employee_id: es=[e for e in es if e.id==l.fixed_employee_id]
 return {'business_name':b.name,'logo_url':b.logo_url,'location_name':l.name,'employees':[{'id':e.id,'name':e.name,'photo_url':e.photo_url if s.show_employee_photos else None} for e in es],'suggested_amounts':[float(x) for x in l.suggested_amounts],'minimum_amount':float(s.minimum_amount),'maximum_amount':float(s.maximum_amount)}
@router.post('/stripe/connect')
def stripe_connect(business_id:str,user:str=Depends(current_user),db:Session=Depends(get_db)):
 b=owned(business_id,user,db)
 if not settings.stripe_secret_key: raise HTTPException(503,'Stripe Connect aún no está configurado')
 stripe.api_key=settings.stripe_secret_key
 account_id=b.stripe_account_id
 if not account_id:
  account=stripe.Account.create(type='express',country=b.country,capabilities={'card_payments':{'requested':True},'transfers':{'requested':True}})
  account_id=account.id;b.stripe_account_id=account_id;db.commit()
 link=stripe.AccountLink.create(account=account_id,refresh_url=f'{settings.app_url}/dashboard/settings',return_url=f'{settings.app_url}/dashboard/settings',type='account_onboarding')
 return {'onboarding_url':link.url}

@router.post('/payments/checkout')
def checkout(payload:CheckoutCreate,db:Session=Depends(get_db)):
 l=db.scalar(select(Location).where(Location.public_token==payload.public_token,Location.active.is_(True)))
 if not l: raise HTTPException(404,'Ubicación no disponible')
 b=db.get(Business,l.business_id); e=db.get(Employee,payload.employee_id); s=db.scalar(select(TipSetting).where(TipSetting.business_id==l.business_id))
 if not e or e.business_id!=l.business_id or not e.active or (l.fixed_employee_id and e.id!=l.fixed_employee_id): raise HTTPException(422,'Empleado no válido')
 if payload.amount<float(s.minimum_amount) or payload.amount>float(s.maximum_amount): raise HTTPException(422,'Importe fuera de los límites permitidos')
 if not settings.stripe_secret_key: raise HTTPException(503,'Los pagos aún no están configurados')
 if not b.stripe_account_id: raise HTTPException(409,'Este negocio aún no ha conectado Stripe')
 from ..services.stripe_service import calculate_fee
 fee=calculate_fee(payload.amount,settings.propi_fee_percent,settings.propi_fixed_fee_cents)
 stripe.api_key=settings.stripe_secret_key
 metadata={'business_id':l.business_id,'employee_id':e.id,'location_id':l.id,'tip_cents':str(fee.tip_cents),'propi_fixed_fee_cents':str(fee.fixed_fee_cents),'propi_percentage_fee_cents':str(fee.percentage_fee_cents),'payout_cents':str(fee.connected_account_payout_cents)}
 items=[{'price_data':{'currency':b.currency.lower(),'product_data':{'name':f'Propina para {e.name}'},'unit_amount':fee.tip_cents},'quantity':1}]
 if fee.propi_fee_cents: items.append({'price_data':{'currency':b.currency.lower(),'product_data':{'name':'Tarifa de servicio Propi'},'unit_amount':fee.propi_fee_cents},'quantity':1})
 session=stripe.checkout.Session.create(mode='payment',payment_method_types=['card'],line_items=items,metadata=metadata,payment_intent_data={'metadata':metadata,'transfer_data':{'destination':b.stripe_account_id,'amount':fee.connected_account_payout_cents}},success_url=f'{settings.app_url}/thank-you?session_id={{CHECKOUT_SESSION_ID}}',cancel_url=f'{settings.app_url}/r/{payload.public_token}')
 return {'checkout_url':session.url,'tip_amount':fee.tip_cents/100,'propi_fee':fee.propi_fee_cents/100,'total':fee.customer_total_cents/100}

@router.get('/businesses/{business_id}')
def business_detail(business_id:str,user:str=Depends(current_user),db:Session=Depends(get_db)):
 b=owned(business_id,user,db); return {'id':b.id,'name':b.name,'legal_name':b.legal_name,'logo_url':b.logo_url,'country':b.country,'currency':b.currency,'stripe_connected':bool(b.stripe_account_id)}
@router.put('/businesses/{business_id}')
def update_business(business_id:str,payload:BusinessUpdate,user:str=Depends(current_user),db:Session=Depends(get_db)):
 b=owned(business_id,user,db)
 for key,value in payload.model_dump().items(): setattr(b,key,value)
 db.commit();return {'id':b.id,'name':b.name}
@router.get('/businesses/{business_id}/locations')
def locations(business_id:str,user:str=Depends(current_user),db:Session=Depends(get_db)):
 owned(business_id,user,db); return [{'id':l.id,'name':l.name,'type':l.type,'active':l.active,'public_token':l.public_token,'distribution_mode':l.distribution_mode,'fixed_employee_id':l.fixed_employee_id,'employee_percentage':float(l.employee_percentage),'suggested_amounts':l.suggested_amounts,'url':f'{settings.app_url}/r/{l.public_token}'} for l in db.scalars(select(Location).where(Location.business_id==business_id))]
@router.put('/locations/{location_id}')
def update_location(location_id:str,payload:LocationUpdate,user:str=Depends(current_user),db:Session=Depends(get_db)):
 l=db.get(Location,location_id)
 if not l: raise HTTPException(404,'Ubicación no encontrada')
 owned(l.business_id,user,db)
 if payload.fixed_employee_id:
  e=db.get(Employee,payload.fixed_employee_id)
  if not e or e.business_id!=l.business_id: raise HTTPException(422,'Empleado no válido')
 for key,value in payload.model_dump().items(): setattr(l,key,value)
 db.commit(); return {'id':l.id,'public_token':l.public_token}
@router.post('/locations/{location_id}/regenerate-token')
def regenerate_location_token(location_id:str,user:str=Depends(current_user),db:Session=Depends(get_db)):
 l=db.get(Location,location_id)
 if not l: raise HTTPException(404,'Ubicación no encontrada')
 owned(l.business_id,user,db);l.public_token=secrets.token_urlsafe(24);db.commit();return {'public_token':l.public_token,'url':f'{settings.app_url}/r/{l.public_token}'}
