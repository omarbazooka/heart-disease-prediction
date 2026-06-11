from sqlalchemy import Column, Integer, Float, String, LargeBinary, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from db.database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    national_id = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Lab(Base):
    __tablename__ = "labs"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    lab_code = Column(String, nullable=False)
    address = Column(String, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class LabTest(Base):
    __tablename__ = "lab_tests"

    id = Column(String, primary_key=True, index=True)
    lab_id = Column(String, nullable=False)
    national_id = Column(String, nullable=False)
    age = Column(Float, nullable=False)
    sex = Column(Integer, nullable=False)
    chest_pain_type = Column(Integer, nullable=False)
    resting_bp_s = Column(Float, nullable=False)
    cholesterol = Column(Float, nullable=False)
    fasting_blood_sugar = Column(Integer, nullable=False)
    resting_ecg = Column(Integer, nullable=False)
    max_heart_rate = Column(Float, nullable=False)
    exercise_angina = Column(Integer, nullable=False)
    oldpeak = Column(Float, nullable=False)
    st_slope = Column(Integer, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    prediction = relationship("Prediction", back_populates="lab_test", uselist=False)


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    lab_test_id = Column(String, ForeignKey("lab_tests.id"), unique=True)
    
    prediction_result = Column(Integer, nullable=True)
    prediction_percentage = Column(Float, nullable=True)
    risk_level = Column(String, nullable=True)
    decision = Column(String, nullable=True)
    
    shap_image = Column(LargeBinary, nullable=True)
    shap_values_json = Column(JSON, nullable=True)
    llm_report_json = Column(JSON, nullable=True)
    pdf_binary = Column(LargeBinary, nullable=True)
    report_generated_at = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    lab_test = relationship("LabTest", back_populates="prediction")
