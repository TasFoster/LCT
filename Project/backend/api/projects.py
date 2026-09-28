"""Контракт 9 (минимальный срез): реальное хранение проекта — SQLite вместо
мока фронта (features/projectApi/mockServer.ts, `Документация/Фронтенд и
визард/api-routes.md`, разделы 3 и 6). Повторяет форму ProjectState/SaveResult
из shared/api/projectState.ts настолько точно, насколько нужно, чтобы
`features/projectApi/index.ts` могло просто сменить тело функций на fetch —
без переписывания компонентов, которые их вызывают.

Осознанно не переносит: геометрические проверки сцены (sceneChecks.ts —
route_crosses_wall/aisle_too_narrow и т.п., см. storage.row_to_state), полную
текстовую валидацию параметров формы (validateParams.ts — здесь просто
pydantic-валидация ObjectParams через сам контракт), историю версий
(ProjectVersion, contracts/records.py) — одна текущая запись на проект, без
снапшотов прошлых версий. Загрузку подложки (POST .../scene/background) тоже
не хранит — сохраняется прежнее клиентское поведение (blob-URL в браузере).
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException
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


@router.post("", status_code=201)
def create_project(req: ProjectCreateRequest) -> dict:
    row = storage.create_project(req.name, req.object_type.value, req.site)
    return storage.row_to_state(row)


@router.get("/{project_id}")
def get_project(project_id: str) -> dict:
    row = storage.get_project(project_id)
    if row is None:
        raise HTTPException(404, f"проект {project_id!r} не найден")
    return storage.row_to_state(row)


@router.put("/{project_id}/input")
def put_input(project_id: str, req: InputSaveRequest):
    ok, row = storage.save_input(project_id, req.base_revision, req.object_type.value, req.params.model_dump_json())
    if row is None:
        raise HTTPException(404, f"проект {project_id!r} не найден")
    if not ok:
        return JSONResponse(status_code=409, content={"current": storage.row_to_state(row)})
    return storage.row_to_state(row)


@router.put("/{project_id}/scene")
def put_scene(project_id: str, req: SceneSaveRequest):
    current = storage.get_project(project_id)
    if current is None:
        raise HTTPException(404, f"проект {project_id!r} не найден")
    if current["revision"] != req.base_revision:
        return JSONResponse(status_code=409, content={"current": storage.row_to_state(current)})
    if current["input_json"] is None:
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
    new_revision = current["revision"] + 1
    scene = req.scene.model_copy(update={"id": f"scene-{project_id}-{new_revision}", "project_id": project_id})
    ok, row = storage.save_scene(project_id, req.base_revision, req.based_on_input_revision, scene.model_dump_json())
    if not ok:
        return JSONResponse(status_code=409, content={"current": storage.row_to_state(row)})
    return storage.row_to_state(row)
