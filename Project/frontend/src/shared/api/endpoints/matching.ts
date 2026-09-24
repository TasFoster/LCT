import { ApiEndpoint } from './base';
import type { MatchResult } from '../../types/contracts';
import type { MatchingPatchRequest, EquipmentSelectionWrite } from './dto';

/** POST /api/projects/{id}/matching — запуск подбора */
export class MatchingRunEndpoint extends ApiEndpoint<void, MatchResult> {
  readonly method = 'POST' as const;
  url(projectId: string) {
    return `/api/projects/${projectId}/matching`;
  }
}
export const matchingRunEndpoint = new MatchingRunEndpoint();

/** GET /api/projects/{id}/matching — последний результат */
export class MatchingReadEndpoint extends ApiEndpoint<void, MatchResult | null> {
  readonly method = 'GET' as const;
  url(projectId: string) {
    return `/api/projects/${projectId}/matching`;
  }
}
export const matchingReadEndpoint = new MatchingReadEndpoint();

/** PATCH /api/projects/{id}/matching — ручные исключения/добавления */
export class MatchingPatchEndpoint extends ApiEndpoint<MatchingPatchRequest, MatchResult> {
  readonly method = 'PATCH' as const;
  url(projectId: string) {
    return `/api/projects/${projectId}/matching`;
  }
}
export const matchingPatchEndpoint = new MatchingPatchEndpoint();

/** PUT /api/projects/{id}/equipment — состав и количество после сравнения (шаг 4) */
export class EquipmentWriteEndpoint extends ApiEndpoint<EquipmentSelectionWrite, MatchResult> {
  readonly method = 'PUT' as const;
  url(projectId: string) {
    return `/api/projects/${projectId}/equipment`;
  }
}
export const equipmentWriteEndpoint = new EquipmentWriteEndpoint();
