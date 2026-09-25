import { useId, useRef, useState } from 'react';
import type { SceneWarning } from '../../../shared/api/projectState';
import { Button, Checkbox, Chip, Field, NumberField, SelectField, TagsField, TextField } from '../../../shared/ui';
import type { CategoryDictionary, CategoryKind } from '../catalog/categories';
import type { Background, Scene, SceneObject, ZoneType } from '../scene/types';
import type { ImageState } from './useImage';

const KIND_LABELS: Record<SceneObject['kind'], string> = {
  zone: 'Зона',
  wall: 'Стена',
  operation_point: 'Точка операции',
  charging_point: 'Точка зарядки',
  route: 'Маршрут',
  robot: 'Робот',
};

// какие категории можно назначить зоне и точке: место, задачи, условия среды
const ZONE_CATEGORIES: CategoryKind[] = ['place_zone', 'task', 'environment'];
const POINT_CATEGORIES: CategoryKind[] = ['place_point', 'task', 'environment'];

const SEVERITY_TONE = { error: 'danger', warning: 'warn', info: 'info' } as const;

interface Props {
  dict: CategoryDictionary;
  scene: Scene;
  background: ImageState;
  selected: SceneObject | null;
  /** Замечания сервера по последнему сохранённому плану */
  warnings: SceneWarning[];
  readOnly: boolean;
  onSelectId: (id: string) => void;
  onChange: (obj: SceneObject, mergeKey?: string) => void;
  onSceneInfo: (fields: { name?: string }, mergeKey?: string) => void;
  onResize: (width: number, height: number, mergeKey?: string) => void;
  onBackground: (bg: Background | null, mergeKey?: string) => void;
  onUploadBackground: (file: File) => Promise<void>;
  onDelete: () => void;
}

export function Properties(props: Props) {
  const { dict, scene, selected, warnings, readOnly, onSelectId } = props;
  return (
    // fieldset disabled — в режиме просмотра все поля панели разом только для чтения
    <fieldset className="plan-panel__form" disabled={readOnly}>
      {selected ? <ObjectFields {...props} selected={selected} /> : <SceneFields {...props} />}
      <WarningList
        warnings={selected ? warnings.filter((w) => w.target_id === selected.data.id) : warnings}
        onSelectId={onSelectId}
        compact={Boolean(selected)}
        name={(id) => findName(scene, id) ?? id}
      />
      {!selected && !readOnly && <p className="faint plan-panel__hint">Выберите инструмент слева или кликните по объекту на плане.</p>}
      {selected && dict.all.length === 0 && <p className="faint">Справочник категорий пуст.</p>}
    </fieldset>
  );
}

function findName(scene: Scene, id: string): string | undefined {
  return [...scene.zones, ...scene.walls, ...scene.operation_points, ...scene.charging_points, ...scene.routes, ...scene.robots].find((o) => o.id === id)?.name;
}

function SceneFields({ scene, background, onSceneInfo, onResize, onBackground, onUploadBackground }: Props) {
  return (
    <>
      <h4 className="plan-panel__title">План объекта</h4>
      <TextField label="Название" value={scene.name} onChange={(name) => onSceneInfo({ name }, 'scene:name')} />
      <div className="plan-panel__row">
        <NumberField
          label="Ширина"
          unit="м"
          value={scene.site.width}
          onChange={(w) => w !== null && w >= 1 && onResize(w, scene.site.height, 'scene:width')}
        />
        <NumberField
          label="Высота"
          unit="м"
          value={scene.site.height}
          onChange={(h) => h !== null && h >= 1 && onResize(scene.site.width, h, 'scene:height')}
        />
      </div>
      <BackgroundFields scene={scene} state={background} onChange={onBackground} onUpload={onUploadBackground} />
      <ul className="plan-panel__counts">
        <li>Зоны: {scene.zones.length}</li>
        <li>Стены: {scene.walls.length}</li>
        <li>Маршруты: {scene.routes.length}</li>
        <li>Точки: {scene.operation_points.length}</li>
        <li>Зарядки: {scene.charging_points.length}</li>
        <li>Роботы: {scene.robots.length}</li>
      </ul>
    </>
  );
}

