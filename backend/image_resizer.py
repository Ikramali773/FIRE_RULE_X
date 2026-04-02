# backend/image_resizer.py
# Resize images before sending to AI to reduce token usage.
# Caps at MAX_DIMENSION while preserving aspect ratio.

from io import BytesIO
from PIL import Image

MAX_DIMENSION = 1536  # Gemini recommended max for detailed understanding


def resize_for_ai(image_bytes: bytes) -> bytes:
    """
    Resize an image to fit within MAX_DIMENSION, preserving aspect ratio.
    Returns resized PNG bytes. If already small enough, returns the original.
    """
    img = Image.open(BytesIO(image_bytes))
    width, height = img.size

    # If image is already small enough, return as-is
    if width <= MAX_DIMENSION and height <= MAX_DIMENSION:
        return image_bytes

    # Calculate new dimensions preserving aspect ratio
    ratio = min(MAX_DIMENSION / width, MAX_DIMENSION / height)
    new_width = int(width * ratio)
    new_height = int(height * ratio)

    resized = img.resize((new_width, new_height), Image.LANCZOS)

    buf = BytesIO()
    resized.save(buf, format="PNG", optimize=True)
    return buf.getvalue()
