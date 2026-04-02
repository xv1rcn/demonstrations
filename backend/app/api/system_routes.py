from __future__ import annotations

from flask import Blueprint

system_bp = Blueprint("system", __name__)


@system_bp.get("/")
def hello() -> str:
    return "Flask backend is running"


@system_bp.get("/api/health")
def health() -> tuple[dict[str, str], int]:
    return {"status": "ok"}, 200
