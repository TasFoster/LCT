import { CHARGE_COLOR, OP_COLOR, ROUTE_COLOR, ZONE_COLORS } from "../scene/colors";
import type { Point, ZoneType } from "../scene/types";

export type Tool =
  | { type: "select" }
  | { type: "zone"; zoneType: ZoneType; category: string | null }
  | { type: "route" }
  | { type: "point"; pointKind: "operation" | "charging"; category: string | null }
  | { type: "robot"; category: string };

export const SELECT_TOOL: Tool = { type: "select" };

/** Базовые инструменты (кнопки вверху панели) и их горячие клавиши. */
export const BASE_TOOLS: { label: string; hotkey: string; tool: Tool; color: string }[] = [
  { label: "Выбор", hotkey: "V", tool: SELECT_TOOL, color: "#5F5E5A" },
  { label: "Зона", hotkey: "Z", tool: { type: "zone", zoneType: "operation", category: null }, color: ZONE_COLORS.operation.stroke },
  { label: "Маршрут", hotkey: "R", tool: { type: "route" }, color: ROUTE_COLOR },
  { label: "Точка", hotkey: "P", tool: { type: "point", pointKind: "operation", category: null }, color: OP_COLOR },
  { label: "Зарядка", hotkey: "C", tool: { type: "point", pointKind: "charging", category: null }, color: CHARGE_COLOR },
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
      return `robot:${t.category}`;
    default:
      return t.type;
  }
}

export const TOOL_HINTS: Record<Tool["type"], string> = {
  select: "Клик — выбрать, перетаскивание точки или робота — переместить, Delete — удалить",
  zone: "Клик — вершина, клик по первой вершине, двойной клик или Enter — замкнуть зону, Backspace — убрать вершину, Esc — отмена",
  route: "Клик — вершина (прилипает к точкам), двойной клик или Enter — закончить, Esc — отмена",
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
  return TOOL_HINTS[tool.type];
}
