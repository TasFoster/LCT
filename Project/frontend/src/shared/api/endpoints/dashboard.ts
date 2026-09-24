import { ApiEndpoint } from './base';
import type { EconomicsResult } from '../../types/contracts';
import type { ExportRequest, ExportFile } from './dto';

/** GET /api/projects/{id}/dashboard — сводка сценариев для итогового экрана */
export class DashboardEndpoint extends ApiEndpoint<void, EconomicsResult[]> {
  readonly method = 'GET' as const;
  url(projectId: string) {
    return `/api/projects/${projectId}/dashboard`;
  }
}
export const dashboardEndpoint = new DashboardEndpoint();

/** POST /api/projects/{id}/export/pdf */
export class ExportPdfEndpoint extends ApiEndpoint<ExportRequest, ExportFile> {
  readonly method = 'POST' as const;
  url(projectId: string) {
    return `/api/projects/${projectId}/export/pdf`;
  }
}
export const exportPdfEndpoint = new ExportPdfEndpoint();

/** POST /api/projects/{id}/export/excel */
export class ExportExcelEndpoint extends ApiEndpoint<ExportRequest, ExportFile> {
  readonly method = 'POST' as const;
  url(projectId: string) {
    return `/api/projects/${projectId}/export/excel`;
  }
}
export const exportExcelEndpoint = new ExportExcelEndpoint();
