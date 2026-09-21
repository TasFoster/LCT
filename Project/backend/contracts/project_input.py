"""Контракт 4: ProjectInput. Граница Владимиров (визард) -> Стас (matching,
simulation, econWrapper).

Discriminated union по object_type: добавление нового типа объекта — это
новый *Params класс + новое значение ObjectType, без изменения кода
matching/economics (они читают params через теги/общие поля, а не через
знание о конкретном типе объекта).
"""

from datetime import datetime
from typing import Literal, Optional, Union

from pydantic import BaseModel, Field

from .enums import ObjectType


class WarehouseParams(BaseModel):
    object_type: Literal[ObjectType.WAREHOUSE] = ObjectType.WAREHOUSE
    area_sqm: float = Field(..., description="Площадь склада, м²")
    working_zones: list[str] = Field(default_factory=list)
    operating_mode: str = Field(..., description="Напр. '24/7' или '2 смены по 12ч'")
    inbound_ops_per_day: float
    internal_ops_per_day: float
    outbound_ops_per_day: float
    storage_type: str
    sku_count: int
    unit_load_weight_kg: float
    unit_load_dimensions_mm: str
    staff_count: int
    staff_cost_per_month: float = Field(..., description="₽/мес на одного сотрудника")
    current_throughput_per_hour: float
    route_length_m: float
    available_area_sqm: Optional[float] = None
    layout_constraints: list[str] = Field(default_factory=list)


class AirportParams(BaseModel):
    object_type: Literal[ObjectType.AIRPORT] = ObjectType.AIRPORT
    operation_zone: str = Field(..., description="Перрон / терминал / багажное отделение и т.п.")
    operating_mode: str
    passenger_flow_per_day: Optional[float] = None
    cargo_flow_tons_per_day: Optional[float] = None
    ops_count_per_day: float
    peak_load_per_hour: float
    route_length_m: float
    unit_weight_kg: float
    unit_dimensions_mm: str
    staff_count: int
    staff_cost_per_month: float
    safety_requirements: list[str] = Field(default_factory=list)
    zone_access: str = Field(..., description="closed / open")


class MedicalParams(BaseModel):
    object_type: Literal[ObjectType.MEDICAL] = ObjectType.MEDICAL
    facility_type: str
    area_sqm: float
    floors_count: int
    operating_mode: str
    cargo_volume_per_day: dict[str, float] = Field(
        default_factory=dict, description="По категориям: грузы/бельё/питание/медикаменты/отходы"
    )
    routes_and_elevators: list[str] = Field(default_factory=list)
    sanitary_requirements: list[str] = Field(default_factory=list)
    staff_count: int
    staff_cost_per_month: float
    access_restrictions: list[str] = Field(default_factory=list)


ObjectParams = Union[WarehouseParams, AirportParams, MedicalParams]


class ProjectInput(BaseModel):
    id: str
    project_id: str
    object_type: ObjectType
    params: ObjectParams = Field(..., discriminator="object_type")
    created_at: datetime
    source: str = Field("manual", description="manual / excel_import / csv_import")
