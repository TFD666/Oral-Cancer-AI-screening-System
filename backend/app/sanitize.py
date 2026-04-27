"""Input sanitization utilities.

All user-supplied text passes through ``clean_text`` before being stored in
the database.  The goal is to prevent stored-XSS and accidental SQL/HTML
injection without mangling legitimate clinical notes.
"""

import re

# Characters that should never appear in free-text clinical fields
_SCRIPT_TAG = re.compile(r"<\s*script[^>]*>.*?<\s*/\s*script\s*>", re.IGNORECASE | re.DOTALL)
_HTML_TAG = re.compile(r"<[^>]+>")


def clean_text(value: str | None) -> str | None:
    """Strip dangerous markup from a user-supplied string.

    Returns ``None`` unchanged so optional fields stay optional.
    """
    if value is None:
        return None
    # Remove script tags entirely (content included)
    value = _SCRIPT_TAG.sub("", value)
    # Remove any remaining HTML tags but keep the text content
    value = _HTML_TAG.sub("", value)
    # Collapse excessive whitespace
    value = " ".join(value.split())
    return value.strip()
