# Фронтенд

React 19 + TypeScript + Vite. Каркас: маршруты всех экранов, разделение
доступа по ролям и два готовых вайрфрейма. Бизнес-логики пока нет — экраны
стоят заглушками с описанием назначения и контрактов.

## Запуск

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # tsc -b && vite build
npm run lint
```

## Что уже можно посмотреть

| Адрес | Что это |
|---|---|
| `/wireframes/params` | Макет шага 2 «Параметры объекта», кадр 1366×768 |
| `/wireframes/dashboard` | Макет итогового дашборда сравнения сценариев |
| `/projects/:id/wizard/:step` | Каркас визарда со степпером на 8 шагов |

Роль переключается кнопками в шапке (заглушка вместо авторизации): гостю не
видны `/projects/*`, пользователю без прав — `/admin/*`.

## Структура

```
src/
  app/            App.tsx (маршруты), RootLayout, guards (RequireAuth / RequireAdmin)
  pages/
    public/       главная, каталог, карточка решения, демо-расчёт
    auth/         вход, регистрация, восстановление пароля
    projects/     список проектов, обзор, версии, дашборд, отчёт, профиль
    wizard/       WizardPage — один маршрут на 8 шагов
    admin/        каталог, правила совместимости, справочники, допущения, пользователи
    errors/       403, 404
    wireframes/   макеты (ObjectParamsWireframe, DashboardWireframe)
  widgets/        AppHeader
  features/       auth/session.ts (zustand, пока заглушка)
  shared/
    config/       routes.ts — все маршруты и список шагов визарда
    types/        contracts.ts — типы по contracts/*.md
    ui/           Placeholder
    styles/       globals.css
  entities/       (пусто — сюда модели домена, когда появятся)
```

## Договорённости

- Маршруты берём только из `shared/config/routes.ts`, строк с путями в
  компонентах не держим.
- Шаг визарда адресуется слагом (`/wizard/params`), не номером — порядок
  шагов можно менять без ломки ссылок.
- Типы в `shared/types/contracts.ts` повторяют `contracts/*.md`. Контракты
  черновые: при их изменении правим этот файл, а не подстраиваем компоненты.
- Интерфейс на русском; рабочее разрешение — от 1366×768.

## Зависимости

`react-router-dom` (маршрутизация), `zustand` (состояние сессии и черновика
визарда), `@tanstack/react-query` (серверные данные, когда появится API),
`react-hook-form` + `zod` (формы визарда и валидация).

## Документация

- [Карта экранов и макеты одной страницей](../site/index.html) — открыть файл в браузере
- [Страничная архитектура](../docs/architecture/pages.md)
- [Макет: параметры объекта](../docs/wireframes/02-object-params.md)
- [Макет: дашборд сценариев](../docs/wireframes/dashboard-scenarios.md)
