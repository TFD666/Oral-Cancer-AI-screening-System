import logging

from fastapi import APIRouter, Depends, HTTPException

import app.state as state
from app.clinical_logic import normalize_prediction_record
from app.config import get_settings
from app.dependencies import get_current_user
from app.storage.supabase_storage import signed_url

logger = logging.getLogger(__name__)

router = APIRouter(tags=["report"])
settings = get_settings()


@router.get("/report/{record_id}")
def get_report(record_id: str, user=Depends(get_current_user)):
    """Return the full prediction report with signed image URLs."""
    try:
        res = (
            state.supabase_admin.table("predictions")
            .select("*")
            .eq("id", record_id)
            .eq("created_by", user.email)
            .execute()
        )
    except Exception:
        logger.exception("Failed to fetch report %s", record_id)
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to load report."},
        )

    if not res.data:
        raise HTTPException(status_code=404, detail={"error": "Record not found."})

    record = normalize_prediction_record(res.data[0])

    try:
        image_url = signed_url(
            state.supabase_admin, settings.uploads_bucket, record["image_path"], 3600
        )
        heatmap_url = signed_url(
            state.supabase_admin, settings.heatmaps_bucket, record["heatmap_path"], 3600
        )
    except Exception:
        logger.exception("Failed to generate signed URLs for report %s", record_id)
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to generate image URLs."},
        )

    return {
        "id": record["id"],
        "patient_id": record["patient_id"],
        "prediction": record["prediction"],
        "confidence": record["confidence"],
        "model_confidence": record["confidence"],
        "risk_level": record["risk_level"],
        "recommendation": record["recommendation"],
        "image_url": image_url,
        "heatmap_url": heatmap_url,
        "timestamp": record["timestamp"],
    }
