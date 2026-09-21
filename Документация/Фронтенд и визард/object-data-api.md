# Какие данные нужны бэкенду от «данных объекта» — бриф для Алексея и Владимирова

Контекст: перед тем как проектировать API для данных объекта, свёл, что бэкенду реально
нужно для трёх расчётов (подбор, экономика, симуляция) и в каких контрактах это уже
описано. Короткий вывод: **экономика Александры (19.09) уже на 100% покрыта существующими
контрактами** — это не ваша зона в этой задаче. Ваша зона — объединить `ProjectInput`
(Владимиров, шаг 2 визарда) и `Scene` (Алексей, редактор, шаг 7) в один запрос к бэкенду.

## 1. Что уже есть от Владимирова — `ProjectInput` (контракт 4)

Полностью описан: `Project/backend/contracts/project_input.py` / `project_input.md`.
Discriminated union по `object_type`, три готовых класса параметров:

- **Склад** (`WarehouseParams`): `area_sqm`, `working_zones`, `operating_mode` (строка,
  напр. "24/7"), `inbound/internal/outbound_ops_per_day`, `storage_type`, `sku_count`,
  `unit_load_weight_kg`, `unit_load_dimensions_mm`, `staff_count`, `staff_cost_per_month`,
  `current_throughput_per_hour`, `route_length_m`, `available_area_sqm`, `layout_constraints`.
- **Аэропорт** (`AirportParams`): `operation_zone`, `operating_mode`, `passenger_flow_per_day`,
  `cargo_flow_tons_per_day`, `ops_count_per_day`, `peak_load_per_hour`, `route_length_m`,
  `unit_weight_kg`, `unit_dimensions_mm`, `staff_count`, `staff_cost_per_month`,
  `safety_requirements`, `zone_access`.
- **Мед. учреждение** (`MedicalParams`): `facility_type`, `area_sqm`, `floors_count`,
  `operating_mode`, `cargo_volume_per_day` (по категориям), `routes_and_elevators`,
  `sanitary_requirements`, `staff_count`, `staff_cost_per_month`, `access_restrictions`.

Это форма шага 2 визарда «Параметры объекта» — она уже спроектирована, менять не нужно
(если только не найдёте в ней дыру по факту вёрстки формы).

## 2. Что уже есть от Алексея — `Scene` (контракт 6)

Полностью описан: `Project/scene.md` (v1.2, source of truth) + pydantic-зеркало
`Project/backend/contracts/topology.py` (синхронизировано 2026-09-22, включая `walls`).
Коротко: `site` (габариты/контур/подложка), `walls` (стены-препятствия), `zones`,
`operation_points`, `charging_points`, `routes`, `robots` — все с `id`, координаты в метрах,
`y_down`. Зоны и точки несут `categories` — id из справочника Артёма
(`Книга1.xlsx` → `editor2d/src/catalog/categories.json`), по ним matching подбирает
оборудование.

Это данные шага 7 визарда «Визуализация» — собираются позже, чем шаг 2, отдельным
действием пользователя (рисует план в редакторе).

## 3. Экономика Александры (19.09) — уже покрыта, это НЕ часть вашей задачи

Её список полей 1:1 совпадает с уже существующими контрактами — ничего придумывать не
нужно, и, что важно, **эти поля не входят в форму «параметры объекта»** — это отдельный
шаг 5 визарда «Экономика», данные вводятся позже и по другому контракту.

**Группа (а) — из характеристик оборудования** — это поля `EconInput` (контракт 3,
`econ_io.py`), их считает `econWrapper` (Стас) агрегацией по выбранному оборудованию
(`equipment_cost_total`, `software_cost_total`, `maintenance_cost_per_year`,
`energy_cost_per_year` — из `CatalogItem.economics`/`technical`; `infrastructure/
integration/commissioning/training_cost_total` — пока как доли от `equipment_cost_total`,
задокументированное допущение, т.к. Артём такие суммы отдельными полями не отдаёт).
Публику это не касается вообще.

**Группа (б) — вводит пользователь** — 1:1 совпадает с уже существующими полями
`ScenarioInput` (контракт 8, `economics.py`), с ровно теми дефолтами, что предложила
Александра:

