/**
 * Мок сервера проектов — ЗАГЛУШКА до появления бэкенда. Правила те же, что
 * описаны в `api-routes.md` (разделы 3, 6) и в `shared/api/projectState.ts`:
 * одна запись на проект, общий счётчик revision, 409 при устаревшей
 * base_revision, 422 при ошибках, план без параметров не принимается,
 * план устаревает, если параметры сохранили после него, предупреждения
 * по плану считает сервер. Хранится в sessionStorage вкладки.
 *
 * Когда появится настоящий API, этот файл уходит, а `features/projectApi`
 * начинает ходить через `shared/api/endpoints/` в реальный сервер.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CATEGORIES, resolveId } from '../../shared/dictionaries';
import { catalogById } from '../../shared/mock/catalog';
import { DEMO_WAREHOUSE_PARAMS, projectById } from '../../shared/mock/projects';
import type { ObjectParams, ProjectInput, Scene } from '../../shared/types/contracts';
import type { SceneBackgroundUploadResponse } from '../../shared/api/endpoints/dto';
import type {
  FieldError,
  InputSaveRequest,
  ProjectCreateRequest,
  ProjectPart,
  ProjectState,
  SaveResult,
  SceneSaveRequest,
  ScenePartState,
} from '../../shared/api/projectState';
import { validateParams } from '../wizard/paramsSchema';
import { autoLayout } from '../planEditor/autoLayout';
import { checkScene } from './sceneChecks';
import type { SceneCheckContext } from './sceneChecks';

export interface ApiLogEntry {
  at: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  request: unknown;
  status: number;
  response: unknown;
}

interface ApiDb {
  projects: Record<string, ProjectState>;
  log: ApiLogEntry[];
  put: (p: ProjectState) => void;
  record: (e: ApiLogEntry) => void;
}

export const useApiDb = create<ApiDb>()(
  persist(
    (set) => ({
      projects: {},
      log: [],
      put: (p) => set((s) => ({ projects: { ...s.projects, [p.project_id]: p } })),
      record: (e) => set((s) => ({ log: [e, ...s.log].slice(0, 20) })),
    }),
    { name: 'robocalc-api-v2', storage: createJSONStorage(() => sessionStorage), partialize: (s) => ({ projects: s.projects, log: s.log }) },
  ),
);

const now = () => new Date().toISOString();

function derive(p: Omit<ProjectState, 'missing_parts' | 'blocking_parts'>): ProjectState {
  const missing: ProjectPart[] = [];
  if (p.input.state === 'missing') missing.push('input');
  if (p.scene.state === 'missing') missing.push('scene');
  return { ...p, missing_parts: missing, blocking_parts: p.input.state === 'missing' ? ['input'] : [] };
}

const EMPTY_SCENE: ScenePartState = {
  state: 'missing',
  revision: null,
  saved_at: null,
  based_on_input_revision: null,
  data: null,
  warnings: [],
};

function makeInput(projectId: string, revision: number, params: ObjectParams, source: ProjectInput['source'], at: string): ProjectInput {
  return { id: `pi-${projectId}-${revision}`, project_id: projectId, object_type: params.object_type, params, created_at: at, source };
}

/** Начальное состояние для моковых проектов из списка — чтобы любой открывался. */
function seed(projectId: string): ProjectState {
  const mock = projectById(projectId);
  const at = mock?.updated_at ?? now();
  const hasInput = Boolean(mock && mock.last_step !== 'object' && mock.last_step !== 'params');
  const params: ObjectParams | null = hasInput && mock?.object_type === 'warehouse' ? { ...DEMO_WAREHOUSE_PARAMS } : null;
  const revision = hasInput ? mock!.current_version : 0;

  // У архивного пилота план уже нарисован — пример записи «параметры + план»
  let scene: ScenePartState = EMPTY_SCENE;
  if (projectId === 'p-old-kazan' && params) {
    const drawn = autoLayout(projectId, {
      objectType: 'warehouse',
      areaSqm: 8000,
      routeLengthM: null,
      workingZoneIds: params.working_zones,
      robots: [{ catalog_item_id: 'amr-vektor-600', name: 'Вектор-600', category_id: 'amr', quantity: 12 }],
      minAisleWidthM: 1.6,
    });
    scene = {
      state: 'saved',
      revision,
      saved_at: at,
      based_on_input_revision: revision,
      data: { ...drawn, id: `scene-${projectId}-${revision}` },
      warnings: checkScene(drawn, { minAisleWidthM: 1.6, formAreaSqm: 8000 }),
    };
  }

  return derive({
    project_id: projectId,
    name: mock?.name ?? 'Новый проект',
    site: mock?.site ?? null,
    object_type: mock?.object_type ?? 'warehouse',
    status: mock?.status ?? 'draft',
    revision,
    dictionary_version: CATEGORIES.version,
    input: hasInput
      ? { state: 'saved', revision, saved_at: at, data: params ? makeInput(projectId, revision, params, 'manual', at) : null }
      : { state: 'missing', revision: null, saved_at: null, data: null },
    scene,
    current_version: mock?.current_version ?? 1,
    created_at: mock?.created_at ?? at,
    updated_at: at,
  });
}

