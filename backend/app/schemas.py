from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.sanitize import clean_text


class PatientCreateIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    age: int = Field(ge=0, le=130)
    gender: Literal["Male", "Female", "Other"]
    medical_history: Optional[str] = Field(default=None, max_length=5000)

    @field_validator("name", "medical_history", mode="before")
    @classmethod
    def sanitize(cls, v):
        return clean_text(v)


class PredictionResponse(BaseModel):
    id: str
    patient_id: str
    prediction: Literal["Cancer", "Non-Cancer"]
    confidence: float
    model_confidence: float
    risk_level: Literal["Low", "Medium", "High"]
    recommendation: str
    image_url: str
    heatmap_url: str
    timestamp: datetime
