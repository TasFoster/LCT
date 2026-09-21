# Подбор и симуляция

Зона Стаса. Контракты живут рядом с реализацией:

- [`../../Project/backend/contracts/matching.py`](../../Project/backend/contracts/matching.py) /
  [`matching.md`](../../Project/backend/contracts/matching.md) — `MatchResult`, ранжирование с explainable-факторами.
- [`../../Project/backend/contracts/simulation.py`](../../Project/backend/contracts/simulation.py) /
  [`simulation.md`](../../Project/backend/contracts/simulation.md) — `SimulationTimeline`, таймлайн для проигрывания на фронте.

[`simulation_design.md`](simulation_design.md) — согласованный план модуля
`backend/simulation/` (граф маршрутов, конечный автомат робота, узкие места). Код ещё не
написан — сверяться с этим файлом перед реализацией.
