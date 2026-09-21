"""Контракт 2: CompatibilityRule. Граница Артём -> Стас (эвалюатор в matching).

Плоская таблица правил вместо полноценного "дерева связей" — MVP-путь,
предложенный и принятый как отправная точка (см. project-team-lct memory).
Каждое правило -- одна строка вида "если условие на оборудовании и условие
на объекте, то вердикт", с обязательной причиной для explainable-ranking.
"""

from typing import Optional

from pydantic import BaseModel, Field

from .enums import CompatibilityVerdict


class RuleCondition(BaseModel):
    key: str = Field(..., description="Тег/характеристика оборудования (CatalogItem) или параметр объекта (ProjectInput)")
    operator: str = Field("eq", description="eq / ne / lt / lte / gt / gte / in / has_tag")
    value: str | float | int | bool | list[str]


class CompatibilityRule(BaseModel):
    id: str
    equipment_condition: RuleCondition
    object_condition: RuleCondition
    verdict: CompatibilityVerdict
    reason: str = Field(..., description="Человекочитаемое объяснение — показывается пользователю в explainable-ranking")
    source: Optional[str] = Field(None, description="Артём / каталог оргов / документированное допущение команды")
