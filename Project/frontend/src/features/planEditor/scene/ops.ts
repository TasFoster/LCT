// Изменения сцены. Все функции чистые: принимают сцену и возвращают новую, не меняя старую.
import { dist, pointInPolygon } from "./geometry";
import { SCHEMA_VERSION, type ChargingPoint, type OperationPoint, type Point, type Scene, type SceneObject } from "./types";

export type ObjectKind = SceneObject["kind"];

const LISTS = {
  zone: "zones",
  wall: "walls",
  operation_point: "operation_points",
  charging_point: "charging_points",
  route: "routes",
  robot: "robots",
} as const satisfies Record<ObjectKind, keyof Scene>;

const PREFIX: Record<ObjectKind, string> = {
  zone: "zone",
  wall: "wall",
  operation_point: "op",
  charging_point: "chg",
  route: "route",
  robot: "robot",
};

export function newId(kind: ObjectKind): string {
  return `${PREFIX[kind]}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Прямоугольный контур плана по габаритам. */
export const siteRect = (width: number, height: number): Point[] => [
  { x: 0, y: 0 },
  { x: width, y: 0 },
  { x: width, y: height },
  { x: 0, y: height },
];

/**
 * Новые габариты плана. Прямоугольный контур (обычный случай) меняется вместе с ними;
 * особый контур, пришедший из файла, не трогаем — объекты за ним покажет проверка.
 */
export function resizeSite(s: Scene, width: number, height: number): Scene {
  const b = s.site.boundary;
  const old = siteRect(s.site.width, s.site.height);
  const isRect = b.length === 4 && b.every((p, i) => dist(p, old[i]) < 1e-9);
  return { ...s, site: { ...s.site, width, height, boundary: isRect ? siteRect(width, height) : b } };
}

/** Пустая сцена. */
export function emptyScene(width = 40, height = 25): Scene {
  return {
    schema_version: SCHEMA_VERSION,
    id: `scene-${crypto.randomUUID().slice(0, 8)}`,
    project_id: "",
    name: "Новая сцена",
    updated_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    units: "m",
    coordinate_system: "y_down",
    site: { width, height, boundary: siteRect(width, height), background: null },
    walls: [],
    zones: [],
    operation_points: [],
    charging_points: [],
    routes: [],
    robots: [],
  };
}

/** Все имена объектов сцены — чтобы новые имена не повторялись. */
export const allNames = (s: Scene): Set<string> =>
  new Set([...s.zones, ...s.walls, ...s.operation_points, ...s.charging_points, ...s.routes, ...s.robots].map((o) => o.name));

/**
 * Имя, которого ещё нет в сцене. numbered = false: сначала base без номера («Зона хранения»),
 * потом «base 2», «base 3»…; numbered = true: сразу «base 1», «base 2»… Берётся наименьший свободный номер.
 */
export function uniqueName(base: string, taken: Set<string>, numbered: boolean): string {
  if (!numbered && !taken.has(base)) return base;
  for (let n = numbered ? 1 : 2; ; n++) {
    if (!taken.has(`${base} ${n}`)) return `${base} ${n}`;
  }
}

export const keyPoints = (s: Scene): (OperationPoint | ChargingPoint)[] => [
  ...s.operation_points,
  ...s.charging_points,
];

export function findObject(s: Scene, id: string): SceneObject | null {
  for (const kind of Object.keys(LISTS) as ObjectKind[]) {
    const item = (s[LISTS[kind]] as { id: string }[]).find((o) => o.id === id);
    if (item) return { kind, data: item } as SceneObject;
  }
  return null;
}

export function addObject(s: Scene, obj: SceneObject): Scene {
  const key = LISTS[obj.kind];
  return normalize({ ...s, [key]: [...(s[key] as unknown[]), obj.data] });
}

export function updateObject(s: Scene, obj: SceneObject): Scene {
  const key = LISTS[obj.kind];
  const list = (s[key] as { id: string }[]).map((o) => (o.id === obj.data.id ? obj.data : o));
  return normalize({ ...s, [key]: list });
}

export function removeObject(s: Scene, kind: ObjectKind, id: string): Scene {
  const key = LISTS[kind];
  return normalize({ ...s, [key]: (s[key] as { id: string }[]).filter((o) => o.id !== id) });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Проверяет JSON из файла и дополняет поля, которых нет в старых версиях контракта
 * (v1.0: у зон нет categories, у роботов нет category) или которые опущены.
 * Бросает Error с понятным текстом, если это не сцена.
 */
export function withDefaults(raw: any): Scene {
  if (!raw || typeof raw !== "object") throw new Error("файл не содержит JSON-объект");
  const site = raw.site;
  if (!site || !(site.width > 0) || !(site.height > 0)) throw new Error("нет site.width / site.height");
  const list = (v: any, name: string): any[] => {
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) throw new Error(`поле ${name} должно быть списком`);
    return v;
  };
  const strings = (v: any) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
  const point = (p: any, where: string): Point => {
    if (!p || typeof p.x !== "number" || typeof p.y !== "number") throw new Error(`неверные координаты в ${where}`);
    return { x: p.x, y: p.y };
  };
  const keyPoint = (p: any) => ({
    ...p,
    name: p.name ?? p.id,
    position: point(p.position, p.id),
    zone_id: p.zone_id ?? null,
    categories: strings(p.categories),
    tags: strings(p.tags),
  });
  // контур нужен для отрисовки плана; если его нет — прямоугольник по габаритам
  const boundary = list(site.boundary, "site.boundary").map((p) => point(p, "site.boundary"));
  const rect = siteRect(site.width, site.height);

  return {
    schema_version: SCHEMA_VERSION, // недостающие поля выше дополнены — файл уже в текущей версии
    id: raw.id ?? `scene-${crypto.randomUUID().slice(0, 8)}`,
    project_id: raw.project_id ?? "",
    name: raw.name ?? "Без названия",
    updated_at: raw.updated_at ?? new Date().toISOString(),
    units: "m",
    coordinate_system: "y_down",
    site: {
      width: site.width,
      height: site.height,
      boundary: boundary.length >= 3 ? boundary : rect,
      background: site.background ?? null,
    },
    walls: list(raw.walls, "walls").map((w) => ({
      ...w,
      name: w.name ?? w.id,
      points: list(w.points, `${w.id}.points`).map((p) => point(p, w.id)),
      thickness: typeof w.thickness === "number" ? w.thickness : 0.2,
      tags: strings(w.tags),
    })),
    zones: list(raw.zones, "zones").map((z) => ({
      ...z,
      name: z.name ?? z.id,
      zone_type: z.zone_type ?? "operation",
      polygon: list(z.polygon, `${z.id}.polygon`).map((p) => point(p, z.id)),
      categories: strings(z.categories),
      tags: strings(z.tags),
    })),
    operation_points: list(raw.operation_points, "operation_points").map(keyPoint),
    charging_points: list(raw.charging_points, "charging_points").map((p) => ({ ...keyPoint(p), slots: p.slots ?? 1 })),
    routes: list(raw.routes, "routes").map((r) => ({
      ...r,
      name: r.name ?? r.id,
      points: list(r.points, `${r.id}.points`).map((p) => ({ ...point(p, r.id), ...(p.ref ? { ref: p.ref } : {}) })),
      bidirectional: r.bidirectional ?? true,
      tags: strings(r.tags),
    })),
    robots: list(raw.robots, "robots").map((r) => ({
      ...r,
      name: r.name ?? r.id,
      category: r.category ?? "",
      catalog_item_id: r.catalog_item_id ?? null,
      start_position: point(r.start_position, r.id),
      start_heading_deg: r.start_heading_deg ?? 0,
      start_point_id: r.start_point_id ?? null,
      home_charging_point_id: r.home_charging_point_id ?? null,
    })),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Точка, привязанная к позиции (с допуском), если такая есть. */
export function keyPointAt(s: Scene, p: Point, tolerance: number) {
  return keyPoints(s).find((k) => dist(k.position, p) <= tolerance) ?? null;
}

/**
 * Приводит производные поля в соответствие с геометрией после любого изменения:
 * zone_id у точек, координаты привязанных вершин маршрутов, старт роботов на точках,
 * ссылки на удалённые объекты.
 */
export function normalize(s: Scene): Scene {
  const zoneOf = (p: Point) =>
    [...s.zones].reverse().find((z) => z.polygon.length >= 3 && pointInPolygon(p, z.polygon))?.id ?? null;
  const operation_points = s.operation_points.map((p) => ({ ...p, zone_id: zoneOf(p.position) }));
  const charging_points = s.charging_points.map((p) => ({ ...p, zone_id: zoneOf(p.position) }));
  const pos = new Map([...operation_points, ...charging_points].map((p) => [p.id, p.position]));
  const charging = new Set(charging_points.map((p) => p.id));

  const routes = s.routes.map((r) => ({
    ...r,
    points: r.points.map((v) => {
      if (!v.ref) return { x: v.x, y: v.y, ref: null };
      const p = pos.get(v.ref);
      return p ? { x: p.x, y: p.y, ref: v.ref } : { x: v.x, y: v.y, ref: null };
    }),
  }));

  const robots = s.robots.map((r) => {
    const start = r.start_point_id ? pos.get(r.start_point_id) : undefined;
    return {
      ...r,
      start_point_id: start ? r.start_point_id : null,
      start_position: start ? { ...start } : r.start_position,
      home_charging_point_id:
        r.home_charging_point_id && charging.has(r.home_charging_point_id) ? r.home_charging_point_id : null,
    };
  });

  return { ...s, operation_points, charging_points, routes, robots };
}
