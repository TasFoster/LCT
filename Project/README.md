# ЛЦТ — платформа подбора роботов: визард и редактор плана

## Запуск

**Windows:** двойной щелчок по `Запустить редактор.bat` — запустится визард платформы, и в
браузере откроется шаг 7 «Визуализация» демо-проекта с редактором плана
(адрес http://127.0.0.1:5173). Чтобы остановить, закройте чёрное окно.

Нужен только [Node.js](https://nodejs.org) версии 20 или новее. При первом запуске лаунчер сам
поставит зависимости (`frontend/node_modules`), это около минуты.

**macOS / Linux:**

```bash
cd frontend
npm install
npm run dev
```

## Что здесь

| Путь | Что это |
|---|---|
| `frontend/` | визард и все экраны платформы (React + Vite) |
| `frontend/src/features/planEditor/` | редактор плана (react-konva) — шаг 7 визарда; журнал работ — `PROGRESS.md` там же |
| `scene.md`, `scene.example.json` | контракт сцены (что отдаёт редактор) и пример |
| `backend/contracts/` | контракты данных между частями платформы |
| `tools/categories_from_xlsx.py`, `Книга1.xlsx`, `книга2.xlsx` | справочник категорий: таблицы Артёма → `backend/contracts/dictionaries/categories.json` |

Проверки — в папке `frontend`: `npm test` (автотесты), `npm run build` (сборка), `npm run lint` (линтер).
