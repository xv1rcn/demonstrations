from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
DB_PATH = BASE_DIR / "app.db"
UPLOAD_ROOT = BASE_DIR / "uploads"
AVATAR_DIR = UPLOAD_ROOT / "avatars"

MAX_AVATAR_BYTES = 2 * 1024 * 1024
AVATAR_SIZE = 256

DEFAULT_ADMIN_USERNAME = os.getenv("DEFAULT_ADMIN_USERNAME", "admin")
DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "123456")
DEFAULT_ADMIN_EMAIL = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@example.com")

AUTH_COOKIE_NAME = "demo_auth_session"
AUTH_USER_ID_COOKIE_NAME = "demo_auth_user_id"

ROLES = {"student", "teacher", "admin"}
USER_STATUSES = {"active", "disabled"}
