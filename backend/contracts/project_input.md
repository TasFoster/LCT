# project_input.py — контракт 4: ProjectInput

Граница: **Владимиров (визард) → Стас** (matching, simulation, econWrapper).
`params` — discriminated union по `object_type`: новый тип объекта — это
новый класс `*Params` + новое значение `ObjectType`, без изменения кода,
который читает `ProjectInput` (matching/economics работают через теги и
общие поля, а не через знание конкретного типа объекта).

## WarehouseParams (object_type = `warehouse`)
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| area_sqm | float | да | Площадь склада, м² |
| working_zones | list[str] | [] | Рабочие зоны |
| operating_mode | str | да | Режим работы, напр. `"24/7"` или `"2 смены по 12ч"` |
| inbound_ops_per_day | float | да | Входящие операции/день |
| internal_ops_per_day | float | да | Внутрискладские операции/день |
| outbound_ops_per_day | float | да | Исходящие операции/день |
| storage_type | str | да | Тип хранения |
| sku_count | int | да | Количество SKU |
| unit_load_weight_kg | float | да | Масса грузовой единицы, кг |
| unit_load_dimensions_mm | str | да | Габариты грузовой единицы, мм |
| staff_count | int | да | Численность персонала |
| staff_cost_per_month | float | да | ₽/мес на одного сотрудника |
| current_throughput_per_hour | float | да | Текущая производительность, операций/час |
| route_length_m | float | да | Протяжённость маршрутов, м |
| available_area_sqm | float \| null | null | Доступная площадь под роботизацию, м² |
| layout_constraints | list[str] | [] | Ограничения планировки |

## AirportParams (object_type = `airport`)
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| operation_zone | str | да | Перрон / терминал / багажное отделение и т.п. |
| operating_mode | str | да | Режим работы |
| passenger_flow_per_day | float \| null | null | Пассажиропоток/день |
| cargo_flow_tons_per_day | float \| null | null | Грузопоток, т/день |
| ops_count_per_day | float | да | Количество операций/день |
| peak_load_per_hour | float | да | Пиковая нагрузка, операций/час |
| route_length_m | float | да | Протяжённость маршрутов, м |
| unit_weight_kg | float | да | Масса объекта, кг |
| unit_dimensions_mm | str | да | Габариты объекта, мм |
| staff_count | int | да | Численность персонала |
| staff_cost_per_month | float | да | ₽/мес на одного сотрудника |
| safety_requirements | list[str] | [] | Требования безопасности |
| zone_access | str | да | `closed` / `open` |

## MedicalParams (object_type = `medical`)
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| facility_type | str | да | Тип учреждения |
| area_sqm | float | да | Площадь, м² |
| floors_count | int | да | Этажность |
| operating_mode | str | да | Режим работы |
| cargo_volume_per_day | dict[str, float] | {} | По категориям: грузы/бельё/питание/медикаменты/отходы |
| routes_and_elevators | list[str] | [] | Маршруты и лифты |
| sanitary_requirements | list[str] | [] | Санитарные требования |
| staff_count | int | да | Численность персонала |
| staff_cost_per_month | float | да | ₽/мес на одного сотрудника |
| access_restrictions | list[str] | [] | Ограничения доступа/безопасности |

## ProjectInput (корневая модель)
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| id | str | да | Идентификатор набора входных параметров |
| project_id | str | да | Идентификатор проекта |
| object_type | ObjectType | да | Тип объекта (дублирует `params.object_type` для быстрой фильтрации) |
| params | WarehouseParams \| AirportParams \| MedicalParams | да | Параметры объекта, выбираются по `object_type` |
| created_at | datetime | да | Момент создания версии входных данных |
| source | str | `"manual"` | `manual` / `excel_import` / `csv_import` |
