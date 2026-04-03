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


def _ensure_feedback_comment_target(connection: sqlite3.Connection) -> None:
    table_row = connection.execute(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'comments'"
    ).fetchone()
    table_sql = str(table_row["sql"]).lower() if table_row and table_row["sql"] else ""
    if "target_type in ('simulation', 'lesson', 'feedback')" in table_sql:
        return

    connection.execute(
        """
        CREATE TABLE comments_next (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            parent_id INTEGER,
            target_type TEXT NOT NULL CHECK (target_type IN ('simulation', 'lesson', 'feedback')),
            target_key TEXT NOT NULL,
            target_title TEXT NOT NULL DEFAULT '',
            content TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
            reviewed_by INTEGER,
            reviewed_at DATETIME,
            deleted_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (parent_id) REFERENCES comments_next(id),
            FOREIGN KEY (reviewed_by) REFERENCES users(id)
        )
        """
    )
    connection.execute(
        """
        INSERT INTO comments_next (
            id,
            user_id,
            parent_id,
            target_type,
            target_key,
            target_title,
            content,
            status,
            reviewed_by,
            reviewed_at,
            deleted_at,
            created_at,
            updated_at
        )
        SELECT
            id,
            user_id,
            parent_id,
            target_type,
            target_key,
            target_title,
            content,
            status,
            reviewed_by,
            reviewed_at,
            deleted_at,
            created_at,
            updated_at
        FROM comments
        """
    )
    connection.execute("DROP TABLE comments")
    connection.execute("ALTER TABLE comments_next RENAME TO comments")
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_key)"
    )
    connection.execute("CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id)")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status)")


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

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                parent_id INTEGER,
                target_type TEXT NOT NULL CHECK (target_type IN ('simulation', 'lesson', 'feedback')),
                target_key TEXT NOT NULL,
                target_title TEXT NOT NULL DEFAULT '',
                content TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                reviewed_by INTEGER,
                reviewed_at DATETIME,
                deleted_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (parent_id) REFERENCES comments(id),
                FOREIGN KEY (reviewed_by) REFERENCES users(id)
            )
            """
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_key)"
        )
        connection.execute("CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id)")
        connection.execute("CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status)")

        _ensure_feedback_comment_target(connection)

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
