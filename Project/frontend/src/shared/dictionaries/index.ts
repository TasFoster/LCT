/**
 * Единый справочник для форм и плана. Два источника, оба в
 * `Project/backend/contracts/dictionaries/`:
 *
 * - `categories.json` — оборудование, рабочие зоны, виды точек, задачи, среды.
 *   Генерируется из Книга1.xlsx/книга2.xlsx (`Project/tools/categories_from_xlsx.py`),
 *   руками не правится. Тот же файл читает редактор Алексея (`editor2d/src/catalog`).
 * - `form_options.json` — справочники форм визарда (режимы, типы хранения,
 *   зоны аэропорта, санитарные требования…), цвета типов зон, габариты техники
 *   и привязка рабочих зон к типам объекта. Ведётся руками.
 *
 * Свои списки в коде не заводим: новое значение добавляется в JSON. В данных
 * храним id, label — только для показа.
 */

import categories from '../../../../backend/contracts/dictionaries/categories.json';
import formOptions from '../../../../backend/contracts/dictionaries/form_options.json';
import type { ObjectType, ZoneType } from '../types/contracts';

export interface DictItem {
  id: string;
  label: string;
  /** Как то же значение называется в других справочниках (транслит, прежние id) */
  aliases?: string[];
  /** Укрупнённая группа из книги Артёма: «Мобильные роботы», «БАС», … */
  group?: string;
}

export interface WorkingZoneItem extends DictItem {
  zone_type: ZoneType;
  object_types: ObjectType[];
}

export interface ZoneTypeItem extends DictItem {
  id: ZoneType;
  color: string;
}

export interface EquipmentCategoryItem extends DictItem {
  /** Габарит для отрисовки на плане, м: [длина, ширина] */
  footprint_m: [number, number];
}

export interface Categories {
  version: number;
  zone_types: ZoneTypeItem[];
  working_zones: WorkingZoneItem[];
  point_kinds: DictItem[];
  equipment_categories: EquipmentCategoryItem[];
  tasks: DictItem[];
  environments: DictItem[];
  operating_modes: DictItem[];
  storage_types: DictItem[];
  layout_constraints: DictItem[];
  airport_zones: DictItem[];
  safety_requirements: DictItem[];
  facility_types: DictItem[];
  medical_cargo_categories: DictItem[];
  routes_and_elevators: DictItem[];
  sanitary_requirements: DictItem[];
  access_restrictions: DictItem[];
  processes: DictItem[];
}

const ALL_OBJECT_TYPES: ObjectType[] = ['warehouse', 'airport', 'medical'];

const zoneObjectTypes = formOptions.working_zone_object_types as Record<string, ObjectType[]>;
const footprints = formOptions.equipment_footprints as unknown as Record<string, [number, number]>;

/**
 * Склейка двух файлов. Зоны и оборудование приходят из генерируемого
 * справочника, а то, чего в таблице Артёма нет (к каким объектам относится
 * зона, каким габаритом рисовать технику), добавляется из form_options.json.
 */
export const CATEGORIES: Categories = {
  version: (categories as { version: number }).version,
  zone_types: formOptions.zone_types as ZoneTypeItem[],
  working_zones: (categories as unknown as { working_zones: (DictItem & { zone_type: ZoneType })[] }).working_zones.map((z) => ({
    ...z,
    object_types: zoneObjectTypes[z.id] ?? ALL_OBJECT_TYPES,
  })),
  point_kinds: (categories as unknown as { point_kinds: DictItem[] }).point_kinds,
  equipment_categories: (categories as unknown as { equipment_categories: DictItem[] }).equipment_categories.map((c) => ({
    ...c,
    footprint_m: footprints[c.id] ?? footprints.default,
  })),
  tasks: (categories as unknown as { tasks: DictItem[] }).tasks,
  environments: (categories as unknown as { environments: DictItem[] }).environments,
  operating_modes: formOptions.operating_modes,
  storage_types: formOptions.storage_types,
  layout_constraints: formOptions.layout_constraints,
  airport_zones: formOptions.airport_zones,
  safety_requirements: formOptions.safety_requirements,
  facility_types: formOptions.facility_types,
  medical_cargo_categories: formOptions.medical_cargo_categories,
  routes_and_elevators: formOptions.routes_and_elevators,
  sanitary_requirements: formOptions.sanitary_requirements,
  access_restrictions: formOptions.access_restrictions,
  processes: formOptions.processes,
};

export type DictSection = Exclude<keyof Categories, 'version'>;

/** Префикс для значений, вписанных пользователем вручную, а не выбранных из справочника. */
export const CUSTOM_PREFIX = 'custom:';

export function optionsOf(section: DictSection): { value: string; label: string }[] {
  return (CATEGORIES[section] as DictItem[]).map((i) => ({ value: i.id, label: i.label }));
}

/** Подпись по id; для «своих» значений — сам текст без префикса. */
export function labelOf(section: DictSection, id: string): string {
  if (id.startsWith(CUSTOM_PREFIX)) return id.slice(CUSTOM_PREFIX.length);
  const items = CATEGORIES[section] as DictItem[];
  return (items.find((i) => i.id === id) ?? items.find((i) => i.aliases?.includes(id)))?.label ?? id;
}

export function workingZone(id: string): WorkingZoneItem | undefined {
  return CATEGORIES.working_zones.find((z) => z.id === id);
}

export function zoneType(id: ZoneType): ZoneTypeItem {
  return CATEGORIES.zone_types.find((z) => z.id === id) ?? CATEGORIES.zone_types[0];
}

/**
 * Главный id по значению: принимает и id из справочника, и алиас (прежние
 * английские id форм, транслит редактора). Неизвестное значение возвращается
 * как есть — его покажем как «своё».
 */
export function resolveId(section: DictSection, value: string): string {
  const items = CATEGORIES[section] as DictItem[];
  if (items.some((i) => i.id === value)) return value;
  const byAlias = items.find((i) => i.aliases?.includes(value));
  return byAlias?.id ?? value;
}

/** Габарит техники на плане, м: [длина, ширина] */
export function footprintOf(categoryId: string | null | undefined): [number, number] {
  const id = categoryId ? resolveId('equipment_categories', categoryId) : '';
  return footprints[id] ?? footprints.default;
}

export const solutionTypeLabel = (id: string) => labelOf('equipment_categories', resolveId('equipment_categories', id));
