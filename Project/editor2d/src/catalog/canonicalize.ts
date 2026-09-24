// Сцена может прийти с сервера или из визарда, где у тех же категорий свои названия
// («storage» вместо «zona_hraneniya», «stacker» вместо «robot_shtabeler»). Перед показом
// приводим их к названиям справочника Артёма — иначе редактор считает категорию незнакомой.
import type { Scene } from "../scene/types";
import type { CategoryDictionary } from "./categories";

export function canonicalizeScene(scene: Scene, dict: CategoryDictionary): Scene {
  const list = (categories: string[]) => categories.map((c) => dict.canonical(c));
  return {
    ...scene,
    zones: scene.zones.map((z) => ({ ...z, categories: list(z.categories) })),
    operation_points: scene.operation_points.map((p) => ({ ...p, categories: list(p.categories) })),
    charging_points: scene.charging_points.map((p) => ({ ...p, categories: list(p.categories) })),
    robots: scene.robots.map((r) => ({ ...r, category: dict.canonical(r.category) })),
  };
}
