/**
 * Клиент API проектов. Пути — из `api-routes.md` (разделы 2, 3, 6).
 * С 2026-09-29 ходит в реальный бэкенд (Project/backend/api/projects.py,
 * SQLite) вместо мока (mockServer.ts остаётся только источником useApiDb —
 * общего клиентского кэша/лога запросов, который здесь заполняется реальными
 * ответами сервера).
 */

import { useEffect } from 'react';
import type { SceneBackgroundUploadResponse } from '../../shared/api/endpoints/dto';
import type {
  FieldError,
  InputSaveRequest,
  ProjectCreateRequest,
  ProjectState,
  SaveResult,
  SceneSaveRequest,
  VersionSaveResult,
} from '../../shared/api/projectState';
import { currentUserId } from '../auth/session';
import type { SceneCheckContext } from './sceneChecks';
import { useApiDb } from './mockServer';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:8000';

function log(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, request: unknown, status: number, response: unknown) {
  useApiDb.getState().record({ at: new Date().toISOString(), method, url, request, status, response });
}

/** Реальный HTTP-вызов, без исключений на 409/422 — это ожидаемые исходы
 * контракта (SaveResult), а не сетевая ошибка. Сетевой сбой (сервер не
 * поднят) пробрасывается дальше как обычное исключение fetch — вызывающие
 * шаги визарда (StepParams/StepTopology) сами решают, как это показать.
 * X-User-Id — изоляция между "пользователями" на реальном бэкенде (не
 * авторизация, см. features/auth/session.ts), на каждый запрос к проектам. */
async function call(method: string, path: string, body?: unknown): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUserId() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

/** GET /api/projects/{id} — 403/404 пробрасывается исключением, а не телом
 * ошибки под видом ProjectState (иначе `{detail: ...}` осело бы в кэше под
 * ключом project_id === undefined). */
export async function fetchProject(projectId: string): Promise<ProjectState> {
  const { status, json } = await call('GET', `/api/projects/${projectId}`);
  log('GET', `/api/projects/${projectId}`, null, status, json);
  if (status !== 200) throw new Error(`GET /projects/${projectId} вернул ${status}`);
  const state = json as ProjectState;
  useApiDb.getState().put(state);
  return state;
}

/** POST /api/projects */
export async function createProject(req: ProjectCreateRequest): Promise<ProjectState> {
  const { status, json } = await call('POST', '/api/projects', req);
  log('POST', '/api/projects', req, status, json);
  const state = json as ProjectState;
  useApiDb.getState().put(state);
  return state;
}

/** PUT /api/projects/{id}/input — параметры объекта с формы (шаг 2) */
export async function saveInput(projectId: string, req: InputSaveRequest): Promise<SaveResult> {
  const { status, json } = await call('PUT', `/api/projects/${projectId}/input`, req);
  log('PUT', `/api/projects/${projectId}/input`, req, status, json);
  if (status === 200) {
    useApiDb.getState().put(json as ProjectState);
    return { status: 200, body: json as ProjectState };
  }
  if (status === 403) return { status: 403, body: json as { detail: string } };
  if (status === 409) return { status: 409, body: json as { current: ProjectState } };
  return { status: 422, body: json as { errors: FieldError[] } };
}

/** PUT /api/projects/{id}/scene — план объекта из редактора (шаг 7) */
export async function saveScene(projectId: string, req: SceneSaveRequest, _ctx: SceneCheckContext): Promise<SaveResult> {
  // _ctx (минимальная ширина прохода/площадь формы) раньше уходил в клиентскую
  // проверку sceneChecks.ts — сервер её пока не считает (см. api/projects.py),
  // предупреждения по плану честно приходят пустым списком, а не выдуманные.
  const { status, json } = await call('PUT', `/api/projects/${projectId}/scene`, req);
  log('PUT', `/api/projects/${projectId}/scene`, req, status, json);
  if (status === 200) {
    useApiDb.getState().put(json as ProjectState);
    return { status: 200, body: json as ProjectState };
  }
  if (status === 403) return { status: 403, body: json as { detail: string } };
  if (status === 409) return { status: 409, body: json as { current: ProjectState } };
  return { status: 422, body: json as { errors: FieldError[] } };
}

/**
 * POST /api/projects/{id}/scene/background — подложка. Бэкенд пока не хранит
 * файлы (см. api/projects.py) — остаётся прежнее клиентское поведение:
 * blob-URL живёт только во вкладке браузера, в план кладётся только ссылка.
 */
