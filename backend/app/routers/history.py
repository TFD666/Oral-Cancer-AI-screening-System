import logging

from fastapi import APIRouter, Depends, HTTPException

import app.state as state
from app.clinical_logic import normalize_prediction_record
from app.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["history"])


def _risk_score(risk_level: str) -> float:
    """Convert risk_level string to a 0-1 score for frontend rendering."""
    if risk_level == "Low":
        return 0.15
    if risk_level == "Medium":
        return 0.50
    return 0.85


def _insight_summary(prediction: str, risk_level: str) -> str:
    """Generate a short human-readable insight from prediction fields."""
    if risk_level == "Low":
        return "No concerning signs detected"
    if risk_level == "Medium":
        return "Monitor for any changes"
    return "Consult a specialist recommended"


@router.get("/history")
def get_history(user=Depends(get_current_user)):
    """Return past predictions for the authenticated user.

    Each item is enriched with computed fields for the UI: scan_number,
    risk_score, and insight_summary.  Results are ordered newest-first.
    """
    try:
        predictions = (
            state.supabase_admin.table("predictions")
            .select("id,patient_id,timestamp,prediction,risk_level,confidence,recommendation")
            .eq("created_by", user.email)
            .order("timestamp", desc=True)
            .execute()
        )
    except Exception:
        logger.exception("Failed to fetch prediction history for %s", user.email)
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to load prediction history."},
        )

    rows = predictions.data or []
    if not rows:
        return {"scans": [], "trend": {"trend": "Stable", "description": "No scans yet."}}

    # Total count for assigning scan numbers (oldest = #1)
    total = len(rows)

    for i, row in enumerate(rows):
        row = normalize_prediction_record(row)
        rows[i] = row
        row["model_confidence"] = row["confidence"]
        row["scan_number"] = total - i  # newest gets highest number
        row["risk_score"] = _risk_score(row["risk_level"])
        row["insight_summary"] = _insight_summary(row["prediction"], row["risk_level"])

    # Compute simple trend from recent scans
    scores = [r["risk_score"] for r in rows[:5]]
    if len(scores) < 2:
        trend = {"trend": "Stable", "description": "Not enough data to determine a trend yet."}
    else:
        mid = len(scores) // 2
        newer_avg = sum(scores[:mid]) / mid
        older_avg = sum(scores[mid:]) / (len(scores) - mid)
        diff = older_avg - newer_avg
        if diff > 0.1:
            trend = {"trend": "Improving", "description": "Your oral health is showing improvement. Keep it up!"}
        elif diff < -0.1:
            trend = {"trend": "Declining", "description": "Recent scans show higher risk. Consider a dental visit."}
        else:
            trend = {"trend": "Stable", "description": "Your oral health is stable. Keep monitoring."}

    return {"scans": rows, "trend": trend}
