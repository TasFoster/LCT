"""Контракт 8: ScenarioInput / EconomicsResult. Граница Стас (econWrapper) -> фронт.

Это API-обёртка вокруг чистых функций Александры (см. econ_io.py) — не путать
с EconInput/EconOutput. econWrapper переводит одно в другое.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from .enums import FinancingType, ScenarioKind


class ScenarioInput(BaseModel):
    project_id: str
    match_result_id: str
    scenario_kind: ScenarioKind
    financing_type: FinancingType = FinancingType.OWN_FUNDS
    financing_rate: float = Field(0.0, description="Ставка по кредиту/лизингу, доля годовых (0 для собственных средств)")
    financing_term_years: float = Field(0.0, description="Срок кредита/лизинга, лет")
    discount_rate: float = Field(0.10, description="Ставка дисконтирования для NPV, доля")
    staff_count: int = Field(..., description="Количество замещаемых сотрудников, чел.")
    staff_salary_per_month: float = Field(..., description="₽/мес на одного сотрудника (gross, до НДФЛ)")
    staff_tax_rate: float = Field(
        0.30, description="Страховые взносы/налоги на ФОТ, доля (в РФ стандарт 30%) — пользователь может менять"
    )
    operating_hours_per_year: float
    load_factor: float = Field(..., ge=0, le=1)
    horizon_years: float = Field(5, ge=5, description="Горизонт TCO, лет, минимум 5 по ТЗ")
    assumptions_overrides: dict[str, float] = Field(
        default_factory=dict,
        description=(
            "Точечные допущения поверх дефолтов для what-if анализа — в т.ч. доли "
            "инфраструктуры/интеграции/пусконаладки/обучения от стоимости оборудования"
        ),
    )


class SensitivityResultPoint(BaseModel):
    parameter: str
    delta_pct: float
    resulting_payback_years: Optional[float] = None
    resulting_roi_pct: float
    resulting_annual_effect: float


class EconomicsResult(BaseModel):
    scenario_id: str
    project_id: str
    scenario_kind: ScenarioKind
    capex_total: float = Field(..., description="₽")
    capex_breakdown: dict[str, float] = Field(
        default_factory=dict,
        description="Ключи: equipment/infrastructure/software/integration/commissioning/training/reserve, ₽",
    )
    opex_annual: float
    opex_breakdown: dict[str, float] = Field(
        default_factory=dict, description="сервис/лицензии/электроэнергия/связь/расходники/ремонт/персонал"
    )
    opex_delta_vs_baseline: float
    annual_effect: float
    payback_years: Optional[float] = None
    roi_pct: float
    tco_total: float
    npv: float = Field(..., description="₽, с учётом discount_rate — сверх минимума ТЗ, доп. глубина анализа")
    sensitivity: list[SensitivityResultPoint] = Field(default_factory=list, description="Минимум 3 параметра по ТЗ")
    calculated_at: datetime
    assumptions_note: str = Field(..., description="Явные допущения расчёта — обязательны к показу пользователю по ТЗ")
    warnings: list[str] = Field(
        default_factory=list, description="Напр. 'эффект отрицательный', 'срок окупаемости > горизонта'"
    )
