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
} from '../../shared/api/projectState';
import type { SceneCheckContext } from './sceneChecks';
import { useApiDb } from './mockServer';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:8000';

function log(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, request: unknown, status: number, response: unknown) {
  useApiDb.getState().record({ at: new Date().toISOString(), method, url, request, status, response });
}

/** Реальный HTTP-вызов, без исключений на 409/422 — это ожидаемые исходы
 * контракта (SaveResult), а не сетевая ошибка. Сетевой сбой (сервер не
 * поднят) пробрасывается дальше как обычное исключение fetch — вызывающие
 * шаги визарда (StepParams/StepTopology) сами решают, как это показать. */
async function call(method: string, path: string, body?: unknown): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

/** GET /api/projects/{id} */
export async function fetchProject(projectId: string): Promise<ProjectState> {
  const { status, json } = await call('GET', `/api/projects/${projectId}`);
  log('GET', `/api/projects/${projectId}`, null, status, json);
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

/** Текущее состояние записи проекта (как его последний раз вернул сервер). */
export function useProjectState(projectId: string, enabled = true): ProjectState | undefined {
  const state = useApiDb((s) => s.projects[projectId]);
  useEffect(() => {
    if (enabled && !state) void fetchProject(projectId);
  }, [enabled, projectId, state]);
  return state;
}

export function useApiLog() {
  return useApiDb((s) => s.log);
}