| Поле Александры | Поле в `ScenarioInput` | Дефолт |
|---|---|---|
| staff_count | `staff_count` | обязательное |
| staff_salary_per_month | `staff_salary_per_month` | обязательное |
| staff_tax_rate | `staff_tax_rate` | `0.30` |
| operating_hours_per_year | `operating_hours_per_year` | обязательное |
| load_factor | `load_factor` | обязательное, 0..1 |
| financing_type | `financing_type` | `own_funds` |
| financing_rate | `financing_rate` | `0.0` |
| horizon_years | `horizon_years` | `5` (минимум 5 по ТЗ) |
| discount_rate | `discount_rate` | `0.10` |

**Группа (в) — можно вывести из плана объекта, а можно вручную** — `operating_hours_per_year`
и `load_factor` из той же таблицы. Их «умные дефолты» по `object_type` (её пример: Аэропорт
→ 8760 ч/год) — это логика фронта на шаге 5 (предзаполнить поле, пользователь может
поменять), а не новое поле в контракте. Обсудите с Александрой набор дефолтов по типам
объекта отдельно — это не блокирует вашу задачу.

## 4. Ваша задача: одна форма API для данных объекта

Рекомендация вместо изобретения нового формата — использовать уже существующую форму
снапшота проекта: **`ProjectVersion`** (контракт 9, `records.py`) — у неё уже есть ровно
нужная пара полей рядом:

```python
class ProjectVersion(BaseModel):
    version: int
    created_at: datetime
    project_input: ProjectInput       # ваш шаг 2, Владимиров
    scene: Optional[Scene] = None     # ваш шаг 7, Алексей
    match_result: Optional[MatchResult] = None   # заполнится позже, не ваша забота сейчас
    scenarios: list[EconomicsResult] = []          # заполнится позже, не ваша забота сейчас
```

Т.е. «одна API» = один эндпоинт, создающий/обновляющий `ProjectVersion`, куда `project_input`
приходит сразу на шаге 2, а `scene` докладывается на шаге 7 (тем же проектом, тем же
`version` — `scene` не обязателен при создании, `Optional`). Так не будет путаницы между
двумя независимыми API для двух половин одной формы.

### Открытые вопросы — обсудите вдвоём и зафиксируйте решение (мне не нужно ждать до четверга — можно прямо в чате команды)

1. **`ProjectInput.staff_cost_per_month` vs `ScenarioInput.staff_salary_per_month`** — это
   одно и то же (нынешний персонал) или разные по смыслу поля (baseline-персонал на шаге 2
   против персонала в what-if-сценарии на шаге 5, может отличаться после роботизации)?
   Зафиксируйте понимание — если это одно и то же, стоит унифицировать имя в одном из
   контрактов.
2. **`operating_mode` (строка, ProjectInput) vs `operating_hours_per_year` (число,
   ScenarioInput)** — на шаге 5 нужно предзаполнять число из строки шага 2 (напр. "24/7" →
   8760). Логика соответствия строка→число — на вашей стороне (фронт), не бэкенда.
3. **Справочник категорий** — Scene использует `categories` из `editor2d/src/catalog/
   categories.json` (сгенерирован из `Книга1.xlsx`). Если форма шага 2 (Владимиров) тоже
   где-то ссылается на типы/категории — сверьте, что это один и тот же справочник, а не
   два независимых списка с похожими названиями.
4. **Формат ошибок/валидации** для единого эндпоинта `ProjectVersion` — что возвращать,
   если `project_input` валиден, а `scene` ещё не пришла (нормальный статус «черновик») —
   зафиксируйте в API-спеке, чтобы не гадать при интеграции.

## 5. Для справки — что нужно matching и симуляции (не блокирует вашу задачу)

- **Подбор** (контракты 2/5): `ProjectInput.params` (объёмы операций) + `Scene.zones`/
  `*_points.categories` — уже всё есть, ничего нового.
- **Симуляция** (контракт 7, `Документация/Подбор и симуляция/simulation_design.md` §0):
  весь `Scene` (маршруты, точки, стены, роботы) + `ProjectInput.params` (объёмы,
  `operating_mode`) + позже `MatchResult.selected_equipment` — тоже уже всё есть, ничего
  нового от вас не требуется сверх того, что вы и так собираете на шагах 2 и 7.
