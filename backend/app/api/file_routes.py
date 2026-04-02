from __future__ import annotations

from flask import Blueprint, send_from_directory

from app.config import AVATAR_DIR

file_bp = Blueprint("files", __name__)


@file_bp.get("/uploads/avatars/<path:filename>")
def get_avatar(filename: str):
    return send_from_directory(AVATAR_DIR, filename)
