import { ApiEndpoint } from './base';
import type { Scene, SimulationTimeline } from '../../types/contracts';
import type { SimulationRunRequest, SimulationJob } from './dto';

/**
 * PUT /api/projects/{id}/scene — шаг 7 визарда. Вызывает Владимиров из
 * своего API-слоя; Алексей (editor2d) сам этот URL не дёргает — отдаёт
 * готовый TS-объект Scene, который Владимиров прокидывает сюда.
 */
export class SceneWriteEndpoint extends ApiEndpoint<Scene, Scene> {
  readonly method = 'PUT' as const;
  url(projectId: string) {
    return `/api/projects/${projectId}/scene`;
  }
}
export const sceneWriteEndpoint = new SceneWriteEndpoint();

/** GET /api/projects/{id}/scene */
export class SceneReadEndpoint extends ApiEndpoint<void, Scene | null> {
  readonly method = 'GET' as const;
  url(projectId: string) {
    return `/api/projects/${projectId}/scene`;
  }
}
export const sceneReadEndpoint = new SceneReadEndpoint();

/** POST /api/projects/{id}/simulation — запуск async job, статус опрашивается отдельно (НФТ 4.3.3: до 60с) */
export class SimulationRunEndpoint extends ApiEndpoint<SimulationRunRequest, SimulationJob> {
  readonly method = 'POST' as const;
  url(projectId: string) {
    return `/api/projects/${projectId}/simulation`;
  }
}
export const simulationRunEndpoint = new SimulationRunEndpoint();

/** GET /api/projects/{id}/simulation/{job_id} — статус job (pending/running/done/error) */
export class SimulationStatusEndpoint extends ApiEndpoint<void, SimulationJob> {
  readonly method = 'GET' as const;
  url(projectId: string, jobId: string) {
    return `/api/projects/${projectId}/simulation/${jobId}`;
  }
}
export const simulationStatusEndpoint = new SimulationStatusEndpoint();

/** GET /api/projects/{id}/simulation/{job_id}/timeline — готовый таймлайн для playback */
export class SimulationTimelineEndpoint extends ApiEndpoint<void, SimulationTimeline> {
  readonly method = 'GET' as const;
  url(projectId: string, jobId: string) {
    return `/api/projects/${projectId}/simulation/${jobId}/timeline`;
  }
}
export const simulationTimelineEndpoint = new SimulationTimelineEndpoint();
