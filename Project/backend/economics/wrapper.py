"""econWrapper (контракт 8, Стас): ScenarioInput + состав оборудования -> EconInput
(Александра, calculator.py) -> EconomicsResult.

Стас переводит одно в другое на границе API — не путать с EconInput/EconOutput
(контракт 3, calculator.py), которые Александра считает без знания об остальном
стеке (см. docstring contracts/econ_io.py).

CAPEX/OPEX по позициям каталога — честно, из того, что реально есть в
`CatalogItem.economics` (equipment_cost/software_cost/implementation_cost/
maintenance_cost_per_year — у реального каталога заполнен только
equipment_cost, см. catalog/loader.py, остальное 0, а не выдумано). То, чего
в каталоге нет вообще (инфраструктура на единицу техники, энергопотребление,
связь, наценки на пусконаладку/обучение) — документированные допущения ниже,
переопределяемые через `ScenarioInput.assumptions_overrides` для what-if.
"""

from __future__ import annotations

from datetime import datetime, timezone

from contracts import CatalogItem
from contracts.econ_io import EconInput
from contracts.economics import EconomicsResult, ScenarioInput, SensitivityResultPoint
from contracts.matching import SelectedEquipment

from .calculator import calculate_economics

# Допущения команды — нигде в каталоге/ТЗ не заданы численно, поэтому явные
# константы здесь, а не внутри calculator.py (то, что общее с формулами
# Александры, живёт там; то, что специфично для перевода каталога в EconInput —
# здесь). Каждое попадает в EconOutput.assumptions_text через сами суммы.
INFRA_PER_UNIT_RUB = 150_000.0  # зарядка, Wi-Fi, разметка — на единицу техники
CONNECTIVITY_PER_UNIT_RUB = 20_000.0  # ₽/год на единицу техники
COMMISSIONING_SHARE_OF_EQUIPMENT = 0.04
TRAINING_SHARE_OF_EQUIPMENT = 0.01
ROBOT_POWER_KW = 1.2
ENERGY_TARIFF_RUB_PER_KWH = 7.2


def _catalog_costs(
    selected_equipment: list[SelectedEquipment], catalog_by_id: dict[str, CatalogItem]
) -> tuple[float, float, float, float, int]:
    """(equipment_cost_total, software_cost_total, integration_cost_total,
    maintenance_cost_per_year, units) — суммы по составу оборудования."""
    equipment = software = integration = maintenance = 0.0
    units = 0
    for se in selected_equipment:
        item = catalog_by_id.get(se.catalog_item_id)
        if item is None:
            continue
        q = se.quantity
        units += q
        equipment += (item.economics.equipment_cost or 0.0) * q
        software += (item.economics.software_cost or 0.0) * q
        integration += (item.economics.implementation_cost or 0.0) * q
        maintenance += (item.economics.maintenance_cost_per_year or 0.0) * q
    return equipment, software, integration, maintenance, units


def build_econ_input(
    scenario: ScenarioInput, selected_equipment: list[SelectedEquipment], catalog: list[CatalogItem]
) -> tuple[EconInput, dict[str, float]]:
    """Возвращает EconInput и разбивку OPEX по статьям (для EconomicsResult.opex_breakdown,
    которую EconOutput сам по себе не хранит — только агрегат)."""
    catalog_by_id = {c.id: c for c in catalog}
    equipment_cost, software_cost, integration_cost, maintenance_cost, units = _catalog_costs(
        selected_equipment, catalog_by_id
    )

    overrides = scenario.assumptions_overrides
    infrastructure_cost = overrides.get("infrastructure_cost_total", units * INFRA_PER_UNIT_RUB)
    integration_cost = overrides.get("integration_cost_total", integration_cost)
    commissioning_cost = overrides.get("commissioning_cost_total", equipment_cost * COMMISSIONING_SHARE_OF_EQUIPMENT)
    training_cost = overrides.get("training_cost_total", equipment_cost * TRAINING_SHARE_OF_EQUIPMENT)
    energy_cost = overrides.get(
        "energy_cost_per_year",
        units * scenario.operating_hours_per_year * scenario.load_factor * ROBOT_POWER_KW * ENERGY_TARIFF_RUB_PER_KWH,
    )
    connectivity_cost = overrides.get("connectivity_cost_per_year", units * CONNECTIVITY_PER_UNIT_RUB)
    consumables_cost = overrides.get("consumables_cost_per_year", 0.0)

    econ_input = EconInput(
        equipment_cost_total=equipment_cost,
        software_cost_total=software_cost,
        infrastructure_cost_total=infrastructure_cost,
        integration_cost_total=integration_cost,
        commissioning_cost_total=commissioning_cost,
        training_cost_total=training_cost,
        staff_count=scenario.staff_count,
        staff_salary_per_month=scenario.staff_salary_per_month,
        staff_tax_rate=scenario.staff_tax_rate,
        operating_hours_per_year=scenario.operating_hours_per_year,
        load_factor=scenario.load_factor,
        maintenance_cost_per_year=maintenance_cost,
        energy_cost_per_year=energy_cost,
        connectivity_cost_per_year=connectivity_cost,
        consumables_cost_per_year=consumables_cost,
        financing_type=scenario.financing_type.value,
        financing_rate=scenario.financing_rate,
        financing_term_years=scenario.financing_term_years,
        discount_rate=scenario.discount_rate,
        horizon_years=scenario.horizon_years,
    )
    opex_breakdown = {
        "maintenance": maintenance_cost,
        "energy": energy_cost,
        "connectivity": connectivity_cost,
        "consumables": consumables_cost,
    }
    return econ_input, opex_breakdown


def run_economics(
    scenario: ScenarioInput, selected_equipment: list[SelectedEquipment], catalog: list[CatalogItem]
) -> EconomicsResult:
    econ_input, opex_breakdown = build_econ_input(scenario, selected_equipment, catalog)
    output = calculate_economics(econ_input)

    return EconomicsResult(
        scenario_id=f"scn-{scenario.project_id}-{scenario.scenario_kind.value}-{scenario.financing_type.value}",
        project_id=scenario.project_id,
        scenario_kind=scenario.scenario_kind,
        capex_total=output.capex_total,
        capex_breakdown={
            "equipment": output.capex_equipment,
            "infrastructure": output.capex_infrastructure,
            "software": output.capex_software,
            "integration": output.capex_integration,
            "commissioning": output.capex_commissioning,
            "training": output.capex_training,
            "reserve": output.capex_reserve,
        },
        opex_annual=output.opex_annual,
        opex_breakdown=opex_breakdown,
        opex_delta_vs_baseline=output.opex_delta_vs_baseline,
        annual_effect=output.annual_effect,
        payback_years=output.payback_years,
        roi_pct=output.roi_pct,
        tco_total=output.tco_total,
        npv=output.npv,
        sensitivity=[
            SensitivityResultPoint(
                parameter=p.parameter,
                # calculator.SensitivityPoint.delta_pct — доля (0.2 для ±20%, см.
                # EconInput.sensitivity_delta_pct); контракт 8 и фронт (как roi_pct,
                # payback и т.д.) исторически используют "число процентов" (20, не 0.2).
                delta_pct=p.delta_pct * 100,
                resulting_payback_years=p.resulting_payback_years,
                resulting_roi_pct=p.resulting_roi_pct,
                resulting_annual_effect=p.resulting_annual_effect,
            )
            for p in output.sensitivity
        ],
        calculated_at=datetime.now(timezone.utc),
        assumptions_note=output.assumptions_text,
        warnings=output.warnings,
    )
