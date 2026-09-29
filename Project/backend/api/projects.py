"""Контракт 9 (минимальный срез): реальное хранение проекта — SQLite вместо
мока фронта (features/projectApi/mockServer.ts, `Документация/Фронтенд и
визард/api-routes.md`, разделы 3 и 6). Повторяет форму ProjectState/SaveResult
из shared/api/projectState.ts настолько точно, насколько нужно, чтобы
`features/projectApi/index.ts` могло просто сменить тело функций на fetch —
без переписывания компонентов, которые их вызывают.

Изоляция между пользователями — заголовок `X-User-Id`, который фронт
генерирует один раз на браузер и хранит в localStorage (features/auth/
session.ts). Это НЕ авторизация (нет пароля/сессии/токена — соответствует
заглушке входа, принятой во всём проекте, см. корневой CLAUDE.md) — просто
стабильный идентификатор владельца, без которого любой мог бы открыть и
изменить чужой проект по одному только id. Каждый GET/PUT на конкретный
проект проверяет владельца (403 при несовпадении); GET-список отдаёт только
проекты этого владельца.

Осознанно не переносит: геометрические проверки сцены (sceneChecks.ts —
route_crosses_wall/aisle_too_narrow и т.п., см. storage.row_to_state), полную
текстовую валидацию параметров формы (validateParams.ts — здесь просто
pydantic-валидация ObjectParams через сам контракт), загрузку подложки
(POST .../scene/background — остаётся прежнее клиентское поведение, blob-URL
в браузере). Версии (ProjectVersion) — снапшот input+scene, без match_result/
scenarios (подбор и экономика в этом репозитории не хранят состояние).
"""

from __future__ import annotations

import json
from typing import Literal

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from contracts import ObjectType, Scene
from contracts.project_input import ObjectParams
from db import storage

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectCreateRequest(BaseModel):
    name: str
    object_type: ObjectType
    site: str | None = None


class InputSaveRequest(BaseModel):
    base_revision: int
    object_type: ObjectType
    params: ObjectParams
    source: Literal["manual", "excel_import", "csv_import"] = "manual"


class SceneSaveRequest(BaseModel):
    base_revision: int
    based_on_input_revision: int
    scene: Scene


class VersionSaveRequest(BaseModel):
    base_revision: int
    comment: str | None = None


class PromoteRequest(BaseModel):
    base_revision: int


def _require_owner(project_id: str, owner_user_id: str) -> None:
    """404, если проекта нет вообще; 403, если он есть, но принадлежит другому
    владельцу — так not-found и no-access не путаются в один код."""
    row = storage.get_project(project_id)
    if row is None:
        raise HTTPException(404, f"проект {project_id!r} не найден")
    if row["owner_user_id"] != owner_user_id:
        raise HTTPException(403, "проект принадлежит другому пользователю")


@router.get("")
def list_projects(x_user_id: str = Header(...)) -> list[dict]:
    return [storage.row_to_state(r) for r in storage.list_projects(x_user_id)]


@router.post("", status_code=201)
def create_project(req: ProjectCreateRequest, x_user_id: str = Header(...)) -> dict:
    row = storage.create_project(req.name, req.object_type.value, req.site, x_user_id)
    return storage.row_to_state(row)


@router.get("/{project_id}")
def get_project(project_id: str, x_user_id: str = Header(...)) -> dict:
    _require_owner(project_id, x_user_id)
    return storage.row_to_state(storage.get_project(project_id))  # type: ignore[arg-type]


@router.put("/{project_id}/input")
def put_input(project_id: str, req: InputSaveRequest, x_user_id: str = Header(...)):
    _require_owner(project_id, x_user_id)
    ok, row = storage.save_input(project_id, req.base_revision, req.object_type.value, req.params.model_dump_json())
    if not ok:
        return JSONResponse(status_code=409, content={"current": storage.row_to_state(row)})  # type: ignore[arg-type]
    return storage.row_to_state(row)  # type: ignore[arg-type]


@router.put("/{project_id}/scene")
def put_scene(project_id: str, req: SceneSaveRequest, x_user_id: str = Header(...)):
    _require_owner(project_id, x_user_id)
    current = storage.get_project(project_id)
    if current["revision"] != req.base_revision:  # type: ignore[index]
        return JSONResponse(status_code=409, content={"current": storage.row_to_state(current)})  # type: ignore[arg-type]
    if current["input_json"] is None:  # type: ignore[index]
        return JSONResponse(
            status_code=422,
            content={
                "errors": [
                    {
                        "path": "scene",
                        "code": "input_required",
                        "message": "Сначала сохраните параметры объекта — план привязывается к ним",
                    }
                ]
            },
        )
    # id/project_id сцены переписываются сервером — та же гарантия, что была в моке
    new_revision = current["revision"] + 1  # type: ignore[index]
    scene = req.scene.model_copy(update={"id": f"scene-{project_id}-{new_revision}", "project_id": project_id})
    ok, row = storage.save_scene(project_id, req.base_revision, req.based_on_input_revision, scene.model_dump_json())
    if not ok:
        return JSONResponse(status_code=409, content={"current": storage.row_to_state(row)})  # type: ignore[arg-type]
    return storage.row_to_state(row)  # type: ignore[arg-type]


@router.post("/{project_id}/versions", status_code=201)
def create_version(project_id: str, req: VersionSaveRequest, x_user_id: str = Header(...)):
    _require_owner(project_id, x_user_id)
    ok, row = storage.save_version(project_id, req.base_revision, req.comment)
    if not ok:
        return JSONResponse(status_code=409, content={"current": storage.row_to_state(row)})  # type: ignore[arg-type]
    return storage.row_to_state(row)  # type: ignore[arg-type]


@router.get("/{project_id}/versions")
def list_versions(project_id: str, x_user_id: str = Header(...)) -> list[dict]:
    _require_owner(project_id, x_user_id)
    return [storage.version_row_to_summary(r) for r in storage.list_versions(project_id)]


@router.get("/{project_id}/versions/{version}")
def get_version(project_id: str, version: int, x_user_id: str = Header(...)) -> dict:
    _require_owner(project_id, x_user_id)
    row = storage.get_version(project_id, version)
    if row is None:
        raise HTTPException(404, f"версии {version} у проекта {project_id!r} нет")
    return {
        "project_id": row["project_id"],
        "version": row["version"],
        "comment": row["comment"],
        "created_at": row["created_at"],
        "input": json.loads(row["input_json"]) if row["input_json"] else None,
        "scene": json.loads(row["scene_json"]) if row["scene_json"] else None,
    }


@router.post("/{project_id}/versions/{version}/promote", status_code=201)
def promote_version(project_id: str, version: int, req: PromoteRequest, x_user_id: str = Header(...)):
    """"Сделать текущей" копией — старая версия остаётся как была (contracts/
    records.py: история версий неизменна), проект получает НОВУЮ версию с тем
    же input/scene, что были в `version`. base_revision — та же защита от
    гонки, что у input/scene: promote переписывает текущие input/scene, поэтому
    конкурентное редактирование между чтением списка версий и нажатием
    «Сделать текущей» не должно тихо потеряться."""
    _require_owner(project_id, x_user_id)
    outcome, row = storage.promote_version(project_id, version, req.base_revision)
    if outcome == "not_found":
        raise HTTPException(404, f"версии {version} у проекта {project_id!r} нет")
    if outcome == "conflict":
        return JSONResponse(status_code=409, content={"current": storage.row_to_state(row)})  # type: ignore[arg-type]
    return storage.row_to_state(row)  # type: ignore[arg-type]
