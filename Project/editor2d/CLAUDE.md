# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`editor2d` is the 2D scene editor (React + Konva) for the larger LCT hackathon platform (see
`../../CLAUDE.md` two levels up, at the repo root, for the full platform brief — this module lives at
`Project/editor2d/`). It is **contract 6** in that platform: Алексей's module, producing the `Scene`
JSON that `matching` and `simulation` consume. This directory is a standalone Vite app; the repo root
is a git repository, this directory is not its own repo.

The contract this app produces is documented outside this directory:
- `../scene.md` — field-by-field spec of the `Scene` JSON (source of truth; read before changing `src/scene/types.ts`).
- `../scene.example.json` — full example scene, loaded by `App.tsx` as the default/demo scene.
- `../архив/topology.md` / `../архив/topology.py` — superseded draft contract (pre-dates `scene.md`,
  archived, not pydantic); `scene.md` has a changelog section against it.
- `../tools/categories_from_xlsx.py` + `../Книга1.xlsx` (+ `../../артём-стас.ods` as an optional third
  argument, the same table split into sections — it fills each category's `group`, which the palette and
  the robot-kind dropdown use to split the 39 equipment kinds) — generates `src/catalog/categories.json`, the
  equipment/zone/task category dictionary. Regenerate the script's output, don't hand-edit the JSON.

`vite.config.ts` sets `server.fs.allow: [".."]` specifically so the dev server can read `scene.example.json`
one directory up.

There's also a non-dev quick-start path: `../README.md` + `../Запустить редактор.bat` — a Windows
launcher for teammates without a dev setup (checks Node.js, `npm install`s if `node_modules` is
missing, opens the browser). It expects `editor2d/` as its sibling — don't move this directory without
updating that `.bat`'s `cd /d "%~dp0editor2d"` line.

## Commands

```
npm run dev       # Vite dev server on 127.0.0.1:5173 (strict port)
npm run build     # tsc --noEmit, then vite build — build fails on type errors
npm run preview   # preview a production build
npm test          # vitest run (all *.test.ts files next to the code they test)
npx vitest run src/scene/ops.test.ts   # run a single test file
npx vitest        # watch mode
```

There is no linter/formatter configured (no ESLint/Prettier config in this directory).

## Working convention (see `PROGRESS.md`)

This repo is developed one item at a time: **reproduce the problem → fix it → verify it (in the
browser or via a test) → record it in `PROGRESS.md` → move to the next item.** `PROGRESS.md` is a
running log of what was done and how each fix was verified — read the tail of it to see current state
before starting new work, and follow the same pattern (small verified steps, written down) when asked
to continue work here. Verification notes there are in Russian and describe concrete repro steps, not
just "tested it".

Windows/Vite note called out in `PROGRESS.md`: a second fast write to the same file can be skipped by
Vite's dev server — if a browser check doesn't reflect a just-made edit, touch the file again rather
than trusting a stale page.

**Gotcha for AI editing tools specifically** (bit this codebase once, see `PROGRESS.md` "Очередь 3"):
an editing tool rewriting the `sceneFileName` regex in `scene/ops.ts` turned `\uXXXX`-style escape
*text* into literal control bytes (`\x00`–`\x1f`) inside the source file — git diffed fine but the
bytes broke `grep`/comparison tools. If a regex needs control-character ranges, write them as explicit
escape sequences in the string literal, then verify with a byte-level check (e.g. `grep -P '[\x00-\x1f]'`
or `chr()` round-trip in Python) — don't trust that the editor rendered what you intended.

## Architecture

### Layering: `scene/` (data) → `catalog/` (reference data) → `editor/` (UI state + rendering)

