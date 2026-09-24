import { ApiEndpoint } from './base';
import type { ScenarioInput, EconomicsResult } from '../../types/contracts';
import type { ScenarioPatchRequest } from './dto';

/** POST /api/projects/{id}/scenarios — расчёт нового сценария, ≤10с по НФТ */
export class ScenarioCreateEndpoint extends ApiEndpoint<ScenarioInput, EconomicsResult> {
  readonly method = 'POST' as const;
  url(projectId: string) {
    return `/api/projects/${projectId}/scenarios`;
  }
}
export const scenarioCreateEndpoint = new ScenarioCreateEndpoint();

/** GET /api/projects/{id}/scenarios — таблица сравнения, минимум 3 сценария */
export class ScenarioListEndpoint extends ApiEndpoint<void, EconomicsResult[]> {
  readonly method = 'GET' as const;
  url(projectId: string) {
    return `/api/projects/${projectId}/scenarios`;
  }
}
export const scenarioListEndpoint = new ScenarioListEndpoint();

/** GET /api/projects/{id}/scenarios/{scenario_id} */
export class ScenarioDetailEndpoint extends ApiEndpoint<void, EconomicsResult> {
  readonly method = 'GET' as const;
  url(projectId: string, scenarioId: string) {
    return `/api/projects/${projectId}/scenarios/${scenarioId}`;
  }
}
export const scenarioDetailEndpoint = new ScenarioDetailEndpoint();

/** PATCH /api/projects/{id}/scenarios/{scenario_id} — правка допущений */
export class ScenarioUpdateEndpoint extends ApiEndpoint<ScenarioPatchRequest, EconomicsResult> {
  readonly method = 'PATCH' as const;
  url(projectId: string, scenarioId: string) {
    return `/api/projects/${projectId}/scenarios/${scenarioId}`;
  }
}
export const scenarioUpdateEndpoint = new ScenarioUpdateEndpoint();

/** DELETE /api/projects/{id}/scenarios/{scenario_id} */
export class ScenarioDeleteEndpoint extends ApiEndpoint<void, void> {
  readonly method = 'DELETE' as const;
  url(projectId: string, scenarioId: string) {
    return `/api/projects/${projectId}/scenarios/${scenarioId}`;
  }
}
export const scenarioDeleteEndpoint = new ScenarioDeleteEndpoint();
