"""Daily oral health tips endpoint."""

import logging

from fastapi import APIRouter, Depends

import app.state as state
from app.daily_tips import FALLBACK_TIPS, generate_daily_tips, get_cached_tips
from app.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["daily-tips"])


def _normalize_risk_level(value: str | None) -> str:
    risk = (value or "general").lower()
    if risk in {"low", "medium", "high"}:
        return risk
    return "general"


def _latest_risk_level(email: str) -> str:
    try:
        result = (
            state.supabase_admin.table("predictions")
            .select("risk_level,timestamp")
            .eq("created_by", email)
            .order("timestamp", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            return _normalize_risk_level(result.data[0].get("risk_level"))
    except Exception:
        logger.warning("Failed to determine latest risk level for daily tips", exc_info=True)
    return "general"


@router.get("/daily-tips")
def daily_tips(user=Depends(get_current_user)):
    """Return cached daily tips personalized by the user's latest scan risk."""
    risk_level = _latest_risk_level(user.email)

    try:
        cached = get_cached_tips()
        if not any(cached.values()):
            cached = generate_daily_tips()
    except Exception:
        logger.warning("Falling back to static daily tips", exc_info=True)
        cached = FALLBACK_TIPS

    personalized = cached.get(risk_level) or []
    general = cached.get("general") or []
    tips = [*personalized[:2], *general[:1]]

    if not tips:
        tips = [*FALLBACK_TIPS.get(risk_level, []), *FALLBACK_TIPS["general"]][:3]

    return {
        "risk_level": risk_level,
        "tips": tips[:3],
    }
