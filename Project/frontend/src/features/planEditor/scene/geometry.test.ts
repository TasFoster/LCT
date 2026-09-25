import { describe, expect, it } from "vitest";
import {
  distToPolyline,
  distToSegment,
  insideOrOnPolygon,
  pointInPolygon,
  polygonSelfIntersects,
  segmentDistance,
  segmentsIntersect,
  segmentTouchesPolygon,
  snapToGrid,
  touchesNeighbour,
} from "./geometry";

const P = (x: number, y: number) => ({ x, y });
const square = [P(0, 0), P(4, 0), P(4, 4), P(0, 4)];

describe("segmentsIntersect", () => {
  it.each([
    ["пересечение крестом", [P(0, 0), P(4, 4), P(0, 4), P(4, 0)], true],
    ["параллельные", [P(0, 0), P(4, 0), P(0, 1), P(4, 1)], false],
    ["касание концом", [P(0, 0), P(2, 2), P(2, 2), P(4, 0)], true],
    ["Т-касание", [P(0, 0), P(4, 0), P(2, 0), P(2, 3)], true],
    ["на одной прямой, накладываются", [P(0, 0), P(3, 0), P(2, 0), P(5, 0)], true],
    ["на одной прямой, врозь", [P(0, 0), P(1, 0), P(2, 0), P(5, 0)], false],
    ["не достаёт", [P(0, 0), P(1, 1), P(3, 0), P(2, 1.5)], false],
  ] as const)("%s", (_, [a, b, c, d], expected) => {
    expect(segmentsIntersect(a, b, c, d)).toBe(expected);
  });
});

describe("distToSegment", () => {
  it("до середины отрезка", () => expect(distToSegment(P(2, 3), P(0, 0), P(4, 0))).toBe(3));
  it("за концом отрезка — до конца", () => expect(distToSegment(P(7, 4), P(0, 0), P(4, 0))).toBe(5));
});

describe("точка и полигон", () => {
  it("внутри", () => expect(insideOrOnPolygon(P(2, 2), square)).toBe(true));
  it("на стороне", () => expect(insideOrOnPolygon(P(4, 2), square)).toBe(true));
  it("в вершине", () => expect(insideOrOnPolygon(P(4, 4), square)).toBe(true));
  it("снаружи", () => expect(insideOrOnPolygon(P(5, 2), square)).toBe(false));
  it("pointInPolygon: внутри вогнутого, в выемке — нет", () => {
    const l = [P(0, 0), P(4, 0), P(4, 1), P(1, 1), P(1, 4), P(0, 4)];
    expect(pointInPolygon(P(0.5, 3), l)).toBe(true);
    expect(pointInPolygon(P(3, 3), l)).toBe(false);
  });
});

describe("polygonSelfIntersects", () => {
  it("квадрат — нет", () => expect(polygonSelfIntersects(square)).toBe(false));
  it("бабочка — да", () => expect(polygonSelfIntersects([P(0, 0), P(4, 4), P(4, 0), P(0, 4)])).toBe(true));
  it("треугольник — нет", () => expect(polygonSelfIntersects([P(0, 0), P(4, 0), P(2, 3)])).toBe(false));
  it("вогнутая L — нет", () =>
    expect(polygonSelfIntersects([P(0, 0), P(4, 0), P(4, 1), P(1, 1), P(1, 4), P(0, 4)])).toBe(false));
  it("вершина на чужой стороне — да", () =>
    expect(polygonSelfIntersects([P(0, 0), P(4, 0), P(4, 4), P(2, 0), P(0, 4)])).toBe(true));
});

describe("segmentTouchesPolygon", () => {
  it("пересекает", () => expect(segmentTouchesPolygon(P(-1, 2), P(5, 2), square)).toBe(true));
  it("снаружи", () => expect(segmentTouchesPolygon(P(5, 0), P(5, 4), square)).toBe(false));
  it("внутри", () => expect(segmentTouchesPolygon(P(1, 1), P(3, 3), square)).toBe(true));
  it("касается стороны", () => expect(segmentTouchesPolygon(P(4, 1), P(6, 1), square)).toBe(true));
});

describe("touchesNeighbour — отрезки нулевой длины", () => {
  const line = [P(0, 0), P(4, 0), P(8, 0)];
  it.each([
    ["зона: перенос на предыдущую", square, P(0, 0), { move: 1 }, true, true],
    ["зона: первая на последнюю (замкнута)", square, P(0, 4), { move: 0 }, true, true],
    ["зона: на своё же место", square, P(4, 0), { move: 1 }, true, false],
    ["зона: свободное место", square, P(2, 2), { move: 1 }, true, false],
    ["зона: вставка после последней на первую", square, P(0, 0), { insertAfter: 3 }, true, true],
    ["маршрут: первая на последнюю (не замкнут)", line, P(8, 0), { move: 0 }, false, false],
    ["маршрут: вставка на следующую", line, P(4, 0), { insertAfter: 0 }, false, true],
    ["маршрут: свободная вставка", line, P(2, 1), { insertAfter: 0 }, false, false],
  ] as const)("%s", (_, pts, p, at, closed, expected) => {
    expect(touchesNeighbour([...pts], p, at, closed)).toBe(expected);
  });
});

describe("segmentDistance / distToPolyline", () => {
  it("пересекаются — 0", () => expect(segmentDistance(P(0, 0), P(4, 4), P(0, 4), P(4, 0))).toBe(0));
  it("параллельные на расстоянии 1", () => expect(segmentDistance(P(0, 0), P(4, 0), P(0, 1), P(4, 1))).toBe(1));
  it("конец до середины другого", () => expect(segmentDistance(P(2, 3), P(2, 5), P(0, 0), P(4, 0))).toBe(3));
  it("концы врозь на одной прямой", () => expect(segmentDistance(P(0, 0), P(1, 0), P(4, 0), P(5, 0))).toBe(3));
  it("до ломаной — до ближайшего звена", () => expect(distToPolyline(P(5, 1), [P(0, 0), P(4, 0), P(4, 4)])).toBe(1));
});

it("snapToGrid", () => expect(snapToGrid(P(24.2, 3.1), 0.5)).toEqual(P(24, 3)));
