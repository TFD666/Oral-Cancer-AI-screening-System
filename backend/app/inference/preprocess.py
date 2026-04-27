from io import BytesIO

from PIL import Image, UnidentifiedImageError
from torchvision import transforms

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png"}

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

transform = transforms.Compose(
    [
        transforms.Resize((240, 240)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ]
)


def read_and_validate_image(image_bytes: bytes) -> Image.Image:
    try:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("Image could not be processed. File may be corrupted.") from exc
    return image


def preprocess_for_model(image: Image.Image):
    return transform(image).unsqueeze(0)
