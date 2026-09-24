import { ApiEndpoint } from './base';
import type { ProjectRecord } from '../../types/contracts';
import type { DemoDraft, DemoCalculateResponse } from './dto';

/** POST /api/demo/calculate — гостевой расчёт без сохранения, шаги 1-5 визарда */
export class DemoCalculateEndpoint extends ApiEndpoint<DemoDraft, DemoCalculateResponse> {
  readonly method = 'POST' as const;
  url() {
    return '/api/demo/calculate';
  }
}
export const demoCalculateEndpoint = new DemoCalculateEndpoint();

/** POST /api/demo/promote — перенос гостевого черновика (sessionStorage) в новый проект */
export class DemoPromoteEndpoint extends ApiEndpoint<DemoDraft, ProjectRecord> {
  readonly method = 'POST' as const;
  url() {
    return '/api/demo/promote';
  }
}
export const demoPromoteEndpoint = new DemoPromoteEndpoint();
