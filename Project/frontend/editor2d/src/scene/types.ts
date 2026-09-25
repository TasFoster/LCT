// Контракт 6 — сцена, которую отдаёт редактор. Описание полей: ../../../../scene.md

/** Версия контракта, которую пишет редактор. Старые файлы при открытии приводятся к ней. */
export const SCHEMA_VERSION = "1.2";

export interface Point {
  x: number;
  y: number;
}

export type ZoneType = "storage" | "operation" | "charging" | "restricted" | "transit";

export interface Background {
  image_url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}

export interface Site {
  width: number;
  height: number;
  boundary: Point[];
  background?: Background | null;
}

export interface Zone {
  id: string;
  name: string;
  zone_type: ZoneType;
  polygon: Point[];
  categories: string[];
  tags: string[];
}

export interface OperationPoint {
  id: string;
  name: string;
  position: Point;
  zone_id?: string | null;
  categories: string[];
  tags: string[];
}

export interface ChargingPoint extends OperationPoint {
  slots: number;
}

export interface RoutePoint extends Point {
  ref?: string | null;
}

export interface Route {
  id: string;
  name: string;
  points: RoutePoint[];
  bidirectional: boolean;
  tags: string[];
}

/** Стена — препятствие-ломаная: роботы через неё не проходят. */
export interface Wall {
  id: string;
  name: string;
  points: Point[]; // ≥ 2 вершин, ось стены
  thickness: number; // толщина, м (> 0)
  tags: string[];
}

export interface RobotPlacement {
  id: string;
  name: string;
  category: string;
  catalog_item_id: string | null;
  start_position: Point;
  start_heading_deg: number;
  start_point_id?: string | null;
  home_charging_point_id?: string | null;
}

export interface Scene {
  schema_version: string;
  id: string;
  project_id: string;
  name: string;
  updated_at: string;
  units: "m";
  coordinate_system: "y_down";
  site: Site;
  walls: Wall[];
  zones: Zone[];
  operation_points: OperationPoint[];
  charging_points: ChargingPoint[];
  routes: Route[];
  robots: RobotPlacement[];
}

export type SceneObject =
  | { kind: "zone"; data: Zone }
  | { kind: "wall"; data: Wall }
  | { kind: "operation_point"; data: OperationPoint }
  | { kind: "charging_point"; data: ChargingPoint }
  | { kind: "route"; data: Route }
  | { kind: "robot"; data: RobotPlacement };
