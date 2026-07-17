import logging
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import torch
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import app.state as state
from app.auth.supabase_auth import build_supabase_admin, build_supabase_auth_client
from app.config import get_settings
from app.inference.pipeline import load_efficientnet
from app.routers.auth import router as auth_router
from app.routers.dashboard import router as dashboard_router
from app.routers.daily_tips import router as daily_tips_router
from app.routers.history import router as history_router
from app.routers.patients import router as patients_router
from app.routers.preferences import router as preferences_router
from app.routers.predict import router as predict_router
from app.routers.report import router as report_router
from app.routers.chat import router as chat_router
from app.routers.clinics import router as clinics_router
from app.daily_tips import ensure_daily_tips

# Configure logging so every module's logger prints to console
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Oral Health Assistant API")
settings = get_settings()
BACKEND_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = BACKEND_DIR / "models"

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler — never expose raw stack traces to the client
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": {"error": "An unexpected server error occurred. Check backend logs."}},
    )


@app.on_event("startup")
async def startup_event():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("Using device: %s", device)
    state.device = device
    state.supabase_auth = build_supabase_auth_client(settings)
    state.supabase_admin = build_supabase_admin(settings)
    state.executor = ThreadPoolExecutor(max_workers=4)
    state.model_b1 = load_efficientnet("efficientnet_b1", str(MODELS_DIR / "b1.pth"), device)
    state.model_b2 = load_efficientnet("efficientnet_b2", str(MODELS_DIR / "b2.pth"), device)
    logger.info("Both models loaded and ready")
    ensure_daily_tips()


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(daily_tips_router)
app.include_router(patients_router)
app.include_router(preferences_router)
app.include_router(predict_router)
app.include_router(history_router)
app.include_router(report_router)
app.include_router(chat_router)
app.include_router(clinics_router)
