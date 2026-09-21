"""Контракт 7: SimulationTimeline. Граница Стас (simulation) -> Алексей (editor2d/viewer3d).

Таймлайн считается один раз на бэкенде и просто проигрывается на фронте —
без физики в браузере (см. п.4.3.3 ТЗ про пересчёт до 60с со статусом)."""

from pydantic import BaseModel, Field

from .enums import RobotState


class TimelineFrame(BaseModel):
    robot_id: str
    t: float = Field(..., description="Время от начала симуляции, с")
    x: float
    y: float
    state: RobotState


class Bottleneck(BaseModel):
    location: str
    description: str
    severity: str = Field("medium", description="low / medium / high")


class SimulationKPI(BaseModel):
    utilization_pct: float = Field(..., description="Средняя загрузка оборудования, %")
    idle_time_pct: float
    throughput_per_hour: float
    bottlenecks: list[Bottleneck] = Field(default_factory=list)


class SimulationTimeline(BaseModel):
    id: str
    project_id: str
    scenario_id: str
    duration_s: float
    frames: list[TimelineFrame]
    kpi: SimulationKPI
