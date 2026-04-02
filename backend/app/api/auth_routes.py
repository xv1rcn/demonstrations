from __future__ import annotations

from typing import Any

from flask import Blueprint, jsonify, request

from app.services.user_service import authenticate_user, create_student_user
from app.utils import is_valid_email, normalize_email

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/api/auth/register")
def auth_register() -> tuple[Any, int]:
    payload = request.get_json(silent=True) or {}
    username = str(payload.get("username", "")).strip()
    email = normalize_email(str(payload.get("email", "")))
    password = str(payload.get("password", ""))
    nickname = str(payload.get("nickname", "")).strip() or username

    if not username:
        return {"message": "username 不能为空"}, 400
    if not email or not is_valid_email(email):
        return {"message": "邮箱格式不正确"}, 400
    if not password or len(password) < 6:
        return {"message": "密码长度至少 6 位"}, 400
    if len(nickname) > 32:
        return {"message": "昵称长度不能超过 32"}, 400

    user, err = create_student_user(username, email, password, nickname)
    if err is not None:
        return err

    return jsonify(user), 201


@auth_bp.post("/api/auth/login")
def auth_login() -> tuple[dict[str, Any], int]:
    payload = request.get_json(silent=True) or {}
    username_or_email = str(payload.get("username", "")).strip() or str(payload.get("email", "")).strip()
    password = str(payload.get("password", ""))

    if not username_or_email or not password:
        return {"message": "用户名或密码错误"}, 401

    user, err = authenticate_user(username_or_email, password)
    if err is not None:
        return err

    return {"ok": True, "user": user}, 200