- **`src/scene/`** is the pure data layer and has no dependency on `editor/` or React/Konva:
  - `types.ts` — the `Scene` TypeScript types mirroring `scene.md` (zones, routes, operation/charging
    points, robots, **walls**), plus `SCHEMA_VERSION`.
  - `ops.ts` — pure functions over `Scene` (`addObject`/`updateObject`/`removeObject`/`findObject`,
    id generation, `withDefaults` for upgrading old-schema JSON on open, `normalize` for recomputing
    derived fields, name uniqueness, file naming).
  - `geometry.ts` — polygon/segment/polyline math (intersection, point-in-polygon, distance, snapping;
    `segmentDistance`/`distToPolyline` support wall-to-route and point-to-wall checks) used by both
    `ops.ts` (normalize) and `editor/` (drag/snap interactions).
  - `validate.ts` — `validateScene(scene, kindOf)` implementing the "Проверки" section of `scene.md`
    (includes wall rules: too few vertices, non-positive thickness, routes passing through a wall);
    takes the category-kind lookup as a function parameter specifically so `scene/` doesn't import `catalog/`.
  - `colors.ts` — rendering colors by zone/object type (only real UI concern living in `scene/`).
- **`src/catalog/`** loads and validates `categories.json` (the category dictionary) into a
  `CategoryDictionary`; malformed rows are dropped with a `console.warn`, not a crash — the dictionary
  is regenerated from an external spreadsheet and must tolerate drift.
- **`src/editor/`** holds all interactive/UI state: `useEditor.ts` is the central hook (tool state,
  undo/redo history, draft-shape drawing, snapping, drag handlers); `SceneView.tsx` is the Konva canvas;
  `Properties.tsx` is the right-side inspector/scene-settings panel; `Toolbar.tsx` is the palette;
  `tools.ts` defines the `Tool` union and hotkeys (`W` = wall tool); `persistence.ts` is localStorage
  autosave; `useImage.ts`/`imageFile.ts` handle the background-image (site plan scan) feature.

Dependency direction is a deliberate fix from `PROGRESS.md` item 0.2: `scene/` must never import from
`editor/`. Keep new code on the correct side of that line.

**Walls** (`Scene.walls`, schema v1.2) are the newest object kind: a polyline (`points`, ≥ 2 vertices)
with a `thickness` in meters, an impassable obstacle for the simulation. They're wired into the same
generic machinery as zones/routes rather than a bespoke path — editing (`moveVertex`/`insertVertex`/
`deleteVertex`), naming, and shared-vertex snapping all go through the same `ShapeKind` union
(`"zone" | "route" | "wall"`) that replaced three separate ad-hoc unions. When adding a new object kind,
follow this pattern (extend `ShapeKind`/`LISTS`/`PREFIX` centrally) rather than special-casing it.

### State flow

All scene mutations go through `useEditor`'s `setScene(change, mergeKey)`, which pushes onto an
undo/redo history stack. `mergeKey` lets consecutive edits with the same key (e.g. typing into one text
field) collapse into a single undo step — see `PROGRESS.md` item 4 for why this exists. Every mutation
result is passed through `scene/ops.ts`'s `normalize()`, which recomputes derived fields (`zone_id` for
points, coordinates of route vertices bound via `ref`, robot start positions) so the rest of the app
never has to.

`App.tsx` wires everything together: loads the initial scene (autosaved → else `scene.example.json`),
tracks a `clean` snapshot to detect unsaved (`dirty`) changes, runs `validateScene` on every render via
`useMemo`, and blocks/downloads JSON accordingly (errors block download unless force-confirmed; warnings
don't).

### Scene contract details worth knowing before editing `scene/types.ts`

- Coordinates are in meters, `y_down` (canvas convention), angles in degrees clockwise from +X — see
  `scene.md` for the full rationale (matches Konva's own conventions, deliberately).
- Polygons are open (first vertex not repeated), minimum 3 vertices for zones, 2 for routes/walls.
- `id` is unique across the *entire* scene, not just within its own list, and is referenced by other
  scene objects (`zone_id`, route `ref`, `start_point_id`, `home_charging_point_id`) and by the
  (separate) simulation timeline contract.
- Route vertices that share exact coordinates are considered graph-connected without an explicit edge
  reference — `normalize`/drag code must keep shared free vertices' coordinates in exact sync (known
  gap: while *dragging*, only the actively-dragged route follows the cursor; the shared neighbor route
  catches up on drop — see `PROGRESS.md` 1.3).
- Files without a `walls` field (schema v1.0/v1.1) are read as a scene with no walls — `withDefaults`
  backfills `walls: []` and a default `thickness`.
- Any change to `scene/types.ts` must be mirrored in `../scene.md` (the field table) and, if it affects
  the shipped example, `../scene.example.json`.
