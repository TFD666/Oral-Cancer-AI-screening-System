import logging

from fastapi import HTTPException
from supabase import Client, create_client

from app.config import Settings

logger = logging.getLogger(__name__)


def build_supabase_admin(settings: Settings) -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def build_supabase_auth_client(settings: Settings) -> Client:
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def verify_user_token(supabase_auth: Client, token: str):
    try:
        user_response = supabase_auth.auth.get_user(token)
    except Exception as exc:  # pragma: no cover
        logger.error("Supabase auth.get_user failed: %s", exc)
        raise HTTPException(
            status_code=401,
            detail={"error": "Invalid or expired session. Please sign in again."},
        ) from exc

    user = getattr(user_response, "user", None)
    if not user or not user.email:
        raise HTTPException(
            status_code=401,
            detail={"error": "Invalid or expired session. Please sign in again."},
        )

    return user
