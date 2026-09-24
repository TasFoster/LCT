import { useEffect, useState, type ReactNode } from "react";
import type { CategoryDictionary, CategoryKind } from "../catalog/categories";
import { ZONE_TYPE_LABELS } from "../scene/colors";
import type { Background, Scene, SceneObject, ZoneType } from "../scene/types";
import type { Issue } from "../scene/validate";
import { prepareBackgroundImage } from "./imageFile";
import type { ImageState } from "./useImage";

const KIND_LABELS: Record<SceneObject["kind"], string> = {
  zone: "Зона",
  wall: "Стена",
  operation_point: "Точка операции",
  charging_point: "Точка зарядки",
  route: "Маршрут",
  robot: "Робот",
};

// какие категории можно назначить зоне или точке
const ASSIGNABLE: { title: string; kinds: CategoryKind[] }[] = [
  { title: "Место", kinds: ["place_zone", "place_point"] },
  { title: "Задачи", kinds: ["task"] },
  { title: "Условия среды", kinds: ["environment"] },
];

interface Props {
  dict: CategoryDictionary;
  scene: Scene;
  background: ImageState;
  selected: SceneObject | null;
  issues: Issue[];
  onSelectId: (id: string) => void;
  onChange: (obj: SceneObject, mergeKey?: string) => void;
  onSceneInfo: (fields: { name?: string; project_id?: string }, mergeKey?: string) => void;
  onResize: (width: number, height: number, mergeKey?: string) => void;
  onBackground: (bg: Background | null, mergeKey?: string) => void;
  onDelete: () => void;
  /** Блок обмена с сервером платформы; null — редактор встроен в визард, на сервер ходит он. */
  server?: ReactNode;
}

