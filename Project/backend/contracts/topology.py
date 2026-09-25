"""Контракт 6: Scene. Граница Алексей (редактор плана, Project/frontend/src/features/planEditor/) -> Артём/Стас (matching), Стас (simulation),
Владимиров (хранение проекта, contracts/records.py).

Зеркалит поле-в-поле ../scene.md (источник истины — Алексей ведёт его вручную; TS-зеркало —
frontend/src/shared/types/contracts.ts). При изменении scene.md синхронизируй оба файла: этот
и topology.md."""

from typing import Literal, Optional

from pydantic import BaseModel, Field

from .enums import ZoneType

SCHEMA_VERSION = "1.2"


class Point(BaseModel):
    x: float
    y: float


class Background(BaseModel):
    image_url: str = Field(
        ...,
        description=(
            "Ссылка на подложку. Для сцен, сохранённых через API — постоянный URL, "
            "полученный из POST /api/projects/{id}/scene/background (не data:, "
            "см. scene.md, раздел Background)"
        ),
    )
    x: float
    y: float
    width: float
    height: float
    opacity: float = Field(1.0, ge=0, le=1)


class Site(BaseModel):
    width: float
    height: float
    boundary: list[Point] = Field(..., min_length=3, description="Контур объекта")
    background: Optional[Background] = None


class Wall(BaseModel):
    id: str
    name: str
    points: list[Point] = Field(..., min_length=2, description="Ось стены; стена — полоса thickness вокруг неё")
    thickness: float = Field(0.2, gt=0, description="Толщина, м")
    tags: list[str] = Field(default_factory=list)


class Zone(BaseModel):
    id: str
    name: str
    zone_type: ZoneType
    polygon: list[Point] = Field(..., min_length=3, description="Контур зоны, м")
    categories: list[str] = Field(default_factory=list, description="Категории Артёма: место/задачи/условия среды")
    tags: list[str] = Field(default_factory=list)


class OperationPoint(BaseModel):
    id: str
    name: str
    position: Point
    zone_id: Optional[str] = Field(None, description="Зона, в которой стоит точка")
    categories: list[str] = Field(default_factory=list, description="Категории Артёма — по ним matching подбирает оборудование")
    tags: list[str] = Field(default_factory=list)


class ChargingPoint(BaseModel):
    id: str
    name: str
    position: Point
    zone_id: Optional[str] = None
    categories: list[str] = Field(default_factory=list, description="Напр. тип зарядки")
    tags: list[str] = Field(default_factory=list)
    slots: int = Field(..., ge=1, description="Сколько роботов заряжается одновременно")


class RoutePoint(BaseModel):
    x: float
    y: float
    ref: Optional[str] = Field(None, description="id ключевой точки, если вершина к ней привязана (примагничена)")


class Route(BaseModel):
    id: str
    name: str
    points: list[RoutePoint] = Field(..., min_length=2)
    bidirectional: bool = Field(..., description="true — обе стороны, false — только по порядку points")
    tags: list[str] = Field(default_factory=list)


class RobotPlacement(BaseModel):
    id: str = Field(..., description="Идентификатор экземпляра на сцене — на него ссылается таймлайн")
    name: str
    category: str = Field(..., description="id категории Артёма вида «оборудование» (amr, robot_tyagach…)")
    catalog_item_id: Optional[str] = Field(..., description="Модель из каталога; null, пока не подобрана matching/пользователем")
    start_position: Point
    start_heading_deg: float
    start_point_id: Optional[str] = Field(None, description="id ключевой точки, если робот стоит на ней")
    home_charging_point_id: Optional[str] = Field(None, description="Зарядка, закреплённая за роботом")


class Scene(BaseModel):
    schema_version: str = SCHEMA_VERSION
    id: str
    project_id: str
    name: str
    updated_at: str = Field(..., description="ISO 8601, UTC")
    units: Literal["m"] = "m"
    coordinate_system: Literal["y_down"] = "y_down"
    site: Site
    walls: list[Wall] = Field(default_factory=list, description="Стены — препятствия (v1.2)")
    zones: list[Zone] = Field(default_factory=list)
    operation_points: list[OperationPoint] = Field(default_factory=list)
    charging_points: list[ChargingPoint] = Field(default_factory=list)
    routes: list[Route] = Field(default_factory=list)
    robots: list[RobotPlacement] = Field(default_factory=list)
