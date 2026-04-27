import logging

from fastapi import APIRouter, Depends, HTTPException

import app.state as state
from app.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])



@router.get("/me")
def me(user=Depends(get_current_user)):
    """Returns the authenticated user's identity."""
    return {"id": user.id, "email": user.email}
