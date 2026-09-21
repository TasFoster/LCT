# Экономика

Зона Александры (→ Стас, econWrapper). Контракты живут рядом с реализацией:

- [`../../Project/backend/contracts/econ_io.py`](../../Project/backend/contracts/econ_io.py) /
  [`econ_io.md`](../../Project/backend/contracts/econ_io.md) — `EconInput`/`EconOutput`, чистые dataclass-формулы.
- [`../../Project/backend/contracts/economics.py`](../../Project/backend/contracts/economics.py) /
  [`economics.md`](../../Project/backend/contracts/economics.md) — `ScenarioInput`/`EconomicsResult`, pydantic-обёртка для API/фронта.

[`econ.json`](econ.json) — чекпоинт-спека Александры (18.09), на неё ссылается докстринг
`econ_io.py`; поля синхронизированы, группировка в файле — только для читаемости документа.
