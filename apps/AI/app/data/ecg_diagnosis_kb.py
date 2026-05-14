"""
Structured reference text for PTB-XL-style SCP ECG labels.
Used in LLM prompts (top-5 only) and optional PDF appendix.
"""

from __future__ import annotations

from typing import Any

# Keep in sync with services/ecg_service.SCP_LABELS keys (all model classes should be covered via fallback).
from services.ecg_service import SCP_LABELS


def _default_block(code: str, label: str) -> dict[str, str]:
    return {
        "clinical_description": (
            f"The automated ECG classifier highlighted pattern {code} ({label}). "
            "This reflects signal features the model associates with that statement code; "
            "it is not equivalent to a clinical diagnosis."
        ),
        "why_it_matters": (
            "Automated labels help triage and documentation, but must be correlated with history, "
            "vitals, prior ECGs, and physical examination."
        ),
        "risk_context": (
            "Risk is context-dependent. Some patterns are benign variants; others warrant urgent evaluation "
            "when combined with symptoms such as chest pain, syncope, or dyspnea."
        ),
        "patient_friendly_summary": (
            f"The computer analysis noted a possible pattern related to: {label}. "
            "Please discuss this result with a qualified clinician."
        ),
    }


# Curated expansions for common / higher-signal codes (remainder use _default_block).
_ENRICHED: dict[str, dict[str, str]] = {
    "NORM": {
        "clinical_description": (
            "The model's highest-probability finding aligns with a normal sinus pattern classification (NORM) "
            "in the PTB-XL label space."
        ),
        "why_it_matters": (
            "A 'normal' automated label reduces—but does not eliminate—the chance of actionable pathology; "
            "clinical context still rules."
        ),
        "risk_context": (
            "Low concern from this label alone; seek care if new cardiac symptoms appear."
        ),
        "patient_friendly_summary": (
            "The tracing was classified as broadly normal by the automated system. Keep routine follow-up with your doctor."
        ),
    },
    "AFIB": {
        "clinical_description": (
            "Atrial fibrillation (AFIB) is an irregular atrial rhythm pattern that automated ECG models may detect "
            "from rhythm and waveform cues."
        ),
        "why_it_matters": (
            "AFIB can be associated with stroke risk and symptoms such as palpitations or fatigue when present."
        ),
        "risk_context": (
            "If symptoms are present or this is a new finding, timely clinical evaluation is important."
        ),
        "patient_friendly_summary": (
            "The analysis may suggest an irregular heartbeat pattern. A clinician should confirm with examination "
            "and possibly additional monitoring."
        ),
    },
    "AMI": {
        "clinical_description": (
            "Anterior MI pattern labels (e.g., AMI) in automated systems reflect ST/T and QRS morphologies "
            "similar to training examples—not a confirmed infarction."
        ),
        "why_it_matters": (
            "ST changes can represent ischemia, early repolarization, or lead placement issues; correlation is essential."
        ),
        "risk_context": (
            "Chest pain, diaphoresis, or shortness of breath with this pattern warrants urgent emergency evaluation."
        ),
        "patient_friendly_summary": (
            "The ECG software flagged a pattern that can sometimes relate to heart muscle stress. "
            "If you have chest pain or breathing difficulty, seek emergency care."
        ),
    },
}


def get_entry(code: str) -> dict[str, Any]:
    label = SCP_LABELS.get(code, code.replace("_", " ").strip() or code)
    base = _ENRICHED.get(code) or _default_block(code, label)
    return {"code": code, "label": label, **base}


def build_kb_context_for_top5(top5: list[dict]) -> str:
    """Human-readable block for LLM prompt (top findings only)."""
    lines: list[str] = []
    for item in top5[:5]:
        code = str(item.get("code") or "").strip()
        if not code:
            continue
        e = get_entry(code)
        lines.append(
            f"Code {e['code']} — {e['label']}\n"
            f"- Clinical note: {e['clinical_description']}\n"
            f"- Why it matters: {e['why_it_matters']}\n"
            f"- Risk context: {e['risk_context']}\n"
            f"- Patient-friendly: {e['patient_friendly_summary']}\n"
        )
    return "\n".join(lines) if lines else "No structured diagnosis codes available."


def all_supported_codes() -> list[str]:
    return sorted(SCP_LABELS.keys())