function ObjectFields({ dict, scene, selected, warnings, onChange, onDelete, readOnly }: Props & { selected: SceneObject }) {
  // обновить поля выбранного объекта, сохранив его вид
  const patch = (fields: object) => onChange({ ...selected, data: { ...selected.data, ...fields } } as SceneObject);
  // для полей ввода: пока печатают в одно поле, изменения сливаются в один шаг отмены
  const typing = (field: string, fields: object) =>
    onChange({ ...selected, data: { ...selected.data, ...fields } } as SceneObject, `${selected.data.id}:${field}`);
  const { kind, data } = selected;
  const own = warnings.filter((w) => w.target_id === data.id);
  const worst = own.find((w) => w.severity === 'error') ?? own.find((w) => w.severity === 'warning') ?? own[0];

  const suggestions = (kinds: CategoryKind[]) => dict.ofKind(...kinds).map((c) => ({ value: c.id, label: c.name }));
  const zoneTypes = (Object.keys(dict.zoneTypeLabels) as ZoneType[]).map((t) => ({ value: t, label: dict.zoneTypeLabels[t] }));

  return (
    <>
      <div className="plan-panel__head">
        <h4 className="plan-panel__title">{KIND_LABELS[kind]}</h4>
        {worst && <Chip tone={SEVERITY_TONE[worst.severity]}>замечаний: {own.length}</Chip>}
      </div>
      <TextField label="Название" value={data.name} onChange={(name) => typing('name', { name })} />

      {kind === 'zone' && (
        <>
          <SelectField label="Тип зоны" value={data.zone_type} options={zoneTypes} onChange={(v) => patch({ zone_type: v as ZoneType })} />
          <TagsField
            label="Категории"
            hint="Из справочника; своё значение — Enter"
            value={data.categories}
            suggestions={suggestions(ZONE_CATEGORIES)}
            onChange={(categories) => patch({ categories })}
          />
        </>
      )}

      {kind === 'wall' && (
        <NumberField label="Толщина" unit="м" value={data.thickness} onChange={(t) => t !== null && t >= 0.01 && typing('thickness', { thickness: t })} />
      )}

      {kind === 'charging_point' && (
        <NumberField
          label="Мест для зарядки"
          unit="шт."
          value={data.slots}
          onChange={(n) => n !== null && Number.isInteger(n) && n >= 1 && typing('slots', { slots: n })}
        />
      )}

      {(kind === 'operation_point' || kind === 'charging_point') && (
        <TagsField
          label="Категории"
          hint="Из справочника; своё значение — Enter"
          value={data.categories}
          suggestions={suggestions(POINT_CATEGORIES)}
          onChange={(categories) => patch({ categories })}
        />
      )}

      {kind === 'route' && (
        <>
          <Checkbox checked={data.bidirectional} onChange={(bidirectional) => patch({ bidirectional })}>
            Движение в обе стороны
          </Checkbox>
          <RouteEnds scene={scene} points={data.points} />
        </>
      )}

      {kind === 'robot' && <RobotFields dict={dict} scene={scene} robot={data} patch={patch} typing={typing} />}

      {kind !== 'robot' && <TagsField label="Теги" value={data.tags} onChange={(tags) => patch({ tags })} />}

      {!readOnly && (
        <Button size="sm" variant="danger" onClick={onDelete}>
          Удалить (Delete)
        </Button>
      )}
    </>
  );
}

/** Концы маршрута привязываются к точкам через RoutePoint.ref — показываем, к каким. */
function RouteEnds({ scene, points }: { scene: Scene; points: Extract<SceneObject, { kind: 'route' }>['data']['points'] }) {
  const nameOf = (ref: string | null) => (ref ? findName(scene, ref) ?? ref : null);
  const start = nameOf(points[0]?.ref ?? null);
  const end = nameOf(points[points.length - 1]?.ref ?? null);
  return (
    <p className="faint plan-panel__hint">
      Начало: {start ?? 'не привязано к точке'} · конец: {end ?? 'не привязан к точке'}
      {(!start || !end) && '. Чтобы привязать, перетащите конец маршрута на точку.'}
    </p>
  );
}

