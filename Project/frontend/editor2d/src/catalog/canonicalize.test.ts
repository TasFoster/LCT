import { expect, it } from "vitest";
import { emptyScene, normalize, withDefaults } from "../scene/ops";
import type { Scene } from "../scene/types";
import { canonicalizeScene } from "./canonicalize";
import { loadCategories } from "./categories";

const dict = loadCategories();
const P = (x: number, y: number) => ({ x, y });

it("названия категорий из визарда заменяются на наши, незнакомые остаются", () => {
  const scene: Scene = {
    ...emptyScene(),
    zones: [
      // «storage» и «receiving» — это справочник визарда
      { id: "z1", name: "Хранение", zone_type: "storage", polygon: [P(0, 0), P(4, 0), P(4, 4)], categories: ["storage", "holod"], tags: [] },
      { id: "z2", name: "Своё", zone_type: "operation", polygon: [P(5, 0), P(9, 0), P(9, 4)], categories: ["neizvestnaya"], tags: [] },
    ],
    operation_points: [{ id: "p1", name: "Приёмка", position: P(1, 1), zone_id: null, categories: ["receiving"], tags: [] }],
    charging_points: [{ id: "c1", name: "Зарядка", position: P(2, 2), zone_id: null, slots: 2, categories: ["charging"], tags: [] }],
    robots: [
      { id: "r1", name: "Штабелёр", category: "stacker", catalog_item_id: null, start_position: P(3, 3), start_heading_deg: 0, start_point_id: null, home_charging_point_id: null },
      { id: "r2", name: "Наш", category: "amr", catalog_item_id: null, start_position: P(4, 4), start_heading_deg: 0, start_point_id: null, home_charging_point_id: null },
    ],
  };

  const out = canonicalizeScene(scene, dict);
  expect(out.zones[0].categories).toEqual(["zona_hraneniya", "holod"]);
  expect(out.zones[1].categories).toEqual(["neizvestnaya"]); // чужого такого нет — не выдумываем
  expect(out.operation_points[0].categories).toEqual(["zona_priemki"]);
  expect(out.charging_points[0].categories).toEqual(["tochka_zaryadki"]);
  expect(out.robots.map((r) => r.category)).toEqual(["robot_shtabeler", "amr"]);
});

it("наша собственная сцена не меняется", () => {
  const example = normalize(withDefaults(emptyScene()));
  expect(canonicalizeScene(example, dict)).toEqual(example);
});

it("справочник знает категорию и по чужому названию", () => {
  expect(dict.get("stacker")?.id).toBe("robot_shtabeler");
  expect(dict.get("robot_shtabeler")?.name).toBe("Робот-штабелер");
  expect(dict.canonical("нет такого")).toBe("нет такого");
});
