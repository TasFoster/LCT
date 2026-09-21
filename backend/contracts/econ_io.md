# econ_io.py — контракт 3: EconInput / EconOutput

Граница: **Александра → Стас** (econWrapper). Обычные `dataclass`, без
pydantic/FastAPI — единственный файл контрактов, который стоит показывать
Александре напрямую.

Поля синхронизированы с её спекой `econ.json` (чекпоинт 18.09). Группировка
capex/staff/operations/opex/financing_and_horizon/sensitivity в её документе —
только для читаемости, в самом датаклассе поля плоские.

## EconInput
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| equipment_cost_total | float | да | CAPEX: оборудование, ₽ |
| software_cost_total | float | да | CAPEX: ПО/лицензии, ₽ |
| staff_count | int | да | Количество замещаемых сотрудников, чел. |
| staff_salary_per_month | float | да | ₽/мес на одного сотрудника (gross, до НДФЛ) |
| operating_hours_per_year | float | да | Часы работы оборудования в год |
| load_factor | float | да | Коэффициент загрузки оборудования, 0..1 |
| maintenance_cost_per_year | float | да | OPEX: обслуживание/ремонт, ₽/год |
| energy_cost_per_year | float | да | OPEX: электроэнергия, ₽/год |
| financing_type | str | да | `"own_funds"` \| `"credit"` \| `"leasing"` \| `"raas"` |
| horizon_years | float | да | Горизонт расчёта TCO, лет (≥ 5 по ТЗ) |
| infrastructure_cost_total | float | `0.0` | CAPEX: инфраструктура (стеллажи, полы, сеть), ₽ |
| integration_cost_total | float | `0.0` | CAPEX: интеграция с ERP/WMS, ₽ |
| commissioning_cost_total | float | `0.0` | CAPEX: пусконаладка/тестирование/запуск, ₽ |
| training_cost_total | float | `0.0` | CAPEX: обучение персонала, ₽ |
| reserve_ratio | float | `0.1` | Резерв в CAPEX, доля от суммы CAPEX |
| staff_tax_rate | float | `0.30` | Страховые взносы/налоги на ФОТ, доля |
| connectivity_cost_per_year | float | `0.0` | OPEX: связь/передача данных, ₽/год |
| consumables_cost_per_year | float | `0.0` | OPEX: расходные материалы, ₽/год |
| financing_rate | float | `0.0` | Ставка по кредиту/лизингу, доля годовых |
| financing_term_years | float | `0.0` | Срок кредита/лизинга, лет |
| discount_rate | float | `0.10` | Ставка дисконтирования для NPV, доля |
| sensitivity_params | list[str] | 3 параметра по умолчанию | Параметры для анализа чувствительности (минимум 3 по ТЗ) |
| sensitivity_delta_pct | float | `0.20` | Шаг изменения параметра (±20%) |

Примечание по источнику данных: `infrastructure_cost_total`/`integration_cost_total`/
`commissioning_cost_total`/`training_cost_total` не приходят из каталога отдельными
полями (`CatalogItem.economics` пока даёт `equipment`/`software`/`implementation`
одним числом) — econWrapper считает их как доли от `equipment_cost_total`
(документированное допущение, отражается в `EconOutput.assumptions_text`).

## SensitivityPoint
| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| parameter | str | да | Название варьируемого параметра |
| delta_pct | float | да | На сколько % изменён параметр |
| resulting_payback_years | float \| null | да (может быть `None`) | Получившийся срок окупаемости, лет; `None`, если эффект ≤ 0 |
| resulting_roi_pct | float | да | Получившийся ROI, % |
| resulting_annual_effect | float | да | Получившийся годовой экономический эффект, ₽ |

## EconOutput
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| capex_equipment | float | да | CAPEX: оборудование, ₽ |
| capex_infrastructure | float | да | CAPEX: инфраструктура, ₽ |
| capex_software | float | да | CAPEX: ПО, ₽ |
| capex_integration | float | да | CAPEX: интеграция, ₽ |
| capex_commissioning | float | да | CAPEX: пусконаладка, ₽ |
| capex_training | float | да | CAPEX: обучение, ₽ |
| capex_reserve | float | да | CAPEX: резерв, ₽ |
| capex_total | float | да | Итоговый CAPEX, ₽ |
| opex_annual | float | да | Итоговый годовой OPEX, ₽ |
| opex_delta_vs_baseline | float | да | Изменение OPEX относительно базового сценария, ₽/год |
| annual_effect | float | да | Чистый годовой экономический эффект, ₽ |
| payback_years | float \| null | да (может быть `None`) | Простой срок окупаемости; `None`, если годовой эффект ≤ 0 |
| roi_pct | float | да | ROI, % |
| tco_total | float | да | TCO на горизонте расчёта, ₽ |
| npv | float | да | NPV на горизонте с учётом discount_rate, ₽ — сверх минимума ТЗ |
| sensitivity | list[SensitivityPoint] | да | Минимум 3 параметра чувствительности по ТЗ |
| assumptions_text | str | да | Пояснение всех допущений/формул/логики — без чёрных ящиков |
| warnings | list[str] | [] | Напр. «эффект отрицательный», «срок окупаемости > горизонта» |
