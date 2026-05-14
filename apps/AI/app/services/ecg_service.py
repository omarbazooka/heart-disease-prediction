from __future__ import annotations

import glob
import pickle
from pathlib import Path
from typing import Any

import numpy as np
import torch

from ECG.Skeleton.xresnet1d import xresnet1d101

# PTB-XL–style SCP statement codes → concise English labels (PTB-XL / AHA conventions).
SCP_LABELS: dict[str, str] = {
    "1AVB": "First-degree atrioventricular block",
    "2AVB": "Second-degree atrioventricular block",
    "3AVB": "Third-degree atrioventricular block",
    "ABQRS": "Abnormal QRS axis or morphology",
    "AFIB": "Atrial fibrillation",
    "AFLT": "Atrial flutter",
    "ALMI": "Anterolateral myocardial infarction",
    "AMI": "Anterior myocardial infarction",
    "ANEUR": "Ventricular aneurysm",
    "ASMI": "Anteroseptal myocardial infarction",
    "BIGU": "Bigeminal pattern",
    "CLBBB": "Complete left bundle branch block",
    "CRBBB": "Complete right bundle branch block",
    "DIG": "Digitalis effect",
    "EL": "Electrolyte disturbance pattern",
    "HVOLT": "High QRS voltage",
    "ILBBB": "Incomplete left bundle branch block",
    "ILMI": "Inferolateral myocardial infarction",
    "IMI": "Inferior myocardial infarction",
    "INJAL": "Anterolateral injury (ST/T)",
    "INJAS": "Anteroseptal injury (ST/T)",
    "INJIL": "Inferolateral injury (ST/T)",
    "INJIN": "Inferior injury (ST/T)",
    "INJLA": "Lateral injury (ST/T)",
    "INVT": "T-wave inversion",
    "IPLMI": "Inferoposterolateral myocardial infarction",
    "IPMI": "Inferoposterior myocardial infarction",
    "IRBBB": "Incomplete right bundle branch block",
    "ISCAL": "Anterolateral ischemia",
    "ISCAN": "Non-specific anterior ischemia",
    "ISCAS": "Anteroseptal ischemia",
    "ISCIL": "Inferolateral ischemia",
    "ISCIN": "Inferior ischemia",
    "ISCLA": "Lateral ischemia",
    "ISC_": "Non-specific ischemia",
    "IVCD": "Intraventricular conduction delay",
    "LAFB": "Left anterior fascicular block",
    "LAO/LAE": "Left atrial overload / enlargement",
    "LMI": "Lateral myocardial infarction",
    "LNGQT": "Long QT interval",
    "LOWT": "Low QRS voltage",
    "LPFB": "Left posterior fascicular block",
    "LPR": "Low pulse rate (bradycardia context)",
    "LVH": "Left ventricular hypertrophy",
    "LVOLT": "Low voltage (general)",
    "NDT": "Non-diagnostic T abnormalities",
    "NORM": "Normal ECG",
    "NST_": "Non-specific ST changes",
    "NT_": "Non-specific T-wave changes",
    "PAC": "Premature atrial contraction(s)",
    "PACE": "Ventricular pacing pattern",
    "PMI": "Posterior myocardial infarction",
    "PRC(S)": "Premature complex(es)",
    "PSVT": "Paroxysmal supraventricular tachycardia",
    "PVC": "Premature ventricular contraction(s)",
    "QWAVE": "Pathological Q waves",
    "RAO/RAE": "Right atrial overload / enlargement",
    "RVH": "Right ventricular hypertrophy",
    "SARRH": "Sinus arrhythmia",
    "SBRAD": "Sinus bradycardia",
    "SEHYP": "Septal hypertrophy pattern",
    "SR": "Sinus rhythm",
    "STACH": "Sinus tachycardia",
    "STD_": "ST depression (non-localized)",
    "STE_": "ST elevation (non-localized)",
    "SVARR": "Supraventricular arrhythmia",
    "SVTAC": "Supraventricular tachycardia",
    "TAB_": "T-wave abnormality (non-specific)",
    "TRIGU": "Trigeminal pattern",
    "VCLVH": "Voltage criteria for LVH",
    "WPW": "Wolff-Parkinson-White pattern",
}


