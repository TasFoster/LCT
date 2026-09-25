import { expect, it } from 'vitest';
import { CATEGORIES } from '../../../shared/dictionaries';
import { emptyScene } from '../scene/ops';
import type { Scene } from '../scene/types';
import { canonicalizeScene } from './canonicalize';
import { dictionaryFrom } from './categories';

const { dict } = dictionaryFrom(CATEGORIES);
const P = (x: number, y: number) => ({ x, y });

// берём из справочника реальные пары «другое название → главный id», чтобы тест не зависел от конкретных слов
const aliased = (section: 'equipment_categories' | 'working_zones') => {
  const item = CATEGORIES[section].find((c) => c.aliases?.some((a) => a !== c.id));
  if (!item) throw new Error(`в ${section} нет записей с другими названиями`);
  return { main: item.id, alias: item.aliases!.find((a) => a !== item.id)! };
};

it('другие названия категорий заменяются на главные id, незнакомые и «custom:» остаются', () => {
  const robot = aliased('equipment_categories');
  const zone = aliased('working_zones');
  const scene: Scene = {
    ...emptyScene(),
    zones: [
      { id: 'z1', name: 'Зона', zone_type: 'storage', polygon: [P(0, 0), P(4, 0), P(4, 4)], categories: [zone.alias, 'custom:Свой склад'], tags: [] },
      { id: 'z2', name: 'Своё', zone_type: 'operation', polygon: [P(5, 0), P(9, 0), P(9, 4)], categories: ['neizvestnaya'], tags: [] },
    ],
    robots: [
      { id: 'r1', name: 'Робот', category: robot.alias, catalog_item_id: null, start_position: P(3, 3), start_heading_deg: 0, start_point_id: null, home_charging_point_id: null },
    ],
  };

  const out = canonicalizeScene(scene, dict);
  expect(out.zones[0].categories).toEqual([zone.main, 'custom:Свой склад']);
  expect(out.zones[1].categories).toEqual(['neizvestnaya']); // такого нет — не выдумываем
  expect(out.robots[0].category).toBe(robot.main);
  expect(scene.robots[0].category).toBe(robot.alias); // входной объект не мутируется
});

it('сцена уже с главными id возвращается тем же объектом', () => {
  const scene = emptyScene();
  expect(canonicalizeScene(scene, dict)).toBe(scene);
});
