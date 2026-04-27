from __future__ import annotations


def risk_from_cancer_score(cancer_score: float) -> str:
    """Map the cancer-class score to a clinical risk band."""
    if cancer_score >= 0.85:
        return "High"
    if cancer_score >= 0.60:
        return "Medium"
    return "Low"


def recommendation_for(prediction: str, risk_level: str) -> str:
    if prediction == "Cancer" and risk_level == "High":
        return "Immediate clinical evaluation and biopsy recommended."
    if prediction == "Cancer" and risk_level == "Medium":
        return "Further diagnostic testing recommended."
    if prediction == "Non-Cancer" and risk_level == "Low":
        return "Routine monitoring advised."
    return "Further diagnostic testing recommended."


def normalize_prediction_record(record: dict) -> dict:
    """
    Normalize legacy records created before risk was derived from the cancer score.

    Older rows can contain logically impossible pairs such as:
    - prediction = Non-Cancer
    - risk_level = High

    Those rows were produced by deriving risk from model certainty instead of the
    cancer-class score. We keep the stored row untouched, but correct the values
    returned to the UI and chat so the product stays clinically coherent.
    """
    normalized = dict(record)
    confidence = normalized.get("confidence")
    if confidence is not None and "model_confidence" not in normalized:
        normalized["model_confidence"] = confidence

    prediction = normalized.get("prediction")
    risk_level = normalized.get("risk_level")
    if prediction == "Non-Cancer" and risk_level in {"Medium", "High"}:
        normalized["risk_level"] = "Low"
        normalized["recommendation"] = recommendation_for("Non-Cancer", "Low")

    return normalized
