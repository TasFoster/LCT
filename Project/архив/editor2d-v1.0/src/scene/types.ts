// Контракт 6 v1.0 — сцена, которую отдаёт редактор. Описание полей: ../../../scene.md

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

export interface RobotPlacement {
  id: string;
  name: string;
  catalog_item_id: string;
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
  zones: Zone[];
  operation_points: OperationPoint[];
  charging_points: ChargingPoint[];
  routes: Route[];
  robots: RobotPlacement[];
}

export type SceneObject =
  | { kind: "zone"; data: Zone }
  | { kind: "operation_point"; data: OperationPoint }
  | { kind: "charging_point"; data: ChargingPoint }
  | { kind: "route"; data: Route }
  | { kind: "robot"; data: RobotPlacement };
