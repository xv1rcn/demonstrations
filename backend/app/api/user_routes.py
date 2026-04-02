from __future__ import annotations

import sqlite3
from typing import Any

from flask import Blueprint, request
from PIL import UnidentifiedImageError
from werkzeug.security import check_password_hash, generate_password_hash

from app.auth import require_current_user
from app.config import MAX_AVATAR_BYTES
from app.db import get_db_connection
from app.repositories.user_repository import get_user_by_id, user_to_public_dict
from app.services.avatar_service import normalize_avatar_and_store
from app.utils import is_valid_email, normalize_email

user_bp = Blueprint("users", __name__)


@user_bp.get("/api/users/me")
def get_me() -> tuple[dict[str, Any], int]:
    with get_db_connection() as connection:
        me, err = require_current_user(connection)
        if err is not None:
            return err
    return user_to_public_dict(me), 200


@user_bp.get("/api/users/me/email")
def get_my_email() -> tuple[dict[str, Any], int]:
    with get_db_connection() as connection:
        me, err = require_current_user(connection)
        if err is not None:
            return err
    return {"email": me["email"]}, 200


@user_bp.get("/api/users/me/nickname")
def get_my_nickname() -> tuple[dict[str, Any], int]:
    with get_db_connection() as connection:
        me, err = require_current_user(connection)
        if err is not None:
            return err
    return {"nickname": me["nickname"]}, 200


@user_bp.get("/api/users/me/role")
def get_my_role() -> tuple[dict[str, Any], int]:
    with get_db_connection() as connection:
        me, err = require_current_user(connection)
        if err is not None:
            return err
    return {"role": me["role"]}, 200


@user_bp.get("/api/users/me/password-meta")
def get_my_password_meta() -> tuple[dict[str, Any], int]:
    with get_db_connection() as connection:
        me, err = require_current_user(connection)
        if err is not None:
            return err
    return {
        "has_password": bool(me["password_hash"]),
        "password_updated_at": me["password_updated_at"],
    }, 200


@user_bp.patch("/api/users/me")
def patch_me() -> tuple[dict[str, Any], int]:
    payload = request.get_json(silent=True) or {}
    nickname = payload.get("nickname")
    email = payload.get("email")

    updates: list[str] = []
    values: list[Any] = []

    if nickname is not None:
        normalized_nickname = str(nickname).strip()
        if not normalized_nickname:
            return {"message": "昵称不能为空"}, 400
        if len(normalized_nickname) > 32:
            return {"message": "昵称长度不能超过 32"}, 400
        updates.append("nickname = ?")
        values.append(normalized_nickname)

    if email is not None:
        normalized_email = normalize_email(str(email))
        if not normalized_email or not is_valid_email(normalized_email):
            return {"message": "邮箱格式不正确"}, 400
        updates.append("email = ?")
        values.append(normalized_email)

    if not updates:
        return {"message": "没有可更新的字段"}, 400

    with get_db_connection() as connection:
        me, err = require_current_user(connection)
        if err is not None:
            return err

        updates.append("updated_at = CURRENT_TIMESTAMP")
        values.append(me["id"])

        try:
            connection.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE id = ?",
                tuple(values),
            )
            connection.commit()
        except sqlite3.IntegrityError:
            return {"message": "邮箱已被使用"}, 409

        fresh = get_user_by_id(connection, int(me["id"]), include_deleted=False)

    return user_to_public_dict(fresh), 200


@user_bp.put("/api/users/me/password")
def change_my_password() -> tuple[dict[str, str], int]:
    payload = request.get_json(silent=True) or {}
    old_password = str(payload.get("old_password", ""))
    new_password = str(payload.get("new_password", ""))

    if not old_password or not new_password:
        return {"message": "old_password 和 new_password 不能为空"}, 400
    if len(new_password) < 6:
        return {"message": "新密码长度至少 6 位"}, 400

    with get_db_connection() as connection:
        me, err = require_current_user(connection)
        if err is not None:
            return err

        if not check_password_hash(str(me["password_hash"]), old_password):
            return {"message": "旧密码错误"}, 401

        connection.execute(
            """
            UPDATE users
            SET password_hash = ?, password_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (generate_password_hash(new_password), me["id"]),
        )
        connection.commit()

    return {"message": "密码修改成功"}, 200


@user_bp.delete("/api/users/me")
def delete_my_account() -> tuple[dict[str, Any], int]:
    payload = request.get_json(silent=True) or {}
    password = str(payload.get("password", ""))

    if not password:
        return {"message": "password 不能为空"}, 400

    with get_db_connection() as connection:
        me, err = require_current_user(connection)
        if err is not None:
            return err

        if not check_password_hash(str(me["password_hash"]), password):
            return {"message": "密码错误"}, 401

        connection.execute(
            """
            UPDATE users
            SET status = 'disabled', deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (me["id"],),
        )
        connection.commit()

    return {"ok": True}, 200


@user_bp.post("/api/users/me/avatar")
def upload_my_avatar() -> tuple[dict[str, Any], int]:
    with get_db_connection() as connection:
        me, err = require_current_user(connection)
        if err is not None:
            return err

    uploaded_file = request.files.get("avatar")
    if uploaded_file is None:
        return {"message": "缺少头像文件字段 avatar"}, 400

    content_length = request.content_length or 0
    if content_length > MAX_AVATAR_BYTES:
        return {"message": "头像文件不能超过 2MB"}, 413

    file_bytes = uploaded_file.read()
    if not file_bytes:
        return {"message": "头像文件为空"}, 400
    if len(file_bytes) > MAX_AVATAR_BYTES:
        return {"message": "头像文件不能超过 2MB"}, 413

    try:
        avatar_filename = normalize_avatar_and_store(file_bytes)
    except UnidentifiedImageError:
        return {"message": "不支持的图片格式"}, 400

    with get_db_connection() as connection:
        connection.execute(
            """
            UPDATE users
            SET avatar_filename = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (avatar_filename, me["id"]),
        )
        connection.commit()
        fresh = get_user_by_id(connection, int(me["id"]), include_deleted=False)

    return {"avatar_url": user_to_public_dict(fresh)["avatar_url"]}, 200
