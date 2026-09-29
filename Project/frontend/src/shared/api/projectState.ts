/**
 * Единая запись проекта: параметры с формы (шаг 2) и план из редактора
 * (шаг 7) — две части одной записи, приходят в разное время.
 *
 * Надстройка над контрактами 4 (`ProjectInput`) и 6 (`Scene`): версия записи
 * для защиты от параллельной правки, состояние каждой части и предупреждения
 * по плану. Пока бэкенда нет, всё это отдаёт мок `features/projectApi` —
 * реальный API-слой (`shared/api/endpoints/`) заменит его, когда появится
 * сервер; форма ответа обсуждается с Владимировым.
 *
 * Маршруты — `Документация/Фронтенд и визард/api-routes.md`, разделы 3 и 6:
 *
 *   PUT  /api/projects/{id}/input
 *   PUT  /api/projects/{id}/scene
 *   POST /api/projects/{id}/scene/background   (multipart)
 */

import type { ObjectParams, ObjectType, ProjectInput, ProjectStatus, Scene } from '../types/contracts';

export type PartState = 'missing' | 'saved' | 'stale';
export type ProjectPart = 'input' | 'scene';

// --- Запросы -----------------------------------------------------------------

/** PUT /api/projects/{id}/input */
export interface InputSaveRequest {
  /** ProjectState.revision, которую клиент видел последней */
  base_revision: number;
  object_type: ObjectType;
  params: ObjectParams;
  source: 'manual' | 'excel_import' | 'csv_import';
}

/** PUT /api/projects/{id}/scene */
export interface SceneSaveRequest {
  base_revision: number;
  /** input.revision, по которому рисовали план */
  based_on_input_revision: number;
  /** id и project_id внутри сервер перезаписывает сам */
  scene: Scene;
}

/** POST /api/projects */
export interface ProjectCreateRequest {
  name: string;
  object_type: ObjectType;
  site?: string | null;
}

// --- Предупреждения по плану --------------------------------------------------

export type WarningSeverity = 'info' | 'warning' | 'error';

export type SceneWarningCode =
  | 'route_crosses_wall'
  | 'robot_in_restricted_zone'
  | 'aisle_too_narrow'
  | 'zone_outside_bounds'
  | 'route_not_linked'
  | 'charging_capacity_exceeded'
  | 'scene_area_differs_from_form';

/** Считает сервер — чтобы редактор, симуляция и отчёт показывали одно и то же */
export interface SceneWarning {
  code: SceneWarningCode;
  severity: WarningSeverity;
  message: string;
  target_kind: 'wall' | 'zone' | 'route' | 'point' | 'robot' | null;
  target_id: string | null;
}

// --- Ответ --------------------------------------------------------------------

export interface InputPartState {
  state: PartState;
  revision: number | null;
  saved_at: string | null;
  data: ProjectInput | null;
}

export interface ScenePartState {
  state: PartState;
  revision: number | null;
  saved_at: string | null;
  based_on_input_revision: number | null;
  data: Scene | null;
  warnings: SceneWarning[];
}

export interface ProjectState {
  project_id: string;
  name: string;
  site: string | null;
  object_type: ObjectType;
  status: ProjectStatus;
  revision: number;
  dictionary_version: number;
  input: InputPartState;
  scene: ScenePartState;
  /** ["scene"] — черновик без плана, нормальное промежуточное состояние */
  missing_parts: ProjectPart[];
  /** Без чего нельзя считать подбор и экономику. Плана тут нет — шаг 7 необязательный */
  blocking_parts: ProjectPart[];
  current_version: number;
  created_at: string;
  updated_at: string;
}

export interface FieldError {
  path: string;
  code: string;
  message: string;
}

export type SaveResult =
  | { status: 200; body: ProjectState }
  | { status: 403; body: { detail: string } }
  | { status: 409; body: { current: ProjectState } }
  | { status: 422; body: { errors: FieldError[] } };

/** POST /api/projects/{id}/versions и .../promote — тот же протокол conflict/
 * forbidden, что у SaveResult, только успех приходит с 201, а не 200. */
export type VersionSaveResult =
  | { status: 201; body: ProjectState }
  | { status: 403; body: { detail: string } }
  | { status: 404; body: { detail: string } }
  | { status: 409; body: { current: ProjectState } };
