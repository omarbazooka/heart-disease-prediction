import os
import pandas as pd
import requests
import io
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from services.risk_classifier import assess_risk, RiskAssessment

API_URL = os.getenv(
    "HEART_MODEL_API_URL",
    "https://omarbm52-artemis-heart-api.hf.space/predict",
)
MODEL_CONNECT_TIMEOUT_SECONDS = float(os.getenv("MODEL_CONNECT_TIMEOUT_SECONDS", "15"))
MODEL_READ_TIMEOUT_SECONDS = float(os.getenv("MODEL_READ_TIMEOUT_SECONDS", "180"))


class MLService:
    def __init__(self):
        self.required_cols = [
            "age", "sex", "chest pain type", "resting bp s", "cholesterol",
            "fasting blood sugar", "resting ecg", "max heart rate",
            "exercise angina", "oldpeak", "ST slope"
        ]

    def _normalize_shap_dict(self, raw):
        """Coerce SHAP payload to float values so charts / lru_cache stay hashable and matplotlib-safe."""
        default = {col: 0.1 for col in self.required_cols}
        if not isinstance(raw, dict):
            return default.copy()
        out = {}
        for k, v in raw.items():
            key = str(k)
            try:
                if isinstance(v, (list, tuple)):
                    v = float(v[0]) if len(v) else 0.0
                else:
                    v = float(v)
            except (TypeError, ValueError, IndexError):
                v = 0.0
            out[key] = v
        for col in self.required_cols:
            if col not in out:
                out[col] = 0.1
        return out

    def _prepare_payload(self, data: list):
        return {
            "age": float(data[0]),
            "sex": int(data[1]),
            "chest pain type": int(data[2]),
            "resting bp s": float(data[3]),
            "cholesterol": float(data[4]),
            "fasting blood sugar": int(data[5]),
            "resting ecg": int(data[6]),
            "max heart rate": float(data[7]),
            "exercise angina": int(data[8]),
            "oldpeak": float(data[9]),
            "ST slope": int(data[10])
        }

    def _call_api(self, data: list) -> dict:
        """Single model API call with bounded connect/read timeouts."""
        payload = self._prepare_payload(data)
        response = requests.post(
            API_URL,
            json=payload,
            timeout=(MODEL_CONNECT_TIMEOUT_SECONDS, MODEL_READ_TIMEOUT_SECONDS),
        )
        response.raise_for_status()
        result = response.json()
        if not isinstance(result, dict):
            raise ValueError("Heart model service returned an invalid response")
        return result

    # ── Binary prediction (0 or 1) ────────────────────────────────────
    def predict_single(self, data: list) -> int:
        try:
            result = self._call_api(data)
            return int(result.get("prediction", 0))
        except Exception as e:
            print("API Error in predict_single:", e)
            raise

    def predict_dataframe(self, df: pd.DataFrame):
        return [self.predict_single(row.tolist()) for _, row in df.iterrows()]

    # ── Risk + SHAP (legacy — kept for compatibility) ─────────────────
    def get_risk_and_shap(self, data: list):
        """Returns (risk_score_pct, shap_data_dict)."""
        try:
            result = self._call_api(data)
            risk_score = float(result.get("probability", 0.0))
            shap_data = self._normalize_shap_dict(result.get("shap_values", {}))
            return risk_score, shap_data
        except Exception as e:
            print("API Error in get_risk_and_shap:", e)
            raise RuntimeError("Heart prediction model service is unavailable") from e

    # ── Full hybrid assessment (preferred) ────────────────────────────
    def assess_full_prediction(self, data: list, probability: float = None):
        """
        Calculates or retrieves prediction results.
        If probability is provided (as a percentage 0-100), it uses it directly.
        Otherwise, it calls the model API.

        Important: a model/API failure must NEVER be converted into a synthetic
        low-risk result. The caller should receive an error and can retry safely.
        """
        shap_data = {col: 0.1 for col in self.required_cols}

        if probability is None:
            try:
                result = self._call_api(data)
                probability_pct = float(result["probability"])
                shap_data = self._normalize_shap_dict(
                    result.get("shap_values", shap_data)
                )
            except Exception as e:
                print("Error in assess_full_prediction:", e)
                raise RuntimeError("Heart prediction model service is unavailable") from e
        else:
            probability_pct = float(probability)

        assessment = assess_risk(probability_pct / 100.0)
        shap_data = self._normalize_shap_dict(shap_data)
        return assessment, shap_data

    # ── SHAP image generator ──────────────────────────────────────────
    def generate_shap_image(self, shap_data: dict) -> bytes:
        features = list(shap_data.keys())
        importance = [abs(v) for v in shap_data.values()]

        shap_df = pd.DataFrame({
            "feature": features,
            "importance": importance
        }).sort_values(by="importance", ascending=False)

        plt.figure(figsize=(8, 4))
        plt.barh(shap_df["feature"], shap_df["importance"])
        plt.gca().invert_yaxis()
        plt.title("Feature Importance (SHAP)")
        plt.xlabel("Feature Importance")

        buf = io.BytesIO()
        plt.savefig(buf, format="png", bbox_inches="tight")
        plt.close()
        buf.seek(0)
        return buf.read()


ml_service = MLService()
