import { useCallback, useEffect, useState } from "react";
import type { CategoryDictionary } from "../catalog/categories";
import { dist, snapToGrid, touchesNeighbour } from "../scene/geometry";
import { addObject, allNames, findObject, keyPointAt, newId, normalize, removeObject, resizeSite, uniqueName, updateObject, type ObjectKind } from "../scene/ops";
import type { Background, Point, RoutePoint, Scene, SceneObject } from "../scene/types";
import { HOTKEYS, SELECT_TOOL, type Snap, type Tool } from "./tools";

const GRID_STEP = 0.5; // м
const SNAP_PX = 12; // радиус прилипания на экране
const HISTORY_LIMIT = 100;

export function useEditor(initial: Scene, dict: CategoryDictionary) {
  // lastKey — ключ склейки последнего изменения (см. setScene)
  const [history, setHistory] = useState({
    past: [] as Scene[],
    present: initial,
    future: [] as Scene[],
    lastKey: null as string | null,
  });
  const scene = history.present;

  /**
   * Любое изменение сцены идёт через эту функцию и попадает в историю отмены.
   * mergeKey — подряд идущие изменения с одним ключом (печать в поле «Название») сливаются
   * в один шаг, чтобы Ctrl+Z откатывал слово целиком, а не по букве.
   */
  const setScene = (change: (s: Scene) => Scene, mergeKey?: string) =>
    setHistory((h) => {
      const next = change(h.present);
      if (next === h.present) return h;
      if (mergeKey && mergeKey === h.lastKey) return { ...h, present: next, future: [] };
      return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [], lastKey: mergeKey ?? null };
    });
  const undo = () =>
    setHistory((h) =>
      h.past.length
        ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future], lastKey: null }
        : h,
    );
  const redo = () =>
    setHistory((h) =>
      h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1), lastKey: null } : h,
    );
  const [tool, setToolState] = useState<Tool>(SELECT_TOOL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Point[]>([]);
  const [draftRefs, setDraftRefs] = useState<(string | undefined)[]>([]);
  const [hover, setHover] = useState<Snap | null>(null);

  const selected = selectedId ? findObject(scene, selectedId) : null;

  const resetDraft = () => {
    setDraft([]);
    setDraftRefs([]);
  };

  const setTool = useCallback((t: Tool) => {
    setToolState(t);
    setDraft([]);
    setDraftRefs([]);
    setHover(null); // подсказка считалась для прошлого инструмента; пересчитается при движении мыши
  }, []);

  const loadScene = (s: Scene) => {
    setHistory({ past: [], present: s, future: [], lastKey: null });
    setSelectedId(null);
    resetDraft();
  };

  /** Прилипание: к ключевой точке, для маршрута — к вершинам других маршрутов, иначе к сетке. */
  const snap = (world: Point, k: number): Snap => {
    const tol = SNAP_PX / k;
    if (tool.type === "zone" && draft.length >= 3 && dist(draft[0], world) <= tol) {
      return { p: { ...draft[0] }, closes: true };
    }
    const kp = keyPointAt(scene, world, tol);
    if (kp && (tool.type === "route" || tool.type === "robot")) return { p: { ...kp.position }, ref: kp.id };
    if (tool.type === "route") {
      const v = scene.routes.flatMap((r) => r.points).find((v) => dist(v, world) <= tol);
      if (v) return { p: { x: v.x, y: v.y } };
    }
    return { p: snapToGrid(world, GRID_STEP) };
  };

  // имя по категории — сначала без номера; общее имя («Зона», «Маршрут») — сразу с номером
  const nameFor = (category: string | null, generic: string) =>
    category ? uniqueName(dict.name(category), allNames(scene), false) : uniqueName(generic, allNames(scene), true);

  const create = (obj: SceneObject) => {
    setScene((s) => addObject(s, obj));
    setSelectedId(obj.data.id);
  };

  const minVertices = tool.type === "zone" ? 3 : 2;

  const finishDraft = () => {
    if (draft.length < minVertices) return; // не хватает вершин — продолжаем рисовать
    if (tool.type === "zone") {
      create({
        kind: "zone",
        data: {
          id: newId("zone"),
          name: nameFor(tool.category, "Зона"),
          zone_type: tool.zoneType,
          polygon: draft,
          categories: tool.category ? [tool.category] : [],
          tags: [],
        },
      });
    }
    if (tool.type === "route") {
      create({
        kind: "route",
        data: {
          id: newId("route"),
          name: nameFor(null, "Маршрут"),
          points: draft.map((p, i) => (draftRefs[i] ? { ...p, ref: draftRefs[i] } : p)),
          bidirectional: true,
          tags: [],
        },
      });
    }
    resetDraft();
  };

  const handleClick = (world: Point, k: number) => {
    const { p, ref, closes } = snap(world, k);
    if (closes) {
      finishDraft();
      return;
    }
    switch (tool.type) {
      case "select":
        setSelectedId(null);
        return;
      case "zone":
      case "route": {
        const last = draft[draft.length - 1];
        if (last && dist(last, p) < 1e-6) return; // второй клик двойного клика
        setDraft([...draft, p]);
        setDraftRefs([...draftRefs, ref]);
        return;
      }
      case "point": {
        const charging = tool.pointKind === "charging";
        const base = { name: "", position: p, zone_id: null, categories: tool.category ? [tool.category] : [], tags: [] };
        if (charging) {
          create({
            kind: "charging_point",
            data: { ...base, id: newId("charging_point"), name: nameFor(tool.category, "Зарядка"), slots: 1 },
          });
        } else {
          create({
            kind: "operation_point",
            data: {
              ...base,
              id: newId("operation_point"),
              name: nameFor(tool.category, "Точка"),
            },
          });
        }
        return;
      }
      case "robot": {
        const onCharger = ref && scene.charging_points.some((c) => c.id === ref);
        create({
          kind: "robot",
          data: {
            id: newId("robot"),
            name: uniqueName(dict.name(tool.category), allNames(scene), true),
            category: tool.category,
            catalog_item_id: null,
            start_position: p,
            start_heading_deg: 0,
            start_point_id: ref ?? null,
            home_charging_point_id: onCharger ? ref : null,
          },
        });
        return;
      }
    }
  };

  // Konva считает двойным кликом любые два быстрых клика, даже в разных местах,
  // поэтому завершаем фигуру, только если второй клик пришёлся на последнюю вершину.
  const handleDoubleClick = (world: Point, k: number) => {
    const last = draft[draft.length - 1];
    if (last && dist(last, snap(world, k).p) < 1e-6) finishDraft();
  };

  const handleHover = (world: Point | null, k: number) => setHover(world ? snap(world, k) : null);

  /** Перетаскивание точки или робота в режиме выбора. */
  const handleDrag = (kind: ObjectKind, id: string, world: Point, k: number) => {
    const obj = findObject(scene, id);
    if (!obj) return;
    if (obj.kind === "robot") {
      const kp = keyPointAt(scene, world, SNAP_PX / k);
      setScene((s) =>
        updateObject(s, {
          kind,
          data: { ...obj.data, start_position: kp ? { ...kp.position } : snapToGrid(world, GRID_STEP), start_point_id: kp?.id ?? null },
        } as SceneObject),
      );
    } else if (obj.kind === "operation_point" || obj.kind === "charging_point") {
      setScene((s) => updateObject(s, { kind, data: { ...obj.data, position: snapToGrid(world, GRID_STEP) } } as SceneObject));
    }
    setSelectedId(id);
  };

  /**
   * Куда встанет вершина маршрута: к точке (с привязкой), к вершине другого маршрута, иначе к сетке.
   * exclude — прежнее место этой же вершины, к нему не прилипаем.
   */
  const snapRouteVertex = (world: Point, k: number, exclude?: Point): RoutePoint => {
    const tol = SNAP_PX / k;
    const kp = keyPointAt(scene, world, tol);
    if (kp) return { ...kp.position, ref: kp.id };
    const other = scene.routes
      .flatMap((r) => r.points)
      .find((v) => !(exclude && dist(v, exclude) < 1e-6) && dist(v, world) <= tol);
    return other ? { x: other.x, y: other.y } : snapToGrid(world, GRID_STEP);
  };

  /** Новая вершина после вершины afterIndex (ручка-середина между вершинами). */
  const insertVertex = (kind: "zone" | "route", id: string, afterIndex: number, world: Point, k: number) => {
    const obj = findObject(scene, id);
    if (!obj) return;
    const insert = <T,>(list: T[], item: T) => [...list.slice(0, afterIndex + 1), item, ...list.slice(afterIndex + 1)];
    if (kind === "zone" && obj.kind === "zone") {
      const p = snapToGrid(world, GRID_STEP);
      if (touchesNeighbour(obj.data.polygon, p, { insertAfter: afterIndex }, true)) return;
      const polygon = insert(obj.data.polygon, p);
      setScene((s) => updateObject(s, { kind: "zone", data: { ...obj.data, polygon } }));
    }
    if (kind === "route" && obj.kind === "route") {
      const p = snapRouteVertex(world, k);
      if (touchesNeighbour(obj.data.points, p, { insertAfter: afterIndex }, false)) return;
      const points = insert(obj.data.points, p);
      setScene((s) => updateObject(s, { kind: "route", data: { ...obj.data, points } }));
    }
  };

  /**
   * Удаление вершины (двойной клик по ручке). Не ниже минимума (зона — 3, маршрут — 2) и не так,
   * чтобы совпавшие соседи встали подряд (A B A → A A).
   */
  const deleteVertex = (kind: "zone" | "route", id: string, index: number) => {
    const obj = findObject(scene, id);
    if (!obj) return;
    const closed = kind === "zone";
    const pts: Point[] = obj.kind === "zone" ? obj.data.polygon : obj.kind === "route" ? obj.data.points : [];
    if (pts.length <= (closed ? 3 : 2)) return;
    const rest = pts.filter((_, i) => i !== index);
    const prev = closed ? (index - 1 + pts.length) % pts.length : index - 1;
    const next = closed ? (index + 1) % pts.length : index + 1;
    if (pts[prev] && pts[next] && dist(pts[prev], pts[next]) < 1e-6) return;
    if (obj.kind === "zone") setScene((s) => updateObject(s, { kind: "zone", data: { ...obj.data, polygon: rest } }));
    if (obj.kind === "route") setScene((s) => updateObject(s, { kind: "route", data: { ...obj.data, points: rest as RoutePoint[] } }));
  };

  /** Перетаскивание вершины выбранной зоны или маршрута (ручка в режиме выбора). */
  const moveVertex = (kind: "zone" | "route", id: string, index: number, world: Point, k: number) => {
    const obj = findObject(scene, id);
    if (!obj) return;
    if (kind === "zone" && obj.kind === "zone") {
      const p = snapToGrid(world, GRID_STEP);
      if (touchesNeighbour(obj.data.polygon, p, { move: index }, true)) return;
      const polygon = obj.data.polygon.map((v, i) => (i === index ? p : v));
      setScene((s) => updateObject(s, { kind: "zone", data: { ...obj.data, polygon } }));
    }
    if (kind === "route" && obj.kind === "route") {
      const old = obj.data.points[index];
      const same = (v: Point) => dist(v, old) < 1e-6;
      const moved = snapRouteVertex(world, k, old);
      if (touchesNeighbour(obj.data.points, moved, { move: index }, false)) return;

      setScene((s) => {
        // привязанная вершина двигается одна (остальные маршруты остаются на точке);
        // свободная общая вершина связана с другими маршрутами только совпадением координат —
        // двигаем её во всех маршрутах, иначе соединение порвётся
        const routes = s.routes.map((r) => ({
          ...r,
          points: r.points.map((v, i) => {
            const isDragged = r.id === id && i === index;
            const isShared = !old.ref && !v.ref && same(v);
            return isDragged || isShared ? moved : v;
          }),
        }));
        return normalize({ ...s, routes });
      });
    }
  };

  /** Перенос зоны целиком; сдвиг кратен шагу сетки, чтобы вершины остались на сетке. */
  const moveZone = (id: string, delta: Point) => {
    const obj = findObject(scene, id);
    if (!obj || obj.kind !== "zone") return;
    const d = snapToGrid(delta, GRID_STEP);
    if (d.x === 0 && d.y === 0) return;
    const polygon = obj.data.polygon.map((v) => ({ x: v.x + d.x, y: v.y + d.y }));
    setScene((s) => updateObject(s, { kind: "zone", data: { ...obj.data, polygon } }));
  };

  const updateSelected = (obj: SceneObject, mergeKey?: string) => setScene((s) => updateObject(s, obj), mergeKey);

  /** Свойства самой сцены (название, проект). Печать в одно поле — один шаг отмены. */
  const updateSceneInfo = (fields: { name?: string; project_id?: string }, mergeKey?: string) =>
    setScene((s) => ({ ...s, ...fields }), mergeKey);

  /** Подложка плана (скан); null — убрать. */
  const setBackground = (background: Background | null, mergeKey?: string) =>
    setScene((s) => ({ ...s, site: { ...s.site, background } }), mergeKey);

  /** Габариты плана; zone_id точек пересчитываются (normalize). */
  const resizePlan = (width: number, height: number, mergeKey?: string) =>
    setScene((s) => normalize(resizeSite(s, width, height)), mergeKey);

  const deleteSelected = () => {
    if (!selected) return;
    setScene((s) => removeObject(s, selected.kind, selected.data.id));
    setSelectedId(null);
  };

  // горячие клавиши (кроме случаев, когда пользователь печатает в поле)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, select, textarea")) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.code === "KeyZ" && !e.shiftKey) {
        resetDraft();
        undo();
      } else if (mod && (e.code === "KeyY" || (e.code === "KeyZ" && e.shiftKey))) {
        resetDraft();
        redo();
      } else if (e.key === "Escape") {
        if (draft.length) resetDraft();
        else if (tool.type !== "select") setTool(SELECT_TOOL);
        else setSelectedId(null);
      } else if (e.key === "Enter") {
        finishDraft();
      } else if (e.key === "Backspace" && draft.length) {
        setDraft(draft.slice(0, -1));
        setDraftRefs(draftRefs.slice(0, -1));
      } else if (e.key === "Delete" && selected) {
        deleteSelected();
      } else if (!mod && !e.altKey && HOTKEYS[e.code]) {
        setTool(HOTKEYS[e.code]);
      } else {
        return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return {
    scene,
    loadScene,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    tool,
    setTool,
    selected,
    select: (obj: SceneObject | null) => setSelectedId(obj?.data.id ?? null),
    selectById: (id: string | null) => setSelectedId(id),
    draft,
    minVertices,
    finishDraft,
    cancelDraft: resetDraft,
    hover,
    handleClick,
    handleDoubleClick,
    handleHover,
    handleDrag,
    moveVertex,
    insertVertex,
    deleteVertex,
    moveZone,
    updateSelected,
    updateSceneInfo,
    resizePlan,
    setBackground,
    deleteSelected,
  };
}
