import { expect, it } from "vitest";
import data from "./categories.json";
import { CategoryDictionary, NO_GROUP, loadCategories, validateCategories } from "./categories";

it("настоящий справочник читается целиком и без предупреждений", () => {
  const { categories, warnings } = validateCategories(data.categories);
  expect(warnings).toEqual([]);
  // 49 категорий applies_to="характеристика" больше не в этом списке — они переехали в
  // backend/contracts/dictionaries/characteristics.json как атрибуты оборудования, не категории.
  // equipment: 39 из Книга1.xlsx + 25 EXTRA_EQUIPMENT_CATEGORIES из catalog_export_v4.csv = 64
  expect(categories).toHaveLength(110);
  const byKind: Record<string, number> = {};
  for (const c of categories) byKind[c.kind] = (byKind[c.kind] ?? 0) + 1;
  expect(byKind).toEqual({ environment: 6, equipment: 64, place_point: 3, place_zone: 12, software: 3, task: 22 });
  expect(categories.every((c) => c.group)).toBe(true); // «Без раздела» больше не бывает
});

it("чужие названия категорий не пересекаются между собой и с нашими id", () => {
  const dict = loadCategories();
  const seen = new Map<string, string>();
  for (const c of dict.all) {
    for (const a of c.aliases) {
      const owner = seen.get(a);
      expect(owner, `чужое название «${a}» указано и у «${owner}», и у «${c.id}»`).toBeUndefined();
      seen.set(a, c.id);
      const own = dict.all.find((x) => x.id === a);
      expect(own === undefined || own.id === c.id, `«${a}» — и чужое название, и наш id`).toBe(true);
    }
  }
  expect(seen.size).toBeGreaterThan(10);
});

it("оборудование разложено по укрупнённым категориям книга2.xlsx", () => {
  const groups = loadCategories().byGroup("equipment");
  // 39 из Книга1.xlsx + 25 EXTRA_EQUIPMENT_CATEGORIES (catalog_export_v4.csv) = 64,
  // все нашли группу — «Без раздела» не нужен
  expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(64);
  expect(groups.map((g) => g.group)).toEqual([
    "Мобильные роботы",
    "Стационарные роботы и комплексы",
    "Воздушные роботы (БАС)",
    "Морские и подводные роботы",
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
