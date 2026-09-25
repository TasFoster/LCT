import { useEffect, useMemo, useRef } from 'react';
import { canonicalizeScene } from './catalog/canonicalize';
import { dictionaryFrom, type CategoryDictionary } from './catalog/categories';
import { Palette } from './editor/Palette';
import { Properties } from './editor/Properties';
import { SceneView } from './editor/SceneView';
import { BASE_TOOLS, SELECT_TOOL, hintFor, type Tool } from './editor/tools';
import { useEditor } from './editor/useEditor';
import { useImage } from './editor/useImage';
import { usePalette } from './editor/usePalette';
import { emptyScene, normalize, withDefaults } from './scene/ops';
import type { Scene } from './scene/types';
import type { PlanEditorProps } from './types';

const RAIL_W = 48;
const PANEL_W = 264;
/** Ниже этой высоты редактор не сжимается — визард даёт странице прокрутиться (1366×768 минус вкладки браузера ≈ 400) */
const MIN_H = 400;

/** Сцена из пропса в том виде, с которым работает редактор: схема дополнена, производные поля пересчитаны, категории — главные id. */
function prepare(value: Scene, dict: CategoryDictionary): Scene {
  return canonicalizeScene(normalize(withDefaults(value)), dict);
}

/**
 * 2D-редактор плана объекта (контракт 6, `Project/scene.md`) — модуль визарда, шаг 7.
 * Данные приходят в `value`, каждое изменение уходит наружу `onChange` полным новым
 * объектом; сохранение, статусы и ошибки сервера — у визарда. Справочник — из
 * пропса `categories`, замечания по плану — из `warnings` (их считает сервер).
 */
export function PlanEditor(props: PlanEditorProps) {
  const { value, categories, width, readOnly, onChange } = props;
  const height = Math.max(MIN_H, props.height);
  const { dict, warnings: dictWarnings } = useMemo(() => dictionaryFrom(categories), [categories]);
  useEffect(() => dictWarnings.forEach((w) => console.warn(`[planEditor: справочник] ${w}`)), [dictWarnings]);

  // сцену нельзя открыть (нет габаритов площадки и т. п.) — не падаем, а говорим, что не так
  const opened = useMemo(() => {
    if (!value) return null;
    try {
      return { scene: prepare(value, dict), error: null };
    } catch (e) {
      return { scene: null, error: (e as Error).message };
    }
  }, [value, dict]);

  if (!value || !opened?.scene) {
    return (
      <div className="plan-editor" style={{ width, height }}>
        <div className="plan-editor__rail" aria-hidden />
        <div className="plan-editor__canvas" style={{ width: Math.max(0, width - RAIL_W - PANEL_W), height }}>
          <div className="plan-editor__empty">
            <strong>{value ? 'План не открывается' : 'Плана объекта ещё нет'}</strong>
            <span className="muted">
              {value
                ? `В сохранённом плане ошибка: ${opened?.error}. Можно собрать черновик заново или начать с пустого плана.`
                : 'Нажмите «Черновик из параметров» наверху — зоны, точки, зарядка и роботы расставятся по форме, дальше их можно править. Или начните с пустого плана.'}
            </span>
            {!readOnly && (
              <button type="button" className="btn btn--sm" onClick={() => onChange(emptyScene())}>
                Пустой план
              </button>
            )}
          </div>
        </div>
        <div className="plan-editor__panel" />
      </div>
    );
  }

  return <EditorBody {...props} height={height} dict={dict} initial={opened.scene} />;
}

