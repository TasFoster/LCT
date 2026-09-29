"""SQLite-хранилище записи проекта — одна строка на проект, входные параметры
(contract 4, ProjectInput) и план (contract 6, Scene) хранятся целиком как JSON
в отдельных колонках. Версии (`project_versions`) — полные снапшоты input+scene
на момент сохранения (contract 9, ProjectVersion), без match_result/scenarios:
подбор и экономика в этом репозитории считаются без сохранения состояния
(matching/economics не пишут в БД), поэтому снапшот версии честно ограничен
тем, что реально хранится — входом и планом, а не выдумывает состав/сценарии
на момент версии.

owner_user_id — изоляция между "пользователями": авторизация в проекте —
заглушка (см. корневой CLAUDE.md), поэтому это не пароль/сессия, а стабильный
идентификатор браузера с фронта (features/auth/session.ts, localStorage).
Разные браузеры/компьютеры не видят и не могут изменить чужие проекты; это
не защита от подмены заголовка (не то же самое, что настоящая авторизация),
но проекты больше не общие на всех — а не были ничем изолированы вообще."""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator
from uuid import uuid4

DB_PATH = Path(__file__).resolve().parent / "projects.db"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_project_id() -> str:
    return f"p-{uuid4().hex[:10]}"


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    with connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                owner_user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                site TEXT,
                object_type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                revision INTEGER NOT NULL DEFAULT 0,
                input_json TEXT,
                input_revision INTEGER,
                input_saved_at TEXT,
                scene_json TEXT,
                scene_revision INTEGER,
                scene_saved_at TEXT,
                scene_based_on_input_revision INTEGER,
                current_version INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS project_versions (
                project_id TEXT NOT NULL,
                version INTEGER NOT NULL,
                comment TEXT,
                input_json TEXT,
                scene_json TEXT,
                created_at TEXT NOT NULL,
                PRIMARY KEY (project_id, version)
            )
            """
        )
        conn.commit()


def create_project(name: str, object_type: str, site: str | None, owner_user_id: str) -> sqlite3.Row:
    project_id = new_project_id()
    at = now_iso()
    with connect() as conn:
        conn.execute(
            """INSERT INTO projects (id, owner_user_id, name, site, object_type, status, revision, current_version, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, 'draft', 0, 1, ?, ?)""",
            (project_id, owner_user_id, name, site, object_type, at, at),
        )
        conn.commit()
        return conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()


def list_projects(owner_user_id: str) -> list[sqlite3.Row]:
    with connect() as conn:
        return conn.execute(
            "SELECT * FROM projects WHERE owner_user_id = ? ORDER BY updated_at DESC", (owner_user_id,)
        ).fetchall()


def get_project(project_id: str) -> sqlite3.Row | None:
    with connect() as conn:
        return conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()


def save_input(project_id: str, base_revision: int, object_type: str, params_json: str) -> tuple[bool, sqlite3.Row | None]:
    """(ok, row). ok=False -> база не тронута, row — текущая строка для 409."""
    with connect() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if row is None:
            return False, None
        if row["revision"] != base_revision:
            return False, row
        at = now_iso()
        new_revision = row["revision"] + 1
        conn.execute(
            """UPDATE projects SET revision=?, input_json=?, input_revision=?, input_saved_at=?,
               object_type=?, updated_at=? WHERE id=?""",
            (new_revision, params_json, new_revision, at, object_type, at, project_id),
        )
        conn.commit()
        return True, conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()


def save_scene(project_id: str, base_revision: int, based_on_input_revision: int, scene_json: str) -> tuple[bool, sqlite3.Row | None]:
    with connect() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if row is None:
            return False, None
        if row["revision"] != base_revision:
            return False, row
        at = now_iso()
        new_revision = row["revision"] + 1
        conn.execute(
            """UPDATE projects SET revision=?, scene_json=?, scene_revision=?, scene_saved_at=?,
               scene_based_on_input_revision=?, updated_at=? WHERE id=?""",
            (new_revision, scene_json, new_revision, at, based_on_input_revision, at, project_id),
        )
        conn.commit()
        return True, conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()


def save_version(project_id: str, base_revision: int, comment: str | None) -> tuple[bool, sqlite3.Row | None]:
    """(ok, row) — тот же протокол, что у save_input/save_scene. Снимок сам по
    себе ничего не перезаписывает, но base_revision всё равно нужен: без него
    два одновременных «Сохранить версию» из разных вкладок читают один и тот
    же current_version и пытаются вставить одну и ту же пару (project_id,
    version) — второй упадёт с IntegrityError вместо понятного 409."""
    with connect() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if row is None:
            return False, None
        if row["revision"] != base_revision:
            return False, row
        at = now_iso()
        new_version = row["current_version"] + 1
        conn.execute(
            """INSERT INTO project_versions (project_id, version, comment, input_json, scene_json, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (project_id, new_version, comment, row["input_json"], row["scene_json"], at),
        )
        conn.execute("UPDATE projects SET current_version=?, updated_at=? WHERE id=?", (new_version, at, project_id))
        conn.commit()
        return True, conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()


