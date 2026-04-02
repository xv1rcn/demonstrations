from __future__ import annotations

import io
from uuid import uuid4

from PIL import Image, ImageOps

from app.config import AVATAR_DIR, AVATAR_SIZE


def normalize_avatar_and_store(file_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(file_bytes))
    image = ImageOps.exif_transpose(image)
    image = image.convert("RGB")
    image = ImageOps.fit(
        image,
        (AVATAR_SIZE, AVATAR_SIZE),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )
    filename = f"{uuid4().hex}.webp"
    save_path = AVATAR_DIR / filename
    image.save(save_path, "WEBP", quality=82, method=6)
    return filename
