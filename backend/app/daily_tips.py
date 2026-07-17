"""Cached AI-generated daily oral health tips.

The frontend should only read cached tips. This module generates one shared
daily batch when the cache is empty or expired, then stores it in Supabase.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta, timezone

import app.state as state
from app.routers.chat import call_groq

logger = logging.getLogger(__name__)

TIP_MODEL = os.getenv("GROQ_DAILY_TIPS_MODEL", "").strip() or None
RISK_LEVELS = ("low", "medium", "high", "general")

FALLBACK_TIPS = {
    "low": [
        "Continue monthly self-checks to maintain good oral health.",
        "Keep brushing twice daily and flossing once every day.",
        "Stay hydrated to support saliva and healthy mouth tissue.",
    ],
    "medium": [
        "Monitor mouth changes and keep regular dental check-ups.",
        "Reduce tobacco use and watch persistent ulcers carefully.",
        "Avoid alcohol and tobacco to support healthier oral tissue.",
    ],
    "high": [
        "Schedule a dental consultation if symptoms persist.",
        "Do not ignore lasting mouth sores or unusual patches.",
        "Follow professional advice and keep your next appointment.",
    ],
    "general": [
        "Brush your tongue daily to reduce harmful oral bacteria.",
        "Regular oral checks help notice changes early.",
        "Limit sugary snacks between meals to protect your teeth.",
    ],
}

SYSTEM_PROMPT = """You are generating short preventive oral health tips for a healthcare app.

Rules:
* Maximum 20 words
* Preventive only
* No diagnosis
* No alarming statements
* No treatment claims
* Easy to understand
* Human-friendly tone"""

USER_PROMPT = """Generate exactly 12 oral health tips as strict JSON:
{
  "low": ["tip", "tip", "tip"],
  "medium": ["tip", "tip", "tip"],
  "high": ["tip", "tip", "tip"],
  "general": ["tip", "tip", "tip"]
}

Each array must contain exactly 3 tips."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _expires_at(now: datetime) -> datetime:
    tomorrow = (now + timedelta(days=1)).date()
    return datetime.combine(tomorrow, datetime.min.time(), tzinfo=timezone.utc)


def _db_timestamp(value: datetime) -> str:
    return value.astimezone(timezone.utc).replace(tzinfo=None).isoformat(timespec="seconds")


def _clean_tip(value: str) -> str:
    tip = " ".join(str(value).strip().split())
    words = tip.split()
    if len(words) > 20:
        tip = " ".join(words[:20]).rstrip(".,;:") + "."
    return tip[:220]


def _extract_json(raw: str) -> dict:
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("Groq tip response did not contain JSON.")
    return json.loads(raw[start : end + 1])


def _normalize_tips(payload: dict) -> dict[str, list[str]]:
    normalized: dict[str, list[str]] = {}
    for risk_level in RISK_LEVELS:
        values = payload.get(risk_level) or []
        tips = [_clean_tip(value) for value in values if str(value).strip()]
        if len(tips) < 3:
            tips.extend(FALLBACK_TIPS[risk_level][len(tips) :])
        normalized[risk_level] = tips[:3]
    return normalized


def _valid_tips_exist(now: datetime | None = None) -> bool:
    sb = state.supabase_admin
    if sb is None:
        return False

    current = now or _now()
    result = (
        sb.table("daily_tips")
        .select("id")
        .gt("expires_at", _db_timestamp(current))
        .limit(1)
        .execute()
    )
    return bool(result.data)


def generate_daily_tips(force: bool = False) -> dict[str, list[str]]:
    """Generate and cache today's shared tips if the daily cache is empty."""
    sb = state.supabase_admin
    if sb is None:
        raise RuntimeError("Supabase admin client is not initialized.")

    now = _now()
    expires_at = _expires_at(now)

    if not force and _valid_tips_exist(now):
        return get_cached_tips()

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": USER_PROMPT},
    ]

    try:
        raw = call_groq(
            messages,
            model_override=TIP_MODEL,
            temperature=0.35,
            top_p=0.9,
            max_tokens=450,
        )
        tips_by_level = _normalize_tips(_extract_json(raw))
    except Exception:
        logger.exception("Failed to generate AI daily tips; using safe fallback tips.")
        tips_by_level = FALLBACK_TIPS

    rows = []
    for risk_level, tips in tips_by_level.items():
        for tip in tips:
            rows.append({
                "risk_level": risk_level,
                "content": tip,
                "created_at": _db_timestamp(now),
                "expires_at": _db_timestamp(expires_at),
            })

    sb.table("daily_tips").insert(rows).execute()
    logger.info("Cached %s daily tips until %s", len(rows), expires_at.isoformat())
    return tips_by_level


def ensure_daily_tips() -> None:
    """Best-effort startup cache warmup."""
    try:
        if not _valid_tips_exist():
            generate_daily_tips()
    except Exception:
        logger.exception("Daily tips cache warmup failed. Check daily_tips table and Groq config.")


def get_cached_tips() -> dict[str, list[str]]:
    """Return currently valid cached tips grouped by risk level."""
    sb = state.supabase_admin
    if sb is None:
        raise RuntimeError("Supabase admin client is not initialized.")

    now = _db_timestamp(_now())
    result = (
        sb.table("daily_tips")
        .select("risk_level,content,created_at")
        .gt("expires_at", now)
        .order("created_at", desc=False)
        .execute()
    )

    grouped = {risk_level: [] for risk_level in RISK_LEVELS}
    for row in result.data or []:
        risk_level = str(row.get("risk_level", "")).lower()
        content = row.get("content")
        if risk_level in grouped and content:
            grouped[risk_level].append(str(content))

    return grouped
