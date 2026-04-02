from __future__ import annotations

import sqlite3
from typing import Any

from werkzeug.security import check_password_hash, generate_password_hash

from app.db import get_db_connection
from app.repositories.user_repository import (
    get_user_by_id,
    get_user_by_username_or_email,
    list_users,
    user_to_public_dict,
)
from app.utils import normalize_email


def authenticate_user(username_or_email: str, password: str) -> tuple[dict[str, Any] | None, tuple[dict[str, str], int] | None]:
    with get_db_connection() as connection:
        row = get_user_by_username_or_email(connection, username_or_email, normalize_email(username_or_email))
        if row is None:
            return None, ({"message": "用户名或密码错误"}, 401)
        if row["status"] != "active":
            return None, ({"message": "账号不可用"}, 403)
        is_valid = check_password_hash(str(row["password_hash"]), password)
        if not is_valid:
            return None, ({"message": "用户名或密码错误"}, 401)
        return user_to_public_dict(row), None


def get_public_user(user_id: int, include_deleted: bool = False) -> dict[str, Any] | None:
    with get_db_connection() as connection:
        row = get_user_by_id(connection, user_id, include_deleted)
        if row is None:
            return None
        return user_to_public_dict(row)


def create_student_user(username: str, email: str, password: str, nickname: str) -> tuple[dict[str, Any] | None, tuple[dict[str, str], int] | None]:
    try:
        with get_db_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO users (username, email, password_hash, nickname, role, status)
                VALUES (?, ?, ?, ?, 'student', 'active')
                """,
                (username, email, generate_password_hash(password), nickname),
            )
            connection.commit()
            user = get_user_by_id(connection, int(cursor.lastrowid), include_deleted=False)
            return user_to_public_dict(user), None
    except sqlite3.IntegrityError as exc:
        message = str(exc).lower()
        if "users.email" in message:
            return None, ({"message": "邮箱已被使用"}, 409)
        if "users.username" in message:
            return None, ({"message": "用户名已存在"}, 409)
        return None, ({"message": "注册失败"}, 409)


def query_users(include_deleted: bool) -> list[dict[str, Any]]:
    with get_db_connection() as connection:
        rows = list_users(connection, include_deleted)
    return [user_to_public_dict(row) for row in rows]
