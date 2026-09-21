import { describe, expect, it } from "vitest";
import { emptyScene, normalize, removeObject, resizeSite, sceneFileName, siteRect, uniqueName, updateObject, withDefaults } from "./ops";
import { SCHEMA_VERSION, type Scene } from "./types";

const P = (x: number, y: number) => ({ x, y });

/** Сцена с зоной, двумя точками, маршрутом между ними и роботом на зарядке. */
function sample(): Scene {
  return normalize({
    ...emptyScene(40, 25),
    zones: [{ id: "z", name: "Склад", zone_type: "storage", polygon: siteRect(20, 10), categories: [], tags: [] }],
    operation_points: [{ id: "p", name: "Точка", position: P(5, 5), zone_id: null, categories: [], tags: [] }],
    charging_points: [{ id: "c", name: "Зарядка", position: P(30, 20), zone_id: null, slots: 1, categories: [], tags: [] }],
    routes: [{ id: "r", name: "Маршрут", points: [{ ...P(5, 5), ref: "p" }, P(30, 5), { ...P(30, 20), ref: "c" }], bidirectional: true, tags: [] }],
    robots: [
      { id: "rb", name: "AMR", category: "amr", catalog_item_id: null, start_position: P(30, 20), start_heading_deg: 0, start_point_id: "c", home_charging_point_id: "c" },
    ],
  });
}

describe("withDefaults — открытие файлов", () => {
  it("файл v1.0 дополняется полями v1.1 и помечается текущей версией", () => {
    const s = withDefaults({
      schema_version: "1.0",
      site: { width: 10, height: 10 },
      zones: [{ id: "z", name: "З", zone_type: "storage", polygon: siteRect(2, 2), tags: [] }],
      robots: [{ id: "r", name: "R", catalog_item_id: "x", start_position: P(1, 1), start_heading_deg: 0 }],
    });
    expect(s.schema_version).toBe(SCHEMA_VERSION);
    expect(s.zones[0].categories).toEqual([]);
    expect(s.robots[0].category).toBe("");
  });

  it("без контура или с контуром меньше 3 точек — прямоугольник по габаритам", () => {
    expect(withDefaults({ site: { width: 12, height: 7 } }).site.boundary).toEqual(siteRect(12, 7));
    expect(withDefaults({ site: { width: 12, height: 7, boundary: [P(0, 0), P(1, 1)] } }).site.boundary).toEqual(siteRect(12, 7));
  });

  it("свой контур сохраняется", () => {
    const tri = [P(0, 0), P(12, 0), P(6, 7)];
    expect(withDefaults({ site: { width: 12, height: 7, boundary: tri } }).site.boundary).toEqual(tri);
  });

  it.each([
    ["не объект", null, "не содержит JSON-объект"],
    ["нет габаритов", { site: {} }, "нет site.width"],
    ["список не список", { site: { width: 1, height: 1 }, zones: {} }, "должно быть списком"],
    ["битые координаты", { site: { width: 1, height: 1 }, robots: [{ id: "r", start_position: { x: "a" } }] }, "неверные координаты"],
  ])("ошибка с понятным текстом: %s", (_, raw, message) => {
    expect(() => withDefaults(raw)).toThrow(message);
  });
});

describe("normalize — производные поля", () => {
  it("zone_id: точка внутри зоны", () => {
    const s = sample();
    expect(s.operation_points[0].zone_id).toBe("z");
    expect(s.charging_points[0].zone_id).toBeNull();
  });

  it("перенос точки тянет привязанную вершину маршрута и робота", () => {
    const s = sample();
    const moved = updateObject(s, { kind: "charging_point", data: { ...s.charging_points[0], position: P(35, 22) } });
    expect(moved.routes[0].points[2]).toEqual({ ...P(35, 22), ref: "c" });
    expect(moved.robots[0].start_position).toEqual(P(35, 22));
  });

  it("удаление точки снимает ссылки на неё, но оставляет вершину и робота на месте", () => {
    const s = removeObject(sample(), "charging_point", "c");
    expect(s.routes[0].points[2]).toEqual(P(30, 20));
    expect(s.robots[0].start_point_id).toBeNull();
    expect(s.robots[0].home_charging_point_id).toBeNull();
    expect(s.robots[0].start_position).toEqual(P(30, 20));
  });
});

describe("uniqueName", () => {
  it.each([
    ["свободно — без номера", "Зона хранения", ["Зона 1"], false, "Зона хранения"],
    ["занято — 2", "Зона хранения", ["Зона хранения"], false, "Зона хранения 2"],
    ["заняты 1 и 2 — 3", "Зона хранения", ["Зона хранения", "Зона хранения 2"], false, "Зона хранения 3"],
    ["с номером, пусто — 1", "Зона", [], true, "Зона 1"],
    ["дырка в номерах — наименьший свободный", "Зона", ["Зона 1", "Зона 3"], true, "Зона 2"],
  ])("%s", (_, base, taken, numbered, expected) => {
    expect(uniqueName(base, new Set(taken), numbered)).toBe(expected);
  });
});

describe("resizeSite", () => {
  it("прямоугольный контур меняется вместе с габаритами", () => {
    const s = resizeSite(emptyScene(40, 25), 60, 30);
    expect(s.site.boundary).toEqual(siteRect(60, 30));
  });
  it("особый контур не трогается", () => {
    const tri = [P(0, 0), P(30, 0), P(15, 20)];
    const base = { ...emptyScene(30, 20), site: { ...emptyScene(30, 20).site, boundary: tri } };
    expect(resizeSite(base, 50, 20).site.boundary).toEqual(tri);
  });
});

describe("sceneFileName", () => {
  const named = (name: string, id = "scene-1") => sceneFileName({ ...emptyScene(), name, id });
  it("по названию", () => expect(named("Склад А, 1 этаж")).toBe("Склад А, 1 этаж.json"));
  it("запрещённые символы заменяются", () => expect(named('Цех 2/3: "новый"?<x>|*')).toBe("Цех 2_3_ _новый___x___.json"));
  it("пустое название — по id, id тоже чистится", () => expect(named("  ", "proj/12:s")).toBe("proj_12_s.json"));
  it("ничего нет — scene", () => expect(named("", "")).toBe("scene.json"));
  it("точки по краям и длина", () => {
    expect(named("..план..")).toBe("план.json");
    expect(named("я".repeat(300))).toBe(`${"я".repeat(100)}.json`);
  });
});

it("emptyScene: у каждой новой сцены свой id", () => {
  expect(emptyScene().id).not.toBe(emptyScene().id);
});
