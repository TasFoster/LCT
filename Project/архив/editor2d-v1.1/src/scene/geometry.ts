import type { Point } from "./types";

export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export const snapToGrid = (p: Point, step: number): Point => ({
  x: Math.round(p.x / step) * step,
  y: Math.round(p.y / step) * step,
});

/**
 * Совпадёт ли вершина с соседней, если поставить её в p: при переносе вершины index
 * (соседи index−1 и index+1) или при вставке после afterIndex (соседи afterIndex и afterIndex+1).
 * Совпадение даёт отрезок нулевой длины. closed — у зоны последняя вершина соседствует с первой.
 */
export function touchesNeighbour(pts: Point[], p: Point, at: { move: number } | { insertAfter: number }, closed: boolean) {
  const n = pts.length;
  const idx = (i: number) => (closed ? (i + n) % n : i);
  const neighbours = "move" in at ? [idx(at.move - 1), idx(at.move + 1)] : [at.insertAfter, idx(at.insertAfter + 1)];
  return neighbours.some((i) => i >= 0 && i < n && !("move" in at && i === at.move) && dist(pts[i], p) < 1e-6);
}

/** Лежит ли точка внутри полигона (метод луча). */
export function pointInPolygon(p: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

const EPS = 1e-9;
const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
const onSegment = (p: Point, a: Point, b: Point) =>
  Math.min(a.x, b.x) - EPS <= p.x && p.x <= Math.max(a.x, b.x) + EPS &&
  Math.min(a.y, b.y) - EPS <= p.y && p.y <= Math.max(a.y, b.y) + EPS;

/** Пересекаются ли отрезки ab и cd (касание концом тоже считается). */
export function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  if (((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS))) return true;
  if (Math.abs(d1) <= EPS && onSegment(a, c, d)) return true;
  if (Math.abs(d2) <= EPS && onSegment(b, c, d)) return true;
  if (Math.abs(d3) <= EPS && onSegment(c, a, b)) return true;
  if (Math.abs(d4) <= EPS && onSegment(d, a, b)) return true;
  return false;
}

/** Расстояние от точки p до отрезка ab. */
export function distToSegment(p: Point, a: Point, b: Point): number {
  const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (len2 === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / len2));
  return dist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}

const edges = (polygon: Point[]) => polygon.map((a, i) => [a, polygon[(i + 1) % polygon.length]] as const);

/** Внутри полигона или на его границе. */
export function insideOrOnPolygon(p: Point, polygon: Point[]): boolean {
  return pointInPolygon(p, polygon) || edges(polygon).some(([a, b]) => distToSegment(p, a, b) < 1e-6);
}

/** Самопересечение контура: пересекаются ли несоседние стороны. */
export function polygonSelfIntersects(polygon: Point[]): boolean {
  const e = edges(polygon);
  const n = e.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue; // соседние стороны делят вершину
      if (segmentsIntersect(e[i][0], e[i][1], e[j][0], e[j][1])) return true;
    }
  }
  return false;
}

/** Задевает ли отрезок ab полигон: пересекает сторону или лежит внутри. */
export function segmentTouchesPolygon(a: Point, b: Point, polygon: Point[]): boolean {
  if (pointInPolygon(a, polygon) || pointInPolygon(b, polygon)) return true;
  return edges(polygon).some(([c, d]) => segmentsIntersect(a, b, c, d));
}

export function bbox(points: Point[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}
