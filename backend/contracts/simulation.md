# simulation.py — контракт 7: SimulationTimeline

Граница: **Стас (simulation) → Алексей** (editor2d/viewer3d). Таймлайн
считается один раз на бэкенде и просто проигрывается на фронте — без физики
в браузере (п. 4.3.3 ТЗ про пересчёт модели до 60 с со статусом).

## TimelineFrame
| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| robot_id | str | да | Идентификатор робота (соответствует RobotPlacement.id) |
| t | float | да | Время от начала симуляции, с |
| x | float | да | Координата X в момент t |
| y | float | да | Координата Y в момент t |
| state | RobotState | да | `idle` / `moving` / `loading` / `unloading` / `charging` / `blocked` |

## Bottleneck
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| location | str | да | Где возникает узкое место |
| description | str | да | Описание проблемы |
| severity | str | `"medium"` | `low` / `medium` / `high` |

## SimulationKPI
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| utilization_pct | float | да | Средняя загрузка оборудования, % |
| idle_time_pct | float | да | Доля простоя, % |
| throughput_per_hour | float | да | Фактическая производительность в симуляции, операций/час |
| bottlenecks | list[Bottleneck] | [] | Найденные узкие места |

## SimulationTimeline (корневая модель)
| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| id | str | да | Идентификатор таймлайна |
| project_id | str | да | Идентификатор проекта |
| scenario_id | str | да | Ссылка на сценарий, для которого считалась симуляция |
| duration_s | float | да | Общая длительность симуляции, с |
| frames | list[TimelineFrame] | да | Precomputed-кадры движения роботов |
| kpi | SimulationKPI | да | Сводные показатели по итогам симуляции |
