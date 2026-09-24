/**
 * Вспомогательные типы API-слоя, которых нет напрямую в контрактах бэкенда
 * (write-варианты без серверных полей, сводки для списков, auth/admin-формы).
 * Полные модели, зеркалящие backend/contracts/*.md, — в shared/types/contracts.ts.
 */
import type {
  ObjectType,
  ObjectParams,
  ProjectStatus,
  FinancingType,
  CatalogItem,
  CompatibilityRule,
  CompatibilityVerdict,
  MatchResult,
  EconomicsResult,
} from '../../types/contracts';

// --- auth ---

export type UserRole = 'user' | 'admin';

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  blocked: boolean;
}

export interface AuthSession {
  user: UserSummary;
  token: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

// --- demo (гостевой расчёт, /demo) ---

export interface DemoDraft {
  object_type: ObjectType;
  params: ObjectParams;
}

export interface DemoCalculateResponse {
  match_result: MatchResult;
  economics: EconomicsResult;
}

// --- projects ---

export interface ProjectCreateRequest {
  name: string;
  object_type: ObjectType;
}

export interface ProjectUpdateRequest {
  name?: string;
  status?: ProjectStatus;
}

export interface ProjectListItem {
  id: string;
  name: string;
  object_type: ObjectType;
  status: ProjectStatus;
  updated_at: string;
  best_payback_years: number | null;
}

export interface ProjectVersionSummary {
  version: number;
  created_at: string;
  summary: string;
}

// --- шаг 2: параметры объекта ---

export interface ProjectInputWrite {
  object_type: ObjectType;
  params: ObjectParams;
  source?: 'manual' | 'excel_import' | 'csv_import';
}

// --- шаг 3-4: подбор и состав оборудования ---

export interface MatchingPatchRequest {
  excluded_candidate_ids?: string[];
  manual_additions?: string[];
}

export interface EquipmentSelectionWrite {
  selected_equipment: { catalog_item_id: string; quantity: number }[];
}

// --- шаг 5-6: сценарии ---

export interface ScenarioPatchRequest {
  financing_type?: FinancingType;
  financing_rate?: number;
  staff_count?: number;
  staff_salary_per_month?: number;
  operating_hours_per_year?: number;
  load_factor?: number;
  horizon_years?: number;
  assumptions_overrides?: Record<string, number>;
}

// --- шаг 7: подложка сцены ---

/** Ответ POST /api/projects/{id}/scene/background — ссылку кладут в Scene.site.background.image_url */
export interface SceneBackgroundUploadResponse {
  image_url: string;
}

// --- шаг 7: симуляция ---

export interface SimulationRunRequest {
  scenario_id: string;
}

export interface SimulationJob {
  job_id: string;
  status: 'pending' | 'running' | 'done' | 'error';
  error: string | null;
}

// --- шаг 8: экспорт ---

export interface ExportRequest {
  version?: number;
}

export interface ExportFile {
  url: string;
  generated_at: string;
}

// --- admin: каталог/правила ---

export type CatalogItemWrite = Omit<CatalogItem, 'id'>;
export type CompatibilityRuleWrite = Omit<CompatibilityRule, 'id'>;

export interface CatalogImportResult {
  imported: number;
  errors: string[];
}

export interface RuleTestRequest {
  equipment: Record<string, string | number | boolean>;
  object: Record<string, string | number | boolean>;
}

export interface RuleTestResponse {
  verdict: CompatibilityVerdict;
  reason: string;
}

// --- admin: справочники, допущения, сводка ---

export interface AdminDictionaries {
  solution_types: string[];
  processes: string[];
  zone_types: string[];
  operating_modes: string[];
  layout_constraints: string[];
}

export interface EconAssumptions {
  electricity_tariff_per_kwh: number;
  credit_rate_default: number;
  capex_reserve_pct: number;
  tco_horizon_years_default: number;
  sensitivity_parameters: string[];
}

export interface AdminSummary {
  catalog_count: number;
  unverified_count: number;
  rules_count: number;
  outdated_count: number;
  users_count: number;
}

export interface AdminUserUpdateRequest {
  role?: UserRole;
  blocked?: boolean;
}
