// Проверки сцены перед отдачей (раздел «Проверки» в ../../../scene.md).
// error — сцена нарушает контракт; warning — формально допустимо, но скорее всего ошибка на плане.
import { insideOrOnPolygon, pointInPolygon, polygonSelfIntersects, segmentTouchesPolygon } from "./geometry";
import type { Scene } from "./types";

export interface Issue {
  level: "error" | "warning";
  objectId: string | null; // null — проблема сцены целиком
  message: string;
}

/** Вид категории по id; undefined — такой категории нет в справочнике. */
export type CategoryKindOf = (id: string) => string | undefined;

const ASSIGNABLE_KINDS = ["place_zone", "place_point", "task", "environment"];

export function validateScene(s: Scene, kindOf: CategoryKindOf): Issue[] {
  const issues: Issue[] = [];
  const error = (objectId: string | null, message: string) => issues.push({ level: "error", objectId, message });
  const warn = (objectId: string | null, message: string) => issues.push({ level: "warning", objectId, message });

  // id уникальны в пределах всей сцены
  const all = [...s.zones, ...s.operation_points, ...s.charging_points, ...s.routes, ...s.robots];
  const seen = new Set<string>();
  for (const o of all) {
    if (!o.id) error(null, `объект «${o.name}» без id`);
    else if (seen.has(o.id)) error(o.id, `id «${o.id}» встречается больше одного раза`);
    seen.add(o.id);
  }

  const zoneIds = new Set(s.zones.map((z) => z.id));
  const keyPointIds = new Set([...s.operation_points, ...s.charging_points].map((p) => p.id));
  const chargingIds = new Set(s.charging_points.map((p) => p.id));
  const restricted = s.zones.filter((z) => z.zone_type === "restricted" && z.polygon.length >= 3);
  const boundary = s.site.boundary;
  const inSite = (p: { x: number; y: number }) => boundary.length < 3 || insideOrOnPolygon(p, boundary);
  const inRestricted = (p: { x: number; y: number }) => restricted.find((z) => pointInPolygon(p, z.polygon));

  const checkCategories = (id: string, name: string, categories: string[]) => {
    for (const c of categories) {
      const kind = kindOf(c);
      if (kind === undefined) warn(id, `«${name}»: категории «${c}» нет в справочнике`);
      else if (!ASSIGNABLE_KINDS.includes(kind)) warn(id, `«${name}»: категорию «${c}» (${kind}) нельзя назначить зоне или точке`);
    }
  };

  for (const z of s.zones) {
    if (z.polygon.length < 3) error(z.id, `зона «${z.name}»: меньше 3 вершин`);
    else if (polygonSelfIntersects(z.polygon)) error(z.id, `зона «${z.name}»: контур самопересекается`);
    if (z.polygon.some((p) => !inSite(p))) warn(z.id, `зона «${z.name}» выходит за границу плана`);
    checkCategories(z.id, z.name, z.categories);
  }

  for (const p of [...s.operation_points, ...s.charging_points]) {
    if (p.zone_id && !zoneIds.has(p.zone_id)) error(p.id, `точка «${p.name}»: zone_id «${p.zone_id}» — нет такой зоны`);
    if (!inSite(p.position)) warn(p.id, `точка «${p.name}» за границей плана`);
    const r = inRestricted(p.position);
    if (r) warn(p.id, `точка «${p.name}» внутри зоны ограниченного доступа «${r.name}»`);
    checkCategories(p.id, p.name, p.categories);
  }
  for (const p of s.charging_points) {
    if (!Number.isInteger(p.slots) || p.slots < 1) error(p.id, `зарядка «${p.name}»: мест должно быть целое число ≥ 1`);
  }

  for (const r of s.routes) {
    if (r.points.length < 2) error(r.id, `маршрут «${r.name}»: меньше 2 вершин`);
    for (const v of r.points) {
      if (v.ref && !keyPointIds.has(v.ref)) error(r.id, `маршрут «${r.name}»: ссылка на несуществующую точку «${v.ref}»`);
    }
    if (r.points.some((v) => !inSite(v))) warn(r.id, `маршрут «${r.name}» выходит за границу плана`);
    const hit = restricted.find((z) => r.points.some((a, i) => i > 0 && segmentTouchesPolygon(r.points[i - 1], a, z.polygon)));
    if (hit) warn(r.id, `маршрут «${r.name}» проходит через зону ограниченного доступа «${hit.name}»`);
  }

  for (const r of s.robots) {
    if (!r.category) error(r.id, `робот «${r.name}»: не задан вид оборудования`);
    else if (kindOf(r.category) === undefined) warn(r.id, `робот «${r.name}»: вида «${r.category}» нет в справочнике`);
    else if (kindOf(r.category) !== "equipment") error(r.id, `робот «${r.name}»: «${r.category}» — не оборудование`);
    if (r.start_point_id && !keyPointIds.has(r.start_point_id))
      error(r.id, `робот «${r.name}»: start_point_id «${r.start_point_id}» — нет такой точки`);
    if (r.home_charging_point_id && !chargingIds.has(r.home_charging_point_id))
      error(r.id, `робот «${r.name}»: home_charging_point_id «${r.home_charging_point_id}» — нет такой зарядки`);
    if (!inSite(r.start_position)) warn(r.id, `робот «${r.name}» стоит за границей плана`);
    const z = inRestricted(r.start_position);
    if (z) warn(r.id, `робот «${r.name}» стоит в зоне ограниченного доступа «${z.name}»`);
  }

  return issues;
}
