from io import BytesIO

import cv2
import numpy as np
import torch
from PIL import Image

from app.inference.preprocess import preprocess_for_model


def _normalize_heatmap(cam: np.ndarray) -> np.ndarray:
    cam = np.maximum(cam, 0)
    max_value = float(cam.max())
    if max_value > 0:
        cam = cam / max_value
    return cam


def generate_gradcam_overlay(model_b1, image_240: Image.Image, target_class_idx: int) -> bytes:
    activations = []
    gradients = []

    def forward_hook(_module, _inputs, output):
        activations.append(output.detach())

    def backward_hook(_module, _grad_input, grad_output):
        gradients.append(grad_output[0].detach())

    handle_forward = model_b1.conv_head.register_forward_hook(forward_hook)
    handle_backward = model_b1.conv_head.register_full_backward_hook(backward_hook)

    try:
        device = next(model_b1.parameters()).device
        input_tensor = preprocess_for_model(image_240).to(device)

        with torch.enable_grad():
            model_b1.zero_grad(set_to_none=True)
            logits = model_b1(input_tensor)
            class_score = logits[:, target_class_idx].sum()
            class_score.backward()

        if not activations or not gradients:
            raise RuntimeError("Grad-CAM hooks did not capture activations or gradients.")

        activation_map = activations[0][0]
        gradient_map = gradients[0][0]
        pooled_gradients = gradient_map.mean(dim=(1, 2))
        weighted_activations = activation_map * pooled_gradients[:, None, None]
        cam = weighted_activations.sum(dim=0).cpu().numpy()
        cam = _normalize_heatmap(cam)
        cam = cv2.resize(cam, (240, 240))

        heatmap = np.uint8(255 * cam)
        heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)

        original = cv2.cvtColor(np.array(image_240), cv2.COLOR_RGB2BGR)
        overlay = cv2.addWeighted(original, 0.6, heatmap, 0.4, 0)
        overlay_rgb = cv2.cvtColor(overlay, cv2.COLOR_BGR2RGB)

        buf = BytesIO()
        Image.fromarray(overlay_rgb).save(buf, format="PNG")
        return buf.getvalue()
    finally:
        handle_forward.remove()
        handle_backward.remove()
