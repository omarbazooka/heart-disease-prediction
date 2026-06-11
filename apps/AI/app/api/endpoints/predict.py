from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import LabTest, Lab, Prediction, User
from services.ml_service import ml_service
from services import chart_service
from services.pdf_service import generate_medical_report_pdf
from datetime import datetime
import pandas as pd
import uuid
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

router = APIRouter(tags=["Prediction"])

@router.post("/predict/{id}")
def create_prediction(id: str, db: Session = Depends(get_db)):
    # First, try to find the LabTest by its unique ID
    patient = db.query(LabTest).filter(LabTest.id == id).first()
    
    # If not found, check if the 'id' provided is actually a national_id and get their latest test
    if not patient:
        patient = db.query(LabTest).filter(LabTest.national_id == id).order_by(LabTest.createdAt.desc()).first()

    # If still not found, return the requested error message
    if not patient:
        raise HTTPException(status_code=404, detail="you don’t have data or the lab doesn’t finish the report file")

    # Fetch patient name from shared users table
    user_record = db.query(User).filter(User.national_id == patient.national_id).first()
    patient_name = user_record.username if user_record else "Anonymous"

    # Fetch lab info
    lab_record = db.query(Lab).filter(Lab.id == patient.lab_id).first()

    prediction_record = db.query(Prediction).filter(Prediction.lab_test_id == patient.id).first()
    if prediction_record and prediction_record.prediction_result is not None:
        assessment, _ = ml_service.assess_full_prediction([], probability=prediction_record.prediction_percentage)
        return {
            "id":             prediction_record.id,
            "lab_test_id":    prediction_record.lab_test_id,
            "prediction":     prediction_record.prediction_result,
            "probability":    prediction_record.prediction_percentage,
            "risk_level":     prediction_record.risk_level,
            "decision":       prediction_record.decision,
            "risk_color":     assessment.risk_color,
            "decision_label": assessment.decision_label,
        }

    data = [
        patient.age, patient.sex, patient.chest_pain_type,
        patient.resting_bp_s, patient.cholesterol, patient.fasting_blood_sugar,
        patient.resting_ecg, patient.max_heart_rate, patient.exercise_angina,
        patient.oldpeak, patient.st_slope
    ]

    # Predict synchronously
    try:
        assessment, shap_data = ml_service.assess_full_prediction(data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Model inference failed: {str(e)}")
    
    prediction_record = db.query(Prediction).filter(Prediction.lab_test_id == patient.id).first()
    if not prediction_record:
        prediction_record = Prediction(id=str(uuid.uuid4()), lab_test_id=patient.id)
        db.add(prediction_record)

    prediction_record.prediction_result  = 1 if assessment.decision.value == "high" else 0
    prediction_record.prediction_percentage = assessment.probability_pct
    prediction_record.risk_level  = assessment.risk_level.value
    prediction_record.decision    = assessment.decision.value
    prediction_record.shap_values_json = shap_data

    if assessment.decision.value == "high":
        # 1. Generate SHAP Image
        image_bytes = ml_service.generate_shap_image(shap_data)
        prediction_record.shap_image = image_bytes

        # 2. Chart Generation
        shap_tuple    = tuple(sorted(shap_data.items()))
        feat_chart    = chart_service.generate_feature_importance_chart(shap_tuple)
        shap_chart    = chart_service.generate_shap_waterfall_chart(shap_tuple)

        # 3. LLM Report Generation
        if consultant:
            top_features = sorted(shap_data.items(), key=lambda x: abs(x[1]), reverse=True)[:3]
            try:
                llm_result = consultant.generate_report(
                    probability   = assessment.probability_pct,
                    decision      = assessment.decision.value,
                    ui_risk_level = assessment.risk_level.value,
                    top_features  = top_features,
                )
                prediction_record.llm_report_json = llm_result
            except Exception as e:
                print(f"Warning: Failed to communicate with AI provider: {str(e)}")
                llm_result = {"explanation": "LLM generation failed.", "recommendations": []}
                prediction_record.llm_report_json = llm_result
        else:
            llm_result = {"explanation": "LLM Consultant is not initialized.", "recommendations": []}
            prediction_record.llm_report_json = llm_result

        # 4. PDF Generation
        patient_data = {
            "name": patient_name,
            "gender": "Male" if patient.sex == 1 else "Female",
            "dob": "N/A",
            "national_id": patient.national_id or "N/A",
            "address": "N/A",
            "age": patient.age,
            "cp": patient.chest_pain_type,
            "trestbps": patient.resting_bp_s,
            "chol": patient.cholesterol,
            "fbs": patient.fasting_blood_sugar,
            "restecg": patient.resting_ecg,
            "thalach": patient.max_heart_rate,
            "exang": "Yes" if patient.exercise_angina == 1 else "No",
            "oldpeak": patient.oldpeak,
            "slope": patient.st_slope,
        }

        risk_score = round(prediction_record.prediction_percentage, 1) if prediction_record.prediction_percentage else 0.0

        llm_report = {
            "summary": llm_result.get("explanation", ""),
            "recommendations": llm_result.get("recommendations", [])
        }

        images_base64 = {
            "university_logo": "",
            "risk_gauge": feat_chart,
            "shap_plot": shap_chart
        }

        lab_data = {
            "name": lab_record.name if lab_record else "N/A",
            "address": lab_record.address if lab_record else "N/A",
        }

        lab_test_data = {
            "id": patient.id,
        }


        pdf_bytes_io = generate_medical_report_pdf(
            patient_data=patient_data,
            risk_score=risk_score,
            llm_report=llm_report,
            images_base64=images_base64,
            lab_data=lab_data,
            lab_test_data=lab_test_data
        )

        prediction_record.pdf_binary = pdf_bytes_io.getvalue()
        prediction_record.report_generated_at = datetime.utcnow().isoformat()
        prediction_record.shap_image = None
        prediction_record.llm_report_json = None
        prediction_record.pdf_binary = None
        prediction_record.report_generated_at = None

    db.commit()

    return {
        "id":             prediction_record.id,
        "lab_test_id":    prediction_record.lab_test_id,
        "prediction":     prediction_record.prediction_result,
        "probability":    prediction_record.prediction_percentage,
        "risk_level":     prediction_record.risk_level,
        "decision":       prediction_record.decision,
        "risk_color":     assessment.risk_color,
        "decision_label": assessment.decision_label,
    }

@router.get("/predict/{id}")
def get_prediction(id: str, db: Session = Depends(get_db)):
    prediction_record = db.query(Prediction).filter(Prediction.lab_test_id == id).first()
    
    if not prediction_record:
        patient = db.query(LabTest).filter(LabTest.national_id == id).order_by(LabTest.createdAt.desc()).first()
        if patient:
            prediction_record = db.query(Prediction).filter(Prediction.lab_test_id == patient.id).first()

    if not prediction_record:
        raise HTTPException(status_code=404, detail="Prediction not found. Call POST /predict/{id} first.")

    return {
        "id":          prediction_record.id,
        "lab_test_id": prediction_record.lab_test_id,
        "prediction":  prediction_record.prediction_result,
        "probability": prediction_record.prediction_percentage,
        "risk_level":  prediction_record.risk_level,
        "decision":    prediction_record.decision,
    }

@router.post("/predict-csv")
async def predict_csv(file: UploadFile = File(...)):
    df = pd.read_csv(file.file)
    df.columns = df.columns.str.strip()

    missing = [col for col in ml_service.required_cols if col not in df.columns]
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing columns in CSV: {missing}")

    feature_df  = df[ml_service.required_cols].copy()
    predictions = ml_service.predict_dataframe(feature_df)
    df["prediction"] = predictions
    return df.to_dict(orient="records")
