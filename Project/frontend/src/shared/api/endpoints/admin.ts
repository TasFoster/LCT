import { ApiEndpoint } from './base';
import type { CatalogItem, CompatibilityRule } from '../../types/contracts';
import type {
  AdminSummary,
  CatalogItemWrite,
  CatalogImportResult,
  CompatibilityRuleWrite,
  RuleTestRequest,
  RuleTestResponse,
  AdminDictionaries,
  EconAssumptions,
  UserSummary,
  AdminUserUpdateRequest,
} from './dto';

/** GET /api/admin/summary */
export class AdminSummaryEndpoint extends ApiEndpoint<void, AdminSummary> {
  readonly method = 'GET' as const;
  url() {
    return '/api/admin/summary';
  }
}
export const adminSummaryEndpoint = new AdminSummaryEndpoint();

/** GET /api/admin/catalog */
export class AdminCatalogListEndpoint extends ApiEndpoint<void, CatalogItem[]> {
  readonly method = 'GET' as const;
  url() {
    return '/api/admin/catalog';
  }
}
export const adminCatalogListEndpoint = new AdminCatalogListEndpoint();

/** POST /api/admin/catalog */
export class AdminCatalogCreateEndpoint extends ApiEndpoint<CatalogItemWrite, CatalogItem> {
  readonly method = 'POST' as const;
  url() {
    return '/api/admin/catalog';
  }
}
export const adminCatalogCreateEndpoint = new AdminCatalogCreateEndpoint();

/** GET /api/admin/catalog/{id} */
export class AdminCatalogDetailEndpoint extends ApiEndpoint<void, CatalogItem> {
  readonly method = 'GET' as const;
  url(itemId: string) {
    return `/api/admin/catalog/${itemId}`;
  }
}
export const adminCatalogDetailEndpoint = new AdminCatalogDetailEndpoint();

/** PUT /api/admin/catalog/{id} */
export class AdminCatalogUpdateEndpoint extends ApiEndpoint<CatalogItemWrite, CatalogItem> {
  readonly method = 'PUT' as const;
  url(itemId: string) {
    return `/api/admin/catalog/${itemId}`;
  }
}
export const adminCatalogUpdateEndpoint = new AdminCatalogUpdateEndpoint();

/** DELETE /api/admin/catalog/{id} */
export class AdminCatalogDeleteEndpoint extends ApiEndpoint<void, void> {
  readonly method = 'DELETE' as const;
  url(itemId: string) {
    return `/api/admin/catalog/${itemId}`;
  }
}
export const adminCatalogDeleteEndpoint = new AdminCatalogDeleteEndpoint();

/** POST /api/admin/catalog/import — multipart/form-data, файл CSV/Excel */
export class AdminCatalogImportEndpoint extends ApiEndpoint<FormData, CatalogImportResult> {
  readonly method = 'POST' as const;
  url() {
    return '/api/admin/catalog/import';
  }
}
export const adminCatalogImportEndpoint = new AdminCatalogImportEndpoint();

/** GET /api/admin/catalog/export — отдаёт файл */
export class AdminCatalogExportEndpoint extends ApiEndpoint<void, Blob> {
  readonly method = 'GET' as const;
  url() {
    return '/api/admin/catalog/export';
  }
}
export const adminCatalogExportEndpoint = new AdminCatalogExportEndpoint();

/** GET /api/admin/rules */
export class AdminRuleListEndpoint extends ApiEndpoint<void, CompatibilityRule[]> {
  readonly method = 'GET' as const;
  url() {
    return '/api/admin/rules';
  }
}
export const adminRuleListEndpoint = new AdminRuleListEndpoint();

/** POST /api/admin/rules */
export class AdminRuleCreateEndpoint extends ApiEndpoint<CompatibilityRuleWrite, CompatibilityRule> {
  readonly method = 'POST' as const;
  url() {
    return '/api/admin/rules';
  }
}
export const adminRuleCreateEndpoint = new AdminRuleCreateEndpoint();

/** PUT /api/admin/rules/{id} */
export class AdminRuleUpdateEndpoint extends ApiEndpoint<CompatibilityRuleWrite, CompatibilityRule> {
  readonly method = 'PUT' as const;
  url(ruleId: string) {
    return `/api/admin/rules/${ruleId}`;
  }
}
export const adminRuleUpdateEndpoint = new AdminRuleUpdateEndpoint();

/** DELETE /api/admin/rules/{id} */
export class AdminRuleDeleteEndpoint extends ApiEndpoint<void, void> {
  readonly method = 'DELETE' as const;
  url(ruleId: string) {
    return `/api/admin/rules/${ruleId}`;
  }
}
export const adminRuleDeleteEndpoint = new AdminRuleDeleteEndpoint();

/** POST /api/admin/rules/{id}/test — проверка правила на тестовой паре оборудование/объект */
export class AdminRuleTestEndpoint extends ApiEndpoint<RuleTestRequest, RuleTestResponse> {
  readonly method = 'POST' as const;
  url(ruleId: string) {
    return `/api/admin/rules/${ruleId}/test`;
  }
}
export const adminRuleTestEndpoint = new AdminRuleTestEndpoint();

/** GET /api/admin/dictionaries */
export class AdminDictionariesReadEndpoint extends ApiEndpoint<void, AdminDictionaries> {
  readonly method = 'GET' as const;
  url() {
    return '/api/admin/dictionaries';
  }
}
export const adminDictionariesReadEndpoint = new AdminDictionariesReadEndpoint();

/** PUT /api/admin/dictionaries */
export class AdminDictionariesWriteEndpoint extends ApiEndpoint<AdminDictionaries, AdminDictionaries> {
  readonly method = 'PUT' as const;
  url() {
    return '/api/admin/dictionaries';
  }
}
export const adminDictionariesWriteEndpoint = new AdminDictionariesWriteEndpoint();

/** GET /api/admin/assumptions */
export class AdminAssumptionsReadEndpoint extends ApiEndpoint<void, EconAssumptions> {
  readonly method = 'GET' as const;
  url() {
    return '/api/admin/assumptions';
  }
}
export const adminAssumptionsReadEndpoint = new AdminAssumptionsReadEndpoint();

/** PUT /api/admin/assumptions */
export class AdminAssumptionsWriteEndpoint extends ApiEndpoint<EconAssumptions, EconAssumptions> {
  readonly method = 'PUT' as const;
  url() {
    return '/api/admin/assumptions';
  }
}
export const adminAssumptionsWriteEndpoint = new AdminAssumptionsWriteEndpoint();

/** GET /api/admin/users */
export class AdminUserListEndpoint extends ApiEndpoint<void, UserSummary[]> {
  readonly method = 'GET' as const;
  url() {
    return '/api/admin/users';
  }
}
export const adminUserListEndpoint = new AdminUserListEndpoint();

/** PATCH /api/admin/users/{id} — роли, блокировка */
export class AdminUserUpdateEndpoint extends ApiEndpoint<AdminUserUpdateRequest, UserSummary> {
  readonly method = 'PATCH' as const;
  url(userId: string) {
    return `/api/admin/users/${userId}`;
  }
}
export const adminUserUpdateEndpoint = new AdminUserUpdateEndpoint();
