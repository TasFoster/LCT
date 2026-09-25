# Фронтенд и визард

Зона Владимирова (визард + backend-glue). Контракты живут рядом с реализацией:

- [`../../Project/backend/contracts/project_input.py`](../../Project/backend/contracts/project_input.py) /
  [`project_input.md`](../../Project/backend/contracts/project_input.md) — `ProjectInput`, вход визарда.
- [`../../Project/backend/contracts/records.py`](../../Project/backend/contracts/records.py) /
  [`records.md`](../../Project/backend/contracts/records.md) — `ProjectRecord`/`ProjectVersion`, версионирование проекта.

Здесь же — дизайн-доки без кода:

- [`architecture/pages.md`](architecture/pages.md) — страничная архитектура: роли, карта маршрутов, 8-шаговый визард.
- [`wireframes/02-object-params.md`](wireframes/02-object-params.md), [`wireframes/dashboard-scenarios.md`](wireframes/dashboard-scenarios.md) — макеты шага 2 и итогового дашборда.
- [`object-data-api.md`](object-data-api.md) — бриф для Алексея и Владимирова (2026-09-22): что бэкенду
  нужно от данных объекта (подбор/экономика/симуляция), почему экономика Александры их не касается,
  и как собрать `ProjectInput` + `Scene` в один API поверх `ProjectVersion`.
- [`editor-and-api.md`](editor-and-api.md) — как соединяются визард шага 7, редактор плана и API (2026-09-25):
  интерфейс встраивания редактора, что уходит на сервер, предупреждения по плану, единый справочник
  и ответы на заявку Алексея от 24.09.

Сам код — [`../../Project/frontend`](../../Project/frontend), см. его `README.md`.
