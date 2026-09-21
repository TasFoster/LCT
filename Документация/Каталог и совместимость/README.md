# Каталог и совместимость

Зона Артёма (→ Стас). Контракты — как код, так и таблица полей для не-питонистов — живут
рядом с реализацией, здесь не дублируются:

- [`../../Project/backend/contracts/catalog.py`](../../Project/backend/contracts/catalog.py) /
  [`catalog.md`](../../Project/backend/contracts/catalog.md) — `CatalogItem`, карточка позиции каталога.
- [`../../Project/backend/contracts/compatibility.py`](../../Project/backend/contracts/compatibility.py) /
  [`compatibility.md`](../../Project/backend/contracts/compatibility.md) — `CompatibilityRule`, таблица правил совместимости.

Общее описание всех 9 контрактов и их направлений — в корневом [`CLAUDE.md`](../../CLAUDE.md).
