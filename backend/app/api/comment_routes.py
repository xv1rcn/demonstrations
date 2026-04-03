from __future__ import annotations

import sqlite3
from typing import Any

from flask import Blueprint, request

from app.auth import get_current_user, require_current_user
from app.db import get_db_connection

comment_bp = Blueprint("comments", __name__)

COMMENT_TARGET_TYPES = {"simulation", "lesson", "feedback"}
COMMENT_STATUSES = {"pending", "approved", "deleted"}
MODERATOR_ROLES = {"teacher", "admin"}
MAX_COMMENT_LENGTH = 500


def _soft_delete_comment_tree(connection: sqlite3.Connection, root_comment_id: int) -> None:
    connection.execute(
        """
        WITH RECURSIVE subtree(id) AS (
            SELECT id
            FROM comments
            WHERE id = ? AND deleted_at IS NULL
            UNION ALL
            SELECT c.id
            FROM comments AS c
            JOIN subtree AS s ON c.parent_id = s.id
            WHERE c.deleted_at IS NULL
        )
        UPDATE comments
        SET status = 'deleted',
            deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id IN (SELECT id FROM subtree)
        """,
        (root_comment_id,),
    )


def _to_public_comment_dict(row: sqlite3.Row) -> dict[str, Any]:
    avatar_filename = row["author_avatar_filename"]
    avatar_url = f"/api/uploads/avatars/{avatar_filename}" if avatar_filename else None
    return {
        "id": row["id"],
        "parent_id": row["parent_id"],
        "target_type": row["target_type"],
        "target_key": row["target_key"],
        "target_title": row["target_title"],
        "content": row["content"],
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "reviewed_at": row["reviewed_at"],
        "author": {
            "id": row["user_id"],
            "nickname": row["author_nickname"],
            "role": row["author_role"],
            "avatar_url": avatar_url,
        },
        "reviewer_nickname": row["reviewer_nickname"],
    }


