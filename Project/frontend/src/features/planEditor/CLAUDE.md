# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this module.

## What this is

`features/planEditor` is the 2D plan editor (React + Konva) of the platform wizard — step 7
«Визуализация». It is **contract 6** (Алексей's module): it edits the `Scene` that `matching` and
`simulation` consume. Until 2026-09-25 it was a standalone Vite app `Project/frontend/editor2d/`; now
it is a module of `Project/frontend/` with no `package.json` of its own (konva, react-konva and vitest
live in the wizard's `package.json`). See `../../../../../CLAUDE.md` (repo root) for the platform brief.

Contract and data this module depends on, all outside it:
- `Project/scene.md` — field-by-field spec of `Scene` (source of truth). The TS mirror is
  `shared/types/contracts.ts`; `scene/types.ts` only re-exports it plus `SceneObject`/`SCHEMA_VERSION`.
  Nothing on top of the contract: no own fields.
- `Project/backend/contracts/dictionaries/categories.json` (generated from Артём's books by
  `Project/tools/categories_from_xlsx.py`, never hand-edited) + `form_options.json` (zone type colors,
  form lists) — merged by `shared/dictionaries` into `Categories`, which the editor gets **as a prop**.
- `Документация/Фронтенд и визард/editor-and-api.md` — how the wizard and the editor split the work;
  §4 lists the server warning codes (`SceneWarning`).

## Commands (run in `Project/frontend/`)

```
npm run dev       # the whole wizard; the editor is at /projects/<id>/wizard/topology
npm test          # vitest run — *.test.ts next to the code
npx vitest run src/features/planEditor/scene/ops.test.ts   # one file
npm run build     # tsc -b && vite build
npm run lint      # oxlint — the module is linted like the rest of the app
```

## The interface (`types.ts`, `index.ts`)

The wizard renders `<PlanEditor {...PlanEditorProps}/>` (`pages/wizard/steps/StepTopology.tsx`). Rules
that the implementation relies on — keep them:

- **No server access inside the module.** No `fetch`, no API client. Data comes in `value: Scene | null`,
  every change goes out via `onChange(scene)` as a *new full object*; the incoming `value` is never
  mutated. Saving, save status, 409/422, «план устарел» — all in the wizard.
- `value === null` → empty state explaining «Черновик из параметров» (the wizard builds it with
  `autoLayout.ts`) plus a «Пустой план» button. A draft from `autoLayout` is accepted as an ordinary
  scene and edited further.
- **Sync** (`PlanEditor.tsx`, `EditorBody`): `synced = { prop, present }`. An editor change emits
  `onChange` and records `prop = present = scene`, so the wizard echoing the same object back is a no-op.
  A *different* `value` from outside (draft rebuilt, background link set, server reload) is prepared
  (`withDefaults` → `normalize` → `canonicalizeScene`) and taken in with `ed.acceptExternal` — as an
  undoable step, and *without* emitting (preparing must not make the wizard think the user edited).
- **Dictionary only from `categories`.** `catalog/categories.ts` → `dictionaryFrom(categories)`. Scenes
  store the dictionary's main `id`; other spellings (`aliases`: transliteration, old form ids) are
  accepted on input and rewritten by `catalog/canonicalize.ts`. Free-text values typed by the user are
  stored as `custom:<text>` (the shared `TagsField` does that in dictionary mode).
- **Warnings are not computed here.** They arrive in `warnings: SceneWarning[]`; objects are outlined
  by `target_id` with the severity color, and the panel lists `message`s (click selects the target).
  There is intentionally no `validate.ts` any more — the reference checks are
  `features/projectApi/sceneChecks.ts` (the mock server), later the backend.
- **Background image:** the editor never reads the file and never puts a `data:` URL in the scene. It
  passes the `File` to `onUploadBackground(file)`; the wizard uploads it
  (`POST /api/projects/{id}/scene/background`) and sets `site.background.image_url`. The editor only
  edits position, width and opacity of an existing background.
- **Look:** colors, fonts, radii only through tokens of `shared/styles/tokens.css` (dark theme
  included). CSS for the module is in `shared/styles/components.css` (`.plan-editor*`, `.plan-panel*`,
  `.plan-palette*`, `.plan-warnings*`, `.plan-playback*`). Konva cannot read CSS variables, so the canvas
  gets token values from `editor/usePalette.ts` (re-read on `prefers-color-scheme` change and on
  `data-theme` change of `<html>`). Zone colors come from the dictionary (`zone_types[].color`).
- **Layout:** tool rail 48 px — canvas — panel 264 px; size from `width`/`height` props (no `100vh`),
  height never below 400 px (`MIN_H`; the wizard lets the page scroll instead). The panel shows the
  palette of the active placing tool (zone / point / charging / robot kinds, robots from step 4 first),
  otherwise the properties of the selection or of the plan.
- `readOnly` — select only, fields disabled (`<fieldset disabled>`), no hotkeys.
- Hotkeys listen on `window` but act only when focus is inside the editor or on `<body>` (`scope` in
  `useEditor`) — the editor is part of a bigger page.

## Architecture

### Layering: `scene/` (data) → `catalog/` (reference data) → `editor/` (UI state + rendering)

- **`scene/`** — pure data, no React/Konva, never imports `editor/` (`PROGRESS.md` item 0.2):
  `types.ts` (re-export of the contract), `ops.ts` (`addObject`/`updateObject`/`removeObject`/
  `findObject`, id generation, `withDefaults` to upgrade old schema versions, `normalize` for derived
  fields, unique names), `geometry.ts` (polygon/segment/polyline math, snapping), `colors.ts` (which
  token feeds which canvas color, `withAlpha`).
- **`catalog/`** — the `Categories` prop laid out for the editor: by kind (`equipment`, `place_zone`,
  `place_point`, `task`, `environment`) and by Артём's groups (`byGroup`); alias resolution
  (`get`/`canonical`); malformed rows are skipped with a `console.warn`, not a crash.
- **`editor/`** — `useEditor.ts` (central hook: tool, undo/redo history with `mergeKey`, draft drawing,
  snapping, drag handlers, `acceptExternal`), `SceneView.tsx` (Konva canvas), `Properties.tsx`
  (inspector built from `shared/ui` fields), `Palette.tsx`, `tools.ts` (`Tool` union, rail buttons,
  hotkeys by `KeyboardEvent.code` so they work in the Russian layout), `usePalette.ts`, `useImage.ts`,
  `grid.ts`, `useSize.ts`.
- **`playback/`** — `PlaybackView` plays a `SimulationTimeline` (contract 7) over the plan. Not wired
  into the wizard yet (the «3D» tab of step 7 is the place for it).

**Walls** (`Scene.walls`) are wired into the same generic machinery as zones/routes — editing
(`moveVertex`/`insertVertex`/`deleteVertex`), naming and shared-vertex snapping go through the
`ShapeKind` union (`"zone" | "route" | "wall"`). A new object kind should extend `ShapeKind`/`LISTS`/
`PREFIX` centrally rather than special-case it.

### State flow

All scene mutations go through `useEditor`'s `setScene(change, mergeKey)` → undo/redo history.
Consecutive edits with the same `mergeKey` (typing into one field) collapse into one undo step. Every
result passes through `normalize()`, which recomputes `zone_id` of points, coordinates of route vertices
bound via `ref`, robot start positions. `PlanEditor.tsx` wires props ↔ `useEditor` (see Sync above).

### Scene contract details worth knowing

- Meters, `y_down`, angles in degrees clockwise from +X (matches Konva, deliberately).
- Polygons are open, min 3 vertices for zones, 2 for routes/walls.
- `id` is unique across the whole scene and referenced by `zone_id`, route `ref`, `start_point_id`,
  `home_charging_point_id` and by the simulation timeline.
- `RoutePoint.ref` is always present: `null` when the vertex is free (`normalize` guarantees it).
- Route vertices sharing exact coordinates are graph-connected without an explicit edge — keep shared
  free vertices in exact sync (known gap: while *dragging* only the dragged route follows the cursor;
  the neighbor catches up on drop — `PROGRESS.md` 1.3).
- Scenes without `walls` (schema 1.0/1.1) open as a scene without walls (`withDefaults`).
- A change to the contract goes to `Project/scene.md` first, then `shared/types/contracts.ts` and
  `backend/contracts/topology.py`/`.md` — never only here.

## Working convention (`PROGRESS.md`)

One item at a time: **reproduce → fix → verify (test or browser) → record in `PROGRESS.md` → next.**
Notes there are in Russian and describe concrete repro/verification steps.

Gotcha for AI editing tools: an editing tool once turned `\uXXXX` escape *text* into literal control
bytes inside a source file. If a regex ever needs control-character ranges, write the escapes
explicitly and verify at byte level (`grep -P '[\x00-\x08\x0e-\x1f]'` or a Python byte scan).

Windows + Vite: a second fast write to the same file can be missed by the dev server — touch the file
again if the browser shows a stale version.
