# Топология и сцена

Зона Алексея (контракт 6). Источник истины — не `backend/contracts/`, а редактор и его
контракт, которые исторически развивались отдельно:

- [`../../Project/scene.md`](../../Project/scene.md) — контракт `Scene` (актуальная версия, v1.1):
  зоны, маршруты, точки операций/зарядки, роботы. Читать перед правкой `Project/editor2d/src/scene/types.ts`.
- [`../../Project/scene.example.json`](../../Project/scene.example.json) — пример сцены, грузится редактором по умолчанию.
- [`../../Project/editor2d`](../../Project/editor2d) — 2D-редактор сцены (React + Konva); у него
  свой `CLAUDE.md` с архитектурой слоёв и `PROGRESS.md` с журналом работы.

`../../Project/backend/contracts/topology.py` — устаревший pydantic-черновик того же
контракта 6 (импортируется в `records.py`, поэтому не удалён); переписать его под
`scene.md` нужно до интеграции с симуляцией (см. `simulation_design.md` в разделе
«Подбор и симуляция», §8).

Более ранний, отдельно устаревший черновик (не pydantic) — `Project/архив/topology.md` /
`topology.py` — оставлен только для истории, не редактировать.
