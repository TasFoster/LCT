/**
 * Клиент API проектов. Пути — из `api-routes.md` (разделы 2, 3, 6).
 * Сейчас ходит в мок (mockServer.ts); при подключении бэкенда здесь меняются
 * только тела функций — на вызовы эндпоинтов из `shared/api/endpoints/`.
 */

import { useEffect } from 'react';
import type { SceneBackgroundUploadResponse } from '../../shared/api/endpoints/dto';
import type {
  InputSaveRequest,
  ProjectCreateRequest,
  ProjectState,
  SaveResult,
  SceneSaveRequest,
} from '../../shared/api/projectState';
import type { SceneCheckContext } from './sceneChecks';
import { serverCreate, serverGet, serverPutInput, serverPutScene, serverUploadBackground, useApiDb } from './mockServer';

const LATENCY_MS = 350;
const wait = () => new Promise((r) => setTimeout(r, LATENCY_MS));

function log(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, request: unknown, status: number, response: unknown) {
  useApiDb.getState().record({ at: new Date().toISOString(), method, url, request, status, response });
}

/** GET /api/projects/{id} */
export async function fetchProject(projectId: string): Promise<ProjectState> {
  await wait();
  const body = serverGet(projectId);
  log('GET', `/api/projects/${projectId}`, null, 200, body);
  return body;
}

/** POST /api/projects */
export async function createProject(req: ProjectCreateRequest): Promise<ProjectState> {
  await wait();
  const body = serverCreate(req);
  log('POST', '/api/projects', req, 201, body);
  return body;
}

/** PUT /api/projects/{id}/input — параметры объекта с формы (шаг 2) */
export async function saveInput(projectId: string, req: InputSaveRequest): Promise<SaveResult> {
  await wait();
  const result = serverPutInput(projectId, req);
  log('PUT', `/api/projects/${projectId}/input`, req, result.status, result.body);
  return result;
}

/** PUT /api/projects/{id}/scene — план объекта из редактора (шаг 7) */
export async function saveScene(projectId: string, req: SceneSaveRequest, ctx: SceneCheckContext): Promise<SaveResult> {
  await wait();
  const result = serverPutScene(projectId, req, ctx);
  log('PUT', `/api/projects/${projectId}/scene`, req, result.status, result.body);
  return result;
}

/**
 * POST /api/projects/{id}/scene/background — подложка грузится отдельно,
 * в плане остаётся только ссылка (`Scene.site.background.image_url`).
 * Сервер отдаёт один `image_url`; размер картинки в пикселях меряем здесь же,
 * на клиенте, — он нужен, чтобы посадить подложку на план без искажений.
 */
export async function uploadBackground(
  projectId: string,
  file: File,
): Promise<SceneBackgroundUploadResponse & { width_px: number; height_px: number }> {
  const size = await imageSize(file);
  await wait();
  const body = serverUploadBackground(file);
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
