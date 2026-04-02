from __future__ import annotations

import sqlite3
from typing import Any


def user_to_public_dict(row: sqlite3.Row) -> dict[str, Any]:
    avatar_filename = row["avatar_filename"]
    avatar_url = f"/uploads/avatars/{avatar_filename}" if avatar_filename else None
    return {
        "id": row["id"],
        "username": row["username"],
        "email": row["email"],
        "nickname": row["nickname"],
        "avatar_url": avatar_url,
        "role": row["role"],
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "password_updated_at": row["password_updated_at"],
        "deleted_at": row["deleted_at"],
    }


def get_user_by_id(connection: sqlite3.Connection, user_id: int, include_deleted: bool = False) -> sqlite3.Row | None:
    if include_deleted:
        return connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return connection.execute(
        "SELECT * FROM users WHERE id = ? AND deleted_at IS NULL",
        (user_id,),
    ).fetchone()


def get_user_by_username_or_email(connection: sqlite3.Connection, username_or_email: str, normalized_email: str) -> sqlite3.Row | None:
    return connection.execute(
        """
        SELECT *
        FROM users
        WHERE (username = ? OR email = ?) AND deleted_at IS NULL
        """,
        (username_or_email, normalized_email),
    ).fetchone()


def list_users(connection: sqlite3.Connection, include_deleted: bool) -> list[sqlite3.Row]:
    where_clause = "" if include_deleted else "WHERE deleted_at IS NULL"
    return connection.execute(f"SELECT * FROM users {where_clause} ORDER BY id ASC").fetchall()
