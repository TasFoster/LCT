// Справочник категорий Артёма. Сейчас это файл, собранный из xlsx скриптом
// tools/categories_from_xlsx.py; позже будет запрос к бэкенду — поменяется только loadCategories.
import data from "./categories.json";
import type { ZoneType } from "../scene/types";

export type CategoryKind =
  | "equipment" // ставится на план как робот
  | "place_zone" // рисуется как зона
  | "place_point" // ставится как ключевая точка
  | "task" // задача — назначается зоне/точке
  | "environment" // условие среды — назначается зоне/точке
  | "characteristic" // характеристика оборудования, в редакторе не используется
  | "software"; // ПО, на план не ставится

/** Категории без раздела в таблице Артёма показываем последней группой. */
export const NO_GROUP = "Без раздела";

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  /** Раздел таблицы Артёма: «1. Склад и внутрискладская логистика» и т.д. */
  group: string;
  applies_to: string;
  description: string;
  examples: string[];
  zone_type?: ZoneType;
  point_kind?: "operation" | "charging";
}

export class CategoryDictionary {
  readonly all: Category[];
  private byId: Map<string, Category>;

  constructor(categories: Category[]) {
    this.all = categories;
    this.byId = new Map(categories.map((c) => [c.id, c]));
  }

  get(id: string): Category | undefined {
    return this.byId.get(id);
  }

  /** Название для показа; неизвестный id показываем как есть, чтобы не терять данные. */
  name(id: string): string {
    return this.byId.get(id)?.name ?? id;
  }

  ofKind(...kinds: CategoryKind[]): Category[] {
    return this.all.filter((c) => kinds.includes(c.kind));
  }

  /**
   * Категории вида, разложенные по разделам таблицы Артёма и упорядоченные по номеру
   * раздела («1. Склад…», «2. Производство…»); «Без раздела» — всегда последним.
   */
  byGroup(...kinds: CategoryKind[]): { group: string; items: Category[] }[] {
    const groups = new Map<string, Category[]>();
    for (const c of this.ofKind(...kinds)) {
      const list = groups.get(c.group);
      if (list) list.push(c);
      else groups.set(c.group, [c]);
    }
    const rest = groups.get(NO_GROUP);
    groups.delete(NO_GROUP);
    // в справочнике разделы идут вперемешку: у техники из раздела 7 строка может
    // стоять раньше, чем у техники из раздела 6 — поэтому сортируем по номеру
    const number = (group: string) => Number(group.match(/^(\d+)\./)?.[1] ?? Number.MAX_SAFE_INTEGER);
    const out = [...groups]
      .map(([group, items]) => ({ group, items }))
      .sort((a, b) => number(a.group) - number(b.group));
    if (rest) out.push({ group: NO_GROUP, items: rest });
    return out;
  }
}

const KINDS: CategoryKind[] = ["equipment", "place_zone", "place_point", "task", "environment", "characteristic", "software"];
const ZONE_TYPES: ZoneType[] = ["storage", "operation", "charging", "restricted", "transit"];

/**
 * Проверяет записи справочника: файл собирается из xlsx скриптом, и после правок таблицы
 * в нём может оказаться то, чего редактор не знает. Такие записи не должны ронять интерфейс.
 */
export function validateCategories(raw: unknown[]): { categories: Category[]; warnings: string[] } {
  const categories: Category[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const item of raw as Partial<Category>[]) {
    if (!item || typeof item.id !== "string" || typeof item.name !== "string") {
      warnings.push(`запись без id или name пропущена: ${JSON.stringify(item)}`);
      continue;
    }
    if (seen.has(item.id)) {
      warnings.push(`повтор id «${item.id}» — вторая запись пропущена`);
      continue;
    }
    if (!KINDS.includes(item.kind as CategoryKind)) {
      warnings.push(`«${item.name}»: неизвестный kind «${item.kind}» — пропущена`);
      continue;
    }
    const c: Category = {
      id: item.id,
      name: item.name,
      kind: item.kind as CategoryKind,
      group: typeof item.group === "string" && item.group.trim() ? item.group : NO_GROUP,
      applies_to: item.applies_to ?? "",
      description: item.description ?? "",
      examples: Array.isArray(item.examples) ? item.examples : [],
    };
    if (c.kind === "place_zone") {
      c.zone_type = ZONE_TYPES.includes(item.zone_type as ZoneType) ? item.zone_type : "operation";
      if (c.zone_type !== item.zone_type) warnings.push(`«${c.name}»: zone_type «${item.zone_type}» заменён на operation`);
    }
    if (c.kind === "place_point") c.point_kind = item.point_kind === "charging" ? "charging" : "operation";
    seen.add(c.id);
    categories.push(c);
  }
  return { categories, warnings };
}

export function loadCategories(): CategoryDictionary {
  const { categories, warnings } = validateCategories(data.categories);
  warnings.forEach((w) => console.warn(`[categories.json] ${w}`));
  return new CategoryDictionary(categories);
}
