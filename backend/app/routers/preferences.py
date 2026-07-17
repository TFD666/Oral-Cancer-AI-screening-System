import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

import app.state as state
from app.dependencies import get_current_user
from app.schemas import UserPreferencesUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/preferences", tags=["preferences"])


def _default_display_name(user) -> str:
    meta = getattr(user, "user_metadata", None) or {}
    full_name = meta.get("full_name") or meta.get("name")
    if isinstance(full_name, str) and full_name.strip():
        return full_name.strip()
    return user.email.split("@")[0]


def _serialize_preferences(row: dict | None, user) -> dict:
    row = row or {}
    return {
        "display_name": row.get("display_name") or _default_display_name(user),
        "email": user.email,
        "scan_reminders": row.get("scan_reminders", True),
        "daily_tips": row.get("daily_tips", True),
    }


@router.get("")
def get_preferences(user=Depends(get_current_user)):
    try:
        result = (
            state.supabase_admin.table("user_preferences")
            .select("display_name,scan_reminders,daily_tips")
            .eq("user_email", user.email)
            .limit(1)
            .execute()
        )
    except Exception:
        logger.exception("Failed to load preferences for %s", user.email)
        raise HTTPException(status_code=500, detail={"error": "Failed to load preferences."})

    return _serialize_preferences((result.data or [None])[0], user)


@router.put("")
def update_preferences(payload: UserPreferencesUpdate, user=Depends(get_current_user)):
    try:
        existing = (
            state.supabase_admin.table("user_preferences")
            .select("display_name,scan_reminders,daily_tips")
            .eq("user_email", user.email)
            .limit(1)
            .execute()
        )
        current = _serialize_preferences((existing.data or [None])[0], user)

        row = {
            "user_email": user.email,
            "display_name": payload.display_name if payload.display_name is not None else current["display_name"],
            "scan_reminders": payload.scan_reminders if payload.scan_reminders is not None else current["scan_reminders"],
            "daily_tips": payload.daily_tips if payload.daily_tips is not None else current["daily_tips"],
            "updated_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(timespec="seconds"),
        }

        result = state.supabase_admin.table("user_preferences").upsert(row).execute()
    except Exception:
        logger.exception("Failed to update preferences for %s", user.email)
        raise HTTPException(status_code=500, detail={"error": "Failed to update preferences."})

    return _serialize_preferences((result.data or [row])[0], user)
