/**
 * Типы по черновым контрактам backend (contracts/*.md).
 * Контракты ещё переделываются — этот файл правится вслед за ними.
 */

export type ObjectType = 'warehouse' | 'airport' | 'medical';
export type AvailabilityStatus = 'available' | 'limited' | 'discontinued' | 'upcoming';
export type AcquisitionModel = 'purchase' | 'leasing' | 'raas';
export type MatchStatus = 'recommended' | 'needs_review' | 'excluded';
export type ScenarioKind = 'baseline' | 'purchase' | 'raas' | 'custom';
export type FinancingType = 'own_funds' | 'credit' | 'leasing' | 'raas';
export type ProjectStatus = 'draft' | 'calculated' | 'archived';
export type ZoneType = 'storage' | 'operation' | 'charging' | 'restricted' | 'transit';

export interface WarehouseParams {
  object_type: 'warehouse';
  area_sqm: number;
  working_zones: string[];
  operating_mode: string;
  inbound_ops_per_day: number;
  internal_ops_per_day: number;
  outbound_ops_per_day: number;
  storage_type: string;
  sku_count: number;
  unit_load_weight_kg: number;
  unit_load_dimensions_mm: string;
  staff_count: number;
  staff_cost_per_month: number;
  current_throughput_per_hour: number;
  route_length_m: number;
  available_area_sqm: number | null;
  layout_constraints: string[];
}

export interface AirportParams {
  object_type: 'airport';
  operation_zone: string;
  operating_mode: string;
  passenger_flow_per_day: number | null;
  cargo_flow_tons_per_day: number | null;
  ops_count_per_day: number;
  peak_load_per_hour: number;
  route_length_m: number;
  unit_weight_kg: number;
  unit_dimensions_mm: string;
  staff_count: number;
  staff_cost_per_month: number;
  safety_requirements: string[];
  zone_access: 'closed' | 'open';
}

export interface MedicalParams {
  object_type: 'medical';
  facility_type: string;
  area_sqm: number;
  floors_count: number;
  operating_mode: string;
  cargo_volume_per_day: Record<string, number>;
  routes_and_elevators: string[];
  sanitary_requirements: string[];
  staff_count: number;
  staff_cost_per_month: number;
  access_restrictions: string[];
}

export type ObjectParams = WarehouseParams | AirportParams | MedicalParams;

export interface ProjectInput {
  id: string;
  project_id: string;
  object_type: ObjectType;
  params: ObjectParams;
  created_at: string;
  source: 'manual' | 'excel_import' | 'csv_import';
}

export interface MatchFactor {
  name: string;
  weight: number;
  contribution: number;
  note: string | null;
}

export interface MatchCandidate {
  catalog_item_id: string;
  status: MatchStatus;
  score: number;
  factors: MatchFactor[];
  reasons: string[];
  quantity_if_selected: number | null;
}

export interface MatchResult {
  id: string;
  project_id: string;
  project_input_id: string;
  generated_at: string;
  candidates: MatchCandidate[];
  selected_equipment: { catalog_item_id: string; quantity: number }[];
  manual_additions: string[];
}

export interface SensitivityResultPoint {
  parameter: string;
  delta_pct: number;
  resulting_payback_years: number;
  resulting_roi_pct: number;
}

export interface EconomicsResult {
  scenario_id: string;
  project_id: string;
  scenario_kind: ScenarioKind;
  capex_total: number;
  capex_breakdown: Record<string, number>;
  opex_annual: number;
  opex_breakdown: Record<string, number>;
  opex_delta_vs_baseline: number;
  annual_effect: number;
  payback_years: number | null;
  roi_pct: number;
  tco_total: number;
  sensitivity: SensitivityResultPoint[];
  calculated_at: string;
  assumptions_note: string;
}

export interface ProjectRecord {
  id: string;
  owner_user_id: string;
  name: string;
  object_type: ObjectType;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  current_version: number;
}