export function Properties({ dict, scene, background, selected, issues, onSelectId, onChange, onSceneInfo, onResize, onBackground, onDelete, server }: Props) {
  if (!selected) {
    return (
      <aside className="properties">
        <h3>Сцена</h3>
        <label className="field">
          Название
          <input value={scene.name} onChange={(e) => onSceneInfo({ name: e.target.value }, "scene:name")} />
        </label>
        <label className="field">
          Проект (project_id)
          <input
            value={scene.project_id}
            onChange={(e) => onSceneInfo({ project_id: e.target.value }, "scene:project_id")}
          />
        </label>
        <div className="field-row">
          <label className="field">
            Ширина плана, м
            <NumberField value={scene.site.width} min={1} onCommit={(w) => onResize(w, scene.site.height, "scene:width")} />
          </label>
          <label className="field">
            Высота плана, м
            <NumberField value={scene.site.height} min={1} onCommit={(h) => onResize(scene.site.width, h, "scene:height")} />
          </label>
        </div>
        <BackgroundFields scene={scene} state={background} onChange={onBackground} />
        {server}
        <h3>Состав сцены</h3>
        <ul className="counts">
          <li>Зоны: {scene.zones.length}</li>
          <li>Стены: {scene.walls.length}</li>
          <li>Маршруты: {scene.routes.length}</li>
          <li>Точки операций: {scene.operation_points.length}</li>
          <li>Точки зарядки: {scene.charging_points.length}</li>
          <li>Роботы: {scene.robots.length}</li>
        </ul>
        <p className="muted">Выберите инструмент слева или кликните по объекту на плане.</p>
        <IssueList issues={issues} onSelectId={onSelectId} />
      </aside>
    );
  }

  // обновить поля выбранного объекта, сохранив его вид
  const patch = (fields: object) => onChange({ ...selected, data: { ...selected.data, ...fields } } as SceneObject);
  // для полей ввода: пока печатают в одно поле, изменения сливаются в один шаг отмены
  const typing = (field: string, fields: object) =>
    onChange({ ...selected, data: { ...selected.data, ...fields } } as SceneObject, `${selected.data.id}:${field}`);
  const { kind, data } = selected;

  return (
    <aside className="properties">
      <h3>{KIND_LABELS[kind]}</h3>
      <IssueList issues={issues.filter((i) => i.objectId === data.id)} onSelectId={onSelectId} compact />
      <label className="field">
        Название
        <input value={data.name} onChange={(e) => typing("name", { name: e.target.value })} />
      </label>

      {kind === "zone" && (
        <label className="field">
          Тип зоны
          <select value={data.zone_type} onChange={(e) => patch({ zone_type: e.target.value as ZoneType })}>
            {Object.entries(ZONE_TYPE_LABELS).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}

      {kind === "wall" && (
        <label className="field">
          Толщина, м
          <NumberField value={data.thickness} min={0.01} onCommit={(thickness) => typing("thickness", { thickness })} />
        </label>
      )}

      {kind === "charging_point" && (
        <label className="field">
          Мест для зарядки
          <NumberField value={data.slots} min={1} integer onCommit={(slots) => typing("slots", { slots })} />
        </label>
      )}

      {(kind === "zone" || kind === "operation_point" || kind === "charging_point") && (
        <CategoriesField dict={dict} value={data.categories} onChange={(categories) => patch({ categories })} />
      )}

      {kind === "route" && (
        <label className="check">
          <input type="checkbox" checked={data.bidirectional} onChange={(e) => patch({ bidirectional: e.target.checked })} />
          Движение в обе стороны
        </label>
      )}

      {kind === "robot" && (
        <>
          <label className="field">
            Вид оборудования
            <select value={data.category} onChange={(e) => patch({ category: e.target.value })}>
              {!dict.get(data.category) && <option value={data.category}>{data.category || "— не задан —"}</option>}
              {dict.ofKind("equipment").map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Модель из каталога
            <input
              value={data.catalog_item_id ?? ""}
              placeholder="подберёт матчинг"
              onChange={(e) => typing("catalog_item_id", { catalog_item_id: e.target.value || null })}
            />
          </label>
          <label className="field">
            Курс на старте, °
            <NumberField
              value={data.start_heading_deg}
              step={15}
              onCommit={(start_heading_deg) => typing("start_heading_deg", { start_heading_deg })}
            />
          </label>
          <label className="field">
            Своя зарядка
            <select
              value={data.home_charging_point_id ?? ""}
              onChange={(e) => patch({ home_charging_point_id: e.target.value || null })}
            >
              <option value="">— нет —</option>
              {scene.charging_points.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {kind !== "robot" && <TagsField value={data.tags} onChange={(tags) => patch({ tags })} />}

      <button className="danger" onClick={onDelete}>
        Удалить (Delete)
      </button>

      <details className="raw">
        <summary>JSON объекта</summary>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </details>
    </aside>
  );
}

/** Подложка плана: загрузка картинки, положение, ширина (высота — по пропорциям), прозрачность. */
function BackgroundFields({
  scene,
  state,
  onChange,
}: {
  scene: Scene;
  state: ImageState;
  onChange: (bg: Background | null, mergeKey?: string) => void;
}) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const bg = scene.site.background;

  const upload = async (file: File) => {
    try {
      const img = await prepareBackgroundImage(file);
      // по ширине плана, с сохранением пропорций картинки
      const width = scene.site.width;
      onChange({ image_url: img.url, x: 0, y: 0, width, height: (width * img.height) / img.width, opacity: 0.5 });
      setLoadError(null);
    } catch (e) {
      setLoadError(`${file.name}: ${(e as Error).message}`);
    }
  };

  return (
    <div className="field">
      Подложка (скан плана)
      {bg && (
        <>
          <div className="field-row">
            <label className="field">
              X, м
              <NumberField value={bg.x} onCommit={(x) => onChange({ ...bg, x }, "bg:x")} />
            </label>
            <label className="field">
              Y, м
              <NumberField value={bg.y} onCommit={(y) => onChange({ ...bg, y }, "bg:y")} />
            </label>
            <label className="field">
              Ширина, м
              <NumberField
                value={bg.width}
                min={0.1}
                onCommit={(width) => onChange({ ...bg, width, height: (bg.height * width) / bg.width }, "bg:width")}
              />
            </label>
          </div>
          <label className="field">
            Прозрачность: {Math.round(bg.opacity * 100)}%
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={bg.opacity}
              onChange={(e) => onChange({ ...bg, opacity: Number(e.target.value) }, "bg:opacity")}
            />
          </label>
        </>
      )}
      {state.status === "error" && <span className="issue warning">⚠ Подложка не загрузилась: {state.url}</span>}
      {loadError && <span className="issue error">✖ {loadError}</span>}
      <div className="field-row">
        <label className="button small-button">
          {bg ? "Заменить картинку…" : "Загрузить картинку…"}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = "";
            }}
          />
        </label>
        {bg && (
          <button className="small-button" onClick={() => onChange(null)}>
            Убрать
          </button>
        )}
      </div>
    </div>
  );
}

function IssueList({ issues, onSelectId, compact }: { issues: Issue[]; onSelectId: (id: string) => void; compact?: boolean }) {
  const errors = issues.filter((i) => i.level === "error").length;
  if (compact && issues.length === 0) return null;
  return (
    <div className="issues">
      {!compact && (
        <h3>
          Проверка{" "}
          <span className="muted small">
            {issues.length === 0 ? "— проблем нет" : `ошибок: ${errors}, предупреждений: ${issues.length - errors}`}
          </span>
        </h3>
      )}
      {issues.map((i, n) => (
        <button
          key={n}
          className={`issue ${i.level}`}
          disabled={!i.objectId}
          onClick={() => i.objectId && onSelectId(i.objectId)}
          title={i.objectId ? "Выбрать объект" : undefined}
        >
          {i.level === "error" ? "✖" : "⚠"} {i.message}
        </button>
      ))}
    </div>
  );
}

function CategoriesField({
  dict,
  value,
  onChange,
}: {
  dict: CategoryDictionary;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="field">
      Категории
      <div className="chips">
        {value.length === 0 && <span className="muted small">не назначены</span>}
        {value.map((id) => (
          <span key={id} className={`chip ${dict.get(id) ? "" : "unknown"}`} title={dict.get(id)?.description ?? "нет в справочнике"}>
            {dict.name(id)}
            <button aria-label="Убрать" onClick={() => onChange(value.filter((v) => v !== id))}>
              ×
            </button>
          </span>
        ))}
      </div>
      <select
        value=""
        onChange={(e) => e.target.value && onChange([...value, e.target.value])}
      >
        <option value="">+ добавить категорию</option>
        {ASSIGNABLE.map((g) => (
          <optgroup key={g.title} label={g.title}>
            {dict
              .ofKind(...g.kinds)
              .filter((c) => !value.includes(c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

/**
 * Числовое поле: набираемый текст хранится как есть (можно стереть всё или начать с «−»),
 * в сцену уходит только корректное число, а при уходе из поля показывается последнее корректное.
 * Обычное текстовое поле, а не type="number": тот подменяет недописанный текст («−», «1.») пустой строкой.
 */
function NumberField({
  value,
  onCommit,
  min,
  step,
  integer,
}: {
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  step?: number;
  integer?: boolean;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const parse = (t: string) => {
    if (t.trim() === "") return null;
    const n = Number(t);
    if (!Number.isFinite(n) || (integer && !Number.isInteger(n)) || (min !== undefined && n < min)) return null;
    return n;
  };
  const accept = (t: string) => {
    setText(t);
    const n = parse(t.replace(",", "."));
    if (n !== null && n !== value) onCommit(n);
  };
  return (
    <input
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      value={text}
      className={parse(text.replace(",", ".")) === null ? "invalid" : ""}
      onChange={(e) => accept(e.target.value)}
      onKeyDown={(e) => {
        // стрелки ↑/↓ — шаг, как у обычного числового поля
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
        e.preventDefault();
        const next = value + (e.key === "ArrowUp" ? 1 : -1) * (step ?? 1);
        accept(String(min !== undefined ? Math.max(min, next) : next));
      }}
      onBlur={() => setText(String(value))}
    />
  );
}

// теги правятся строкой через запятую и сохраняются при потере фокуса
function TagsField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const joined = value.join(", ");
  const [text, setText] = useState(joined);
  useEffect(() => setText(joined), [joined]);
  return (
    <label className="field">
      Теги
      <input
        value={text}
        placeholder="через запятую"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onChange(text.split(",").map((t) => t.trim()).filter(Boolean))}
      />
    </label>
  );
}
