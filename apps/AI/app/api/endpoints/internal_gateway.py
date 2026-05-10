"""
Internal AI routes — callable ONLY by the Node.js gateway with X-INTERNAL-API-KEY.
"""

from __future__ import annotations

import io
import sys
import uuid
from datetime import datetime
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from core.security import verify_internal_api_key
from db.database import get_db
from db.models import Lab, LabTest, Prediction, User
from schemas.internal import InternalTargetRequest
from services.ml_service import ml_service
from services.pdf_service import generate_medical_report_pdf

AI_DIR = Path(__file__).resolve().parent.parent.parent.parent
if str(AI_DIR) not in sys.path:
    sys.path.append(str(AI_DIR))

try:
    from app.services.llm_service import HeartDiseaseConsultant
    consultant = HeartDiseaseConsultant()
except Exception:
    consultant = None


router = APIRouter(
    prefix="/internal",
    tags=["Internal AI"],
    dependencies=[Depends(verify_internal_api_key)],
)

# ---------------- HELPERS ----------------

def _lab_test_by_id(db: Session, lab_test_id: str) -> LabTest:
    obj = db.query(LabTest).filter(LabTest.id == lab_test_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="LabTest not found")
    return obj


# ---------------- PREDICT ----------------

@router.post("/predict")
def internal_predict(body: InternalTargetRequest, db: Session = Depends(get_db)):
    patient = _lab_test_by_id(db, body.target_id)

    user = db.query(User).filter(User.national_id == patient.national_id).first()
    patient_name = user.username if user else "Anonymous"
    lab = db.query(Lab).filter(Lab.id == patient.lab_id).first()

    prediction = (
        db.query(Prediction)
        .filter(Prediction.lab_test_id == patient.id)
        .first()
    )

    # ---------------- CACHE ----------------
    if prediction and prediction.prediction_result is not None:
        assessment, _ = ml_service.assess_full_prediction(
            [], probability=prediction.prediction_percentage
        )

        return {
            "id": prediction.id,
            "lab_test_id": prediction.lab_test_id,
            "prediction": prediction.prediction_result,
            "probability": prediction.prediction_percentage,
            "risk_level": prediction.risk_level,
            "decision": prediction.decision,
            "risk_color": assessment.risk_color,
            "decision_label": assessment.decision_label,
        }

    # ---------------- INPUT ----------------
    features = [
        patient.age,
        patient.sex,
        patient.chest_pain_type,
        patient.resting_bp_s,
        patient.cholesterol,
        patient.fasting_blood_sugar,
        patient.resting_ecg,
        patient.max_heart_rate,
        patient.exercise_angina,
        patient.oldpeak,
        patient.st_slope,
    ]

    try:
        assessment, shap_data = ml_service.assess_full_prediction(features)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    # ---------------- DB UPSERT ----------------
    if not prediction:
        prediction = Prediction(
            id=str(uuid.uuid4()),
            lab_test_id=patient.id,
            user_id=body.user_id,
        )
        db.add(prediction)

    if body.user_id:
        prediction.user_id = body.user_id

    prediction.prediction_result = 1 if assessment.decision.value == "high" else 0
    prediction.prediction_percentage = assessment.probability_pct
    prediction.risk_level = assessment.risk_level.value
    prediction.decision = assessment.decision.value
    prediction.shap_values_json = shap_data

    # ---------------- SHAP ----------------
    prediction.shap_image = ml_service.generate_shap_image(shap_data)

    # ---------------- LLM ----------------
    llm_result = {"explanation": "", "recommendations": []}

    if consultant:
        try:
            top = sorted(shap_data.items(), key=lambda x: abs(x[1]), reverse=True)[:3]
            llm_result = consultant.generate_report(
                probability=assessment.probability_pct,
                decision=assessment.decision.value,
                ui_risk_level=assessment.risk_level.value,
                top_features=top,
            )
        except Exception:
            llm_result = {"explanation": "LLM failed", "recommendations": []}

    prediction.llm_report_json = llm_result

    # ---------------- PDF ----------------
    try:
        pdf = generate_medical_report_pdf(
            patient_data={
                "name": patient_name,
                "age": patient.age,
                "gender": "Male" if patient.sex == 1 else "Female",
            },
            risk_score=round(prediction.prediction_percentage or 0, 1),
            llm_report=llm_result,
            images_base64={"risk_gauge": "", "shap_plot": ""},
            lab_data={"name": lab.name if lab else "N/A"},
            lab_test_data={"id": patient.id},
        )

        prediction.pdf_binary = pdf.getvalue()
        prediction.report_generated_at = datetime.utcnow().isoformat()

    except Exception:
        prediction.pdf_binary = None

    db.commit()

    return {
        "id": prediction.id,
        "lab_test_id": prediction.lab_test_id,
        "prediction": prediction.prediction_result,
        "probability": prediction.prediction_percentage,
        "risk_level": prediction.risk_level,
        "decision": prediction.decision,
    }


