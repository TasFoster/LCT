/**
 * Упрощённый расчёт экономики на фронте — ЗАГЛУШКА до econWrapper (Стас)
 * и функций Александры. Формулы грубые, но выдают результат в форме
 * EconomicsResult, чтобы экраны 5, 6 и дашборд жили на одной структуре
 * и реагировали на ввод. При подключении API этот файл удаляется.
 */

import type { EconomicsResult, FinancingType, ScenarioKind, SensitivityResultPoint } from '../../shared/types/contracts';
import { catalogById } from '../../shared/mock/catalog';
import { MATCH_RESULT } from '../../shared/mock/results';
import type { Draft } from './store';

export interface ScenarioDef {
  id: string;
  title: string;
  kind: ScenarioKind;
  financing: FinancingType;
  /** Переопределения поверх общих входных данных шага 5 (what-if) */
  loadFactor?: number;
  staffCostPerMonth?: number;
  creditRatePct?: number;
  equipmentPriceDeltaPct?: number;
}

export const DEFAULT_SCENARIOS: ScenarioDef[] = [
  { id: 'base', title: 'Базовый', kind: 'baseline', financing: 'own_funds' },
  { id: 'purchase', title: 'Покупка', kind: 'purchase', financing: 'own_funds' },
  { id: 'raas', title: 'RaaS', kind: 'raas', financing: 'raas' },
  { id: 'credit', title: 'Кредит 18 %', kind: 'custom', financing: 'credit', creditRatePct: 18 },
];

const ENERGY_TARIFF = 7.2; // ₽/кВт·ч — из /admin/assumptions
const POWER_KW = 1.2;
const CONNECTIVITY_PER_UNIT = 20_000;
const OTHER_OPEX_BASELINE = 2_600_000;
const RESERVE = 0.1;
/** Какую долю работы персонала роботы берут на себя при полном покрытии нагрузки */
const MAX_REPLACED_SHARE = 0.45;
/** Инфраструктура на единицу техники: зарядка, Wi-Fi, разметка */
const INFRA_PER_UNIT = 150_000;

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function qtyOf(draft: Draft, id: string): number {
  return draft.quantities[id] ?? MATCH_RESULT.candidates.find((c) => c.catalog_item_id === id)?.quantity_if_selected ?? 1;
}

/** Требуемая нагрузка, операций в час — по типу объекта. */
function requiredOpsPerHour(draft: Draft, hoursPerDay: number): number {
  const type = draft.objectType ?? 'warehouse';
  const p = draft.params[type] ?? {};
  if (type === 'warehouse') {
    const perDay = num(p.inbound_ops_per_day, 1200) + num(p.internal_ops_per_day, 3400) + num(p.outbound_ops_per_day, 1100);
    return perDay / hoursPerDay;
  }
  if (type === 'airport') return num(p.peak_load_per_hour, 240);
  const cargo = (p.cargo_volume_per_day ?? {}) as Record<string, number>;
  return Object.values(cargo).reduce((a, b) => a + (b || 0), 0) / hoursPerDay || 14;
}

/** Ставка дисконтирования для NPV, доля */
const DISCOUNT_RATE = 0.15;

