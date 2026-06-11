from fastapi import APIRouter

from app.api.endpoints import internal_gateway

api_router = APIRouter()

# All ML / prediction / SHAP / report traffic must go through the Node gateway + X-INTERNAL-API-KEY
api_router.include_router(internal_gateway.router)

# internal_ecg depends on heavy native libs (torch, wfdb). Import lazily and don't fail startup if missing.
try:
    from app.api.endpoints import internal_ecg
    api_router.include_router(internal_ecg.router)
except Exception as e:
    print("Warning: internal_ecg router not loaded:", e)

