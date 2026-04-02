from __future__ import annotations

import sqlite3

from werkzeug.security import generate_password_hash

from app.config import (
    AVATAR_DIR,
    DEFAULT_ADMIN_EMAIL,
    DEFAULT_ADMIN_PASSWORD,
    DEFAULT_ADMIN_USERNAME,
    DB_PATH,
    UPLOAD_ROOT,
)
from app.utils import normalize_email


def get_db_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)

    with get_db_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                nickname TEXT NOT NULL,
                avatar_filename TEXT,
                role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
                status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
                deleted_at TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                password_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)")
        connection.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)")

        existing_admin = connection.execute(
            "SELECT id FROM users WHERE username = ?",
            (DEFAULT_ADMIN_USERNAME,),
        ).fetchone()
        if existing_admin is None:
            connection.execute(
                """
                INSERT INTO users (username, email, password_hash, nickname, role, status)
                VALUES (?, ?, ?, ?, 'admin', 'active')
                """,
                (
                    DEFAULT_ADMIN_USERNAME,
                    normalize_email(DEFAULT_ADMIN_EMAIL),
                    generate_password_hash(DEFAULT_ADMIN_PASSWORD),
                    "管理员",
                ),
            )
        connection.commit()
