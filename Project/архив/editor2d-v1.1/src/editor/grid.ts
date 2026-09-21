// Сетка: шаг подбирается по масштабу (линии не чаще MIN_GRID_PX), каждая линия следующего шага темнее.
const GRID_STEPS = [1, 5, 10, 50, 100, 500, 1000, 5000, 10000];
const MIN_GRID_PX = 10;

/** Линии сетки в видимой части плана: from..to по оси, шаг step, major — более тёмная линия. */
export function gridLines(from: number, to: number, k: number) {
  const i = GRID_STEPS.findIndex((s) => s * k >= MIN_GRID_PX);
  const step = GRID_STEPS[i === -1 ? GRID_STEPS.length - 1 : i];
  const major = GRID_STEPS[Math.min((i === -1 ? GRID_STEPS.length - 1 : i) + 1, GRID_STEPS.length - 1)];
  const lines: { v: number; major: boolean }[] = [];
  for (let v = Math.ceil(from / step) * step; v <= to + 1e-9; v += step) {
    lines.push({ v, major: Math.abs(v / major - Math.round(v / major)) < 1e-9 });
  }
  return lines;
}
