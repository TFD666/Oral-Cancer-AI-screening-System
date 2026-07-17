import logging

from fastapi import HTTPException
from supabase import Client, create_client

from app.config import Settings

logger = logging.getLogger(__name__)


def build_supabase_admin(settings: Settings) -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def build_supabase_auth_client(settings: Settings) -> Client:
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def _extract_valid_user(user_response):
    user = getattr(user_response, "user", None)
    if user and getattr(user, "email", None):
        return user
    return None


def verify_user_token(supabase_auth: Client, token: str, supabase_admin: Client | None = None):
    try:
        user_response = supabase_auth.auth.get_user(token)
    except Exception as exc:  # pragma: no cover
        logger.warning("Supabase auth client get_user failed, attempting admin fallback: %s", exc)
        user_response = None

    user = _extract_valid_user(user_response) if user_response is not None else None

    if user is None and supabase_admin is not None:
        try:
            admin_response = supabase_admin.auth.get_user(token)
            user = _extract_valid_user(admin_response)
        except Exception as exc:  # pragma: no cover
            logger.error("Supabase admin get_user failed: %s", exc)

    if user is None:
        raise HTTPException(
            status_code=401,
            detail={"error": "Invalid or expired session. Please sign in again."},
        )

    return user
