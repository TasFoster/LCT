import { ApiEndpoint } from './base';
import type { ProjectRecord, ProjectVersion } from '../../types/contracts';
import type {
  ProjectCreateRequest,
  ProjectUpdateRequest,
  ProjectListItem,
  ProjectVersionSummary,
} from './dto';

/** GET /api/projects */
export class ProjectListEndpoint extends ApiEndpoint<void, ProjectListItem[]> {
  readonly method = 'GET' as const;
  url() {
    return '/api/projects';
  }
}
export const projectListEndpoint = new ProjectListEndpoint();

/** POST /api/projects */
export class ProjectCreateEndpoint extends ApiEndpoint<ProjectCreateRequest, ProjectRecord> {
  readonly method = 'POST' as const;
  url() {
    return '/api/projects';
  }
}
export const projectCreateEndpoint = new ProjectCreateEndpoint();

/** GET /api/projects/{id} */
export class ProjectDetailEndpoint extends ApiEndpoint<void, ProjectRecord> {
  readonly method = 'GET' as const;
  url(projectId: string) {
    return `/api/projects/${projectId}`;
  }
}
export const projectDetailEndpoint = new ProjectDetailEndpoint();

/** PATCH /api/projects/{id} */
export class ProjectUpdateEndpoint extends ApiEndpoint<ProjectUpdateRequest, ProjectRecord> {
  readonly method = 'PATCH' as const;
  url(projectId: string) {
    return `/api/projects/${projectId}`;
  }
}
export const projectUpdateEndpoint = new ProjectUpdateEndpoint();

/** DELETE /api/projects/{id} */
export class ProjectDeleteEndpoint extends ApiEndpoint<void, void> {
  readonly method = 'DELETE' as const;
  url(projectId: string) {
    return `/api/projects/${projectId}`;
  }
}
export const projectDeleteEndpoint = new ProjectDeleteEndpoint();

/** GET /api/projects/{id}/versions */
export class ProjectVersionListEndpoint extends ApiEndpoint<void, ProjectVersionSummary[]> {
  readonly method = 'GET' as const;
  url(projectId: string) {
    return `/api/projects/${projectId}/versions`;
  }
}
export const projectVersionListEndpoint = new ProjectVersionListEndpoint();

/** GET /api/projects/{id}/versions/{v} — снапшот, только чтение */
export class ProjectVersionDetailEndpoint extends ApiEndpoint<void, ProjectVersion> {
  readonly method = 'GET' as const;
  url(projectId: string, version: string) {
    return `/api/projects/${projectId}/versions/${version}`;
  }
}
export const projectVersionDetailEndpoint = new ProjectVersionDetailEndpoint();

/** POST /api/projects/{id}/versions/{v}/promote — «сделать текущей» (копией) */
export class ProjectVersionPromoteEndpoint extends ApiEndpoint<void, ProjectRecord> {
  readonly method = 'POST' as const;
  url(projectId: string, version: string) {
    return `/api/projects/${projectId}/versions/${version}/promote`;
  }
}
export const projectVersionPromoteEndpoint = new ProjectVersionPromoteEndpoint();