# ---------------- SHAP IMAGE ----------------

@router.post("/shap")
def internal_shap(body: InternalTargetRequest, db: Session = Depends(get_db)):
    patient = _lab_test_by_id(db, body.target_id)

    prediction = db.query(Prediction).filter(
        Prediction.lab_test_id == patient.id
    ).first()

    if not prediction:
        raise HTTPException(400, "Run prediction first")

    if not prediction.shap_image:
        _, shap = ml_service.assess_full_prediction([
            patient.age,
            patient.sex,
            patient.chest_pain_type,
            patient.resting_bp_s,
            patient.cholesterol,
            patient.fasting_blood_sugar,
            patient.resting_ecg,
            patient.max_heart_rate,
            patient.exercise_angina,
            patient.oldpeak,
            patient.st_slope,
        ])

        prediction.shap_image = ml_service.generate_shap_image(shap)
        db.commit()

    return StreamingResponse(io.BytesIO(prediction.shap_image), media_type="image/png")


# ---------------- SHAP DATA ----------------

@router.post("/shap/data")
def internal_shap_data(body: InternalTargetRequest, db: Session = Depends(get_db)):
    patient = _lab_test_by_id(db, body.target_id)

    prediction = db.query(Prediction).filter(
        Prediction.lab_test_id == patient.id
    ).first()

    if not prediction:
        raise HTTPException(400, "Run prediction first")

    shap = prediction.shap_values_json
    if not shap:
        _, shap = ml_service.assess_full_prediction([
            patient.age,
            patient.sex,
            patient.chest_pain_type,
            patient.resting_bp_s,
            patient.cholesterol,
            patient.fasting_blood_sugar,
            patient.resting_ecg,
            patient.max_heart_rate,
            patient.exercise_angina,
            patient.oldpeak,
            patient.st_slope,
        ])
        prediction.shap_values_json = shap
        db.commit()

    return {
        "prediction_probability": prediction.prediction_percentage,
        "risk_level": prediction.risk_level,
        "top_features": sorted(shap.items(), key=lambda x: abs(x[1]), reverse=True),
    }


# ---------------- REPORT ----------------

@router.post("/report")
def internal_report(body: InternalTargetRequest, db: Session = Depends(get_db)):
    prediction = db.query(Prediction).filter(
        Prediction.lab_test_id == body.target_id
    ).first()

    if not prediction:
        raise HTTPException(400, "Run prediction first")

    if not prediction.pdf_binary:
        raise HTTPException(404, "Report not generated")

    return Response(
        content=prediction.pdf_binary,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=report_{body.target_id}.pdf"
        },
    )


# ---------------- CSV ----------------

@router.post("/predict-csv")
async def internal_predict_csv(file: UploadFile = File(...)):
    df = pd.read_csv(file.file)
    df.columns = df.columns.str.strip()

    missing = [c for c in ml_service.required_cols if c not in df.columns]
    if missing:
        raise HTTPException(422, f"Missing columns: {missing}")

    preds = ml_service.predict_dataframe(df[ml_service.required_cols])
    df["prediction"] = preds

    return df.to_dict(orient="records")