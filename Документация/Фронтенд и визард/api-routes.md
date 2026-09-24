# API-маршруты между бэком и фронтом

Версия 1.0 (зафиксировано 2026-09-23) — **список URL закрыт, дальше не меняется.**
Опирается на карту экранов `architecture/pages.md`, 8-шаговый визард и контракты
`Project/backend/contracts/*.md`. При появлении нового контракта/экрана — новый
раздел ниже, существующие пути не переименовывать.

Владелец интеграции: Владимиров (backend-glue + API-слой фронта). Алексей
(editor2d) не вызывает эти URL напрямую — получает/отдаёт данные как TS-классы,
которые Владимиров прокидывает через `/scene` и `/simulation` (см.
[[project-team-lct]] в памяти проекта, решение от 2026-09-23).

Префикс всех путей — `/api`. Идентификатор проекта — `{id}`.

---

## 1. Публичная зона

| Метод + URL | Контракт | Назначение |
|---|---|---|
| `GET /api/catalog` | CatalogItem (1) | список решений, фильтры: тип, отрасль, грузоподъёмность, навигация, доступность |
| `GET /api/catalog/{item_id}` | CatalogItem | карточка решения |
| `POST /api/auth/register` | — | регистрация |
| `POST /api/auth/login` | — | вход |
| `POST /api/auth/logout` | — | выход |
| `POST /api/auth/forgot-password` | — | восстановление пароля |
| `GET /api/me` | — | текущий пользователь/роль |
| `POST /api/demo/calculate` | ProjectInput → MatchResult/EconomicsResult | гостевой расчёт без сохранения (шаги 1–5 демо) |
| `POST /api/demo/promote` | → ProjectRecord | перенос демо-черновика в новый проект после регистрации/входа |

## 2. Проекты и версии

| Метод + URL | Контракт | Назначение |
|---|---|---|
| `GET /api/projects` | ProjectRecord[] (9) | список проектов пользователя |
| `POST /api/projects` | ProjectRecord | создать (название + `object_type`) |
| `GET /api/projects/{id}` | ProjectRecord | обзор/хаб проекта |
| `PATCH /api/projects/{id}` | — | переименовать/архивировать |
| `DELETE /api/projects/{id}` | — | удалить проект и файлы |
| `GET /api/projects/{id}/versions` | ProjectVersion[] | история версий |
| `GET /api/projects/{id}/versions/{v}` | ProjectVersion | снапшот, только чтение |
| `POST /api/projects/{id}/versions/{v}/promote` | ProjectVersion | «сделать текущей» (копией) |

## 3. Визард — шаги 1–2 (object, params)

| Метод + URL | Контракт |
|---|---|
| `PUT /api/projects/{id}/input` | ProjectInput (4) — upsert черновика, сохраняется на каждом шаге |
| `GET /api/projects/{id}/input` | ProjectInput — текущий черновик |

## 4. Шаг 3–4 (matching, comparison)

| Метод + URL | Контракт |
|---|---|
| `POST /api/projects/{id}/matching` | запуск подбора → MatchResult (5) |
| `GET /api/projects/{id}/matching` | последний MatchResult |
| `PATCH /api/projects/{id}/matching` | ручные исключения/добавления (`manual_additions`) |
| `PUT /api/projects/{id}/equipment` | `selected_equipment[]` — состав и количество после сравнения |

## 5. Шаг 5–6 (economics, scenarios)

| Метод + URL | Контракт |
|---|---|
| `POST /api/projects/{id}/scenarios` | ScenarioInput → EconomicsResult (8), ≤10с по НФТ |
| `GET /api/projects/{id}/scenarios` | EconomicsResult[] — таблица сравнения (мин. 3 сценария) |
| `GET /api/projects/{id}/scenarios/{scenario_id}` | один результат |
| `PATCH /api/projects/{id}/scenarios/{scenario_id}` | правка допущений сценария |
| `DELETE /api/projects/{id}/scenarios/{scenario_id}` | удаление сценария |

