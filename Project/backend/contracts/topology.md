# topology.py — контракт 6: TopologyConfig / SceneData

Граница: **Алексей ↔ Владимиров**, Алексей (editor2d) **→** Стас (simulation).

## Point2D
| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| x | float | да | Координата X в системе координат сцены |
| y | float | да | Координата Y в системе координат сцены |

## Zone
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| id | str | да | Идентификатор зоны |
| name | str | да | Название зоны |
| zone_type | ZoneType | да | `storage` / `operation` / `charging` / `restricted` / `transit` |
| polygon | list[Point2D] | да | Контур зоны в координатах сцены, м |
| tags | list[str] | [] | Теги зоны (используются matching/compatibility) |

## Route
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| id | str | да | Идентификатор маршрута |
| points | list[Point2D] | да | Ломаная маршрута |
| tags | list[str] | [] | Теги маршрута |

## OperationPoint
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| id | str | да | Идентификатор точки |
| kind | str | да | `operation` / `charging` |
| position | Point2D | да | Координаты точки |
| tags | list[str] | [] | Теги точки |

## RobotPlacement
| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| id | str | да | Идентификатор размещения робота на сцене |
| catalog_item_id | str | да | Ссылка на позицию каталога (какой это робот) |
| start_position | Point2D | да | Стартовая позиция на сцене |

## TopologyConfig (корневая модель)
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| id | str | да | Идентификатор конфигурации сцены |
| project_id | str | да | Идентификатор проекта |
| scale_m_per_unit | float | `1.0` | Метров на единицу координат сцены |
| zones | list[Zone] | [] | Зоны объекта |
| routes | list[Route] | [] | Маршруты |
| operation_points | list[OperationPoint] | [] | Точки операций и зарядки |
| robots | list[RobotPlacement] | [] | Размещённые роботы |
