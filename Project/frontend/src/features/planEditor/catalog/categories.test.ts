import { expect, it } from 'vitest';
import { CATEGORIES, type Categories } from '../../../shared/dictionaries';
import { NO_GROUP, dictionaryFrom } from './categories';

it('общий справочник визарда читается целиком и без предупреждений', () => {
  const { dict, warnings } = dictionaryFrom(CATEGORIES);
  expect(warnings).toEqual([]);
  expect(dict.ofKind('equipment')).toHaveLength(CATEGORIES.equipment_categories.length);
  expect(dict.ofKind('place_zone')).toHaveLength(CATEGORIES.working_zones.length);
  expect(dict.ofKind('place_point')).toHaveLength(CATEGORIES.point_kinds.length);
  // зарядка — отдельный вид точки, редактор ставит её в charging_points
  expect(dict.ofKind('place_point').some((c) => c.point_kind === 'charging')).toBe(true);
});

it('оборудование разложено по разделам книги Артёма, без «Без раздела»', () => {
  const { dict } = dictionaryFrom(CATEGORIES);
  const groups = dict.byGroup('equipment');
  expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(CATEGORIES.equipment_categories.length);
  expect(groups.map((g) => g.group)).not.toContain(NO_GROUP);
  expect(groups.length).toBeGreaterThan(1);
});

it('другое название категории приводится к главному id, «custom:» — нет', () => {
  const { dict } = dictionaryFrom(CATEGORIES);
  const withAlias = CATEGORIES.equipment_categories.find((c) => c.aliases?.length);
  expect(withAlias).toBeDefined();
  expect(dict.canonical(withAlias!.aliases![0])).toBe(withAlias!.id);
  expect(dict.canonical('custom:Свой робот')).toBe('custom:Свой робот');
  expect(dict.name('custom:Свой робот')).toBe('Свой робот');
  expect(dict.name('neizvestno')).toBe('neizvestno');
});

it('цвета зон — из справочника (form_options.json), не из кода редактора', () => {
  const { dict } = dictionaryFrom(CATEGORIES);
  for (const z of CATEGORIES.zone_types) expect(dict.zoneColors[z.id]).toBe(z.color);
});

it('испорченные записи отсеиваются с предупреждением, остальное читается', () => {
  const broken = {
    ...CATEGORIES,
    equipment_categories: [
      { id: 'a', label: 'А' },
      { id: 'a', label: 'Дубль' },
      { label: 'Без id' },
      null,
    ],
    working_zones: [{ id: 'z', label: 'Зона', zone_type: 'warehouse' }],
  } as unknown as Categories;
  const { dict, warnings } = dictionaryFrom(broken);
  expect(dict.ofKind('equipment').map((c) => c.id)).toEqual(['a']);
  expect(dict.get('z')?.zone_type).toBe('operation');
  expect(warnings).toHaveLength(3);
});
