import { useMemo, useState } from 'react';
import type { Category, CategoryDictionary } from '../catalog/categories';
import type { PlanEditorContext } from '../types';
import { toolKey, type Tool } from './tools';

interface Props {
  dict: CategoryDictionary;
  /** Роботы из состава оборудования (шаг 4 визарда) — их ставят в первую очередь */
  robots: PlanEditorContext['robots'];
  tool: Tool;
  onToolChange: (tool: Tool) => void;
}

function toolFor(c: Category): Tool {
  if (c.kind === 'place_zone') return { type: 'zone', zoneType: c.zone_type ?? 'operation', category: c.id };
  if (c.kind === 'place_point') return { type: 'point', pointKind: c.point_kind ?? 'operation', category: c.id };
  return { type: 'robot', category: c.id };
}

/**
 * Что именно ставить активным инструментом: вид зоны, точки, техники. Показывается
 * в панели справа — на рейке 48 px сотня категорий не поместится. Категории — из
 * справочника визарда; у оборудования — разделы книги Артёма.
 */
export function Palette({ dict, robots, tool, onToolChange }: Props) {
  const [query, setQuery] = useState('');
  const active = toolKey(tool);
  const q = query.trim().toLowerCase();

  const groups = useMemo(() => {
    const match = (c: Category) => !q || c.name.toLowerCase().includes(q) || c.group.toLowerCase().includes(q);
    const grouped = (kind: 'equipment' | 'place_zone') =>
      dict
        .byGroup(kind)
        .map((g) => ({ ...g, items: g.items.filter(match) }))
        .filter((g) => g.items.length > 0);
    if (tool.type === 'robot') return grouped('equipment');
    if (tool.type === 'zone') return grouped('place_zone');
    if (tool.type === 'point') {
      const items = dict.ofKind('place_point').filter((c) => (c.point_kind ?? 'operation') === tool.pointKind && match(c));
      return items.length ? [{ group: 'Вид точки', items }] : [];
    }
    return [];
  }, [dict, tool, q]);

  const item = (key: string, label: string, t: Tool, hint?: string) => {
    const on = toolKey(t) === active;
    return (
      <button key={key} type="button" className={`plan-palette__item${on ? ' is-active' : ''}`} onClick={() => onToolChange(t)} title={hint} aria-pressed={on}>
        {label}
      </button>
    );
  };

  const title =
    tool.type === 'zone' ? 'Какую зону рисуем' : tool.type === 'robot' ? 'Какого робота ставим' : tool.type === 'point' && tool.pointKind === 'charging' ? 'Зарядка' : 'Какую точку ставим';

  return (
    <div className="plan-palette">
      <h4 className="plan-panel__title">{title}</h4>

      {tool.type === 'zone' && item('none', 'Зона без категории', { type: 'zone', zoneType: tool.zoneType, category: null })}
      {tool.type === 'point' &&
        item('none', tool.pointKind === 'charging' ? 'Зарядка без категории' : 'Точка без категории', { type: 'point', pointKind: tool.pointKind, category: null })}

      {tool.type === 'robot' && robots.length > 0 && (
        <section className="plan-palette__group">
          <div className="plan-palette__group-title">Из состава оборудования</div>
          {robots.map((r) =>
            item(
              r.catalog_item_id,
              `${r.name} · ${r.quantity} шт.`,
              { type: 'robot', category: dict.canonical(r.category_id), catalogItemId: r.catalog_item_id, label: r.name },
              dict.name(r.category_id),
            ),
          )}
        </section>
      )}

      {(tool.type === 'robot' || tool.type === 'zone') && (
        <input
          className="input plan-palette__search"
          type="search"
          placeholder={tool.type === 'robot' ? 'Поиск по видам техники' : 'Поиск по зонам'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {groups.length === 0 && q && <p className="faint">Ничего не найдено</p>}
      {groups.map((g, i) => (
        // при поиске разделы раскрыты; key с признаком поиска — чтобы состояние пересоздалось
        <details key={`${g.group}${q ? '-q' : ''}`} className="plan-palette__group" open={Boolean(q) || i === 0 || groups.length === 1}>
          <summary className="plan-palette__group-title">
            {g.group} <span className="faint">{g.items.length}</span>
          </summary>
          {g.items.map((c) => item(c.id, c.name, toolFor(c)))}
        </details>
      ))}
    </div>
  );
}
