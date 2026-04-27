import os
from uuid import uuid4

import timm
import torch
import torch.nn.functional as F
from PIL import Image

from app.clinical_logic import recommendation_for, risk_from_cancer_score
from app.inference.gradcam import generate_gradcam_overlay
from app.inference.preprocess import preprocess_for_model


def load_efficientnet(model_name: str, weight_path: str, device: torch.device):
    if not os.path.exists(weight_path):
        raise FileNotFoundError(f"Model weights not found at {weight_path}")
    model = timm.create_model(model_name, pretrained=False, num_classes=2)
    state = torch.load(weight_path, map_location=device)
    model.load_state_dict(state, strict=True)
    model.to(device)
    model.eval()
    return model


def run_inference_sync(model_b1, model_b2, device: torch.device, image: Image.Image):
    tensor = preprocess_for_model(image).to(device)
    with torch.no_grad():
        logits_1 = model_b1(tensor)
        logits_2 = model_b2(tensor)
        probs_1 = F.softmax(logits_1, dim=1)
        probs_2 = F.softmax(logits_2, dim=1)
        avg_probs = (probs_1 + probs_2) / 2.0
        confidence = float(torch.max(avg_probs).item())
        cancer_score = float(avg_probs[0, 1].item())
        class_idx = int(torch.argmax(avg_probs, dim=1).item())

    prediction = "Cancer" if class_idx == 1 else "Non-Cancer"
    risk_level = risk_from_cancer_score(cancer_score)
    recommendation = recommendation_for(prediction, risk_level)
    image_240 = image.resize((240, 240))
    heatmap_png = generate_gradcam_overlay(model_b1, image_240, class_idx)

    return {
        "id": str(uuid4()),
        "prediction": prediction,
        "confidence": confidence,
        "cancer_score": cancer_score,
        "risk_level": risk_level,
        "recommendation": recommendation,
        "heatmap_png": heatmap_png,
    }
