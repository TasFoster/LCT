import { useMemo, useState } from "react";
import type { Category, CategoryDictionary } from "../catalog/categories";
import { CHARGE_COLOR, OP_COLOR, ROBOT_COLOR, ZONE_COLORS } from "../scene/colors";
import { BASE_TOOLS, toolKey, type Tool } from "./tools";

interface Props {
  dict: CategoryDictionary;
  tool: Tool;
  onToolChange: (tool: Tool) => void;
}

function toolFor(c: Category): Tool {
  if (c.kind === "place_zone") return { type: "zone", zoneType: c.zone_type ?? "operation", category: c.id };
  if (c.kind === "place_point") return { type: "point", pointKind: c.point_kind ?? "operation", category: c.id };
  return { type: "robot", category: c.id };
}

function colorFor(c: Category): string {
  if (c.kind === "place_zone") return ZONE_COLORS[c.zone_type ?? "operation"].stroke;
  if (c.kind === "place_point") return c.point_kind === "charging" ? CHARGE_COLOR : OP_COLOR;
  return ROBOT_COLOR;
}

function PaletteItem({
  category,
  active,
  onToolChange,
}: {
  category: Category;
  active: string;
  onToolChange: (tool: Tool) => void;
}) {
  const tool = toolFor(category);
  return (
    <button
      className={`palette-item ${toolKey(tool) === active ? "active" : ""}`}
      onClick={() => onToolChange(tool)}
      title={tooltip(category)}
    >
      <span
        className={category.kind === "place_zone" ? "swatch square" : "swatch"}
        style={{ background: colorFor(category) }}
      />
      {category.name}
    </button>
  );
}

const tooltip = (c: Category) =>
  [c.description, c.examples.length ? `Примеры: ${c.examples.join(", ")}` : ""].filter(Boolean).join("\n");

export function Toolbar({ dict, tool, onToolChange }: Props) {
  const [query, setQuery] = useState("");
  const active = toolKey(tool);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (c: Category) =>
      !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) ||
      c.examples.some((e) => e.toLowerCase().includes(q));
    // Оборудование разложено по разделам таблицы Артёма (поле group в справочнике),
    // иначе это плоский список из 39 видов техники.
    const equipment = dict
      .byGroup("equipment")
      .map((g) => ({ ...g, items: g.items.filter(match) }))
      .filter((g) => g.items.length > 0);
    return {
      flat: [
        { title: "Зоны", items: dict.ofKind("place_zone").filter(match) },
        { title: "Точки", items: dict.ofKind("place_point").filter(match) },
      ],
      equipment,
      equipmentCount: equipment.reduce((n, g) => n + g.items.length, 0),
      searching: q.length > 0,
    };
  }, [dict, query]);

  return (
    <nav className="toolbar">
      <div className="tool-grid">
        {BASE_TOOLS.map((b) => (
          <button
            key={b.label}
            className={toolKey(b.tool) === active ? "active" : ""}
            onClick={() => onToolChange(b.tool)}
            title={`${b.label} (${b.hotkey})`}
          >
            <span className="swatch" style={{ background: b.color }} />
            {b.label}
            <kbd>{b.hotkey}</kbd>
          </button>
        ))}
      </div>

      <input
        className="search"
        type="search"
        placeholder="Поиск по категориям…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {sections.flat.map((s) => (
        <details key={s.title} open>
          <summary>
            {s.title} <span className="muted">{s.items.length}</span>
          </summary>
          {s.items.length === 0 && <p className="muted small">Ничего не найдено</p>}
          {s.items.map((c) => (
            <PaletteItem key={c.id} category={c} active={active} onToolChange={onToolChange} />
          ))}
        </details>
      ))}

      <details open>
        <summary>
          Оборудование <span className="muted">{sections.equipmentCount}</span>
        </summary>
        {sections.equipment.length === 0 && <p className="muted small">Ничего не найдено</p>}
        {sections.equipment.map((g, i) => (
          // при поиске разделы раскрыты; key с признаком поиска — чтобы состояние пересоздалось
          <details key={`${g.group}${sections.searching ? "-q" : ""}`} className="group" open={sections.searching || i === 0}>
            <summary>
              {g.group} <span className="muted">{g.items.length}</span>
            </summary>
            {g.items.map((c) => (
              <PaletteItem key={c.id} category={c} active={active} onToolChange={onToolChange} />
            ))}
          </details>
        ))}
      </details>

      <p className="muted small">
        Задачи и условия среды (холод, взрывоопасность…) назначаются зоне или точке в панели свойств.
      </p>
    </nav>
  );
}
