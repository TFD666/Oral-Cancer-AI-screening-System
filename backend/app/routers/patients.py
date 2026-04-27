import logging

from fastapi import APIRouter, Depends, HTTPException

import app.state as state
from app.dependencies import get_current_user
from app.schemas import PatientCreateIn

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post("")
def create_patient(payload: PatientCreateIn, user=Depends(get_current_user)):
    """Create a new patient record owned by the authenticated doctor."""
    record = payload.model_dump()
    record["created_by"] = user.email
    try:
        res = state.supabase_admin.table("patients").insert(record).execute()
        if not res.data:
            raise RuntimeError("Insert returned no data")
        logger.info("Patient created: id=%s by=%s", res.data[0]["id"], user.email)
        return res.data[0]
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to create patient")
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to create patient record. Please try again."},
        )


@router.get("")
def list_patients(user=Depends(get_current_user)):
    """Return all patients belonging to the authenticated doctor."""
    try:
        res = (
            state.supabase_admin.table("patients")
            .select("*")
            .eq("created_by", user.email)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception:
        logger.exception("Failed to list patients for %s", user.email)
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to load patient records."},
        )


@router.get("/{patient_id}")
def get_patient(patient_id: str, user=Depends(get_current_user)):
    """Return a patient profile together with their full scan history."""
    try:
        patient = (
            state.supabase_admin.table("patients")
            .select("*")
            .eq("id", patient_id)
            .eq("created_by", user.email)
            .execute()
        )
    except Exception:
        logger.exception("Failed to fetch patient %s", patient_id)
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to load patient record."},
        )

    if not patient.data:
        raise HTTPException(status_code=404, detail={"error": "Record not found."})

    try:
        predictions = (
            state.supabase_admin.table("predictions")
            .select("*")
            .eq("patient_id", patient_id)
            .eq("created_by", user.email)
            .order("timestamp", desc=True)
            .execute()
        )
    except Exception:
        logger.exception("Failed to fetch predictions for patient %s", patient_id)
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to load scan history."},
        )

    return {"patient": patient.data[0], "history": predictions.data or []}
