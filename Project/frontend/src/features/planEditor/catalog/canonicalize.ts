// Сцена может прийти с категориями под другими названиями той же категории: транслит из
// прежнего справочника редактора («robot_shtabeler»), старые id форм. Приводим их к главным
// id общего справочника — в сцене храним только их. Незнакомое и «custom:…» не трогаем.
import type { Scene } from '../scene/types';
import type { CategoryDictionary } from './categories';

export function canonicalizeScene(scene: Scene, dict: CategoryDictionary): Scene {
  const list = (categories: string[]) => categories.map((c) => dict.canonical(c));
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

  let changed = false;
  const fix = <T extends { categories: string[] }>(o: T): T => {
    const next = list(o.categories);
    if (same(next, o.categories)) return o;
    changed = true;
    return { ...o, categories: next };
  };
  const zones = scene.zones.map(fix);
  const operation_points = scene.operation_points.map(fix);
  const charging_points = scene.charging_points.map(fix);
  const robots = scene.robots.map((r) => {
    const category = dict.canonical(r.category);
    if (category === r.category) return r;
    changed = true;
    return { ...r, category };
  });
  // ничего не поменялось — возвращаем тот же объект: визард сравнивает сцены по ссылке
  return changed ? { ...scene, zones, operation_points, charging_points, robots } : scene;
}
