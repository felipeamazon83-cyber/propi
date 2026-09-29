import secrets,time
from collections import defaultdict,deque
from fastapi import APIRouter,Depends,HTTPException,Request
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Business,Employee,Location,Tip,TipSetting
from ..schemas.contracts import BusinessCreate,EmployeeCreate,LocationCreate,CheckoutCreate
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
 owned(business_id,user,db); l=Location(business_id=business_id,public_token=secrets.token_urlsafe(24),**payload.model_dump());db.add(l);db.commit();return {'id':l.id,'name':l.name,'public_token':l.public_token,'url':f'{settings.app_url}/r/{l.public_token}'}
@router.get('/public/locations/{token}')
def public_location(token:str,request:Request,db:Session=Depends(get_db)):
 now=time.time(); q=hits[request.client.host];
 while q and q[0]<now-60:q.popleft()
 if len(q)>=60: raise HTTPException(429,'Demasiadas solicitudes')
 q.append(now); l=db.scalar(select(Location).where(Location.public_token==token,Location.active.is_(True))); 
 if not l: raise HTTPException(404,'Este código QR no está disponible')
 b=db.get(Business,l.business_id); s=db.scalar(select(TipSetting).where(TipSetting.business_id==b.id)); es=db.scalars(select(Employee).where(Employee.business_id==b.id,Employee.active.is_(True))).all()
 return {'business_name':b.name,'logo_url':b.logo_url,'location_name':l.name,'employees':[{'id':e.id,'name':e.name,'photo_url':e.photo_url if s.show_employee_photos else None} for e in es],'suggested_amounts':[float(s.suggested_amount_1),float(s.suggested_amount_2),float(s.suggested_amount_3),5],'minimum_amount':float(s.minimum_amount),'maximum_amount':float(s.maximum_amount)}
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
 e=db.get(Employee,payload.employee_id); s=db.scalar(select(TipSetting).where(TipSetting.business_id==l.business_id))
 if not e or e.business_id!=l.business_id or not e.active: raise HTTPException(422,'Empleado no válido')
 if payload.amount<float(s.minimum_amount) or payload.amount>float(s.maximum_amount):raise HTTPException(422,'Importe fuera de los límites permitidos')
 if not settings.stripe_secret_key: raise HTTPException(503,'Los pagos aún no están configurados')
 stripe.api_key=settings.stripe_secret_key
 session=stripe.checkout.Session.create(mode='payment',payment_method_types=['card'],line_items=[{'price_data':{'currency':'eur','product_data':{'name':f'Propina para {e.name}'},'unit_amount':round(payload.amount*100)},'quantity':1}],metadata={'business_id':l.business_id,'employee_id':e.id,'location_id':l.id},success_url=f'{settings.app_url}/thank-you?session_id={{CHECKOUT_SESSION_ID}}',cancel_url=f'{settings.app_url}/r/{payload.public_token}')
 return {'checkout_url':session.url}
