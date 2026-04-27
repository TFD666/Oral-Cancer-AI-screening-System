"""Aggregated dashboard endpoint.

Returns everything the Home Dashboard screen needs in a single API call:
latest scan with full detail, last 5 scans for the wave chart, total scan
count, days since last scan, and a daily tip.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

import app.state as state
from app.clinical_logic import normalize_prediction_record
from app.config import get_settings
from app.dependencies import get_current_user
from app.storage.supabase_storage import signed_url

logger = logging.getLogger(__name__)

router = APIRouter(tags=["dashboard"])
settings = get_settings()

# Static tip pool — rotates daily based on day-of-year
_TIPS = [
    "Persistent ulcers lasting more than 2 weeks should be evaluated by a dentist or doctor promptly.",
    "Brushing your tongue helps remove bacteria and keeps your breath fresh.",
    "Drink plenty of water throughout the day to maintain saliva flow and oral health.",
    "Avoid tobacco in all forms — it's the leading risk factor for oral cancer.",
    "Regular dental check-ups every 6 months can catch problems early.",
    "A diet rich in fruits and vegetables supports healthy gums and oral tissue.",
    "Red or white patches inside the mouth that don't go away should be checked by a professional.",
    "Limit sugary snacks between meals to reduce the risk of tooth decay.",
    "Replace your toothbrush every 3-4 months or when bristles become frayed.",
    "Self-examination of your mouth monthly can help you spot changes early.",
]


def _risk_score(risk_level: str) -> float:
    """Convert risk_level string to a 0-1 score for the wave chart."""
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


def _compute_trend(scans: list[dict]) -> dict:
    """Compute a simple trend from the last few scans."""
    if len(scans) < 2:
        return {"trend": "Stable", "description": "Not enough data to determine a trend yet."}

    scores = [_risk_score(s["risk_level"]) for s in scans[:5]]
    # Compare average of first half vs second half (newer vs older)
    mid = len(scores) // 2
    newer_avg = sum(scores[:mid]) / mid
    older_avg = sum(scores[mid:]) / (len(scores) - mid)
    diff = older_avg - newer_avg  # positive means improving (newer scores are lower)

    if diff > 0.1:
        return {"trend": "Improving", "description": "Your oral health is showing improvement. Keep it up!"}
    if diff < -0.1:
        return {"trend": "Declining", "description": "Recent scans show higher risk. Consider a dental visit."}
    return {"trend": "Stable", "description": "Your oral health is stable. Keep monitoring."}


@router.get("/dashboard")
def get_dashboard(user=Depends(get_current_user)):
    """Return aggregated dashboard data for the authenticated user."""

    # 1. Fetch all predictions for this user, newest first
    try:
        predictions = (
            state.supabase_admin.table("predictions")
            .select("id,timestamp,prediction,confidence,risk_level,recommendation,image_path,heatmap_path")
            .eq("created_by", user.email)
            .order("timestamp", desc=True)
            .execute()
        )
    except Exception:
        logger.exception("Failed to fetch predictions for dashboard, user=%s", user.email)
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to load dashboard data."},
        )

    all_scans = [normalize_prediction_record(scan) for scan in (predictions.data or [])]
    total_scan_count = len(all_scans)

    # 2. Derive user display info
    meta = getattr(user, "user_metadata", None) or {}
    full_name = meta.get("full_name") or meta.get("name") or user.email.split("@")[0]
    initials = "".join(word[0].upper() for word in full_name.split()[:2]) if full_name else "?"

    # 3. Build latest scan detail (if any)
    latest_scan = None
    days_since_last_scan = None
    if all_scans:
        latest = all_scans[0]
        # Generate signed URLs for the latest scan images
        try:
            image_url = signed_url(
                state.supabase_admin, settings.uploads_bucket, latest["image_path"], 3600
            )
            heatmap_url = signed_url(
                state.supabase_admin, settings.heatmaps_bucket, latest["heatmap_path"], 3600
            )
        except Exception:
            logger.warning("Could not generate signed URLs for latest scan", exc_info=True)
            image_url = ""
            heatmap_url = ""

        latest_scan = {
            "id": latest["id"],
            "timestamp": latest["timestamp"],
            "prediction": latest["prediction"],
            "confidence": latest["confidence"],
            "model_confidence": latest["confidence"],
            "risk_level": latest["risk_level"],
            "recommendation": latest["recommendation"],
            "image_url": image_url,
            "heatmap_url": heatmap_url,
            "insight": _insight_summary(latest["prediction"], latest["risk_level"]),
        }

        # Calculate days since last scan
        try:
            scan_dt = datetime.fromisoformat(latest["timestamp"].replace("Z", "+00:00"))
            delta = datetime.now(timezone.utc) - scan_dt
            days_since_last_scan = delta.days
        except Exception:
            days_since_last_scan = None

    # 4. Build wave chart data (last 5 scans)
    recent_scans = []
    for scan in all_scans[:5]:
        recent_scans.append({
            "id": scan["id"],
            "timestamp": scan["timestamp"],
            "risk_score": _risk_score(scan["risk_level"]),
            "confidence": scan["confidence"],
            "model_confidence": scan["confidence"],
        })

    # 5. Trend
    trend = _compute_trend(all_scans)

    # 6. Tip of the day
    day_of_year = datetime.now().timetuple().tm_yday
    tip_of_the_day = _TIPS[day_of_year % len(_TIPS)]

    return {
        "user": {
            "name": full_name,
            "email": user.email,
            "initials": initials,
        },
        "latest_scan": latest_scan,
        "recent_scans": recent_scans,
        "total_scan_count": total_scan_count,
        "days_since_last_scan": days_since_last_scan,
        "trend": trend,
        "tip_of_the_day": tip_of_the_day,
    }