export function computeScenario(draft: Draft, def: ScenarioDef): EconomicsResult {
  const type = draft.objectType ?? 'warehouse';
  const p = draft.params[type] ?? {};
  const econ = draft.economics;
  const horizon = econ.horizonYears;
  const load = def.loadFactor ?? econ.loadFactor;
  const staffCost = def.staffCostPerMonth ?? econ.staffCostPerMonth;
  const staffCount = num(p.staff_count, 46);
  const hoursPerDay = Math.max(1, econ.hoursPerYear / 365);

  // Как в ТЗ: staff_cost_per_month — расходы на весь персонал за месяц
  const staffBaseline = staffCost * 12;
  const opexBaseline = staffBaseline + OTHER_OPEX_BASELINE;

  const base: EconomicsResult = {
    scenario_id: def.id,
    project_id: 'draft',
    scenario_kind: def.kind,
    capex_total: 0,
    capex_breakdown: {},
    opex_annual: opexBaseline,
    opex_breakdown: { staff: staffBaseline, energy: OTHER_OPEX_BASELINE * 0.55, repair: OTHER_OPEX_BASELINE * 0.45 },
    opex_delta_vs_baseline: 0,
    annual_effect: 0,
    payback_years: null,
    roi_pct: 0,
    tco_total: opexBaseline * horizon,
    npv: -opexBaseline * horizon,
    warnings: [],
    sensitivity: [],
    calculated_at: new Date().toISOString(),
    assumptions_note: 'Текущая организация работ без роботизации.',
  };
  if (def.kind === 'baseline') return base;

  const priceK = 1 + (def.equipmentPriceDeltaPct ?? 0) / 100;
  let equipment = 0;
  let software = 0;
  let integration = 0;
  let service = 0;
  let units = 0;
  let capacity = 0;
  for (const id of draft.selected) {
    const item = catalogById(id);
    if (!item) continue;
    const q = qtyOf(draft, id);
    units += q;
    equipment += (item.economics.equipment_cost ?? 0) * q * priceK;
    software += item.economics.software_cost ?? 0;
    integration += (item.economics.implementation_cost ?? 0) * Math.max(1, Math.sqrt(q));
    service += (item.economics.maintenance_cost_per_year ?? 0) * q;
    capacity += (item.technical.throughput_per_hour ?? 0) * q * load;
  }

  const share = MAX_REPLACED_SHARE * Math.min(1, capacity / Math.max(1, requiredOpsPerHour(draft, hoursPerDay)));
  const infrastructure = units * INFRA_PER_UNIT;
  const staffAfter = staffBaseline * (1 - share);
  const energy = units * econ.hoursPerYear * load * POWER_KW * ENERGY_TARIFF;
  const connectivity = units * CONNECTIVITY_PER_UNIT;
  const licenses = software * 0.2;
  const other = OTHER_OPEX_BASELINE * 0.9;

  let capexBreakdown: Record<string, number>;
  let opexBreakdown: Record<string, number>;

  if (def.financing === 'raas') {
    capexBreakdown = { infrastructure, integration };
    const subscription = (equipment + software) * 0.24 + service;
    opexBreakdown = { staff: staffAfter, service: subscription, energy, connectivity, repair: other };
  } else {
    const commissioning = equipment * 0.04;
    const training = equipment * 0.01;
    const subtotal = equipment + infrastructure + software + integration + commissioning + training;
    capexBreakdown = { equipment, infrastructure, software, integration, commissioning, training, reserve: subtotal * RESERVE };
    opexBreakdown = { staff: staffAfter, service, licenses, energy, connectivity, repair: other };
    if (def.financing === 'credit' || def.financing === 'leasing') {
      const rate = (def.creditRatePct ?? (def.financing === 'leasing' ? 14 : 18)) / 100;
      const capex = Object.values(capexBreakdown).reduce((a, b) => a + b, 0);
      opexBreakdown.interest = capex * rate * 0.55;
    }
  }

  const capexTotal = Object.values(capexBreakdown).reduce((a, b) => a + b, 0);
  const opex = Object.values(opexBreakdown).reduce((a, b) => a + b, 0);
  const effect = opexBaseline - opex;
  const payback = effect > 0 ? capexTotal / effect : null;
  const roi = capexTotal > 0 ? ((effect * horizon - capexTotal) / capexTotal) * 100 : effect > 0 ? 999 : 0;
  // NPV: годовой эффект, дисконтированный по ставке DISCOUNT_RATE, минус CAPEX
  const npv = Array.from({ length: horizon }, (_, i) => effect / (1 + DISCOUNT_RATE) ** (i + 1)).reduce((a, b) => a + b, 0) - capexTotal;

  return {
    ...base,
    capex_total: capexTotal,
    capex_breakdown: capexBreakdown,
    opex_annual: opex,
    opex_breakdown: opexBreakdown,
    opex_delta_vs_baseline: opex - opexBaseline,
    annual_effect: effect,
    payback_years: payback,
    roi_pct: roi,
    tco_total: capexTotal + opex * horizon,
    npv,
    assumptions_note: [
      `Горизонт ${horizon} лет.`,
      `Резерв в CAPEX ${RESERVE * 100} %.`,
      `Тариф электроэнергии ${ENERGY_TARIFF.toString().replace('.', ',')} ₽/кВт·ч.`,
      `Стоимость всего персонала ${new Intl.NumberFormat('ru-RU').format(staffCost)} ₽/мес (${staffCount} чел.).`,
      `Коэффициент загрузки ${load.toString().replace('.', ',')}.`,
      `Роботы берут на себя ${Math.round(share * 100)} % операций персонала.`,
      def.financing === 'credit' ? `Кредит ${def.creditRatePct ?? 18} % годовых, проценты в OPEX.` : '',
      def.financing === 'raas' ? 'Подписка включает сервис; интеграция оплачивается отдельно.' : '',
      `NPV посчитан по ставке дисконтирования ${Math.round(DISCOUNT_RATE * 100)} %; срок окупаемости — простой, без дисконтирования.`,
      'Инфляция не учитывается.',
    ]
      .filter(Boolean)
      .join(' '),
  };
}

