"""Контракт 5: MatchResult. Граница Стас (matching) -> фронт, econWrapper, simulation."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from .enums import MatchStatus


class MatchFactor(BaseModel):
    name: str = Field(..., description="Критерий ранжирования, напр. 'грузоподъёмность', 'проходимость'")
    weight: float
    contribution: float = Field(..., description="Вклад фактора в итоговый score")
    note: Optional[str] = None


class MatchCandidate(BaseModel):
    catalog_item_id: str
    status: MatchStatus
    score: float = Field(..., ge=0, le=1)
    factors: list[MatchFactor] = Field(default_factory=list, description="Explainable-разбивка score по факторам")
    reasons: list[str] = Field(default_factory=list, description="Причины включения / исключения / необходимости проверки")
    quantity_if_selected: Optional[int] = Field(None, description="Сколько единиц потребуется, если выбрать только этот кандидат")


class SelectedEquipment(BaseModel):
    catalog_item_id: str
    quantity: int = Field(..., ge=1)


class MatchResult(BaseModel):
    id: str
    project_id: str
    project_input_id: str
    generated_at: datetime
    candidates: list[MatchCandidate]
    selected_equipment: list[SelectedEquipment] = Field(
        default_factory=list, description="Итоговый состав оборудования — вход для econWrapper и simulation"
    )
    manual_additions: list[str] = Field(default_factory=list, description="ID решений, добавленных вручную вне автоподбора")
