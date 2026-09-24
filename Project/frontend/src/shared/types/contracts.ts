/**
 * Типы по черновым контрактам backend (contracts/*.md).
 * Контракты ещё переделываются — этот файл правится вслед за ними.
 */

export type ObjectType = 'warehouse' | 'airport' | 'medical';
export type AvailabilityStatus = 'available' | 'limited' | 'discontinued' | 'upcoming';
export type AcquisitionModel = 'purchase' | 'leasing' | 'raas';
export type NavigationType =
  | 'lidar_slam'
  | 'visual_slam'
  | 'magnetic_tape'
  | 'qr_markers'
  | 'wire_guided'
  | 'other';
export type CompatibilityVerdict = 'allowed' | 'forbidden' | 'warning' | 'needs_review';
export type RuleOperator = 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'in' | 'has_tag';
export type MatchStatus = 'recommended' | 'needs_review' | 'excluded';
export type ScenarioKind = 'baseline' | 'purchase' | 'raas' | 'custom';
export type FinancingType = 'own_funds' | 'credit' | 'leasing' | 'raas';
export type ProjectStatus = 'draft' | 'calculated' | 'archived';
export type ZoneType = 'storage' | 'operation' | 'charging' | 'restricted' | 'transit';
export type RobotState = 'idle' | 'moving' | 'loading' | 'unloading' | 'charging' | 'blocked';

// --- Контракт 1: CatalogItem (backend/contracts/catalog.py) ---

export interface CatalogIdentification {
  manufacturer: string;
  product_name: string;
  solution_type: string;
  purpose: string;
  country: string;
  availability_status: AvailabilityStatus;
}

export interface CatalogTechnicalSpecs {
  payload_kg: number | null;
  dimensions_mm: string | null;
  speed_mps: number | null;
  throughput_per_hour: number | null;
  autonomy_hours: number | null;
  positioning_accuracy_mm: number | null;
  navigation_type: NavigationType | null;
  operating_conditions: string | null;
}

export interface CatalogInfrastructure {
  aisle_width_mm: number | null;
  charging_type: string | null;
  connectivity: string | null;
  integration_notes: string | null;
  service_model: string | null;
}

export interface CatalogEconomicsInfo {
  equipment_cost: number | null;
  software_cost: number | null;
  implementation_cost: number | null;
  maintenance_cost_per_year: number | null;
  acquisition_model: AcquisitionModel;
  service_life_years: number | null;
}

export interface CatalogApplicability {
  supported_object_types: string[];
  supported_processes: string[];
  limitations: string[];
  case_studies: string[];
}

export interface CatalogDataQuality {
  source: string;
  source_url: string | null;
  last_updated: string;
  confidence: 'verified' | 'partial' | 'unverified';
}

export interface CatalogItem {
  id: string;
  identification: CatalogIdentification;
  technical: CatalogTechnicalSpecs;
  infrastructure: CatalogInfrastructure;
  economics: CatalogEconomicsInfo;
  applicability: CatalogApplicability;
  data_quality: CatalogDataQuality;
  tags: string[];
  attributes: Record<string, string | number | boolean>;
}

// --- Контракт 2: CompatibilityRule (backend/contracts/compatibility.py) ---

export interface RuleCondition {
  key: string;
  operator: RuleOperator;
  value: string | number | boolean | string[];
}

export interface CompatibilityRule {
  id: string;
  equipment_condition: RuleCondition;
  object_condition: RuleCondition;
  verdict: CompatibilityVerdict;
  reason: string;
  source: string | null;
}

// --- Контракт 4: ProjectInput (backend/contracts/project_input.py) ---

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

// --- Контракт 5: MatchResult (backend/contracts/matching.py) ---

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

// --- Контракт 6: Scene (backend/contracts/topology.py, source of truth — scene.md v1.2) ---

export interface Point {
  x: number;
  y: number;
}

export interface SceneBackground {
  image_url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}

export interface Site {
  width: number;
  height: number;
  boundary: Point[];
  background: SceneBackground | null;
}

export interface Wall {
  id: string;
  name: string;
  points: Point[];
  thickness: number;
  tags: string[];
}

export interface Zone {
  id: string;
  name: string;
  zone_type: ZoneType;
  polygon: Point[];
  categories: string[];
  tags: string[];
}

export interface OperationPoint {
  id: string;
  name: string;
  position: Point;
  zone_id: string | null;
  categories: string[];
  tags: string[];
}

export interface ChargingPoint extends OperationPoint {
  slots: number;
}

export interface RoutePoint extends Point {
  ref: string | null;
}

export interface Route {
  id: string;
  name: string;
  points: RoutePoint[];
  bidirectional: boolean;
  tags: string[];
}

export interface RobotPlacement {
  id: string;
  name: string;
  category: string;
  catalog_item_id: string | null;
  start_position: Point;
  start_heading_deg: number;
  start_point_id: string | null;
  home_charging_point_id: string | null;
}

export interface Scene {
  schema_version: string;
  id: string;
  project_id: string;
  name: string;
  updated_at: string;
  units: 'm';
  coordinate_system: 'y_down';
  site: Site;
  walls: Wall[];
  zones: Zone[];
  operation_points: OperationPoint[];
  charging_points: ChargingPoint[];
  routes: Route[];
  robots: RobotPlacement[];
}

// --- Контракт 7: SimulationTimeline (backend/contracts/simulation.py) ---

export interface TimelineFrame {
  robot_id: string;
  t: number;
  x: number;
  y: number;
  state: RobotState;
}

export interface Bottleneck {
  location: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SimulationKPI {
  utilization_pct: number;
  idle_time_pct: number;
  throughput_per_hour: number;
  bottlenecks: Bottleneck[];
}

export interface SimulationTimeline {
  id: string;
  project_id: string;
  scenario_id: string;
  duration_s: number;
  frames: TimelineFrame[];
  kpi: SimulationKPI;
}

// --- Контракт 8: ScenarioInput / EconomicsResult (backend/contracts/economics.py) ---

export interface ScenarioInput {
  project_id: string;
  match_result_id: string;
  scenario_kind: ScenarioKind;
  financing_type: FinancingType;
  financing_rate: number;
  financing_term_years: number;
  discount_rate: number;
  staff_count: number;
  staff_salary_per_month: number;
  staff_tax_rate: number;
  operating_hours_per_year: number;
  load_factor: number;
  horizon_years: number;
  assumptions_overrides: Record<string, number>;
}

export interface SensitivityResultPoint {
  parameter: string;
  delta_pct: number;
  resulting_payback_years: number | null;
  resulting_roi_pct: number;
  resulting_annual_effect: number;
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
  npv: number;
  sensitivity: SensitivityResultPoint[];
  calculated_at: string;
  assumptions_note: string;
  warnings: string[];
}

// --- Контракт 9: ProjectRecord (backend/contracts/records.py) ---

export interface ProjectVersion {
  version: number;
  created_at: string;
  project_input: ProjectInput;
  scene: Scene | null;
  match_result: MatchResult | null;
  scenarios: EconomicsResult[];
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
  versions: ProjectVersion[];
}