function getOrSeed(projectId: string): ProjectState {
  const db = useApiDb.getState();
  const existing = db.projects[projectId];
  if (existing) return existing;
  const fresh = seed(projectId);
  db.put(fresh);
  return fresh;
}

/**
 * Проверка плана перед сохранением: ссылки внутри сцены и id справочника.
 * Значения принимаются и алиасами (прежние id форм, транслит редактора).
 */
function validateScene(scene: Scene): FieldError[] {
  const errors: FieldError[] = [];
  const zoneTypes = new Set(CATEGORIES.zone_types.map((z) => z.id));
  const zoneCats = new Set(CATEGORIES.working_zones.map((z) => z.id));
  const equipCats = new Set(CATEGORIES.equipment_categories.map((c) => c.id));
  const zoneIds = new Set(scene.zones.map((z) => z.id));
  const pointIds = new Set([...scene.operation_points, ...scene.charging_points].map((p) => p.id));
  const chargingIds = new Set(scene.charging_points.map((p) => p.id));

  scene.zones.forEach((z, i) => {
    const path = `scene.zones[${i}]`;
    if (z.polygon.length < 3) errors.push({ path: `${path}.polygon`, code: 'min_points', message: `Зона «${z.name}»: нужен контур минимум из трёх точек` });
    if (!zoneTypes.has(resolveId('zone_types', z.zone_type) as typeof z.zone_type)) errors.push({ path: `${path}.zone_type`, code: 'unknown_dictionary_id', message: `Зона «${z.name}»: неизвестный тип зоны` });
    z.categories.forEach((c, j) => {
      if (!zoneCats.has(resolveId('working_zones', c))) {
        errors.push({ path: `${path}.categories[${j}]`, code: 'unknown_dictionary_id', message: `Зона «${z.name}»: категории «${c}» нет в справочнике` });
      }
    });
  });

  scene.operation_points.forEach((p, i) => {
    if (p.zone_id && !zoneIds.has(p.zone_id)) {
      errors.push({ path: `scene.operation_points[${i}].zone_id`, code: 'unknown_zone', message: `Точка ${p.id}: зоны ${p.zone_id} нет на плане` });
    }
  });

  scene.charging_points.forEach((p, i) => {
    if (p.slots < 1) errors.push({ path: `scene.charging_points[${i}].slots`, code: 'min', message: `Зарядка ${p.id}: мест не может быть меньше одного` });
  });

  scene.routes.forEach((r, i) => {
    if (r.points.length < 2) errors.push({ path: `scene.routes[${i}].points`, code: 'min_points', message: `Маршрут ${r.id}: нужны минимум две точки` });
    r.points.forEach((p, j) => {
      if (p.ref && !pointIds.has(p.ref)) {
        errors.push({ path: `scene.routes[${i}].points[${j}].ref`, code: 'unknown_point', message: `Маршрут ${r.id}: точки ${p.ref} нет на плане` });
      }
    });
  });

  scene.robots.forEach((r, i) => {
    // Пустой catalog_item_id допустим: робот «вообще», без конкретной модели
    if (r.catalog_item_id && !catalogById(r.catalog_item_id)) {
      errors.push({ path: `scene.robots[${i}].catalog_item_id`, code: 'unknown_catalog_item', message: `Робот ${r.id}: такой позиции нет в каталоге` });
    }
    if (!r.catalog_item_id && r.category && !equipCats.has(resolveId('equipment_categories', r.category))) {
      errors.push({ path: `scene.robots[${i}].category`, code: 'unknown_dictionary_id', message: `Робот ${r.id}: вида «${r.category}» нет в справочнике` });
    }
    if (r.home_charging_point_id && !chargingIds.has(r.home_charging_point_id)) {
      errors.push({ path: `scene.robots[${i}].home_charging_point_id`, code: 'unknown_point', message: `Робот ${r.id}: зарядки ${r.home_charging_point_id} нет на плане` });
    }
  });

  return errors;
}

