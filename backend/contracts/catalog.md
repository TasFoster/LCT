# catalog.py — контракт 1: CatalogItem

Граница: **Артём → Стас** (catalog/matching). Обязательные группы полей — из
раздела «Каталог решений» в CLAUDE.md.

## Identification
| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| manufacturer | str | да | Производитель |
| product_name | str | да | Наименование продукта |
| solution_type | str | да | Тип решения из справочника: AMR, FMR, робот-штабелер, робот-тягач, робот-уборщик, беспилотный погрузчик, AutoStore и т.п. |
| purpose | str | да | Назначение / процесс, под который решение подобрано |
| country | str | да | Страна производителя |
| availability_status | AvailabilityStatus | да | Статус доступности (см. enums.md) |

## TechnicalSpecs
| Поле | Тип | По умолчанию | Описание |
|---|---|---|---|
| payload_kg | float \| null | null | Грузоподъёмность, кг |
| dimensions_mm | str \| null | null | Габариты Д×Ш×В, мм |
| speed_mps | float \| null | null | Максимальная скорость, м/с |
| throughput_per_hour | float \| null | null | Производительность, операций/час |
| autonomy_hours | float \| null | null | Автономность работы от заряда, ч |
| positioning_accuracy_mm | float \| null | null | Точность позиционирования, мм |
| navigation_type | NavigationType \| null | null | Тип навигации |
| operating_conditions | str \| null | null | Температура/влажность/пыль и т.п. |

## Infrastructure
| Поле | Тип | По умолчанию | Описание |
|---|---|---|---|
| aisle_width_mm | float \| null | null | Минимальная ширина прохода, мм |
| charging_type | str \| null | null | Тип зарядки |
| connectivity | str \| null | null | Требования к связи (Wi-Fi, 5G и т.п.) |
| integration_notes | str \| null | null | Заметки по интеграции |
| service_model | str \| null | null | Модель сервисного обслуживания |

## EconomicsInfo
| Поле | Тип | По умолчанию | Описание |
|---|---|---|---|
| equipment_cost | float \| null | null | Ориентировочная стоимость оборудования, ₽, с НДС |
| software_cost | float \| null | null | Стоимость ПО/лицензий, ₽ |
| implementation_cost | float \| null | null | Стоимость внедрения/интеграции, ₽ |
| maintenance_cost_per_year | float \| null | null | Стоимость обслуживания, ₽/год |
| acquisition_model | AcquisitionModel | `purchase` | Модель приобретения |
| service_life_years | float \| null | null | Срок службы, лет |

## Applicability
| Поле | Тип | По умолчанию | Описание |
|---|---|---|---|
| supported_object_types | list[str] | [] | Отрасли/типы объектов, для которых применимо |
| supported_processes | list[str] | [] | Поддерживаемые процессы |
| limitations | list[str] | [] | Ограничения применения |
| case_studies | list[str] | [] | Ссылки/описания внедрений |

## DataQuality
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| source | str | да | Источник данных: каталог оргов, сайт производителя и т.п. |
| source_url | str \| null | null | Ссылка на источник |
| last_updated | date | да | Дата актуализации данных |
| confidence | str | `"unverified"` | `verified` / `partial` / `unverified` |

## CatalogItem (корневая модель)
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| id | str | да | Уникальный идентификатор позиции каталога |
| identification | Identification | да | см. выше |
| technical | TechnicalSpecs | да | см. выше |
| infrastructure | Infrastructure | да | см. выше |
| economics | EconomicsInfo | да | см. выше |
| applicability | Applicability | да | см. выше |
| data_quality | DataQuality | да | см. выше |
| tags | list[str] | [] | Теги для фильтрации в matching и topology |
| attributes | dict[str, str\|float\|int\|bool] | {} | Доп. характеристики без изменения схемы — расширяемость каталога |