export async function uploadBackground(
  projectId: string,
  file: File,
): Promise<SceneBackgroundUploadResponse & { width_px: number; height_px: number }> {
  const size = await imageSize(file);
  const body: SceneBackgroundUploadResponse = { image_url: URL.createObjectURL(file) };
  log('POST', `/api/projects/${projectId}/scene/background`, { name: file.name, size_bytes: file.size, type: file.type }, 201, body);
  return { ...body, width_px: size.width, height_px: size.height };
}

function imageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** GET /api/projects — только проекты текущего владельца (X-User-Id) */
export async function listProjects(): Promise<ProjectState[]> {
  const { status, json } = await call('GET', '/api/projects');
  log('GET', '/api/projects', null, status, json);
  if (status !== 200) throw new Error(`GET /projects вернул ${status}`);
  return json as ProjectState[];
}

export interface VersionSummary {
  version: number;
  comment: string | null;
  created_at: string;
}

export interface VersionDetail extends VersionSummary {
  project_id: string;
  input: unknown;
  scene: unknown;
}

/** POST /api/projects/{id}/versions — снимок текущего input+scene как новой
 * версии. base_revision — та же защита от гонки, что у saveInput/saveScene
 * (см. api/projects.py); 403/404/409 — ожидаемые исходы, не исключение. */
export async function saveVersion(projectId: string, baseRevision: number, comment: string | null): Promise<VersionSaveResult> {
  const { status, json } = await call('POST', `/api/projects/${projectId}/versions`, { base_revision: baseRevision, comment });
  log('POST', `/api/projects/${projectId}/versions`, { base_revision: baseRevision, comment }, status, json);
  if (status === 201) {
    useApiDb.getState().put(json as ProjectState);
    return { status: 201, body: json as ProjectState };
  }
  if (status === 409) return { status: 409, body: json as { current: ProjectState } };
  return { status: status === 404 ? 404 : 403, body: json as { detail: string } };
}

/** GET /api/projects/{id}/versions — 404/403 пробрасывается исключением (не
 * пустым списком): ProjectVersionsPage различает «реальный проект без версий»
 * (200, []) от «этого id на сервере нет» (старая демо-карточка из мока) и
 * только во втором случае откатывается на иллюстративные VERSIONS. */
export async function listVersions(projectId: string): Promise<VersionSummary[]> {
  const { status, json } = await call('GET', `/api/projects/${projectId}/versions`);
  log('GET', `/api/projects/${projectId}/versions`, null, status, json);
  if (status !== 200) throw new Error(`GET /versions вернул ${status}`);
  return json as VersionSummary[];
}

/** GET /api/projects/{id}/versions/{v} — снапшот, только чтение */
export async function getVersion(projectId: string, version: number): Promise<VersionDetail> {
  const { status, json } = await call('GET', `/api/projects/${projectId}/versions/${version}`);
  log('GET', `/api/projects/${projectId}/versions/${version}`, null, status, json);
  if (status !== 200) throw new Error(`GET /versions/${version} вернул ${status}`);
  return json as VersionDetail;
}

/** POST /api/projects/{id}/versions/{v}/promote — «сделать текущей» (копией).
 * base_revision — promote переписывает текущие input/scene, поэтому нужна та
 * же защита от гонки, что у saveInput/saveScene/saveVersion. */
export async function promoteVersion(projectId: string, version: number, baseRevision: number): Promise<VersionSaveResult> {
  const { status, json } = await call('POST', `/api/projects/${projectId}/versions/${version}/promote`, { base_revision: baseRevision });
  log('POST', `/api/projects/${projectId}/versions/${version}/promote`, { base_revision: baseRevision }, status, json);
  if (status === 201) {
    useApiDb.getState().put(json as ProjectState);
    return { status: 201, body: json as ProjectState };
  }
  if (status === 409) return { status: 409, body: json as { current: ProjectState } };
  return { status: status === 404 ? 404 : 403, body: json as { detail: string } };
}

/** Текущее состояние записи проекта (как его последний раз вернул сервер). */
export function useProjectState(projectId: string, enabled = true): ProjectState | undefined {
  const state = useApiDb((s) => s.projects[projectId]);
  useEffect(() => {
    // Не найден/чужой (403/404) — молча остаёмся без server-состояния, вызывающие
    // компоненты уже трактуют undefined как «сервер ничего не знает про этот id».
    if (enabled && !state) void fetchProject(projectId).catch(() => {});
  }, [enabled, projectId, state]);
  return state;
}

export function useApiLog() {
  return useApiDb((s) => s.log);
}
