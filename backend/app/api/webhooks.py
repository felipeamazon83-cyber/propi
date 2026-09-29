from fastapi import APIRouter,Request,HTTPException,Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
import stripe
from ..config import settings
from ..database import get_db
from ..models import Tip
router=APIRouter()
@router.post('/webhooks/stripe')
async def stripe_webhook(request:Request,db:Session=Depends(get_db)):
 if not settings.stripe_webhook_secret:raise HTTPException(503,'Webhook no configurado')
 try:event=stripe.Webhook.construct_event(await request.body(),request.headers.get('stripe-signature',''),settings.stripe_webhook_secret)
 except Exception:raise HTTPException(400,'Firma de webhook inválida')
 obj=event['data']['object']; kind=event['type']
 if kind=='checkout.session.completed':
  sid=obj['id']
  if not db.scalar(select(Tip).where(Tip.stripe_checkout_session_id==sid)):
   m=obj.get('metadata',{}); db.add(Tip(business_id=m['business_id'],employee_id=m.get('employee_id'),location_id=m['location_id'],amount=obj['amount_total']/100,currency=obj['currency'].upper(),status='paid',stripe_checkout_session_id=sid,stripe_payment_intent_id=obj.get('payment_intent')));db.commit()
 elif kind=='payment_intent.payment_failed':
  tip=db.scalar(select(Tip).where(Tip.stripe_payment_intent_id==obj['id']));
  if tip:tip.status='failed';db.commit()
 elif kind=='charge.refunded':
  tip=db.scalar(select(Tip).where(Tip.stripe_payment_intent_id==obj.get('payment_intent')))
  if tip:tip.status='refunded';db.commit()
 return {'received':True}
