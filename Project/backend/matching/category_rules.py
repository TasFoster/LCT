"""Контракт 2 (расширение): категориальные правила Артёма — `backend/contracts/
dictionaries/compatibility_tree.json` (дерево категорий оборудования `tree` +
87 правил `rules` вида `{from, to, type}` + `requirements`).

Это ВТОРОЙ, независимый вид правил рядом с `CompatibilityRule`
(`rules.py`/`compatibility.py`), а не замена: `CompatibilityRule` сравнивает
ЧИСЛА/строки конкретного поля (`technical.payload_kg >= X`) — то, что явно
требует ТЗ («правила по габаритам, массе, точности позиционирования»).
Правила Артёма сравнивают КАТЕГОРИИ («amr» нельзя «underwater_work») — то,
что числовым правилом не выразить, но нужно, чтобы не показывать морских или
воздушных роботов в подборе для склада. Обе схемы нужны одновременно.

Как правила Артёма нацелены на ObjectType — честно, не выдумано:
- `to` в его 87 правилах — это ЗАДАЧИ (`warehouse_logistics`,
  `warehouse_inventory`, ...) и физическая СРЕДА (`indoor`/`outdoor`/`air`/
  `underwater`/...), а НЕ голые id из `entities.environments`
  (`warehouse`/`airport`/`hospital`) — они в `rules` вообще не встречаются,
  только в справочнике сущностей. Поэтому "релевантные цели" для типа
  объекта — это конкретные задачи + среда, а не название отрасли.
- Задачи под склад у Артёма есть (`warehouse_logistics`, `warehouse_inventory`).
  Специфичных задач под аэропорт или медучреждение в его 87 правилах СЕЙЧАС
  НЕТ — для них проверяется только общая среда (indoor/outdoor). Это
  ограничение его данных на сегодня, не наша недоработка: как только у него
  появятся задачи вида `airport_ramp`/`hospital_logistics`, их нужно будет
  добавить в `_OBJECT_TYPE_TASKS` ниже, и подбор для этих типов объектов
  сразу станет точнее — переписывать код не придётся.
- `requirements` (`requires_any`/`requires_all`, напр. «AMR нужна точка
  зарядки») здесь НЕ используются: это проверка про конкретную СЦЕНУ
  (`ChargingPoint` на плане), а на шаге подбора (контракт 5) сцены ещё нет —
  ей место в валидации сцены (контракт 6, шаг 7), не здесь.
"""

from __future__ import annotations

import json
import re
from enum import Enum
from pathlib import Path

from contracts import CatalogItem, ObjectType

COMPATIBILITY_TREE_PATH = (
    Path(__file__).resolve().parents[1] / "contracts" / "dictionaries" / "compatibility_tree.json"
)

# Какие задачи Артёма релевантны для каждого ObjectType — см. докстринг выше.
_OBJECT_TYPE_TASKS: dict[ObjectType, list[str]] = {
    ObjectType.WAREHOUSE: ["warehouse_logistics", "warehouse_inventory"],
    ObjectType.AIRPORT: [],
    ObjectType.MEDICAL: [],
}
# Общая физическая среда — единственное, что можно проверить для ВСЕХ трёх
# типов объектов уже сейчас (перрон аэропорта считаем outdoor — упрощение).
_OBJECT_TYPE_ENVIRONMENT: dict[ObjectType, str] = {
    ObjectType.WAREHOUSE: "indoor",
    ObjectType.AIRPORT: "outdoor",
    ObjectType.MEDICAL: "indoor",
}


class CategoryVerdict(str, Enum):
    ALLOWED = "allowed"
    FORBIDDEN = "forbidden"
    NOT_APPLICABLE = "not_applicable"  # позиция не опознана как известная категория, либо правил на неё нет


def _normalize(name: str) -> str:
    """"Робот-уборщик" и "Робот уборщик" (в датасете есть оба написания) ->
    одна строка для сравнения: нижний регистр, ё->е, без пробелов/дефисов."""
    return re.sub(r"[\s\-]+", "", name.lower().replace("ё", "е"))


class CategoryTaxonomy:
    def __init__(self, raw: dict):
        self.nodes: dict[str, dict] = raw["tree"]["nodes"]
        self.rules: list[dict] = raw["rules"]
        self._name_to_id = {_normalize(node["name"]): node_id for node_id, node in self.nodes.items()}

    @classmethod
    def load(cls, path: Path = COMPATIBILITY_TREE_PATH) -> CategoryTaxonomy:
        with open(path, encoding="utf-8") as f:
            return cls(json.load(f))

    def match_entity(self, item: CatalogItem) -> str | None:
        """Название каталожной позиции -> id категории Артёма. Пробует Подтип,
        затем Тип (см. catalog/loader.py: attributes.subtype_raw/type_raw),
        затем уже вычисленный identification.solution_type. None — ни одно
        название не совпало ни с одним известным узлом дерева (нормально:
        дерево не покрывает вообще все ~150 категорий каталога, только те,
        на которые у Артёма есть правила)."""
        for candidate in (
            item.attributes.get("subtype_raw"),
            item.attributes.get("type_raw"),
            item.identification.solution_type,
        ):
            if isinstance(candidate, str) and candidate:
                node_id = self._name_to_id.get(_normalize(candidate))
                if node_id:
                    return node_id
        return None

    def _ancestors(self, entity_id: str) -> list[str]:
        """[entity_id, родитель, родитель родителя, ...] — правило на широкую
        категорию ("mobile" не летает) действует и на её потомков ("amr")."""
        chain = [entity_id]
        seen = {entity_id}
        current = entity_id
        while True:
            parent = self.nodes.get(current, {}).get("parent")
            if not parent or parent in seen:
                return chain
            chain.append(parent)
            seen.add(parent)
            current = parent

    def evaluate(self, item: CatalogItem, object_type: ObjectType) -> tuple[CategoryVerdict, list[str]]:
        """Вердикт по всем правилам Артёма, чей `to` релевантен этому типу
        объекта, плюс человекочитаемые причины (в reasons кандидата)."""
        entity_id = self.match_entity(item)
        if entity_id is None:
            return CategoryVerdict.NOT_APPLICABLE, []

        targets = {*_OBJECT_TYPE_TASKS.get(object_type, []), _OBJECT_TYPE_ENVIRONMENT[object_type]}
        chain = self._ancestors(entity_id)

        forbidden_reasons: list[str] = []
        allowed_reasons: list[str] = []
        for rule in self.rules:
            if rule["from"] not in chain or rule["to"] not in targets:
                continue
            reason = rule.get("reason") or f"{rule['from']} ↔ {rule['to']}"
            if rule["type"] == "forbidden":
                forbidden_reasons.append(f"{reason} (правило Артёма {rule['id']})")
            elif rule["type"] == "allowed":
                allowed_reasons.append(f"{reason} (правило Артёма {rule['id']})")

        if forbidden_reasons:
            return CategoryVerdict.FORBIDDEN, forbidden_reasons
        if allowed_reasons:
            return CategoryVerdict.ALLOWED, allowed_reasons
        return CategoryVerdict.NOT_APPLICABLE, []
