import type { ObjectType, ProjectRecord, WarehouseParams } from '../types/contracts';
import type { WizardStepSlug } from '../config/routes';

/** Запись списка проектов + то, что списку нужно поверх контракта. */
export interface ProjectListItem extends Omit<ProjectRecord, 'versions'> {
  /** Последний пройденный шаг визарда */
  last_step: WizardStepSlug;
  /** Лучший срок окупаемости среди сценариев, лет */
  best_payback_years: number | null;
  scenarios_count: number;
  site: string;
}

export const PROJECTS: ProjectListItem[] = [
  {
    id: 'p-leningradka',
    owner_user_id: 'u-1',
    name: 'Склад на Ленинградке',
    object_type: 'warehouse',
    status: 'calculated',
    created_at: '2026-08-28T09:12:00+03:00',
    updated_at: '2026-09-18T16:40:00+03:00',
    current_version: 3,
    last_step: 'export',
    best_payback_years: 2.4,
    scenarios_count: 4,
    site: 'Химки, 12 500 м²',
  },
  {
    id: 'p-svo-baggage',
    owner_user_id: 'u-1',
    name: 'Багажное отделение, терминал B',
    object_type: 'airport',
    status: 'draft',
    created_at: '2026-09-10T11:03:00+03:00',
    updated_at: '2026-09-20T10:15:00+03:00',
    current_version: 1,
    last_step: 'matching',
    best_payback_years: null,
    scenarios_count: 0,
    site: 'Багажное отделение',
  },
  {
    id: 'p-gkb-7',
    owner_user_id: 'u-1',
    name: 'ГКБ №7: доставка между корпусами',
    object_type: 'medical',
    status: 'calculated',
    created_at: '2026-07-14T14:22:00+03:00',
    updated_at: '2026-09-05T12:00:00+03:00',
    current_version: 2,
    last_step: 'scenarios',
    best_payback_years: 3.8,
    scenarios_count: 3,
    site: '6 корпусов, 9 этажей',
  },
  {
    id: 'p-rc-south',
    owner_user_id: 'u-1',
    name: 'РЦ «Южный», зона комплектации',
    object_type: 'warehouse',
    status: 'draft',
    created_at: '2026-09-19T08:40:00+03:00',
    updated_at: '2026-09-19T08:52:00+03:00',
    current_version: 1,
    last_step: 'params',
    best_payback_years: null,
    scenarios_count: 0,
    site: 'Ростов-на-Дону, 34 000 м²',
  },
  {
    id: 'p-old-kazan',
    owner_user_id: 'u-1',
    name: 'Казань, пилот 2025',
    object_type: 'warehouse',
    status: 'archived',
    created_at: '2025-11-02T10:00:00+03:00',
    updated_at: '2026-02-11T17:30:00+03:00',
    current_version: 5,
    last_step: 'export',
    best_payback_years: 4.6,
    scenarios_count: 3,
    site: 'Казань, 8 000 м²',
  },
];

export const projectById = (id: string | undefined) => PROJECTS.find((p) => p.id === id);

/** Проект по id, а для неизвестных id — демо-проект, чтобы любые ссылки открывались. */
export function projectOrDemo(id: string | undefined): ProjectListItem {
  return projectById(id) ?? { ...PROJECTS[0], id: id ?? PROJECTS[0].id };
}

/**
 * Демо-склад: заполнен весь WarehouseParams из контракта 4. Часть полей форма
 * шага 2 пока не спрашивает — здесь они стоят как типовые значения объекта
 * такого размера, чтобы моки и расчёт-заглушка были полными.
 */
export const DEMO_WAREHOUSE_PARAMS: WarehouseParams = {
  object_type: 'warehouse',
  // Помещение
  area_sqm: 12_500,
  working_zones: ['receiving', 'storage', 'picking', 'shipping'],
  available_area_sqm: 4200,
  layout_constraints: ['narrow_aisles_2_5', 'columns_6x6'],
  ceiling_height_m: 12,
  mezzanine_floors_count: 1,
  main_aisle_width_m: 3.6,
  rack_aisle_width_m: 2.5,
  floor_surface_type: 'Бетон с упрочнённым верхним слоем',
  floor_flatness_mm_per_2m: 4,
  // Режим работы
  operating_mode: '24/7',
  shifts_per_day: 3,
  working_days_per_year: 365,
  shift_duration_hours: 8,
  peak_load_factor: 1.4,
  // Операции
  inbound_ops_per_day: 1200,
  internal_ops_per_day: 3400,
  outbound_ops_per_day: 1100,
  inbound_pallets_per_day: 900,
  outbound_pallets_per_day: 820,
  picking_lines_per_day: 5600,
  picking_units_per_day: 14_200,
  piece_pick_share_pct: 35,
  sku_count: 8400,
  fast_moving_sku_share_pct: 20,
  // Персонал
  staff_count: 46,
  pickers_count: 22,
  forklift_operators_count: 10,
  packing_operators_count: 8,
  // Как в ТЗ: на весь замещаемый персонал за месяц, с налогами
  staff_cost_per_month: 4_370_000,
  picker_salary_per_month: 85_000,
  forklift_operator_salary_per_month: 105_000,
  payroll_tax_rate: 0.3,
  picker_throughput_lines_per_hour: 38,
  labor_loss_factor_pct: 12,
  // Маршруты
  route_length_m: 1800,
  picker_route_length_per_line_m: 42,
  conveyor_length_m: 180,
  // Хранение и грузы
  storage_type: 'selective_rack',
  rack_system_type: 'Фронтальные стеллажи, 5 ярусов',
  pallet_positions_count: 9800,
  unit_load_weight_kg: 450,
  unit_load_dimensions_mm: '1200×800×1450',
  pallet_weight_kg: 25,
  sku_unit_weight_kg: 4.2,
  pallet_dimensions_mm: '1200×800×145',
  sku_unit_dimensions_mm: '400×300×250',
  oversized_cargo_share_pct: 6,
  current_throughput_per_hour: 120,
  // Инфраструктура и бюджет
  available_power_kw: 250,
  has_wms: true,
  erp_system: '1С:ERP',
  planned_capex_mln_rub: 60,
  payback_horizon_years: 5,
};

export interface ProjectVersionItem {
  version: number;
  created_at: string;
  author: string;
  summary: string;
  scenarios: number;
  best_payback_years: number | null;
  is_current: boolean;
}

export const VERSIONS: ProjectVersionItem[] = [
  {
    version: 3,
    created_at: '2026-09-18T16:40:00+03:00',
    author: 'Иван Петров',
    summary: 'Добавлен сценарий «Кредит 18 %», горизонт 5 лет',
    scenarios: 4,
    best_payback_years: 2.4,
    is_current: true,
  },
  {
    version: 2,
    created_at: '2026-09-10T12:05:00+03:00',
    author: 'Иван Петров',
    summary: 'Персонал 52 → 46 человек, пересчитан подбор',
    scenarios: 3,
    best_payback_years: 2.1,
    is_current: false,
  },
  {
    version: 1,
    created_at: '2026-08-28T09:40:00+03:00',
    author: 'Иван Петров',
    summary: 'Первый расчёт',
    scenarios: 3,
    best_payback_years: 2.7,
    is_current: false,
  },
];

export const OBJECT_ICON: Record<ObjectType, string> = {
  warehouse: '▦',
  airport: '✈',
  medical: '✚',
};
