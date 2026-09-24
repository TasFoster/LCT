import { expect, it } from "vitest";
import data from "./categories.json";
import { CategoryDictionary, NO_GROUP, loadCategories, validateCategories } from "./categories";

it("настоящий справочник читается целиком и без предупреждений", () => {
  const { categories, warnings } = validateCategories(data.categories);
  expect(warnings).toEqual([]);
  expect(categories).toHaveLength(134);
  const byKind: Record<string, number> = {};
  for (const c of categories) byKind[c.kind] = (byKind[c.kind] ?? 0) + 1;
  expect(byKind).toEqual({ characteristic: 49, environment: 6, equipment: 39, place_point: 3, place_zone: 12, software: 3, task: 22 });
});

it("оборудование разложено по разделам таблицы Артёма", () => {
  const groups = loadCategories().byGroup("equipment");
  expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(39);
  // разделы идут в порядке таблицы, «Без раздела» — последним
  expect(groups.map((g) => g.group)).toEqual([
    "1. Склад и внутрискладская логистика",
    "2. Производство и цех",
    "3. Транспорт, логистика и доставка",
    "5. Торговля, услуги и общественные пространства",
    "6. Безопасность, патрулирование и ЧС",
    "7. Инфраструктура, ЖКХ и подземные коммуникации",
    "8. Авиационные системы (БАС / дроны)",
    NO_GROUP,
  ]);
  expect(groups[0].items.map((c) => c.id)).toContain("amr");
});

it("категория без раздела не теряется", () => {
  const { categories, warnings } = validateCategories([
    { id: "a", name: "Без раздела", kind: "equipment" },
    { id: "b", name: "С разделом", kind: "equipment", group: "1. Склад" },
  ]);
  expect(warnings).toEqual([]);
  const groups = new CategoryDictionary(categories).byGroup("equipment");
  expect(groups.map((g) => `${g.group}:${g.items.length}`)).toEqual(["1. Склад:1", `${NO_GROUP}:1`]);
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