def _build_tree(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    id_to_node: dict[int, dict[str, Any]] = {}
    roots: list[dict[str, Any]] = []

    for item in items:
        node = {**item, "replies": []}
        id_to_node[item["id"]] = node

    for item in items:
        node = id_to_node[item["id"]]
        parent_id = item["parent_id"]
        if parent_id and parent_id in id_to_node:
            id_to_node[parent_id]["replies"].append(node)
        else:
            roots.append(node)

    return roots


def _query_comment_rows(
    connection: sqlite3.Connection,
    where_clause: str,
    values: tuple[Any, ...],
    order_clause: str,
    limit_clause: str = "",
) -> list[sqlite3.Row]:
    return connection.execute(
        f"""
        SELECT
            c.*,
            au.nickname AS author_nickname,
            au.role AS author_role,
            au.avatar_filename AS author_avatar_filename,
            rv.nickname AS reviewer_nickname
        FROM comments AS c
        JOIN users AS au ON au.id = c.user_id
        LEFT JOIN users AS rv ON rv.id = c.reviewed_by
        WHERE {where_clause}
        {order_clause}
        {limit_clause}
        """,
        values,
    ).fetchall()


@comment_bp.get("/api/comments")
def list_comments_for_target() -> tuple[dict[str, Any], int]:
    target_type = str(request.args.get("target_type", "")).strip()
    target_key = str(request.args.get("target_key", "")).strip()
    if target_type not in COMMENT_TARGET_TYPES:
        return {"message": "target_type 必须是 simulation/lesson/feedback"}, 400
    if not target_key:
        return {"message": "target_key 不能为空"}, 400

    with get_db_connection() as connection:
        viewer = get_current_user(connection)
        include_pending = request.args.get("include_pending", "false").lower() == "true"
        is_moderator = bool(viewer and viewer["role"] in MODERATOR_ROLES)

        if include_pending and is_moderator:
            rows = _query_comment_rows(
                connection,
                "c.target_type = ? AND c.target_key = ? AND c.deleted_at IS NULL",
                (target_type, target_key),
                "ORDER BY c.created_at ASC, c.id ASC",
            )
        elif viewer is not None:
            rows = _query_comment_rows(
                connection,
                """
                c.target_type = ?
                AND c.target_key = ?
                AND c.deleted_at IS NULL
                AND (c.status = 'approved' OR c.user_id = ?)
                """,
                (target_type, target_key, viewer["id"]),
                "ORDER BY c.created_at ASC, c.id ASC",
            )
        else:
            rows = _query_comment_rows(
                connection,
                """
                c.target_type = ?
                AND c.target_key = ?
                AND c.deleted_at IS NULL
                AND c.status = 'approved'
                """,
                (target_type, target_key),
                "ORDER BY c.created_at ASC, c.id ASC",
            )

    items = [_to_public_comment_dict(row) for row in rows]
    return {"items": _build_tree(items)}, 200


@comment_bp.post("/api/comments")
def create_comment() -> tuple[dict[str, Any], int]:
    payload = request.get_json(silent=True) or {}
    target_type = str(payload.get("target_type", "")).strip()
    target_key = str(payload.get("target_key", "")).strip()
    target_title = str(payload.get("target_title", "")).strip()
    content = str(payload.get("content", "")).strip()
    parent_id_raw = payload.get("parent_id")

    if target_type not in COMMENT_TARGET_TYPES:
        return {"message": "target_type 必须是 simulation/lesson/feedback"}, 400
    if not target_key:
        return {"message": "target_key 不能为空"}, 400
    if not content:
        return {"message": "评论内容不能为空"}, 400
    if len(content) > MAX_COMMENT_LENGTH:
        return {"message": f"评论长度不能超过 {MAX_COMMENT_LENGTH}"}, 400

    parent_id: int | None = None
    if parent_id_raw is not None:
        raw = str(parent_id_raw).strip()
        if not raw.isdigit():
            return {"message": "parent_id 必须是数字"}, 400
        parent_id = int(raw)

    with get_db_connection() as connection:
        me, err = require_current_user(connection)
        if err is not None:
            return err

        if parent_id is not None:
            parent = connection.execute(
                """
                SELECT id, target_type, target_key
                FROM comments
                WHERE id = ? AND deleted_at IS NULL
                """,
                (parent_id,),
            ).fetchone()
            if parent is None:
                return {"message": "父评论不存在"}, 404
            if parent["target_type"] != target_type or parent["target_key"] != target_key:
                return {"message": "回复目标与父评论不一致"}, 400

        status = "pending" if me["role"] == "student" else "approved"
        cursor = connection.execute(
            """
            INSERT INTO comments (user_id, parent_id, target_type, target_key, target_title, content, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                me["id"],
                parent_id,
                target_type,
                target_key,
                target_title,
                content,
                status,
            ),
        )
        connection.commit()

        row = _query_comment_rows(
            connection,
            "c.id = ?",
            (int(cursor.lastrowid),),
            "ORDER BY c.id ASC",
        )[0]

    return {
        "item": _to_public_comment_dict(row),
        "needs_review": status == "pending",
    }, 201


@comment_bp.get("/api/comments/feed")
def list_comment_feed() -> tuple[dict[str, Any], int]:
    try:
        limit = int(request.args.get("limit", "6"))
    except ValueError:
        return {"message": "limit 必须是数字"}, 400
    limit = max(1, min(limit, 50))

    random_order = request.args.get("random", "false").lower() == "true"
    order_clause = "ORDER BY RANDOM()" if random_order else "ORDER BY c.created_at DESC, c.id DESC"

    with get_db_connection() as connection:
        rows = connection.execute(
            f"""
            SELECT
                c.*,
                au.nickname AS author_nickname,
                au.role AS author_role,
                au.avatar_filename AS author_avatar_filename,
                rv.nickname AS reviewer_nickname
            FROM comments AS c
            JOIN users AS au ON au.id = c.user_id
            LEFT JOIN users AS rv ON rv.id = c.reviewed_by
            WHERE c.status = 'approved' AND c.deleted_at IS NULL AND c.parent_id IS NULL
            {order_clause}
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return {"items": [_to_public_comment_dict(row) for row in rows]}, 200


@comment_bp.get("/api/comments/moderation")
def list_pending_comments() -> tuple[dict[str, Any], int]:
    with get_db_connection() as connection:
        me, err = require_current_user(connection)
        if err is not None:
            return err
        if me["role"] not in MODERATOR_ROLES:
            return {"message": "需要教师或管理员权限"}, 403

        rows = _query_comment_rows(
            connection,
            "c.status = 'pending' AND c.deleted_at IS NULL",
            tuple(),
            "ORDER BY c.created_at ASC, c.id ASC",
        )

    return {"items": [_to_public_comment_dict(row) for row in rows]}, 200


@comment_bp.patch("/api/comments/<int:comment_id>/moderation")
def moderate_comment(comment_id: int) -> tuple[dict[str, Any], int]:
    payload = request.get_json(silent=True) or {}
    action = str(payload.get("action", "")).strip().lower()
    if action not in {"approve", "reject"}:
        return {"message": "action 必须是 approve/reject"}, 400

    with get_db_connection() as connection:
        me, err = require_current_user(connection)
        if err is not None:
            return err
        if me["role"] not in MODERATOR_ROLES:
            return {"message": "需要教师或管理员权限"}, 403

        existing = connection.execute(
            "SELECT id FROM comments WHERE id = ? AND deleted_at IS NULL",
            (comment_id,),
        ).fetchone()
        if existing is None:
            return {"message": "评论不存在"}, 404

        if action == "approve":
            connection.execute(
                """
                UPDATE comments
                SET status = 'approved',
                    reviewed_by = ?,
                    reviewed_at = CURRENT_TIMESTAMP,
                    deleted_at = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (me["id"], comment_id),
            )
            connection.commit()

            row = _query_comment_rows(
                connection,
                "c.id = ?",
                (comment_id,),
                "ORDER BY c.id ASC",
            )[0]
            return {"item": _to_public_comment_dict(row)}, 200

        _soft_delete_comment_tree(connection, comment_id)
        connection.execute(
            """
            UPDATE comments
            SET reviewed_by = ?,
                reviewed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (me["id"], comment_id),
        )
        connection.commit()

    return {"ok": True, "status": "deleted"}, 200


@comment_bp.delete("/api/comments/<int:comment_id>")
def delete_comment(comment_id: int) -> tuple[dict[str, Any], int]:
    with get_db_connection() as connection:
        me, err = require_current_user(connection)
        if err is not None:
            return err

        row = connection.execute(
            """
            SELECT id, user_id
            FROM comments
            WHERE id = ? AND deleted_at IS NULL
            """,
            (comment_id,),
        ).fetchone()
        if row is None:
            return {"message": "评论不存在或已删除"}, 404

        if me["role"] not in MODERATOR_ROLES and int(row["user_id"]) != int(me["id"]):
            return {"message": "只能删除自己的评论"}, 403

        _soft_delete_comment_tree(connection, comment_id)
        connection.commit()

    return {"ok": True}, 200
