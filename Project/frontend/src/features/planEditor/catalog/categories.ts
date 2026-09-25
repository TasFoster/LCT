// Справочник категорий для редактора. Своего файла у редактора нет: визард отдаёт
// общий справочник в пропсе `categories` (backend/contracts/dictionaries/categories.json,
// собирается из книг Артёма, + form_options.json). Здесь он только раскладывается
// так, как удобно редактору: по видам и по разделам.
import type { Categories, DictItem } from '../../../shared/dictionaries';
import { CUSTOM_PREFIX } from '../../../shared/dictionaries';
import type { ZoneType } from '../scene/types';

export type CategoryKind =
  | 'equipment' // ставится на план как робот
  | 'place_zone' // рисуется как зона
  | 'place_point' // ставится как ключевая точка
  | 'task' // задача — назначается зоне/точке
  | 'environment'; // условие среды — назначается зоне/точке

/** Группа для записей справочника без раздела — показываем последней. */
export const NO_GROUP = 'Без раздела';

export interface Category {
  /** Главный id из справочника — он и хранится в сцене */
  id: string;
  name: string;
  kind: CategoryKind;
  /** Раздел книги Артёма: «Мобильные роботы», «Воздушные роботы (БАС)»… */
  group: string;
  /** Другие названия той же категории (транслит, прежние id форм) — принимаются на входе */
  aliases: string[];
  zone_type?: ZoneType;
  point_kind?: 'operation' | 'charging';
}

const ZONE_TYPES: ZoneType[] = ['storage', 'operation', 'charging', 'restricted', 'transit'];

/** Разделы общего справочника, которые нужны редактору, и во что они превращаются. */
const SECTIONS: { section: 'equipment_categories' | 'working_zones' | 'point_kinds' | 'tasks' | 'environments'; kind: CategoryKind }[] = [
  { section: 'equipment_categories', kind: 'equipment' },
  { section: 'working_zones', kind: 'place_zone' },
  { section: 'point_kinds', kind: 'place_point' },
  { section: 'tasks', kind: 'task' },
  { section: 'environments', kind: 'environment' },
];

export class CategoryDictionary {
  readonly all: Category[];
  /** Цвет типа зоны из form_options.json → zone_types */
  readonly zoneColors: Record<ZoneType, string>;
  readonly zoneTypeLabels: Record<ZoneType, string>;
  private byId: Map<string, Category>;
  private byAlias: Map<string, Category>;

  constructor(categories: Category[], zoneTypes: { id: ZoneType; label: string; color: string }[] = []) {
    this.all = categories;
    this.byId = new Map(categories.map((c) => [c.id, c]));
    // чужие названия той же категории: главный id имеет приоритет
    this.byAlias = new Map();
    for (const c of categories) {
      for (const a of c.aliases) if (!this.byId.has(a) && !this.byAlias.has(a)) this.byAlias.set(a, c);
    }
    const fallback = { id: 'operation' as ZoneType, label: 'Зона', color: '#8b95a1' };
    const zt = (t: ZoneType) => zoneTypes.find((z) => z.id === t) ?? { ...fallback, id: t };
    this.zoneColors = Object.fromEntries(ZONE_TYPES.map((t) => [t, zt(t).color])) as Record<ZoneType, string>;
    this.zoneTypeLabels = Object.fromEntries(ZONE_TYPES.map((t) => [t, zt(t).label])) as Record<ZoneType, string>;
  }

  /** Категория по главному id или по другому её названию. */
  get(id: string): Category | undefined {
    return this.byId.get(id) ?? this.byAlias.get(id);
  }

  /** Главный id: «robot_shtabeler» -> «stacker». Незнакомое и «custom:…» возвращаем как есть. */
  canonical(id: string): string {
    return this.get(id)?.id ?? id;
  }

  /** Подпись для показа; «custom:текст» — сам текст, незнакомый id — как есть, чтобы не терять данные. */
  name(id: string): string {
    if (id.startsWith(CUSTOM_PREFIX)) return id.slice(CUSTOM_PREFIX.length);
    return this.get(id)?.name ?? id;
  }

  ofKind(...kinds: CategoryKind[]): Category[] {
    return this.all.filter((c) => kinds.includes(c.kind));
  }

  /** Категории вида по разделам — в порядке первого появления раздела; «Без раздела» последним. */
  byGroup(...kinds: CategoryKind[]): { group: string; items: Category[] }[] {
    const groups = new Map<string, Category[]>();
    for (const c of this.ofKind(...kinds)) {
      const list = groups.get(c.group);
      if (list) list.push(c);
      else groups.set(c.group, [c]);
    }
    const rest = groups.get(NO_GROUP);
    groups.delete(NO_GROUP);
    const out = [...groups].map(([group, items]) => ({ group, items }));
    if (rest) out.push({ group: NO_GROUP, items: rest });
    return out;
  }
}

/**
 * Раскладывает общий справочник визарда для редактора. Записи без id или с повтором
 * пропускаются с предупреждением: справочник собирается из внешних таблиц и может дрейфовать.
 */
export function dictionaryFrom(source: Categories): { dict: CategoryDictionary; warnings: string[] } {
  const warnings: string[] = [];
  const seen = new Set<string>();
  const categories: Category[] = [];
  for (const { section, kind } of SECTIONS) {
    for (const raw of (source[section] ?? []) as (DictItem & { zone_type?: string; point_kind?: string })[]) {
      if (!raw || typeof raw.id !== 'string' || typeof raw.label !== 'string') {
        warnings.push(`${section}: запись без id или label пропущена`);
        continue;
      }
      if (seen.has(raw.id)) {
        warnings.push(`${section}: повтор id «${raw.id}» — вторая запись пропущена`);
        continue;
      }
      seen.add(raw.id);
      const c: Category = {
        id: raw.id,
        name: raw.label,
        kind,
        group: raw.group?.trim() || NO_GROUP,
        aliases: Array.isArray(raw.aliases) ? raw.aliases.filter((a) => typeof a === 'string') : [],
      };
      if (kind === 'place_zone') c.zone_type = ZONE_TYPES.includes(raw.zone_type as ZoneType) ? (raw.zone_type as ZoneType) : 'operation';
      if (kind === 'place_point') c.point_kind = raw.point_kind === 'charging' ? 'charging' : 'operation';
      categories.push(c);
    }
  }
  return { dict: new CategoryDictionary(categories, source.zone_types ?? []), warnings };
}
