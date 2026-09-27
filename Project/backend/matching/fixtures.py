"""Иллюстративные данные для demo.py — НЕ настоящий каталог и НЕ настоящие
правила совместимости. Реальный каталог (223 позиции
`Датасет/Датасет/catalog_export_v4.csv`) и реальный набор CompatibilityRule —
контракты 1 и 2, граница Артём -> Стас; ни то, ни другое пока не загружено
(см. CLAUDE.md, раздел про matching). Три позиции и три правила ниже подобраны
так, чтобы прогнать через все ветки rules.py/scoring.py: forbidden, allowed,
warning и "нет данных для проверки" (UNKNOWN) — по образцу
simulation/fixtures.py.
"""

from __future__ import annotations

from datetime import date, datetime, timezone

from contracts import (
    AcquisitionModel,
    Applicability,
    AvailabilityStatus,
    CatalogItem,
    CompatibilityRule,
    CompatibilityVerdict,
    DataQuality,
    EconomicsInfo,
    Identification,
    Infrastructure,
    NavigationType,
    ObjectType,
    ProjectInput,
    RuleCondition,
    TechnicalSpecs,
    WarehouseParams,
)


def _catalog_item(
    item_id: str,
    manufacturer: str,
    product_name: str,
    *,
    payload_kg: float,
    aisle_width_mm: float | None,
    positioning_accuracy_mm: float | None,
    throughput_per_hour: float,
    availability_status: AvailabilityStatus,
    confidence: str,
    supported_object_types: list[str],
) -> CatalogItem:
    return CatalogItem(
        id=item_id,
        identification=Identification(
            manufacturer=manufacturer,
            product_name=product_name,
            solution_type="AMR",
            purpose="Внутрискладская перевозка палет между зонами",
            country="RU",
            availability_status=availability_status,
        ),
        technical=TechnicalSpecs(
            payload_kg=payload_kg,
            speed_mps=1.5,
            throughput_per_hour=throughput_per_hour,
            autonomy_hours=8,
            positioning_accuracy_mm=positioning_accuracy_mm,
            navigation_type=NavigationType.LIDAR_SLAM,
        ),
        infrastructure=Infrastructure(aisle_width_mm=aisle_width_mm, charging_type="автоматическая"),
        economics=EconomicsInfo(equipment_cost=2_500_000, acquisition_model=AcquisitionModel.PURCHASE, service_life_years=7),
        applicability=Applicability(supported_object_types=supported_object_types),
        data_quality=DataQuality(
            source="иллюстративная позиция для demo.py — НЕ настоящие данные каталога",
            last_updated=date(2026, 9, 25),
            confidence=confidence,
        ),
    )


DEMO_CATALOG: list[CatalogItem] = [
    _catalog_item(
        "demo-amr-500",
        "Demo Robotics",
        "AMR-500",
        payload_kg=500,
        aisle_width_mm=1500,
        positioning_accuracy_mm=20,
        throughput_per_hour=12,
        availability_status=AvailabilityStatus.AVAILABLE,
        confidence="partial",
        supported_object_types=["warehouse"],
    ),
    _catalog_item(
        "demo-amr-heavy",
        "Demo Robotics",
        "AMR-1500 Heavy",
        payload_kg=1500,
        aisle_width_mm=2200,  # шире, чем rack_aisle_width_m демо-объекта -> rule-aisle-width сработает
        positioning_accuracy_mm=50,  # грубее 30мм -> rule-precision-warn сработает
        throughput_per_hour=8,
        availability_status=AvailabilityStatus.AVAILABLE,
        confidence="unverified",
        supported_object_types=["warehouse"],
    ),
    _catalog_item(
        "demo-shuttle",
        "Demo Storage Systems",
        "Shuttle-Cube",
        payload_kg=50,
        aisle_width_mm=None,  # стационарная система — поле неприменимо -> UNKNOWN, не NOT_APPLICABLE (см. docstring)
        positioning_accuracy_mm=None,
        throughput_per_hour=40,
        availability_status=AvailabilityStatus.UPCOMING,
        confidence="unverified",
        supported_object_types=[],  # не заявлено — упражняет нейтральную ветку applicability
    ),
]


DEMO_RULES: list[CompatibilityRule] = [
    CompatibilityRule(
        id="rule-aisle-width",
        object_condition=RuleCondition(key="rack_aisle_width_m", operator="lt", value=2.5),
        equipment_condition=RuleCondition(key="infrastructure.aisle_width_mm", operator="gt", value=2000),
        verdict=CompatibilityVerdict.FORBIDDEN,
        reason="габарит робота превышает ширину рабочих проходов склада (rack_aisle_width_m)",
        source="иллюстративное правило для demo.py",
    ),
    CompatibilityRule(
        id="rule-precision-ok",
        object_condition=RuleCondition(key="storage_type", operator="eq", value="pallet"),
        equipment_condition=RuleCondition(key="technical.positioning_accuracy_mm", operator="lte", value=30),
        verdict=CompatibilityVerdict.ALLOWED,
        reason="точности позиционирования достаточно для паллетного хранения",
        source="иллюстративное правило для demo.py",
    ),
    CompatibilityRule(
        id="rule-precision-warn",
        object_condition=RuleCondition(key="storage_type", operator="eq", value="pallet"),
        equipment_condition=RuleCondition(key="technical.positioning_accuracy_mm", operator="gt", value=30),
        verdict=CompatibilityVerdict.WARNING,
        reason="точность позиционирования грубее рекомендованной для паллетного хранения — проверить разметку/стеллажи",
        source="иллюстративное правило для demo.py",
    ),
]


DEMO_PROJECT_INPUT = ProjectInput(
    id="demo-project-input",
    project_id="demo-project",
    object_type=ObjectType.WAREHOUSE,
    params=WarehouseParams(
        area_sqm=1000,
        operating_mode="24/7",
        shifts_per_day=2,
        shift_duration_hours=11,
        peak_load_factor=1.5,
        inbound_ops_per_day=600,
        internal_ops_per_day=400,
        outbound_ops_per_day=600,
        storage_type="pallet",
        rack_aisle_width_m=2.0,  # уже, чем 2.5 -> rule-aisle-width применим
        sku_count=500,
        unit_load_weight_kg=300,
        unit_load_dimensions_mm="1200x800x1500",
        staff_count=10,
        staff_cost_per_month=80000,
        current_throughput_per_hour=20,
        route_length_m=100,
    ),
    created_at=datetime.now(timezone.utc),
    source="manual",
)
