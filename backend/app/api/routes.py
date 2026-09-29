"""Compatibility router that composes the domain-specific API modules."""
from fastapi import APIRouter
from .businesses import router as businesses_router
from .employees import router as employees_router
from .locations import router as locations_router
from .payments import router as payments_router
from .qr import router as qr_router
from .tips import router as tips_router
router = APIRouter()
for module_router in (businesses_router, employees_router, locations_router, payments_router, qr_router, tips_router):
    router.include_router(module_router)
