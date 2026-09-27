"""Болванки на месте matching (контракт 5) — Артём/эвалюатор совместимости ещё не готовы
(см. Документация/Подбор и симуляция/simulation_design.md §0, §8.4).

Даёт CatalogItem/SelectedEquipment в реальной форме контрактов 1 и 5, чтобы graph.py/
engine.py разрабатывались и тестировались против настоящих типов уже сейчас. Когда
появится настоящий matching — resolve_catalog_item/stub_selected_equipment заменяются
вызовом реального модуля; остальной код (engine.py, kpi.py) этого не заметит, он и так
работает через CatalogItem/SelectedEquipment, а не через хардкод.

Открытый вопрос §8.4 (источник истины по количеству роботов — selected_equipment.quantity
или фактический Scene.robots) здесь решён прагматично для разработки: считаем от
Scene.robots (что реально расставлено в редакторе), catalog — только источник ТТХ.
Пересмотреть, когда появится настоящий matching.
"""

from datetime import date

from contracts import (
    AcquisitionModel,
    Applicability,
    AvailabilityStatus,
    CatalogItem,
    DataQuality,
    EconomicsInfo,
    Identification,
    Infrastructure,
    NavigationType,
    RobotPlacement,
    SelectedEquipment,
    TechnicalSpecs,
)


def _catalog_item(
    item_id: str,
    manufacturer: str,
    product_name: str,
    *,
    payload_kg: float,
    speed_mps: float,
    throughput_per_hour: float,
    autonomy_hours: float,
) -> CatalogItem:
    return CatalogItem(
        id=item_id,
        identification=Identification(
            manufacturer=manufacturer,
            product_name=product_name,
            solution_type="AMR",
            purpose="Внутрискладская перевозка палет/тележек между точками операций",
            country="RU",
            availability_status=AvailabilityStatus.AVAILABLE,
        ),
        technical=TechnicalSpecs(
            payload_kg=payload_kg,
            dimensions_mm="1200x800x400",
            speed_mps=speed_mps,
            throughput_per_hour=throughput_per_hour,
            autonomy_hours=autonomy_hours,
            positioning_accuracy_mm=20,
            navigation_type=NavigationType.LIDAR_SLAM,
            operating_conditions="0..+40 C, сухое помещение",
        ),
        infrastructure=Infrastructure(
            aisle_width_mm=1500,
            charging_type="автоматическая, контактная",
            connectivity="Wi-Fi",
        ),
        economics=EconomicsInfo(
            equipment_cost=2_500_000,
            acquisition_model=AcquisitionModel.PURCHASE,
            service_life_years=7,
        ),
        applicability=Applicability(supported_object_types=["warehouse"]),
        data_quality=DataQuality(
            source="болванка для разработки simulation — НЕ настоящие данные каталога",
            last_updated=date(2026, 9, 22),
            confidence="unverified",
        ),
    )


STUB_CATALOG: dict[str, CatalogItem] = {
    "cat-amr-500": _catalog_item(
        "cat-amr-500", "Stub Robotics", "AMR-500",
        payload_kg=500, speed_mps=1.5, throughput_per_hour=12, autonomy_hours=8,
    ),
    "cat-amr-300": _catalog_item(
        "cat-amr-300", "Stub Robotics", "AMR-300",
        payload_kg=300, speed_mps=1.8, throughput_per_hour=15, autonomy_hours=6,
    ),
}

# category (справочник Артёма) -> модель по умолчанию, пока у робота нет catalog_item_id.
STUB_CATEGORY_DEFAULTS: dict[str, str] = {
    "amr": "cat-amr-500",
}


def resolve_catalog_item(
    robot: RobotPlacement,
    catalog: dict[str, CatalogItem] = STUB_CATALOG,
    defaults: dict[str, str] = STUB_CATEGORY_DEFAULTS,
) -> CatalogItem:
    """catalog_item_id, если это одна из двух болванок каталога, иначе — болванка по
    category. Не пытается разрешить настоящий catalog_item_id (реальный каталог,
    contracts/catalog.py) через STUB_CATALOG: у реальных позиций своих числовых ТТХ
    всё равно нет (catalog/loader.py, TechnicalSpecs везде пусто), так что для
    симуляции они настолько же "болванка", насколько и явные cat-amr-*."""
    item_id = robot.catalog_item_id if robot.catalog_item_id in catalog else defaults.get(robot.category)
    if item_id is None:
        raise KeyError(
            f"нет болванки каталога для робота {robot.id!r} (category={robot.category!r}, "
            f"catalog_item_id={robot.catalog_item_id!r}) — добавь категорию в STUB_CATEGORY_DEFAULTS"
        )
    return catalog[item_id]


def stub_selected_equipment(robots: list[RobotPlacement]) -> list[SelectedEquipment]:
    """Состав флота по факту расставленных на сцене роботов, сгруппированный по модели —
    временная замена MatchResult.selected_equipment, пока нет matching (см. §8.4)."""
    counts: dict[str, int] = {}
    for robot in robots:
        item = resolve_catalog_item(robot)
        counts[item.id] = counts.get(item.id, 0) + 1
    return [SelectedEquipment(catalog_item_id=item_id, quantity=qty) for item_id, qty in counts.items()]
