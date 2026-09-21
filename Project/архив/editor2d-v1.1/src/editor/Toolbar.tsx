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
    return [
      { title: "Зоны", items: dict.ofKind("place_zone").filter(match) },
      { title: "Точки", items: dict.ofKind("place_point").filter(match) },
      { title: "Оборудование", items: dict.ofKind("equipment").filter(match) },
    ];
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

      {sections.map((s) => (
        <details key={s.title} open>
          <summary>
            {s.title} <span className="muted">{s.items.length}</span>
          </summary>
          {s.items.length === 0 && <p className="muted small">Ничего не найдено</p>}
          {s.items.map((c) => {
            const t = toolFor(c);
            return (
              <button
                key={c.id}
                className={`palette-item ${toolKey(t) === active ? "active" : ""}`}
                onClick={() => onToolChange(t)}
                title={tooltip(c)}
              >
                <span className={c.kind === "place_zone" ? "swatch square" : "swatch"} style={{ background: colorFor(c) }} />
                {c.name}
              </button>
            );
          })}
        </details>
      ))}

      <p className="muted small">
        Задачи и условия среды (холод, взрывоопасность…) назначаются зоне или точке в панели свойств.
      </p>
    </nav>
  );
}
