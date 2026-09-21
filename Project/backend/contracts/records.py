"""Контракт 9: ProjectRecord. Граница Владимиров (backend-glue) <-> БД, -> фронт.

Версионирование целиком по снапшотам: воспроизводимость расчёта (п.4.3.4 ТЗ)
означает "открыл старую версию — увидел те же входные данные и тот же результат",
а не пересчёт по текущим формулам/каталогу."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from .economics import EconomicsResult
from .enums import ObjectType, ProjectStatus
from .matching import MatchResult
from .project_input import ProjectInput
from .topology import TopologyConfig


class ProjectVersion(BaseModel):
    version: int
    created_at: datetime
    project_input: ProjectInput
    topology: Optional[TopologyConfig] = None
    match_result: Optional[MatchResult] = None
    scenarios: list[EconomicsResult] = Field(default_factory=list, description="Минимум 3 сценария по ТЗ")


class ProjectRecord(BaseModel):
    id: str
    owner_user_id: str
    name: str
    object_type: ObjectType
    status: ProjectStatus = ProjectStatus.DRAFT
    created_at: datetime
    updated_at: datetime
    current_version: int = 1
    versions: list[ProjectVersion] = Field(default_factory=list, description="История версий для повторного воспроизведения расчёта")