// --- «Эндпоинты» ---------------------------------------------------------------

/** GET /api/projects/{id} */
export function serverGet(projectId: string): ProjectState {
  return getOrSeed(projectId);
}

/** POST /api/projects */
export function serverCreate(req: ProjectCreateRequest): ProjectState {
  const at = now();
  const id = `p-${Date.now().toString(36)}`;
  const state = derive({
    project_id: id,
    name: req.name,
    site: req.site ?? null,
    object_type: req.object_type,
    status: 'draft',
    revision: 0,
    dictionary_version: CATEGORIES.version,
    input: { state: 'missing', revision: null, saved_at: null, data: null },
    scene: EMPTY_SCENE,
    current_version: 1,
    created_at: at,
    updated_at: at,
  });
  useApiDb.getState().put(state);
  return state;
}

/** PUT /api/projects/{id}/input */
export function serverPutInput(projectId: string, req: InputSaveRequest): SaveResult {
  const current = getOrSeed(projectId);
  if (req.base_revision !== current.revision) return { status: 409, body: { current } };

  const issues = validateParams(req.object_type, req.params as unknown as Record<string, unknown>);
  const errors: FieldError[] = Object.entries(issues)
    .filter(([, issue]) => issue.error)
    .map(([key, issue]) => ({ path: `params.${key}`, code: 'invalid', message: issue.error! }));
  if (errors.length) return { status: 422, body: { errors } };

  const at = now();
  const revision = current.revision + 1;
  const saved = derive({
    ...current,
    revision,
    updated_at: at,
    object_type: req.object_type,
    // Параметры изменились — прежний расчёт им больше не соответствует
    status: current.status === 'archived' ? 'archived' : 'draft',
    input: { state: 'saved', revision, saved_at: at, data: makeInput(projectId, revision, req.params, req.source, at) },
    scene: current.scene.state === 'saved' ? { ...current.scene, state: 'stale' } : current.scene,
  });
  useApiDb.getState().put(saved);
  return { status: 200, body: saved };
}

/** PUT /api/projects/{id}/scene */
export function serverPutScene(projectId: string, req: SceneSaveRequest, ctx: SceneCheckContext): SaveResult {
  const current = getOrSeed(projectId);
  if (req.base_revision !== current.revision) return { status: 409, body: { current } };

  if (current.input.state === 'missing') {
    return {
      status: 422,
      body: { errors: [{ path: 'scene', code: 'input_required', message: 'Сначала сохраните параметры объекта — план привязывается к ним' }] },
    };
  }

  const errors = validateScene(req.scene);
  if (errors.length) return { status: 422, body: { errors } };

  const at = now();
  const revision = current.revision + 1;
  const inputRevision = current.input.revision ?? 0;
  const saved = derive({
    ...current,
    revision,
    updated_at: at,
    scene: {
      state: req.based_on_input_revision < inputRevision ? 'stale' : 'saved',
      revision,
      saved_at: at,
      based_on_input_revision: req.based_on_input_revision,
      data: { ...req.scene, id: `scene-${projectId}-${revision}`, project_id: projectId, updated_at: at },
      warnings: checkScene(req.scene, ctx),
    },
  });
  useApiDb.getState().put(saved);
  return { status: 200, body: saved };
}

/**
 * POST /api/projects/{id}/scene/background — загрузка подложки.
 * Файл не хранится внутри плана: в плане остаётся ссылка `image_url`
 * (в моке — локальный blob-URL вместо адреса на сервере).
 */
export function serverUploadBackground(file: File): SceneBackgroundUploadResponse {
  return { image_url: URL.createObjectURL(file) };
}
