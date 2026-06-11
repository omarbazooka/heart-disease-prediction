from fastapi import APIRouter

<<<<<<< HEAD
from app.api.endpoints import internal_gateway
=======
from api.endpoints import internal_gateway
>>>>>>> 3a5e7c62be61d9bf6bde782a67674acea097339c

api_router = APIRouter()

# All ML / prediction / SHAP / report traffic must go through the Node gateway + X-INTERNAL-API-KEY
api_router.include_router(internal_gateway.router)
<<<<<<< HEAD

# internal_ecg depends on heavy native libs (torch, wfdb). Import lazily and don't fail startup if missing.
try:
    from app.api.endpoints import internal_ecg
    api_router.include_router(internal_ecg.router)
except Exception as e:
    print("Warning: internal_ecg router not loaded:", e)

=======
>>>>>>> 3a5e7c62be61d9bf6bde782a67674acea097339c
