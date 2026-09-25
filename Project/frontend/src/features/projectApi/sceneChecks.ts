/**
 * Проверки плана объекта по контракту 6 (`Project/scene.md`, тип `Scene`).
 * Считать их должен сервер и возвращать вместе со сценой — тогда редактор
 * Алексея, симуляция и отчёт показывают одни и те же замечания, а не каждый
 * свои. Пока сервера нет, это делает мок-слой (`mockServer.ts`), а здесь —
 * эталонная реализация, которую бэкенд может повторить один в один.
 */

import type { Point, Scene } from '../../shared/types/contracts';
import type { SceneWarning } from '../../shared/api/projectState';

export interface SceneCheckContext {
  /** Самый требовательный к ширине прохода робот, м */
  minAisleWidthM: number | null;
  /** Площадь из формы, м² — для сверки с размером плана */
  formAreaSqm: number | null;
}

const sub = (a: Point, b: Point) => ({ x: a.x - b.x, y: a.y - b.y });
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;

/** Пересекаются ли отрезки p1p2 и p3p4 */
function segmentsCross(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const r = sub(p2, p1);
  const s = sub(p4, p3);
  const denom = cross(r, s);
  if (Math.abs(denom) < 1e-9) return false; // параллельные
  const t = cross(sub(p3, p1), s) / denom;
  const u = cross(sub(p3, p1), r) / denom;
  return t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9;
}

/** Расстояние от точки до отрезка, м */
function distanceToSegment(p: Point, a: Point, b: Point): number {
  const ab = sub(b, a);
  const len2 = ab.x * ab.x + ab.y * ab.y;
  if (len2 < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + ab.x * t), p.y - (a.y + ab.y * t));
}

function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const intersects =
      poly[i].y > p.y !== poly[j].y > p.y &&
      p.x < ((poly[j].x - poly[i].x) * (p.y - poly[i].y)) / (poly[j].y - poly[i].y) + poly[i].x;
    if (intersects) inside = !inside;
  }
  return inside;
}

const segments = (pts: Point[]) => pts.slice(0, -1).map((p, i) => [p, pts[i + 1]] as const);
const nameOf = (name: string | null, id: string) => (name && name.trim() ? `«${name}»` : id);

/** Роботов на одно место зарядки, выше которого встанет очередь */
export const ROBOTS_PER_SLOT = 4;

export function checkScene(scene: Scene, ctx: SceneCheckContext): SceneWarning[] {
  const out: SceneWarning[] = [];
  const wallSegments = scene.walls.flatMap((w) => segments(w.points));

  // 1. Маршрут проходит сквозь стену
  for (const route of scene.routes) {
    const crosses = segments(route.points).some(([a, b]) => wallSegments.some(([c, d]) => segmentsCross(a, b, c, d)));
    if (crosses) {
      out.push({
        code: 'route_crosses_wall',
        severity: 'error',
        message: `Маршрут ${nameOf(route.name, route.id)} проходит сквозь стену — робот так не проедет`,
        target_kind: 'route',
        target_id: route.id,
      });
    }
  }

  // 2. Концы маршрута не привязаны к точкам (RoutePoint.ref) — симуляции
  // нечего назначать по такому маршруту
  for (const route of scene.routes) {
    const ends = [route.points[0], route.points[route.points.length - 1]];
    if (route.points.length < 2 || ends.some((p) => !p?.ref)) {
      out.push({
        code: 'route_not_linked',
        severity: 'warning',
        message: `У маршрута ${nameOf(route.name, route.id)} не указано, между какими точками он идёт — симуляция не сможет назначить по нему задания`,
        target_kind: 'route',
        target_id: route.id,
      });
    }
  }

  // 3. Робот стоит в зоне ограниченного доступа
  const restricted = scene.zones.filter((z) => z.zone_type === 'restricted');
  for (const robot of scene.robots) {
    const zone = restricted.find((z) => pointInPolygon(robot.start_position, z.polygon));
    if (zone) {
      out.push({
        code: 'robot_in_restricted_zone',
        severity: 'error',
        message: `Робот ${nameOf(robot.name, robot.id)} стоит в зоне «${zone.name}» с ограниченным доступом`,
        target_kind: 'robot',
        target_id: robot.id,
      });
    }
  }

  // 4. Маршрут проходит слишком близко к стене для выбранной техники
  if (ctx.minAisleWidthM) {
    const half = ctx.minAisleWidthM / 2;
    for (const route of scene.routes) {
      const tight = route.points.some((p) => wallSegments.some(([a, b]) => distanceToSegment(p, a, b) < half));
      if (tight) {
        out.push({
          code: 'aisle_too_narrow',
          severity: 'warning',
          message: `Маршрут ${nameOf(route.name, route.id)} идёт ближе ${half.toFixed(1)} м к стене, а выбранной технике нужен проход от ${ctx.minAisleWidthM.toFixed(1)} м`,
          target_kind: 'route',
          target_id: route.id,
        });
      }
    }
  }

  // 5. Зона выходит за габариты площадки (Site.width × Site.height)
  const { width, height } = scene.site;
  if (width > 0 && height > 0) {
    for (const zone of scene.zones) {
      const outside = zone.polygon.some((p) => p.x < -1e-6 || p.y < -1e-6 || p.x > width + 1e-6 || p.y > height + 1e-6);
      if (outside) {
        out.push({
          code: 'zone_outside_bounds',
          severity: 'warning',
          message: `Зона «${zone.name}» выходит за границы объекта`,
          target_kind: 'zone',
          target_id: zone.id,
        });
      }
    }
  }

  // 6. Очередь на зарядку: роботы заряжаются по очереди, но если на место
  // приходится больше ROBOTS_PER_SLOT роботов, мест не хватит по времени
  for (const point of scene.charging_points) {
    const linked = scene.robots.filter((r) => r.home_charging_point_id === point.id).length;
    const slots = Math.max(1, point.slots);
    if (linked > slots * ROBOTS_PER_SLOT) {
      const perSlot = (linked / slots).toFixed(1).replace('.', ',');
      out.push({
        code: 'charging_capacity_exceeded',
        severity: 'warning',
        message: `К зарядке ${nameOf(point.name, point.id)} привязано ${linked} роботов на ${slots} мест — ${perSlot} робота на место, будет очередь`,
        target_kind: 'point',
        target_id: point.id,
      });
    }
  }

  // 7. Площадь плана заметно расходится с формой
  if (width > 0 && height > 0 && ctx.formAreaSqm) {
    const planArea = width * height;
    const diff = Math.abs(planArea - ctx.formAreaSqm) / ctx.formAreaSqm;
    if (diff > 0.2) {
      out.push({
        code: 'scene_area_differs_from_form',
        severity: 'info',
        message: `Площадь плана ${Math.round(planArea)} м², а в параметрах объекта ${Math.round(ctx.formAreaSqm)} м² — расхождение ${Math.round(diff * 100)} %`,
        target_kind: null,
        target_id: null,
      });
    }
  }

  return out;
}