## 6. Шаг 7 (topology/визуализация)

| Метод + URL | Контракт |
|---|---|
| `PUT /api/projects/{id}/scene` | Scene (6) — вызывает Владимиров, Алексей отдаёт только TS-объект |
| `GET /api/projects/{id}/scene` | Scene |
| `POST /api/projects/{id}/scene/background` *(добавлено 2026-09-24)* | multipart-загрузка файла подложки (`Site.background`) → `{ image_url }`. Отдельно от `PUT /scene`, потому что сам скан может весить мегабайты — гонять его вместе с остальной сценой не нужно. Перед сохранением `Scene` API-слой обязан подменить `data:` URL из редактора на `image_url`, полученный отсюда — в сохранённых проектах `Scene.site.background.image_url` всегда обычная ссылка, не `data:` (см. `scene.md`, раздел Background) |
| `POST /api/projects/{id}/simulation` | запуск расчёта → `{job_id}` (асинхронно, до 60с по НФТ 4.3.3) |
| `GET /api/projects/{id}/simulation/{job_id}` | статус job (`pending/running/done/error`) |
| `GET /api/projects/{id}/simulation/{job_id}/timeline` | готовый SimulationTimeline (7) для playback |

## 7. Шаг 8 + дашборд + экспорт

| Метод + URL | Контракт |
|---|---|
| `GET /api/projects/{id}/dashboard` | EconomicsResult[] — сводка для итогового экрана |
| `POST /api/projects/{id}/export/pdf` | ProjectVersion → файл отчёта |
| `POST /api/projects/{id}/export/excel` | ProjectVersion → таблицы |

## 8. Админ-зона

| Метод + URL | Контракт |
|---|---|
| `GET /api/admin/summary` | агрегаты (кол-во позиций, `unverified`, правил, пользователей) |
| `GET /api/admin/catalog`, `POST /api/admin/catalog` | CatalogItem — список/создание |
| `GET /api/admin/catalog/{id}`, `PUT /api/admin/catalog/{id}`, `DELETE /api/admin/catalog/{id}` | CatalogItem — карточка |
| `POST /api/admin/catalog/import` | импорт CSV/Excel |
| `GET /api/admin/catalog/export` | экспорт |
| `GET /api/admin/rules`, `POST /api/admin/rules` | CompatibilityRule (2) — список/создание |
| `PUT /api/admin/rules/{id}`, `DELETE /api/admin/rules/{id}` | CompatibilityRule — правка/удаление |
| `POST /api/admin/rules/{id}/test` | проверка правила на тестовой паре оборудование/объект |
| `GET /api/admin/dictionaries`, `PUT /api/admin/dictionaries` | справочники (типы, процессы, зоны, режимы) |
| `GET /api/admin/assumptions`, `PUT /api/admin/assumptions` | дефолты EconInput (тариф, ставка, резерв CAPEX, горизонт) |
| `GET /api/admin/users`, `PATCH /api/admin/users/{id}` | роли, блокировка |

---

## 9. Замечания по НФТ и правилам

- Симуляция (и, возможно, matching при большом каталоге) — кандидаты на async
  job-паттерн (`POST` → `job_id` → `GET .../{job_id}` polling); остальное —
  синхронный запрос-ответ.
- `PUT /scene` и `PUT /input` — идемпотентный upsert в один и тот же
  `ProjectVersion` (решение из `object-data-api.md` §4), а не отдельные сущности.
- Изоляция по `owner_user_id`: чужой `{id}` на любом `/api/projects/{id}/*`
  отдаёт `404`, не `403` (см. `pages.md` §1) — не раскрываем факт существования
  чужого проекта.

## 10. Открытые вопросы

1. Нужна ли отдельная ручка `POST /api/projects/{id}/draft-from-demo`, или это
   то же самое, что `POST /api/demo/promote` — решить с Владимировым
   (см. `pages.md` §7.1).
