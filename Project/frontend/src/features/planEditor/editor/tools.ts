import type { Point, ZoneType } from "../scene/types";

export type Tool =
  | { type: "select" }
  | { type: "zone"; zoneType: ZoneType; category: string | null }
  | { type: "route" }
  | { type: "wall" }
  | { type: "point"; pointKind: "operation" | "charging"; category: string | null }
  /** catalogItemId и label — если робот взят из состава оборудования (шаг 4 визарда) */
  | { type: "robot"; category: string; catalogItemId?: string | null; label?: string };

export const SELECT_TOOL: Tool = { type: "select" };

/** Объекты-ломаные с ручками вершин: зона (замкнута), маршрут и стена (открыты). */
export type ShapeKind = "zone" | "route" | "wall";

/** Базовые инструменты рейки, их значки и горячие клавиши. Робот — отдельно: ему нужен вид техники. */
export const BASE_TOOLS: { label: string; hotkey: string; glyph: string; tool: Tool }[] = [
  { label: "Выбор", hotkey: "V", glyph: "↖", tool: SELECT_TOOL },
  { label: "Стена", hotkey: "W", glyph: "▭", tool: { type: "wall" } },
  { label: "Зона", hotkey: "Z", glyph: "⬚", tool: { type: "zone", zoneType: "operation", category: null } },
  { label: "Маршрут", hotkey: "R", glyph: "⤳", tool: { type: "route" } },
  { label: "Точка операции", hotkey: "P", glyph: "◎", tool: { type: "point", pointKind: "operation", category: null } },
  { label: "Зарядка", hotkey: "C", glyph: "ϟ", tool: { type: "point", pointKind: "charging", category: null } },
];

// ключ — физическая клавиша (KeyboardEvent.code), чтобы работало и в русской раскладке
export const HOTKEYS: Record<string, Tool> = Object.fromEntries(BASE_TOOLS.map((b) => [`Key${b.hotkey}`, b.tool]));

/** Куда «прилип» курсор. */
export interface Snap {
  p: Point;
  ref?: string; // id ключевой точки, если прилипли к ней
  closes?: boolean; // курсор на первой вершине зоны — клик замкнёт её
}

/** Ключ для подсветки активной кнопки. */
export function toolKey(t: Tool): string {
  switch (t.type) {
    case "zone":
      return `zone:${t.category ?? t.zoneType}`;
    case "point":
      return `point:${t.category ?? t.pointKind}`;
    case "robot":
      return `robot:${t.catalogItemId ?? t.category}`;
    default:
      return t.type;
  }
}

export const TOOL_HINTS: Record<Tool["type"], string> = {
  select: "Клик — выбрать, перетаскивание точки или робота — переместить, Delete — удалить",
  zone: "Клик — вершина, клик по первой вершине, двойной клик или Enter — замкнуть зону, Backspace — убрать вершину, Esc — отмена",
  route: "Клик — вершина (прилипает к точкам), двойной клик или Enter — закончить, Esc — отмена",
  wall: "Клик — вершина стены (прилипает к вершинам других стен и углам плана), двойной клик или Enter — закончить, Esc — отмена",
  point: "Клик — поставить точку",
  robot: "Клик — поставить робота (на точке он к ней привяжется), Esc — выйти из режима",
};

const SHAPE_HINT =
  "Тяните белую ручку — перенести вершину, полупрозрачную — добавить вершину (клик по ней — в середину отрезка), " +
  "двойной клик по вершине — удалить";

/** Подсказка внизу холста: для выбранной зоны или маршрута — как править форму. */
export function hintFor(tool: Tool, selectedKind: string | null): string {
  if (tool.type === "select" && selectedKind === "zone") return `${SHAPE_HINT}; зону можно перетащить целиком`;
  if (tool.type === "select" && selectedKind === "route") return `${SHAPE_HINT}; закрашенная вершина привязана к точке`;
  if (tool.type === "select" && selectedKind === "wall") return `${SHAPE_HINT}; общая вершина стен двигается у всех стен сразу`;
  return TOOL_HINTS[tool.type];
}