def list_versions(project_id: str) -> list[sqlite3.Row]:
    with connect() as conn:
        return conn.execute(
            "SELECT project_id, version, comment, created_at FROM project_versions WHERE project_id = ? ORDER BY version DESC",
            (project_id,),
        ).fetchall()


def get_version(project_id: str, version: int) -> sqlite3.Row | None:
    with connect() as conn:
        return conn.execute(
            "SELECT * FROM project_versions WHERE project_id = ? AND version = ?", (project_id, version)
        ).fetchone()


def promote_version(project_id: str, version: int, base_revision: int) -> tuple[str, sqlite3.Row | None]:
    """"Сделать текущей" — копией: старый снапшот input/scene становится
    состоянием проекта под НОВЫМ номером версии (сама версия `version` не
    трогается, как и требует contracts/records.py — история неизменна).

    Возвращает ("ok"|"conflict"|"not_found", row) — promote переписывает
    текущие input/scene совсем как save_input/save_scene, поэтому base_revision
    проверяется точно так же (409 с актуальной записью, а не тихая перезапись
    чужого конкурентного изменения)."""
    with connect() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if row is None:
            return "not_found", None
        if row["revision"] != base_revision:
            return "conflict", row
        snapshot = conn.execute(
            "SELECT * FROM project_versions WHERE project_id = ? AND version = ?", (project_id, version)
        ).fetchone()
        if snapshot is None:
            return "not_found", None
        at = now_iso()
        new_revision = row["revision"] + 1
        new_version = row["current_version"] + 1
        has_input = snapshot["input_json"] is not None
        has_scene = snapshot["scene_json"] is not None
        conn.execute(
            """UPDATE projects SET revision=?, input_json=?, input_revision=?, input_saved_at=?,
               scene_json=?, scene_revision=?, scene_saved_at=?, scene_based_on_input_revision=?,
               current_version=?, updated_at=? WHERE id=?""",
            (
                new_revision,
                snapshot["input_json"],
                new_revision if has_input else None,
                at if has_input else None,
                snapshot["scene_json"],
                new_revision if has_scene else None,
                at if has_scene else None,
                new_revision if has_scene else None,
                new_version,
                at,
                project_id,
            ),
        )
        conn.execute(
            """INSERT INTO project_versions (project_id, version, comment, input_json, scene_json, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (project_id, new_version, f"Восстановлено из версии {version}", snapshot["input_json"], snapshot["scene_json"], at),
        )
        conn.commit()
        return "ok", conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()


def row_to_state(row: sqlite3.Row) -> dict[str, Any]:
    input_saved = row["input_json"] is not None
    scene_saved = row["scene_json"] is not None
    scene_state = "missing"
    if scene_saved:
        stale = (
            row["scene_based_on_input_revision"] is not None
            and row["input_revision"] is not None
            and row["scene_based_on_input_revision"] < row["input_revision"]
        )
        scene_state = "stale" if stale else "saved"

    missing_parts = [p for p, ok in (("input", input_saved), ("scene", scene_saved)) if not ok]
    blocking_parts = [] if input_saved else ["input"]

    return {
        "project_id": row["id"],
        "owner_user_id": row["owner_user_id"],
        "name": row["name"],
        "site": row["site"],
        "object_type": row["object_type"],
        "status": row["status"],
        "revision": row["revision"],
        "dictionary_version": 1,
        "input": {
            "state": "saved" if input_saved else "missing",
            "revision": row["input_revision"],
            "saved_at": row["input_saved_at"],
            "data": json.loads(row["input_json"]) if input_saved else None,
        },
        "scene": {
            "state": scene_state,
            "revision": row["scene_revision"],
            "saved_at": row["scene_saved_at"],
            "based_on_input_revision": row["scene_based_on_input_revision"],
            "data": json.loads(row["scene_json"]) if scene_saved else None,
            # Геометрические проверки сцены (route_crosses_wall, aisle_too_narrow и
            # т.п. — sceneChecks.ts на фронте) на бэкенд ещё не перенесены — честно
            # пустой список, а не выдуманные предупреждения.
            "warnings": [],
        },
        "missing_parts": missing_parts,
        "blocking_parts": blocking_parts,
        "current_version": row["current_version"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def version_row_to_summary(row: sqlite3.Row) -> dict[str, Any]:
    return {"version": row["version"], "comment": row["comment"], "created_at": row["created_at"]}
