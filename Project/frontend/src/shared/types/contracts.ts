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
  // Общие параметры объекта
  area_sqm: number;
  working_zones: string[];
  available_area_sqm: number | null;
  layout_constraints: string[];
  ceiling_height_m: number;
  mezzanine_floors_count: number;
  main_aisle_width_m: number;
  rack_aisle_width_m: number;
  floor_surface_type: string;
  floor_flatness_mm_per_2m: number;
  // Режим работы
  operating_mode: string;
  shifts_per_day: number;
  working_days_per_year: number;
  shift_duration_hours: number;
  peak_load_factor: number;
  // Операции: объём и производительность
  inbound_ops_per_day: number;
  internal_ops_per_day: number;
  outbound_ops_per_day: number;
  inbound_pallets_per_day: number;
  outbound_pallets_per_day: number;
  picking_lines_per_day: number;
  picking_units_per_day: number;
  piece_pick_share_pct: number;
  sku_count: number;
  fast_moving_sku_share_pct: number;
  // Персонал
  staff_count: number;
  pickers_count: number;
  forklift_operators_count: number;
  packing_operators_count: number;
  staff_cost_per_month: number;
  picker_salary_per_month: number;
  forklift_operator_salary_per_month: number;
  payroll_tax_rate: number;
  picker_throughput_lines_per_hour: number;
  labor_loss_factor_pct: number;
  // Маршруты и планировка
  route_length_m: number;
  picker_route_length_per_line_m: number;
  conveyor_length_m: number;
  // Хранение и характеристики грузов
  storage_type: string;
  rack_system_type: string;
  pallet_positions_count: number;
  unit_load_weight_kg: number;
  unit_load_dimensions_mm: string;
  pallet_weight_kg: number;
  sku_unit_weight_kg: number;
  pallet_dimensions_mm: string;
  sku_unit_dimensions_mm: string;
  oversized_cargo_share_pct: number;
  current_throughput_per_hour: number;
  // Инфраструктура и ограничения
  available_power_kw: number;
  has_wms: boolean;
  erp_system: string | null;
  planned_capex_mln_rub: number;
  payback_horizon_years: number;
}

export interface AirportParams {
  object_type: 'airport';
  // Общие параметры объекта
  operation_zone: string;
  terminal_area_sqm: number;
  apron_area_sqm: number;
  terminals_count: number;
  gates_count: number;
  runways_count: number;
  // Пассажирский поток
  passenger_flow_per_day: number | null;
  passenger_flow_per_year_mln: number;
  peak_passengers_per_hour: number;
  transfer_passengers_share_pct: number;
  check_in_desks_count: number;
  // Наземное обслуживание (RAMP)
  ops_count_per_day: number;
  daily_flights_count: number;
  peak_flights_per_hour: number;
  aircraft_turnaround_time_min: number;
  ground_ops_per_flight: number;
  baggage_units_per_day: number;
  baggage_unit_weight_kg: number;
  baggage_carousels_count: number;
  catering_portions_per_day: number;
  refueling_flights_per_day: number;
  // Внутрипортовая логистика и уборка
  internal_cart_trips_per_day: number;
  cleaning_machines_count: number;
  cleaning_area_sqm: number;
  waste_containers_per_day: number;
  // Персонал
  staff_count: number;
  ramp_staff_count: number;
  terminal_staff_count: number;
  staff_cost_per_month: number;
  ramp_staff_salary_per_month: number;
  terminal_cleaner_salary_per_month: number;
  payroll_tax_rate: number;
  annual_staff_turnover_pct: number;
  // Безопасность и ограничения
  safety_requirements: string[];
  security_zones_count: number;
  has_access_control: boolean;
  airside_certification_requirements: string;
  noise_limit_dba: number;
  unheated_zone_min_temp_c: number;
  // Инфраструктура
  has_fids_aodb: boolean;
  has_bms: boolean;
  available_charging_power_kw: number;
  planned_capex_mln_rub: number;
  payback_horizon_years: number;
  // Прочее
  cargo_flow_tons_per_day: number | null;
  peak_load_per_hour: number;
  route_length_m: number;
  unit_weight_kg: number;
  unit_dimensions_mm: string;
  zone_access: 'closed' | 'open';
}

export interface MedicalParams {
  object_type: 'medical';
  // Общие параметры объекта
  facility_type: string;
  area_sqm: number;
  floors_count: number;
  elevators_count: number;
  beds_count: number;
  bed_occupancy_pct: number;
  operating_rooms_count: number;
  outpatient_visits_per_day: number;
  // Режим работы
  operating_mode: string;
  outpatient_operating_mode: string;
  medical_staff_shifts_per_day: number;
  peak_logistics_hours: string;
  // Внутрибольничная логистика
  cargo_volume_per_day: Record<string, number>;
  meals_per_day_count: number;
  kitchen_to_ward_distance_m: number;
  meal_delivery_points_count: number;
  meal_cart_weight_kg: number;
  meal_delivery_time_norm_min: number;
  dirty_linen_kg_per_day: number;
  clean_linen_kg_per_day: number;
  linen_points_count: number;
  linen_change_frequency_per_day: number;
  linen_container_weight_kg: number;
  medication_sku_count: number;
  medication_requests_per_day: number;
  pharmacy_points_count: number;
  delivery_points_count: number;
  pharmacy_fulfillment_time_min: number;
  stat_delivery_share_pct: number;
  consumables_trips_per_day: number;
  biosample_count_per_day: number;
  labs_count: number;
  sample_delivery_time_norm_min: number;
  lab_results_trips_per_day: number;
  waste_class_a_kg_per_day: number;
  waste_class_b_kg_per_day: number;
  waste_points_count: number;
  waste_collection_frequency_per_day: number;
  routes_and_elevators: string[];
  // Персонал (немедицинский, задействованный в логистике)
  staff_count: number;
  orderlies_count: number;
  kitchen_staff_count: number;
  laundry_staff_count: number;
  staff_cost_per_month: number;
  orderly_salary_per_month: number;
  kitchen_staff_salary_per_month: number;
  payroll_tax_rate: number;
  annual_staff_turnover_pct: number;
  // Требования безопасности и санитарные нормы
  sanitary_requirements: string[];
  robot_disinfection_required: string;
  ward_noise_limit_dba: number;
  has_access_control: boolean;
  robot_surface_material_requirements: string;
  // Инфраструктура
  has_mis: boolean;
  has_lis: boolean;
  has_bms: boolean;
  corridor_width_m: number;
  has_ramps_or_lifts: boolean;
  available_charging_power_kw: number;
  planned_capex_mln_rub: number;
  payback_horizon_years: number;
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