/** Чувствительность: три параметра ±20 % (минимум по ТЗ). */
export function computeSensitivity(draft: Draft, def: ScenarioDef): SensitivityResultPoint[] {
  if (def.kind === 'baseline') return [];
  const econ = draft.economics;
  const variants: { parameter: string; delta_pct: number; patch: Partial<ScenarioDef> }[] = [
    { parameter: 'Стоимость оборудования', delta_pct: 20, patch: { equipmentPriceDeltaPct: (def.equipmentPriceDeltaPct ?? 0) + 20 } },
    { parameter: 'Стоимость персонала', delta_pct: -20, patch: { staffCostPerMonth: (def.staffCostPerMonth ?? econ.staffCostPerMonth) * 0.8 } },
    { parameter: 'Коэффициент загрузки', delta_pct: -20, patch: { loadFactor: (def.loadFactor ?? econ.loadFactor) * 0.8 } },
  ];
  return variants.map((v) => {
    const r = computeScenario(draft, { ...def, ...v.patch });
    return {
      parameter: v.parameter,
      delta_pct: v.delta_pct,
      resulting_payback_years: r.payback_years,
      resulting_roi_pct: r.roi_pct,
      resulting_annual_effect: r.annual_effect,
    };
  });
}

/** Накопленный денежный поток по годам (ряда нет в контракте — открытый вопрос 1). */
export function cashflow(r: EconomicsResult, years: number): number[] {
  return Array.from({ length: years + 1 }, (_, y) => -r.capex_total + r.annual_effect * y);
}

/** Выгода на горизонте: накопленный эффект минус вложения (конечная точка графика). */
export function horizonGain(r: EconomicsResult, years: number): number {
  return r.annual_effect * years - r.capex_total;
}

/**
 * Лучший сценарий — по выгоде за горизонт (то же, что минимальный TCO).
 * По сроку окупаемости всегда «выигрывает» RaaS с почти нулевым CAPEX,
 * даже если за горизонт он приносит меньше (открытый вопрос 3 в карте экранов).
 */
export function bestScenario(results: { def: ScenarioDef; result: EconomicsResult }[], years: number) {
  return results
    .filter((r) => r.def.kind !== 'baseline' && r.result.annual_effect > 0)
    .sort((a, b) => horizonGain(b.result, years) - horizonGain(a.result, years))[0];
}

/** Сценарий с самой быстрой окупаемостью — для подписи рядом с лучшим. */
export function fastestPayback(results: { def: ScenarioDef; result: EconomicsResult }[]) {
  return results
    .filter((r) => r.def.kind !== 'baseline' && r.result.payback_years !== null)
    .sort((a, b) => (a.result.payback_years ?? Infinity) - (b.result.payback_years ?? Infinity))[0];
}
