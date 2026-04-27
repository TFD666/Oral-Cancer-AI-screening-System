"""Implicit self-patient logic.

Every authenticated user has exactly one "self" patient record.  It is
created transparently on the first scan and reused for all subsequent
scans.  The frontend never exposes a patient-selection UI.
"""

import logging

from supabase import Client

logger = logging.getLogger(__name__)

# Sentinel values used for the auto-created self-patient record so it
# can be distinguished from legacy manually-created patients.
_SELF_PATIENT_AGE = 0
_SELF_PATIENT_GENDER = "Other"


def get_or_create_self_patient(supabase_admin: Client, user) -> str:
    """Return the patient ID for the authenticated user's self-patient.

    If no self-patient exists yet, one is created automatically.
    The ``user`` object must expose ``.email`` and optionally
    ``.user_metadata`` with a ``full_name`` field.

    Returns the UUID string of the patient row.
    """
    email: str = user.email

    # 1. Try to find an existing self-patient for this user
    try:
        existing = (
            supabase_admin.table("patients")
            .select("id")
            .eq("created_by", email)
            .order("created_at", desc=False)   # oldest first = the self-patient
            .limit(1)
            .execute()
        )
        if existing.data:
            return existing.data[0]["id"]
    except Exception:
        logger.exception("Failed to look up self-patient for %s", email)
        raise

    # 2. No patient exists yet — create the self-patient record
    display_name = _derive_display_name(user)
    record = {
        "name": display_name,
        "age": _SELF_PATIENT_AGE,
        "gender": _SELF_PATIENT_GENDER,
        "medical_history": None,
        "created_by": email,
    }

    try:
        res = supabase_admin.table("patients").insert(record).execute()
        if not res.data:
            raise RuntimeError("Self-patient insert returned no data")
        patient_id = res.data[0]["id"]
        logger.info(
            "Auto-created self-patient: id=%s for user=%s", patient_id, email
        )
        return patient_id
    except Exception:
        logger.exception("Failed to create self-patient for %s", email)
        raise


def _derive_display_name(user) -> str:
    """Best-effort extraction of the user's display name from Supabase
    auth metadata.  Falls back to the email prefix."""
    meta = getattr(user, "user_metadata", None) or {}
    full_name = meta.get("full_name") or meta.get("name")
    if full_name and isinstance(full_name, str) and full_name.strip():
        return full_name.strip()
    # Fallback: take everything before the @ in the email
    return user.email.split("@")[0]
