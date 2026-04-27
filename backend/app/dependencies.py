from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer

from app.auth.supabase_auth import verify_user_token
import app.state as state

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def get_current_user(request_token: str = Depends(oauth2_scheme)):
    if state.supabase_auth is None:
        raise RuntimeError("Supabase clients are not initialized.")
    return verify_user_token(state.supabase_auth, request_token)
