import { ApiEndpoint } from './base';
import type { ProjectInput } from '../../types/contracts';
import type { ProjectInputWrite } from './dto';

/** PUT /api/projects/{id}/input — шаги 1-2 визарда, upsert черновика */
export class ProjectInputWriteEndpoint extends ApiEndpoint<ProjectInputWrite, ProjectInput> {
  readonly method = 'PUT' as const;
  url(projectId: string) {
    return `/api/projects/${projectId}/input`;
  }
}
export const projectInputWriteEndpoint = new ProjectInputWriteEndpoint();

/** GET /api/projects/{id}/input */
export class ProjectInputReadEndpoint extends ApiEndpoint<void, ProjectInput | null> {
  readonly method = 'GET' as const;
  url(projectId: string) {
    return `/api/projects/${projectId}/input`;
  }
}
export const projectInputReadEndpoint = new ProjectInputReadEndpoint();
