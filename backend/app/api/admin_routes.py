from __future__ import annotations

import sqlite3
from typing import Any

from flask import Blueprint, request
from werkzeug.security import generate_password_hash

from app.auth import require_admin
from app.config import ROLES, USER_STATUSES
from app.db import get_db_connection
from app.repositories.user_repository import get_user_by_id, list_users, user_to_public_dict
from app.utils import is_valid_email, normalize_email, utc_now_iso

admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/api/users")
def query_users() -> tuple[dict[str, Any], int]:
    with get_db_connection() as connection:
        _, err = require_admin(connection)
        if err is not None:
            return err

        include_deleted = request.args.get("include_deleted", "false").lower() == "true"
        rows = list_users(connection, include_deleted)
    return {"items": [user_to_public_dict(row) for row in rows]}, 200


@admin_bp.patch("/api/admin/users/<int:user_id>")
def admin_patch_user(user_id: int) -> tuple[dict[str, Any], int]:
    payload = request.get_json(silent=True) or {}
    email = payload.get("email")
    nickname = payload.get("nickname")
    role = payload.get("role")
    status = payload.get("status")

    updates: list[str] = []
    values: list[Any] = []

    if email is not None:
        normalized_email = normalize_email(str(email))
        if not is_valid_email(normalized_email):
            return {"message": "邮箱格式不正确"}, 400
        updates.append("email = ?")
        values.append(normalized_email)

    if nickname is not None:
        normalized_nickname = str(nickname).strip()
        if not normalized_nickname:
            return {"message": "昵称不能为空"}, 400
        if len(normalized_nickname) > 32:
            return {"message": "昵称长度不能超过 32"}, 400
        updates.append("nickname = ?")
        values.append(normalized_nickname)

    if role is not None:
        normalized_role = str(role).strip()
        if normalized_role not in ROLES:
            return {"message": "role 必须是 student/teacher/admin"}, 400
        updates.append("role = ?")
        values.append(normalized_role)

    if status is not None:
        normalized_status = str(status).strip()
        if normalized_status not in USER_STATUSES:
            return {"message": "status 必须是 active/disabled"}, 400
        updates.append("status = ?")
        values.append(normalized_status)

    if not updates:
        return {"message": "没有可更新的字段"}, 400

    with get_db_connection() as connection:
        _, err = require_admin(connection)
        if err is not None:
            return err

        target_user = get_user_by_id(connection, user_id, include_deleted=False)
        if target_user is None:
            return {"message": "用户不存在"}, 404

        updates.append("updated_at = CURRENT_TIMESTAMP")
        values.append(user_id)

        try:
            connection.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE id = ?",
                tuple(values),
            )
            connection.commit()
        except sqlite3.IntegrityError:
            return {"message": "邮箱已被使用"}, 409

        fresh = get_user_by_id(connection, user_id, include_deleted=False)

    return user_to_public_dict(fresh), 200


@admin_bp.put("/api/admin/users/<int:user_id>/password")
def admin_reset_user_password(user_id: int) -> tuple[dict[str, str], int]:
    payload = request.get_json(silent=True) or {}
    password = payload.get("password")
    normalized_password = str(password or "")
    if not normalized_password or len(normalized_password) < 6:
        return {"message": "新密码长度至少 6 位"}, 400

    with get_db_connection() as connection:
        _, err = require_admin(connection)
        if err is not None:
            return err

        target_user = get_user_by_id(connection, user_id, include_deleted=False)
        if target_user is None:
            return {"message": "用户不存在"}, 404

        connection.execute(
            """
            UPDATE users
            SET password_hash = ?, password_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (generate_password_hash(normalized_password), user_id),
        )
        connection.commit()

    return {"message": "密码重置成功"}, 200


@admin_bp.delete("/api/admin/users/<int:user_id>")
def admin_soft_delete_user(user_id: int) -> tuple[dict[str, str], int]:
    with get_db_connection() as connection:
        _, err = require_admin(connection)
        if err is not None:
            return err

        target_user = get_user_by_id(connection, user_id, include_deleted=False)
        if target_user is None:
            return {"message": "用户不存在"}, 404

        connection.execute(
            """
            UPDATE users
            SET deleted_at = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (utc_now_iso(), user_id),
        )
        connection.commit()

    return {"message": "删除成功"}, 200


@admin_bp.post("/api/admin/users/<int:user_id>/restore")
def admin_restore_user(user_id: int) -> tuple[dict[str, Any], int]:
    with get_db_connection() as connection:
        _, err = require_admin(connection)
        if err is not None:
            return err

        target_user = get_user_by_id(connection, user_id, include_deleted=True)
        if target_user is None:
            return {"message": "用户不存在"}, 404

        connection.execute(
            """
            UPDATE users
            SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (user_id,),
        )
        connection.commit()
        fresh = get_user_by_id(connection, user_id, include_deleted=False)

    return user_to_public_dict(fresh), 200