def _label_for_code(code: str) -> str:
    return SCP_LABELS.get(code, code.replace("_", " ").strip() or code)


def _ai_root() -> Path:
    return Path(__file__).resolve().parent.parent.parent


def _ecg_root() -> Path:
    return _ai_root() / "ECG"


def _first_pth_under_weights() -> Path:
    weights_dir = _ecg_root() / "weights"
    matches = sorted(glob.glob(str(weights_dir / "*.pth")))
    if not matches:
        raise FileNotFoundError(f"No .pth weights found under {weights_dir}")
    return Path(matches[0])


class ECGPredictor:
    """
    Loads PTB-XL-style `xresnet1d101` weights plus `StandardScaler` and `MultiLabelBinarizer`
    pickles from `ECG/weights` and `ECG/Data Preprocessing`.
    """

    def __init__(self) -> None:
        ecg = _ecg_root()
        preprocess = ecg / "Data Preprocessing"
        self.model_path = _first_pth_under_weights()
        self.scaler_path = preprocess / "standard_scaler.pkl"
        self.mlb_path = preprocess / "mlb.pkl"

        if not self.scaler_path.is_file():
            raise FileNotFoundError(f"Scaler not found: {self.scaler_path}")
        if not self.mlb_path.is_file():
            raise FileNotFoundError(f"MLB pickle not found: {self.mlb_path}")

        with open(self.scaler_path, "rb") as f:
            self.scaler = pickle.load(f)
        with open(self.mlb_path, "rb") as f:
            self.mlb = pickle.load(f)

        self.classes = list(self.mlb.classes_)
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._device = device

        self.model = xresnet1d101(
            num_classes=len(self.classes),
            input_channels=12,
            lin_ftrs_head=[128],
        )
        state = torch.load(self.model_path, map_location=device, weights_only=False)
        if isinstance(state, dict) and "model" in state:
            state = state["model"]
        self.model.load_state_dict(state, strict=False)
        self.model.to(device)
        self.model.eval()

    def preprocess_signal(self, raw_signal: np.ndarray) -> torch.Tensor:
        x = np.asarray(raw_signal, dtype=np.float32)
        if x.ndim != 2 or x.shape[1] != 12:
            raise ValueError(f"Expected signal shape (T, 12), got {x.shape}")

        n_feat = getattr(self.scaler, "n_features_in_", 12)
        if n_feat == 1:
            flat = x.reshape(-1, 1)
            scaled = self.scaler.transform(flat).reshape(x.shape)
        else:
            scaled = self.scaler.transform(x)
        scaled = scaled.T
        tensor = torch.from_numpy(scaled).to(dtype=torch.float32, device=self._device).unsqueeze(0)
        return tensor

    def predict(self, raw_signal: np.ndarray) -> list[dict[str, Any]]:
        """
        Run inference, drop zero-probability classes, sort descending, return top 5
        with human-readable labels: ``{"label": "Normal ECG (NORM)", "probability": 99.44, "code": "NORM"}``.
        """
        tensor_signal = self.preprocess_signal(raw_signal)
        with torch.no_grad():
            logits = self.model(tensor_signal)
            probabilities = torch.sigmoid(logits).detach().cpu().numpy()[0]

        scored: list[tuple[str, float]] = []
        for code, prob in zip(self.classes, probabilities):
            pct = round(float(prob) * 100, 2)
            if pct > 0:
                scored.append((code, pct))

        scored.sort(key=lambda x: -x[1])
        scored = scored[:5]

        out: list[dict[str, Any]] = []
        for code, pct in scored:
            readable = _label_for_code(code)
            out.append(
                {
                    "label": f"{readable} ({code})",
                    "probability": pct,
                    "code": code,
                }
            )
        return out


_predictor_singleton: ECGPredictor | None = None


def get_ecg_predictor() -> ECGPredictor:
    global _predictor_singleton
    if _predictor_singleton is None:
        _predictor_singleton = ECGPredictor()
    return _predictor_singleton


if __name__ == "__main__":
    predictor = ECGPredictor()
    dummy = np.random.randn(1000, 12).astype(np.float32)
    print(predictor.predict(dummy))
