import { describe, expect, it } from "vitest";
import example from "../../../../scene.example.json";
import { loadCategories } from "../catalog/categories";
import { normalize, siteRect, withDefaults } from "./ops";
import type { Scene } from "./types";
import { validateScene } from "./validate";

const dict = loadCategories();
const kindOf = (id: string) => dict.get(id)?.kind;
const P = (x: number, y: number) => ({ x, y });
const rect = (x1: number, y1: number, x2: number, y2: number) => [P(x1, y1), P(x2, y1), P(x2, y2), P(x1, y2)];

it("пример сцены из контракта проходит проверку (в т.ч. все его категории есть в справочнике)", () => {
  expect(validateScene(normalize(withDefaults(example)), kindOf)).toEqual([]);
});

describe("стены", () => {
  const base = normalize(withDefaults({ site: { width: 20, height: 10 } }));
  const scene: Scene = {
    ...base,
    walls: [
      { id: "w_ok", name: "Перегородка", points: [P(10, 0), P(10, 6)], thickness: 0.2, tags: [] },
      { id: "w_one", name: "Одна вершина", points: [P(1, 1)], thickness: 0.2, tags: [] },
      { id: "w_zero", name: "Нулевая", points: [P(1, 8), P(3, 8)], thickness: 0, tags: [] },
      { id: "w_out", name: "Наружу", points: [P(18, 9), P(22, 9)], thickness: 0.2, tags: [] },
    ],
    operation_points: [
      { id: "p_wall", name: "В стене", position: P(10.05, 3), zone_id: null, categories: [], tags: [] },
      { id: "p_near", name: "У стены", position: P(10.3, 3), zone_id: null, categories: [], tags: [] },
    ],
    routes: [
      { id: "r_thru", name: "Сквозь", points: [P(5, 3), P(15, 3)], bidirectional: true, tags: [] },
      { id: "r_door", name: "В проём", points: [P(5, 8), P(15, 8)], bidirectional: true, tags: [] },
      { id: "r_along", name: "Вдоль", points: [P(10.3, 1), P(10.3, 5)], bidirectional: true, tags: [] },
    ],
    robots: [
      { id: "rb", name: "AMR", category: "amr", catalog_item_id: null, start_position: P(10, 5.9), start_heading_deg: 0, start_point_id: null, home_charging_point_id: null },
    ],
  };
  const issues = validateScene(scene, kindOf).map((i) => `${i.level}: ${i.message}`);

  it("находятся ровно ожидаемые проблемы — проём и проезд вдоль стены не считаются", () => {
    expect(issues).toEqual([
      "error: стена «Одна вершина»: меньше 2 вершин",
      "error: стена «Нулевая»: толщина должна быть больше 0",
      "warning: стена «Наружу» выходит за границу плана",
      "warning: точка «В стене» стоит в стене «Перегородка»",
      "warning: маршрут «Сквозь» проходит сквозь стену «Перегородка»",
      "warning: робот «AMR» стоит в стене «Перегородка»",
    ]);
  });

  it("дубль id стены с другим объектом ловится", () => {
    const dup = { ...scene, walls: [{ ...scene.walls[0], id: "r_thru" }] };
    expect(validateScene(dup, kindOf).map((i) => i.message)).toContain("id «r_thru» встречается больше одного раза");
  });
});

describe("испорченная сцена: находятся ровно все заложенные проблемы", () => {
  const bad: Scene = {
    schema_version: "1.1",
    id: "s",
    project_id: "",
    name: "bad",
    updated_at: "",
    units: "m",
    coordinate_system: "y_down",
    site: { width: 20, height: 10, boundary: siteRect(20, 10) },
    walls: [],
    zones: [
      { id: "zr", name: "Запретная", zone_type: "restricted", polygon: rect(10, 0, 14, 4), categories: [], tags: [] },
      { id: "z2", name: "Две вершины", zone_type: "storage", polygon: [P(1, 1), P(2, 2)], categories: [], tags: [] },
      { id: "zb", name: "Бабочка", zone_type: "storage", polygon: [P(1, 5), P(4, 8), P(4, 5), P(1, 8)], categories: ["nope_cat", "amr"], tags: [] },
      { id: "zo", name: "Наружу", zone_type: "storage", polygon: rect(16, 6, 22, 9), categories: ["zona_hraneniya"], tags: [] },
    ],
    operation_points: [
      { id: "p_out", name: "За планом", position: P(25, 5), zone_id: null, categories: [], tags: [] },
      { id: "p_in_r", name: "В запретной", position: P(12, 2), zone_id: "zr", categories: [], tags: [] },
      { id: "p_badzone", name: "Битая зона", position: P(6, 2), zone_id: "ghost", categories: [], tags: [] },
      { id: "zr", name: "Дубль id", position: P(7, 2), zone_id: null, categories: [], tags: [] },
    ],
    charging_points: [{ id: "c0", name: "Ноль мест", position: P(2, 9), zone_id: null, slots: 0, categories: [], tags: [] }],
    routes: [
      { id: "r_ref", name: "Битая ссылка", points: [P(1, 3), { ...P(5, 3), ref: "ghost" }], bidirectional: true, tags: [] },
      { id: "r_thru", name: "Через запретную", points: [P(8, 2), P(16, 2)], bidirectional: true, tags: [] },
    ],
    robots: [
      { id: "rb_nocat", name: "Без вида", category: "", catalog_item_id: null, start_position: P(3, 3), start_heading_deg: 0, start_point_id: null, home_charging_point_id: null },
      { id: "rb_task", name: "Вид-задача", category: "sortirovka_gruzov", catalog_item_id: null, start_position: P(3, 4), start_heading_deg: 0, start_point_id: "ghost", home_charging_point_id: "p_in_r" },
      { id: "rb_r", name: "В запретной", category: "amr", catalog_item_id: null, start_position: P(11, 1), start_heading_deg: 0, start_point_id: null, home_charging_point_id: null },
    ],
  };
  const issues = validateScene(bad, kindOf);
  const messages = (level: string) => issues.filter((i) => i.level === level).map((i) => i.message);

  it("10 ошибок", () => {
    expect(messages("error")).toEqual([
      "id «zr» встречается больше одного раза",
      "зона «Две вершины»: меньше 3 вершин",
      "зона «Бабочка»: контур самопересекается",
      "точка «Битая зона»: zone_id «ghost» — нет такой зоны",
      "зарядка «Ноль мест»: мест должно быть целое число ≥ 1",
      "маршрут «Битая ссылка»: ссылка на несуществующую точку «ghost»",
      "робот «Без вида»: не задан вид оборудования",
      "робот «Вид-задача»: «sortirovka_gruzov» — не оборудование",
      "робот «Вид-задача»: start_point_id «ghost» — нет такой точки",
      "робот «Вид-задача»: home_charging_point_id «p_in_r» — нет такой зарядки",
    ]);
  });

  it("7 предупреждений", () => {
    expect(messages("warning")).toEqual([
      "«Бабочка»: категории «nope_cat» нет в справочнике",
      "«Бабочка»: категорию «amr» (equipment) нельзя назначить зоне или точке",
      "зона «Наружу» выходит за границу плана",
      "точка «За планом» за границей плана",
      "точка «В запретной» внутри зоны ограниченного доступа «Запретная»",
      "маршрут «Через запретную» проходит через зону ограниченного доступа «Запретная»",
      "робот «В запретной» стоит в зоне ограниченного доступа «Запретная»",
    ]);
  });
});
