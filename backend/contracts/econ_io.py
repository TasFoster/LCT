"""Контракт 3: EconInput / EconOutput. Граница Александра -> Стас (econWrapper).

ВАЖНО: только stdlib, никакого pydantic/FastAPI. Александра пишет чистые
функции над этими датаклассами и не должна знать об остальном стеке.
econWrapper сам конвертирует ScenarioInput -> EconInput и EconOutput ->
EconomicsResult (см. economics.py) на границе API.

Поля синхронизированы с её собственной спекой (econ.json, чекпоинт 18.09) —
она группировала поля (capex/staff/operations/opex/financing_and_horizon/
sensitivity) только для читаемости документа, в датаклассе группировка не
нужна: EconInput остаётся плоским, как и было в черновике.

infrastructure_cost_total/integration_cost_total/commissioning_cost_total/
training_cost_total Александра считает по своим формулам, но исходные суммы
для них не приходят из каталога отдельными полями (CatalogItem.economics
даёт только equipment/software/implementation одним числом) — econWrapper
получает их как доли от equipment_cost_total (документированное допущение,
попадает в EconOutput.assumptions_text), а не из данных Артёма.
"""

from dataclasses import dataclass, field


@dataclass
class EconInput:
    # --- обязательные ---
    equipment_cost_total: float  # CAPEX на оборудование, ₽
    software_cost_total: float  # CAPEX на ПО/лицензии, ₽
    staff_count: int  # количество замещаемых сотрудников, чел.
    staff_salary_per_month: float  # ₽/мес на одного сотрудника (gross, до НДФЛ)
    operating_hours_per_year: float
    load_factor: float  # 0..1, коэффициент загрузки оборудования
    maintenance_cost_per_year: float
    energy_cost_per_year: float
    financing_type: str  # "own_funds" | "credit" | "leasing" | "raas"
    horizon_years: float  # горизонт TCO, лет (>= 5 по ТЗ)

    # --- с дефолтами ---
    infrastructure_cost_total: float = 0.0  # CAPEX на инфраструктуру, ₽
    integration_cost_total: float = 0.0  # CAPEX на интеграцию с ERP/WMS, ₽
    commissioning_cost_total: float = 0.0  # CAPEX: пусконаладка/тестирование/запуск, ₽
    training_cost_total: float = 0.0  # CAPEX: обучение персонала, ₽
    reserve_ratio: float = 0.1  # резерв в CAPEX, доля от суммы CAPEX
    staff_tax_rate: float = 0.30  # страховые взносы/налоги на ФОТ, доля (в РФ стандарт 30%)
    connectivity_cost_per_year: float = 0.0
    consumables_cost_per_year: float = 0.0
    financing_rate: float = 0.0  # ставка по кредиту/лизингу, доля годовых (0 для собственных средств)
    financing_term_years: float = 0.0  # срок кредита/лизинга, лет
    discount_rate: float = 0.10  # ставка дисконтирования для NPV, доля
    sensitivity_params: list[str] = field(
        default_factory=lambda: ["equipment_cost_total", "staff_salary_per_month", "operating_hours_per_year"]
    )  # минимум 3 параметра по ТЗ
    sensitivity_delta_pct: float = 0.20  # шаг изменения параметра, ±20%


@dataclass
class SensitivityPoint:
    parameter: str
    delta_pct: float
    resulting_payback_years: float | None  # None, если получившийся эффект <= 0
    resulting_roi_pct: float
    resulting_annual_effect: float


@dataclass
class EconOutput:
    capex_equipment: float
    capex_infrastructure: float
    capex_software: float
    capex_integration: float
    capex_commissioning: float
    capex_training: float
    capex_reserve: float
    capex_total: float
    opex_annual: float
    opex_delta_vs_baseline: float
    annual_effect: float
    payback_years: float | None  # None, если годовой эффект <= 0
    roi_pct: float
    tco_total: float
    npv: float  # ₽, с учётом discount_rate — сверх минимума ТЗ, доп. глубина анализа
    sensitivity: list[SensitivityPoint]  # минимум 3 параметра по ТЗ
    assumptions_text: str  # пояснение всех допущений/формул/логики — без чёрных ящиков
    warnings: list[str] = field(default_factory=list)  # напр. "эффект отрицательный", "срок > горизонта"
