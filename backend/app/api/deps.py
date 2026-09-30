from fastapi import HTTPException
from sqlalchemy.orm import Session
from ..models import Business

def owned_business(business_id: str, user_id: str, db: Session) -> Business:
    business = db.get(Business, business_id)
    if not business or business.owner_id != user_id:
        raise HTTPException(404, 'Negocio no encontrado')
    return business
