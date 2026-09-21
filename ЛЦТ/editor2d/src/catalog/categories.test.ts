import { expect, it } from "vitest";
import data from "./categories.json";
import { validateCategories } from "./categories";

it("настоящий справочник читается целиком и без предупреждений", () => {
  const { categories, warnings } = validateCategories(data.categories);
  expect(warnings).toEqual([]);
  expect(categories).toHaveLength(134);
  const byKind: Record<string, number> = {};
  for (const c of categories) byKind[c.kind] = (byKind[c.kind] ?? 0) + 1;
  expect(byKind).toEqual({ characteristic: 49, environment: 6, equipment: 39, place_point: 3, place_zone: 12, software: 3, task: 22 });
});

it("испорченные записи отсеиваются с понятными предупреждениями", () => {
  const { categories, warnings } = validateCategories([
    { id: "a", name: "Зона А", kind: "place_zone", zone_type: "warehouse" },
    { id: "a", name: "Дубль", kind: "task" },
    { id: "b", name: "Странная", kind: "robotics" },
    { name: "Без id", kind: "task" },
    null,
    { id: "c", name: "Точка", kind: "place_point" },
  ]);
  expect(categories.map((c) => `${c.id}:${c.zone_type ?? c.point_kind}`)).toEqual(["a:operation", "c:operation"]);
  expect(warnings).toHaveLength(5);
  expect(warnings[0]).toContain("warehouse");
});
