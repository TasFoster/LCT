"""Эвалюатор CompatibilityRule (контракт 2) — см. compatibility.md.

RuleCondition.key — путь через точку до поля CatalogItem/ProjectInput,
напр. "technical.payload_kg", "identification.solution_type", "tags",
"attributes.max_incline_deg" для оборудования; "area_sqm", "object_type",
"working_zones" для объекта (ищется сначала в ProjectInput.params, потом в
самом ProjectInput — так один и тот же key работает и для полей конкретного
*Params, и для общих полей вроде object_type).
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from contracts import CatalogItem, CompatibilityRule, ProjectInput


class RuleOutcome(str, Enum):
    """Итог применения одного правила к одному кандидату."""

    APPLIED = "applied"  # оба условия истинны — verdict правила действует
    NOT_APPLICABLE = "not_applicable"  # правило не про этот объект или не про это оборудование
    UNKNOWN = "unknown"  # правило про этот объект, но у оборудования нет данных для проверки


def _resolve_path(obj: Any, path: str) -> Any:
    """Идёт по .-разделённому пути через атрибуты pydantic-моделей и dict'ы
    (attributes.*). Отсутствующий атрибут/ключ и None на любом шаге -> None."""
    current = obj
    for part in path.split("."):
        if current is None:
            return None
        if isinstance(current, dict):
            current = current.get(part)
        else:
            current = getattr(current, part, None)
    return current


def resolve_equipment_value(item: CatalogItem, key: str) -> Any:
    return _resolve_path(item, key)


def resolve_object_value(project_input: ProjectInput, key: str) -> Any:
    """Сначала ищет key в ProjectInput.params (area_sqm, working_zones, ...),
    затем в самом ProjectInput (object_type и другие поля верхнего уровня)."""
    value = _resolve_path(project_input.params, key)
    if value is not None:
        return value
    return _resolve_path(project_input, key)


def _as_comparable(value: Any) -> Any:
    """Enum-поля (AvailabilityStatus, NavigationType, ObjectType...) сравниваем
    со строковым value из правила по .value, а не по identity объекта enum."""
    return getattr(value, "value", value)


def evaluate_condition(resolved: Any, operator: str, value: Any) -> bool | None:
    """True/False — условие выполнено/не выполнено; None — недостаточно
    данных (resolved is None или числовое сравнение не по числу), вывод
    сделать нельзя."""
    if resolved is None:
        return None
    resolved = _as_comparable(resolved)

    if operator == "has_tag":
        if isinstance(resolved, (list, tuple, set)):
            return value in resolved
        return resolved == value
    if operator == "in":
        return resolved in value
    if operator == "eq":
        return resolved == value
    if operator == "ne":
        return resolved != value
    if operator in ("lt", "lte", "gt", "gte"):
        try:
            a, b = float(resolved), float(value)
        except (TypeError, ValueError):
            return None
        return {"lt": a < b, "lte": a <= b, "gt": a > b, "gte": a >= b}[operator]
    raise ValueError(f"неизвестный оператор RuleCondition: {operator!r}")


def evaluate_rule(rule: CompatibilityRule, item: CatalogItem, project_input: ProjectInput) -> RuleOutcome:
    """Правило действует (APPLIED), только если истинны ОБА условия — на
    объекте и на оборудовании (compatibility.md: "если условие на
    оборудовании И условие на объекте -> вердикт"). object_condition
    ложно/неизвестно — правило просто не про этот объект (NOT_APPLICABLE,
    обычная фильтрация, не повод для предупреждения). equipment_condition
    неизвестно (нет данных в CatalogItem) при истинном object_condition —
    UNKNOWN: правило релевантно, но проверить нечем (ТЗ: недостаток данных
    помечается "требует проверки", а не скрывается молча)."""
    object_ok = evaluate_condition(
        resolve_object_value(project_input, rule.object_condition.key),
        rule.object_condition.operator,
        rule.object_condition.value,
    )
    if not object_ok:
        return RuleOutcome.NOT_APPLICABLE

    equipment_ok = evaluate_condition(
        resolve_equipment_value(item, rule.equipment_condition.key),
        rule.equipment_condition.operator,
        rule.equipment_condition.value,
    )
    if equipment_ok is None:
        return RuleOutcome.UNKNOWN
    return RuleOutcome.APPLIED if equipment_ok else RuleOutcome.NOT_APPLICABLE
