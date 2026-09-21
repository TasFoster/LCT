import type { ZoneType } from "./types";

export const ZONE_COLORS: Record<ZoneType, { fill: string; stroke: string }> = {
  storage: { fill: "rgba(29,158,117,0.18)", stroke: "#1D9E75" },
  operation: { fill: "rgba(127,119,221,0.18)", stroke: "#7F77DD" },
  charging: { fill: "rgba(99,153,34,0.20)", stroke: "#639922" },
  restricted: { fill: "rgba(226,75,74,0.18)", stroke: "#E24B4A" },
  transit: { fill: "rgba(136,135,128,0.15)", stroke: "#888780" },
};

export const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  storage: "Хранение",
  operation: "Операции",
  charging: "Зарядка",
  restricted: "Ограниченный доступ",
  transit: "Проезд / транзит",
};

export const ROUTE_COLOR = "#378ADD";
export const OP_COLOR = "#D85A30";
export const CHARGE_COLOR = "#639922";
export const ROBOT_COLOR = "#185FA5";
export const SELECT_COLOR = "#EF9F27";
export const DRAFT_COLOR = "#EF9F27";
