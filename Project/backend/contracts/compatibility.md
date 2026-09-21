# compatibility.py — контракт 2: CompatibilityRule

Граница: **Артём → Стас** (эвалюатор совместимости в matching). Плоская
таблица правил — принятый MVP-путь вместо полноценного «дерева связей».

## RuleCondition
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| key | str | да | Тег/характеристика оборудования (CatalogItem) или параметр объекта (ProjectInput) |
| operator | str | `"eq"` | `eq` / `ne` / `lt` / `lte` / `gt` / `gte` / `in` / `has_tag` |
| value | str \| float \| int \| bool \| list[str] | да | Значение, с которым сравнивается `key` |

## CompatibilityRule
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| id | str | да | Идентификатор правила |
| equipment_condition | RuleCondition | да | Условие на стороне оборудования |
| object_condition | RuleCondition | да | Условие на стороне объекта |
| verdict | CompatibilityVerdict | да | Итог: `allowed` / `forbidden` / `warning` / `needs_review` |
| reason | str | да | Человекочитаемое объяснение — показывается пользователю в explainable-ranking |
| source | str \| null | null | Артём / каталог оргов / документированное допущение команды |
