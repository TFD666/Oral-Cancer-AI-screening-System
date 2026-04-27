import logging


logger = logging.getLogger(__name__)


def upload_bytes(supabase_admin, bucket: str, path: str, content: bytes, content_type: str):
    logger.info("Uploading %d bytes to bucket=%s path=%s", len(content), bucket, path)
    supabase_admin.storage.from_(bucket).upload(
        path=path,
        file=content,
        file_options={"content-type": content_type, "upsert": "false"},
    )


def signed_url(supabase_admin, bucket: str, path: str, expires_seconds: int = 3600) -> str:
    result = supabase_admin.storage.from_(bucket).create_signed_url(path, expires_seconds)
    if isinstance(result, dict):
        url = result.get("signedURL") or result.get("signedUrl") or ""
    else:
        url = getattr(result, "signed_url", "")
    if not url:
        logger.warning("signed_url returned empty for bucket=%s path=%s result=%s", bucket, path, result)
    return url
