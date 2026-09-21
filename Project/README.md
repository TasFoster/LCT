# ЛЦТ — 2D-редактор сцены

## Запуск

**Windows:** двойной щелчок по `Запустить редактор.bat` — редактор откроется в браузере
(адрес http://127.0.0.1:5173). Чтобы остановить, закройте чёрное окно.

Нужен только [Node.js](https://nodejs.org) версии 20 или новее. Зависимости (`editor2d/node_modules`)
уже лежат в архиве и собраны под **Windows x64** — ставить ничего не нужно.

**macOS / Linux:** в папке архива `node_modules` не подойдут (в нём есть части, собранные под Windows).
Удалите `editor2d/node_modules` и выполните:

```bash
cd editor2d
npm install
npm run dev
```

## Что здесь

| Путь | Что это |
|---|---|
| `editor2d/` | редактор (React + react-konva + Vite); журнал работ — `editor2d/PROGRESS.md` |
| `scene.md`, `scene.example.json` | контракт сцены (что отдаёт редактор) и пример |
| `topology.md`, `topology.py` | исходный черновик контракта |
| `tools/categories_from_xlsx.py`, `Книга1.xlsx` | справочник категорий: таблица → `editor2d/src/catalog/categories.json` |

Проверки: `npm test` (автотесты), `npm run build` (сборка) — в папке `editor2d`.
