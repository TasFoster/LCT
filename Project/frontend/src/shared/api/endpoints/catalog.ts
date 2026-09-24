import { ApiEndpoint } from './base';
import type { CatalogItem } from '../../types/contracts';

export interface CatalogListQuery {
  solution_type?: string;
  object_type?: string;
  min_payload_kg?: number;
  navigation_type?: string;
  availability_status?: string;
  manufacturer?: string;
}

/** GET /api/catalog */
export class CatalogListEndpoint extends ApiEndpoint<CatalogListQuery, CatalogItem[]> {
  readonly method = 'GET' as const;
  url() {
    return '/api/catalog';
  }
}
export const catalogListEndpoint = new CatalogListEndpoint();

/** GET /api/catalog/{item_id} */
export class CatalogDetailEndpoint extends ApiEndpoint<void, CatalogItem> {
  readonly method = 'GET' as const;
  url(itemId: string) {
    return `/api/catalog/${itemId}`;
  }
}
export const catalogDetailEndpoint = new CatalogDetailEndpoint();
