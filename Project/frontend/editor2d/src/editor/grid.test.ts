import { expect, it } from "vitest";
import { gridLines } from "./grid";

const summary = (from: number, to: number, k: number) => {
  const l = gridLines(from, to, k);
  return { count: l.length, step: l[1].v - l[0].v, majors: l.filter((x) => x.major).map((x) => x.v) };
};

it("обычный план при обычном масштабе — шаг 1 м, тёмные через 5 м (как было раньше)", () => {
  expect(summary(0, 40, 19.65)).toEqual({ count: 41, step: 1, majors: [0, 5, 10, 15, 20, 25, 30, 35, 40] });
});

it("большой план вписан — шаг 50 м, тёмные через 100 м, 41 линия вместо 2001", () => {
  const s = summary(0, 2000, 0.393);
  expect(s.count).toBe(41);
  expect(s.step).toBe(50);
  expect(s.majors).toHaveLength(21);
});

it("линии не чаще 10 px при любом масштабе", () => {
  for (const k of [0.01, 0.1, 0.393, 1, 3, 19.65, 400]) {
    const l = gridLines(0, 10000, k);
    if (l.length > 1) expect((l[1].v - l[0].v) * k).toBeGreaterThanOrEqual(10);
  }
});

it("только заданный участок", () => {
  expect(gridLines(10.2, 12.9, 400).map((l) => l.v)).toEqual([11, 12]);
});
