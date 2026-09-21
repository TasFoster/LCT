"""Контракт 6: TopologyConfig / SceneData. Граница Алексей <-> Владимиров,
Алексей (editor2d) -> Стас (simulation)."""

from pydantic import BaseModel, Field

from .enums import ZoneType


class Point2D(BaseModel):
    x: float
    y: float


class Zone(BaseModel):
    id: str
    name: str
    zone_type: ZoneType
    polygon: list[Point2D] = Field(..., description="Контур зоны в координатах сцены, м")
    tags: list[str] = Field(default_factory=list)


class Route(BaseModel):
    id: str
    points: list[Point2D]
    tags: list[str] = Field(default_factory=list)


class OperationPoint(BaseModel):
    id: str
    kind: str = Field(..., description="operation / charging")
    position: Point2D
    tags: list[str] = Field(default_factory=list)


class RobotPlacement(BaseModel):
    id: str
    catalog_item_id: str
    start_position: Point2D


class TopologyConfig(BaseModel):
    id: str
    project_id: str
    scale_m_per_unit: float = Field(1.0, description="Метров на единицу координат сцены")
    zones: list[Zone] = Field(default_factory=list)
    routes: list[Route] = Field(default_factory=list)
    operation_points: list[OperationPoint] = Field(default_factory=list)
    robots: list[RobotPlacement] = Field(default_factory=list)
