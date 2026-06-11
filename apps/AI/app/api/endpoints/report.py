from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import LabTest, Prediction
from services.ml_service import ml_service
from services import chart_service
import sys
from pathlib import Path

# Add LLM dir to path
AI_DIR = Path(__file__).resolve().parent.parent.parent.parent
if str(AI_DIR) not in sys.path:
    sys.path.append(str(AI_DIR))

try:
    from app.services.llm_service import HeartDiseaseConsultant
    consultant = HeartDiseaseConsultant()
except Exception as e:
    print("Warning: Could not initialize HeartDiseaseConsultant:", e)
    consultant = None

router = APIRouter(tags=["Report"])

@router.get("/predict/{id}/report")
def get_prediction_report(id: str, db: Session = Depends(get_db)):
    # Try to find prediction by labtest ID directly
    prediction_record = db.query(Prediction).filter(Prediction.lab_test_id == id).first()
    
    # If not found, check if 'id' is a national_id and find the latest prediction for that patient
    if not prediction_record:
        patient = db.query(LabTest).filter(LabTest.national_id == id).order_by(LabTest.createdAt.desc()).first()
        if patient:
            prediction_record = db.query(Prediction).filter(Prediction.lab_test_id == patient.id).first()

    if not prediction_record:
        raise HTTPException(
            status_code=400,
            detail="Prediction has not been evaluated yet. Call POST /predict/{id} first."
        )

    if prediction_record.decision == "low":
        raise HTTPException(
            status_code=400,
            detail="Report PDF is not available for low risk predictions."
        )

    if not prediction_record.pdf_binary:
        raise HTTPException(
            status_code=404,
            detail="Report PDF not found. Ensure prediction generation completed successfully."
        )

    return Response(
        content=prediction_record.pdf_binary,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=artemis_report_patient_{id}.pdf"
        },
    )
