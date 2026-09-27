/**
 * Клиент реального бэкенда (Project/backend/api/main.py) — три эндпоинта без
 * хранения состояния между запросами (см. докстринг main.py): каталог,
 * подбор, симуляция. Проекты/параметры/план по-прежнему живут в mockServer —
 * этот файл их не трогает, только добавляет реальные данные там, где раньше
 * были моковые (CATALOG, MATCH_RESULT).
 *
 * Адрес сервера — VITE_API_BASE_URL, по умолчанию локальный uvicorn
 * (см. CLAUDE.md, «Команды разработки»: `uvicorn api.main:app --port 8000`).
 */

import type { CatalogItem, MatchResult, ObjectType, Scene, SimulationTimeline } from '../../shared/types/contracts';
import type { ParamValues } from '../wizard/paramsSchema';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:8000';

export class RealApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new RealApiError('Сервер подбора недоступен — запущен ли `uvicorn api.main:app --port 8000` в Project/backend?');
  }
  if (!res.ok) {
    const body = await res.text();
    throw new RealApiError(`Сервер вернул ошибку ${res.status}: ${body.slice(0, 300)}`, res.status);
  }
  return res.json() as Promise<T>;
}

/** GET /api/catalog — реальный каталог, 223 позиции */
export function fetchRealCatalog(): Promise<CatalogItem[]> {
  return request<CatalogItem[]>('/api/catalog');
}

/** ProjectInput для отправки в /api/matching/run и /api/simulation/run — та же
 * форма, что и у contracts.ProjectInput, но собранная из черновика визарда
 * (draft.params[type] иногда не несёт свой object_type, см. StepParams.tsx
 * DEMO_VALUES — довносим его явно, а не полагаемся на форму). */
export function buildProjectInput(projectId: string, objectType: ObjectType, params: ParamValues) {
  return {
    id: `pi-${projectId}`,
    project_id: projectId,
    object_type: objectType,
    params: { ...params, object_type: objectType },
    created_at: new Date().toISOString(),
    source: 'manual' as const,
  };
}

/** POST /api/matching/run */
export function runRealMatching(projectInput: ReturnType<typeof buildProjectInput>): Promise<MatchResult> {
  return request<MatchResult>('/api/matching/run', { method: 'POST', body: JSON.stringify(projectInput) });
}

/** POST /api/simulation/run */
export function runRealSimulation(
  scene: Scene,
  projectInput: ReturnType<typeof buildProjectInput>,
  scenarioId: string,
): Promise<SimulationTimeline> {
  return request<SimulationTimeline>('/api/simulation/run', {
    method: 'POST',
    body: JSON.stringify({ scene, project_input: projectInput, scenario_id: scenarioId }),
  });
}
