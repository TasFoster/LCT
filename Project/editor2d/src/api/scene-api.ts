// Обмен сценой с сервером платформы: PUT/GET /api/projects/{id}/scene
// («Документация/Фронтенд и визард/api-routes.md», раздел 6).
// Слой без React: только fetch и разбор ответа, чтобы это можно было проверить тестами.
import { normalize, withDefaults } from "../scene/ops";
import type { Scene } from "../scene/types";

const TIMEOUT_MS = 15000;
const SETTINGS_KEY = "editor2d:server";

export interface ServerSettings {
  /** Адрес сервера: «https://host» или «/» — тогда запрос идёт на тот же адрес, что и редактор. */
  baseUrl: string;
}

export const DEFAULT_SETTINGS: ServerSettings = { baseUrl: "" };

export function loadSettings(): ServerSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ServerSettings>;
    return { baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : "" };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: ServerSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // приватный режим браузера — настройка просто не запомнится
  }
}

/** Адрес ручки сцены. Пустой baseUrl — тот же сервер, что отдал редактор. */
export function sceneUrl(baseUrl: string, projectId: string): string {
  const id = projectId.trim();
  if (!id) throw new Error("Не заполнен идентификатор проекта — он в панели свойств, поле «Проект»");
  if (!/^[A-Za-z0-9._~-]+$/.test(id)) throw new Error(`Идентификатор проекта «${id}»: можно только латиницу, цифры, дефис, точку и подчёркивание`);
  const base = baseUrl.trim().replace(/\/+$/, "");
  if (base && !/^https?:\/\//i.test(base)) throw new Error(`Адрес сервера «${baseUrl}»: должен начинаться с http:// или https://`);
  return `${base}/api/projects/${encodeURIComponent(id)}/scene`;
}

/** Текст ошибки сервера: сообщение из тела ответа, если оно там есть. */
async function serverMessage(res: Response): Promise<string> {
  let detail = "";
  try {
    const text = (await res.text()).trim();
    if (text.startsWith("{")) {
      const body = JSON.parse(text) as Record<string, unknown>;
      const value = body.message ?? body.detail ?? body.error;
      detail = typeof value === "string" ? value : "";
    } else {
      detail = text.slice(0, 200);
    }
  } catch {
    detail = "";
  }
  if (res.status === 401 || res.status === 403) return "сервер не пустил: нужно войти в платформу";
  if (res.status === 404) return "проекта с таким идентификатором на сервере нет (или он чужой)";
  if (res.status === 413) return "сцена слишком большая для сервера";
  if (res.status === 422 || res.status === 400) return detail || "сервер не принял сцену: данные не прошли проверку";
  return detail ? `сервер ответил ${res.status}: ${detail}` : `сервер ответил ${res.status}`;
}

async function request(url: string, init: RequestInit): Promise<Response> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: abort.signal });
  } catch (e) {
    if (abort.signal.aborted) throw new Error(`Сервер не ответил за ${TIMEOUT_MS / 1000} с`);
    // fetch на сетевой ошибке даёт «Failed to fetch» — пользователю это ничего не говорит
    throw new Error(`Сервер недоступен: проверьте адрес «${url}» и что сервер запущен`);
  } finally {
    clearTimeout(timer);
  }
}

/** Отправить сцену: PUT /api/projects/{id}/scene. Возвращает время отправки. */
export async function putScene(baseUrl: string, scene: Scene): Promise<string> {
  const url = sceneUrl(baseUrl, scene.project_id);
  const updated_at = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const res = await request(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...scene, updated_at }),
  });
  if (!res.ok) throw new Error(`Сцена не отправлена: ${await serverMessage(res)}`);
  return updated_at;
}

/** Забрать сцену: GET /api/projects/{id}/scene. null — на сервере её ещё нет. */
export async function getScene(baseUrl: string, projectId: string): Promise<Scene | null> {
  const url = sceneUrl(baseUrl, projectId);
  const res = await request(url, { method: "GET", headers: { Accept: "application/json" } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Сцена не загружена: ${await serverMessage(res)}`);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error("Сцена не загружена: сервер прислал не JSON");
  }
  if (body === null) return null;
  try {
    return normalize(withDefaults(body));
  } catch (e) {
    throw new Error(`Сцена не загружена: ${(e as Error).message}`);
  }
}
