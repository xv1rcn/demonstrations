from __future__ import annotations

import sqlite3

from flask import request

from app.config import AUTH_COOKIE_NAME, AUTH_USER_ID_COOKIE_NAME
from app.repositories.user_repository import get_user_by_id


ErrorResponse = tuple[dict[str, str], int]


def get_current_user(connection: sqlite3.Connection) -> sqlite3.Row | None:
    raw_user_id = request.headers.get("X-User-Id", "").strip()
    if not raw_user_id:
        session_flag = request.cookies.get(AUTH_COOKIE_NAME, "")
        cookie_user_id = request.cookies.get(AUTH_USER_ID_COOKIE_NAME, "").strip()
        if session_flag == "authenticated":
            raw_user_id = cookie_user_id
    if not raw_user_id.isdigit():
        return None
    return get_user_by_id(connection, int(raw_user_id), include_deleted=False)


def require_current_user(connection: sqlite3.Connection) -> tuple[sqlite3.Row | None, ErrorResponse | None]:
    user = get_current_user(connection)
    if user is None:
        return None, ({"message": "未登录或用户不存在"}, 401)
    if user["status"] != "active":
        return None, ({"message": "账号不可用"}, 403)
    return user, None


def require_admin(connection: sqlite3.Connection) -> tuple[sqlite3.Row | None, ErrorResponse | None]:
    user, err = require_current_user(connection)
    if err is not None:
        return None, err
    if user["role"] != "admin":
        return None, ({"message": "需要管理员权限"}, 403)
    return user, None