function EditorBody({
  value,
  onChange,
  context,
  warnings,
  onUploadBackground,
  width,
  height,
  readOnly = false,
  dict,
  initial,
}: PlanEditorProps & { dict: CategoryDictionary; initial: Scene }) {
  const root = useRef<HTMLDivElement>(null);
  const ed = useEditor(initial, dict, { readOnly, scope: root });
  const palette = usePalette();
  const { scene } = ed;
  const background = useImage(scene.site.background?.image_url);

  // Связь с визардом. prop — последний value, который мы видели или отдали сами;
  // present — какой сцене в редакторе он соответствует.
  const synced = useRef<{ prop: Scene | null; present: Scene }>({ prop: value, present: initial });

  // правка в редакторе → наружу полным объектом (входной value не трогаем)
  useEffect(() => {
    if (ed.scene === synced.current.present) return;
    synced.current = { prop: ed.scene, present: ed.scene };
    onChange(ed.scene);
    // onChange визарда может меняться на каждом рендере — реагируем только на сцену
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ed.scene]);

  // новая сцена снаружи (черновик из параметров, ссылка на подложку, версия с сервера) → в редактор
  useEffect(() => {
    if (!value || value === synced.current.prop) return;
    try {
      const next = prepare(value, dict);
      synced.current = { prop: value, present: next };
      ed.acceptExternal(next);
    } catch (e) {
      console.warn(`[planEditor] сцена снаружи не открылась: ${(e as Error).message}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, dict]);

  // в режиме просмотра — только выбор
  useEffect(() => {
    if (readOnly) ed.setTool(SELECT_TOOL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly]);

  const flagged = useMemo(() => {
    const m = new Map<string, 'error' | 'warning' | 'info'>();
    const rank = { error: 3, warning: 2, info: 1 };
    for (const w of warnings) {
      if (!w.target_id) continue;
      const prev = m.get(w.target_id);
      if (!prev || rank[w.severity] > rank[prev]) m.set(w.target_id, w.severity);
    }
    return m;
  }, [warnings]);

  // робот с рейки: первый из состава оборудования (шаг 4), иначе первый вид техники справочника
  const robotTool = useMemo((): Tool | null => {
    const r = context.robots[0];
    if (r) return { type: 'robot', category: dict.canonical(r.category_id), catalogItemId: r.catalog_item_id, label: r.name };
    const first = dict.ofKind('equipment')[0];
    return first ? { type: 'robot', category: first.id } : null;
  }, [context.robots, dict]);

  const canvasW = Math.max(200, width - RAIL_W - PANEL_W);
  const canvasH = height;
  const active = ed.tool.type;
  const placing = active === 'zone' || active === 'point' || active === 'robot';
  const needed = context.robots.reduce((n, r) => n + r.quantity, 0);
  // точка и зарядка — один инструмент с разным видом точки: подсвечиваем ту кнопку, чей вид выбран
  const isOn = (t: Tool) => (t.type === 'point' ? ed.tool.type === 'point' && ed.tool.pointKind === t.pointKind : t.type === active);

  return (
    <div className="plan-editor" style={{ width, height }} ref={root}>
      <div className="plan-editor__rail" role="toolbar" aria-label="Инструменты">
        {BASE_TOOLS.map((b) => {
          const on = isOn(b.tool);
          return (
            <button
              key={b.label}
              type="button"
              className={on ? 'is-active' : undefined}
              disabled={readOnly && b.tool.type !== 'select'}
              onClick={() => ed.setTool(b.tool)}
              title={`${b.label} (${b.hotkey})`}
              aria-label={b.label}
              aria-pressed={on}
            >
              {b.glyph}
            </button>
          );
        })}
        <button
          type="button"
          className={active === 'robot' ? 'is-active' : undefined}
          disabled={readOnly || !robotTool}
          onClick={() => robotTool && ed.setTool(robotTool)}
          title="Робот"
          aria-label="Робот"
          aria-pressed={active === 'robot'}
        >
          ◆
        </button>
        <span className="plan-editor__rail-sep" />
        <button type="button" disabled={readOnly || !ed.canUndo} onClick={ed.undo} title="Отменить (Ctrl+Z)" aria-label="Отменить">
          ↶
        </button>
        <button type="button" disabled={readOnly || !ed.canRedo} onClick={ed.redo} title="Повторить (Ctrl+Y)" aria-label="Повторить">
          ↷
        </button>
      </div>

      <div className="plan-editor__canvas" style={{ width: canvasW, height: canvasH }}>
        <SceneView
          scene={scene}
          background={background}
          palette={palette}
          zoneColors={dict.zoneColors}
          flagged={flagged}
          editable={!readOnly}
          width={canvasW}
          height={canvasH}
          tool={ed.tool}
          selectedId={ed.selected?.data.id ?? null}
          draft={ed.draft}
          hover={ed.hover}
          onSelect={ed.select}
          onClick={ed.handleClick}
          onDoubleClick={ed.handleDoubleClick}
          onHover={ed.handleHover}
          onDrag={ed.handleDrag}
          onVertexMove={ed.moveVertex}
          onZoneMove={ed.moveZone}
          onVertexInsert={ed.insertVertex}
          onVertexDelete={ed.deleteVertex}
        />
        {ed.draft.length > 0 && (
          <div className="plan-editor__drawbar">
            <span>
              {active === 'zone' ? 'Зона' : active === 'wall' ? 'Стена' : 'Маршрут'}: {ed.draft.length} верш.
              {ed.draft.length < ed.minVertices ? ` — нужно ещё ${ed.minVertices - ed.draft.length}` : active === 'zone' ? ' — клик по первой вершине замкнёт' : ''}
            </span>
            <button type="button" className="btn btn--primary btn--sm" disabled={ed.draft.length < ed.minVertices} onClick={ed.finishDraft}>
              Готово
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={ed.cancelDraft}>
              Отмена
            </button>
          </div>
        )}
        <div className="plan-editor__hint">{readOnly ? 'Просмотр версии — правка недоступна' : hintFor(ed.tool, ed.selected?.kind ?? null)}</div>
      </div>

      <div className="plan-editor__panel">
        {placing && !readOnly ? (
          <Palette dict={dict} robots={context.robots} tool={ed.tool} onToolChange={ed.setTool} />
        ) : active === 'wall' || active === 'route' ? (
          <div className="plan-panel__section">
            <h4 className="plan-panel__title">{active === 'wall' ? 'Стена' : 'Маршрут'}</h4>
            <p className="faint plan-panel__hint">{hintFor(ed.tool, null)}</p>
          </div>
        ) : (
          <Properties
            dict={dict}
            scene={scene}
            background={background}
            selected={ed.selected}
            warnings={warnings}
            readOnly={readOnly}
            onSelectId={ed.selectById}
            onChange={ed.updateSelected}
            onSceneInfo={ed.updateSceneInfo}
            onResize={ed.resizePlan}
            onBackground={ed.setBackground}
            onUploadBackground={onUploadBackground}
            onDelete={ed.deleteSelected}
          />
        )}
        {needed > 0 && (
          <p className="faint plan-panel__hint">
            Роботов на плане: {scene.robots.length} из {needed} по составу оборудования
          </p>
        )}
      </div>
    </div>
  );
}
