import asyncio
import logging
import os
import traceback

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

import app.state as state
from app.config import get_settings
from app.dependencies import get_current_user
from app.inference.pipeline import run_inference_sync
from app.inference.preprocess import ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, read_and_validate_image
from app.self_patient import get_or_create_self_patient
from app.storage.supabase_storage import signed_url, upload_bytes

logger = logging.getLogger(__name__)

router = APIRouter(tags=["predict"])
settings = get_settings()


@router.post("/predict")
async def predict(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    # --- Resolve self-patient (auto-create on first scan) ---
    try:
        patient_id = get_or_create_self_patient(state.supabase_admin, user)
    except Exception:
        logger.error("Failed to resolve self-patient:\n%s", traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to initialize your profile. Please try again."},
        )

    # --- Input validation ---
    if file is None:
        raise HTTPException(status_code=400, detail={"error": "No file uploaded."})

    ext = os.path.splitext((file.filename or "").lower())[1]
    if ext not in ALLOWED_EXTENSIONS or file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail={"error": "Invalid file type. Only jpg, jpeg, png allowed."},
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail={"error": "No file uploaded."})

    try:
        image = read_and_validate_image(content)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail={"error": "Image could not be processed. File may be corrupted."},
        )

    # --- Model inference ---
    logger.info("Starting inference for user=%s, file=%s", user.email, file.filename)
    loop = asyncio.get_event_loop()
    try:
        result = await asyncio.wait_for(
            loop.run_in_executor(
                state.executor,
                run_inference_sync,
                state.model_b1,
                state.model_b2,
                state.device,
                image,
            ),
            timeout=settings.inference_timeout_seconds,
        )
    except asyncio.TimeoutError:
        logger.error("Inference timed out for user=%s", user.email)
        raise HTTPException(status_code=500, detail={"error": "Inference timeout. Please try again."})
    except Exception:
        logger.error("Inference failed:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail={"error": "Internal model inference error."})

    logger.info(
        "Inference complete: prediction=%s, confidence=%.4f, risk=%s",
        result["prediction"], result["confidence"], result["risk_level"],
    )

    uid = result["id"]
    upload_name = f"{uid}_{file.filename}"
    heatmap_name = f"{uid}_heatmap.png"

    # --- Storage upload ---
    try:
        upload_bytes(
            state.supabase_admin,
            settings.uploads_bucket,
            upload_name,
            content,
            file.content_type,
        )
        logger.info("Uploaded original image: bucket=%s path=%s", settings.uploads_bucket, upload_name)
    except Exception:
        logger.error("Failed to upload original image:\n%s", traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to store the uploaded image. Please try again."},
        )

    try:
        upload_bytes(
            state.supabase_admin,
            settings.heatmaps_bucket,
            heatmap_name,
            result["heatmap_png"],
            "image/png",
        )
        logger.info("Uploaded heatmap: bucket=%s path=%s", settings.heatmaps_bucket, heatmap_name)
    except Exception:
        logger.error("Failed to upload heatmap:\n%s", traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to store the heatmap image. Please try again."},
        )

    # --- Signed URLs ---
    try:
        image_url = signed_url(state.supabase_admin, settings.uploads_bucket, upload_name, 3600)
        heatmap_url = signed_url(state.supabase_admin, settings.heatmaps_bucket, heatmap_name, 3600)
        logger.info("Generated signed URLs")
    except Exception:
        logger.error("Failed to generate signed URLs:\n%s", traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to generate image URLs. Please try again."},
        )

    # --- Database insert ---
    db_row = {
        "id": uid,
        "patient_id": patient_id,
        "prediction": result["prediction"],
        "confidence": result["confidence"],
        "risk_level": result["risk_level"],
        "recommendation": result["recommendation"],
        "image_path": upload_name,
        "heatmap_path": heatmap_name,
        "created_by": user.email,
    }

    try:
        inserted = state.supabase_admin.table("predictions").insert(db_row).execute()
        if not inserted.data:
            raise RuntimeError("Insert returned no data")
        row = inserted.data[0]
        logger.info("Prediction saved to DB: id=%s", row["id"])
    except Exception:
        logger.error("Failed to insert prediction into DB:\n%s", traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to save prediction record. Please try again."},
        )

    return {
        "id": row["id"],
        "patient_id": row["patient_id"],
        "prediction": row["prediction"],
        "confidence": row["confidence"],
        "model_confidence": row["confidence"],
        "risk_level": row["risk_level"],
        "recommendation": row["recommendation"],
        "image_url": image_url,
        "heatmap_url": heatmap_url,
        "timestamp": row["timestamp"],
    }