function RobotFields({
  dict,
  scene,
  robot,
  patch,
  typing,
}: {
  dict: CategoryDictionary;
  scene: Scene;
  robot: Extract<SceneObject, { kind: 'robot' }>['data'];
  patch: (fields: object) => void;
  typing: (field: string, fields: object) => void;
}) {
  const id = useId();
  return (
    <>
      <Field label="Вид оборудования" htmlFor={id}>
        <div className="control">
          <select id={id} value={robot.category} onChange={(e) => patch({ category: e.target.value })}>
            {!dict.get(robot.category) && <option value={robot.category}>{robot.category ? dict.name(robot.category) : '— не задан —'}</option>}
            {/* разделы книги Артёма — те же, что в палитре */}
            {dict.byGroup('equipment').map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </Field>
      <TextField
        label="Модель из каталога"
        value={robot.catalog_item_id ?? ''}
        placeholder="подберёт matching"
        onChange={(v) => typing('catalog_item_id', { catalog_item_id: v || null })}
      />
      <NumberField
        label="Поворот на старте"
        unit="°"
        value={robot.start_heading_deg}
        onChange={(v) => v !== null && typing('start_heading_deg', { start_heading_deg: v })}
      />
      <SelectField
        label="Своя зарядка"
        value={robot.home_charging_point_id ?? ''}
        options={[{ value: '', label: '— нет —' }, ...scene.charging_points.map((p) => ({ value: p.id, label: p.name }))]}
        onChange={(v) => patch({ home_charging_point_id: v || null })}
      />
    </>
  );
}

/**
 * Подложка — скан или чертёж. Файл редактор не читает и в сцену не кладёт: отдаёт
 * визарду (onUploadBackground), тот грузит его отдельной ручкой и возвращает в сцену
 * ссылку site.background.image_url. Здесь — только положение, размер и прозрачность.
 */
function BackgroundFields({
  scene,
  state,
  onChange,
  onUpload,
}: {
  scene: Scene;
  state: ImageState;
  onChange: (bg: Background | null, mergeKey?: string) => void;
  onUpload: (file: File) => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bg = scene.site.background;

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      await onUpload(file);
    } catch (e) {
      setError(`${file.name}: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="plan-panel__section">
      <div className="field__label">Подложка (скан плана)</div>
      {bg && (
        <>
          <div className="plan-panel__row">
            <NumberField label="X" unit="м" value={bg.x} onChange={(x) => x !== null && onChange({ ...bg, x }, 'bg:x')} />
            <NumberField label="Y" unit="м" value={bg.y} onChange={(y) => y !== null && onChange({ ...bg, y }, 'bg:y')} />
          </div>
          <NumberField
            label="Ширина"
            unit="м"
            value={bg.width}
            onChange={(width) => width !== null && width >= 0.1 && onChange({ ...bg, width, height: (bg.height * width) / bg.width }, 'bg:width')}
          />
          <Field label={`Прозрачность: ${Math.round(bg.opacity * 100)}%`}>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={bg.opacity}
              onChange={(e) => onChange({ ...bg, opacity: Number(e.target.value) }, 'bg:opacity')}
            />
          </Field>
        </>
      )}
      {state.status === 'error' && <span className="field__warn">Подложка не загрузилась по ссылке</span>}
      {error && <span className="field__error">{error}</span>}
      <div className="plan-panel__row">
        <Button size="sm" onClick={() => input.current?.click()} disabled={uploading}>
          {uploading ? 'Загрузка…' : bg ? 'Заменить' : 'Загрузить чертёж'}
        </Button>
        {bg && (
          <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
            Убрать
          </Button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void upload(file);
        }}
      />
    </div>
  );
}

function WarningList({
  warnings,
  onSelectId,
  compact,
  name,
}: {
  warnings: SceneWarning[];
  onSelectId: (id: string) => void;
  compact: boolean;
  name: (id: string) => string;
}) {
  if (warnings.length === 0) return null;
  return (
    <div className="plan-panel__section">
      {!compact && <div className="field__label">Замечания по сохранённому плану</div>}
      <ul className="plan-warnings">
        {warnings.map((w, i) => (
          <li key={`${w.code}-${w.target_id ?? ''}-${i}`}>
            <button
              type="button"
              className={`plan-warnings__item plan-warnings__item--${w.severity}`}
              disabled={!w.target_id}
              onClick={() => w.target_id && onSelectId(w.target_id)}
              title={w.target_id ? `Показать: ${name(w.target_id)}` : undefined}
            >
              {w.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
