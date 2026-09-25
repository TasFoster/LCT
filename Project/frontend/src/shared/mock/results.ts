/**
 * Результаты расчётов-заглушки: подбор (MatchResult) и экономика сценариев
 * (EconomicsResult). Числа согласованы с макетом дашборда.
 */

import type { EconomicsResult, MatchResult } from '../types/contracts';

export const MATCH_RESULT: MatchResult = {
  id: 'm-1',
  project_id: 'p-leningradka',
  project_input_id: 'pi-3',
  generated_at: '2026-09-18T16:31:00+03:00',
  selected_equipment: [{ catalog_item_id: 'amr-vektor-600', quantity: 12 }],
  manual_additions: [],
  candidates: [
    {
      catalog_item_id: 'amr-vektor-600',
      status: 'recommended',
      score: 0.91,
      quantity_if_selected: 12,
      reasons: ['Грузоподъёмность 600 кг покрывает груз 450 кг с запасом', 'Проход 1,6 м укладывается в ограничение 2,5 м'],
      factors: [
        { name: 'Грузоподъёмность', weight: 0.3, contribution: 0.28, note: '600 кг при грузе 450 кг' },
        { name: 'Проходимость', weight: 0.25, contribution: 0.25, note: 'нужен проход 1,6 м' },
        { name: 'Производительность', weight: 0.25, contribution: 0.21, note: '22 оп./ч на единицу' },
        { name: 'Стоимость владения', weight: 0.2, contribution: 0.17, note: null },
      ],
    },
    {
      catalog_item_id: 'amr-vektor-1500',
      status: 'recommended',
      score: 0.78,
      quantity_if_selected: 16,
      reasons: ['Покрывает тяжёлые паллеты', 'Проход 2,2 м — на пределе ограничения'],
      factors: [
        { name: 'Грузоподъёмность', weight: 0.3, contribution: 0.3, note: 'избыточно: 1500 кг' },
        { name: 'Проходимость', weight: 0.25, contribution: 0.17, note: 'нужен проход 2,2 м' },
        { name: 'Производительность', weight: 0.25, contribution: 0.16, note: '16 оп./ч на единицу' },
        { name: 'Стоимость владения', weight: 0.2, contribution: 0.15, note: null },
      ],
    },
    {
      catalog_item_id: 'tug-gruz-t3',
      status: 'needs_review',
      score: 0.64,
      quantity_if_selected: 8,
      reasons: ['Данные каталога не проверены (обновлены 18.03.2026)', 'Нужна разметка QR-метками по всем маршрутам'],
      factors: [
        { name: 'Грузоподъёмность', weight: 0.3, contribution: 0.3, note: null },
        { name: 'Проходимость', weight: 0.25, contribution: 0.2, note: null },
        { name: 'Производительность', weight: 0.25, contribution: 0.08, note: '9 оп./ч — мало для 3 400 внутренних операций' },
        { name: 'Стоимость владения', weight: 0.2, contribution: 0.06, note: null },
      ],
    },
    {
      catalog_item_id: 'storage-sever-cube',
      status: 'needs_review',
      score: 0.52,
      quantity_if_selected: 1,
      reasons: ['Подходит только для коробочного хранения — груз 450 кг не проходит', 'Имеет смысл для зоны комплектации отдельно'],
      factors: [
        { name: 'Грузоподъёмность', weight: 0.3, contribution: 0.02, note: '30 кг на ячейку' },
        { name: 'Проходимость', weight: 0.25, contribution: 0.25, note: null },
        { name: 'Производительность', weight: 0.25, contribution: 0.25, note: '450 оп./ч' },
        { name: 'Стоимость владения', weight: 0.2, contribution: 0.0, note: 'CAPEX 47 млн ₽' },
      ],
    },
    {
      catalog_item_id: 'stacker-neva-s14',
      status: 'excluded',
      score: 0.31,
      quantity_if_selected: null,
      reasons: ['Требует проход 2,8 м — на объекте проходы до 2,5 м'],
      factors: [],
    },
    {
      catalog_item_id: 'forklift-avto-l16',
      status: 'excluded',
      score: 0.22,
      quantity_if_selected: null,
      reasons: ['Требует проход 3,2 м — на объекте проходы до 2,5 м'],
      factors: [],
    },
  ],
};

export const SCENARIOS: EconomicsResult[] = [
  {
    scenario_id: 's-base',
    project_id: 'p-leningradka',
    scenario_kind: 'baseline',
    capex_total: 0,
    capex_breakdown: {},
    opex_annual: 31_200_000,
    opex_breakdown: { staff: 28_600_000, energy: 1_400_000, repair: 1_200_000 },
    opex_delta_vs_baseline: 0,
    annual_effect: 0,
    payback_years: null,
    roi_pct: 0,
    tco_total: 156_000_000,
    npv: 0,
    warnings: [],
    sensitivity: [],
    calculated_at: '2026-09-18T16:38:00+03:00',
    assumptions_note: 'Текущая организация работ без роботизации.',
  },
  {
    scenario_id: 's-purchase',
    project_id: 'p-leningradka',
    scenario_kind: 'purchase',
    capex_total: 42_500_000,
    capex_breakdown: {
      equipment: 33_000_000,
      software: 3_200_000,
      integration: 2_400_000,
      commissioning: 1_600_000,
      training: 400_000,
      reserve: 1_900_000,
    },
    opex_annual: 12_800_000,
    opex_breakdown: {
      staff: 8_700_000,
      service: 1_980_000,
      licenses: 640_000,
      energy: 820_000,
      connectivity: 240_000,
      consumables: 180_000,
      repair: 240_000,
    },
    opex_delta_vs_baseline: -18_400_000,
    annual_effect: 18_400_000,
    payback_years: 2.4,
    roi_pct: 108,
    tco_total: 96_200_000,
    npv: 19_200_000,
    warnings: [],
    sensitivity: [
      { parameter: 'Стоимость оборудования', delta_pct: 20, resulting_payback_years: 2.9, resulting_roi_pct: 84, resulting_annual_effect: 14_300_000 },
      { parameter: 'Стоимость персонала', delta_pct: -20, resulting_payback_years: 3.2, resulting_roi_pct: 71, resulting_annual_effect: 12_100_000 },
      { parameter: 'Коэффициент загрузки', delta_pct: -20, resulting_payback_years: 3.0, resulting_roi_pct: 79, resulting_annual_effect: 13_500_000 },
    ],
    calculated_at: '2026-09-18T16:38:00+03:00',
    assumptions_note:
      'Горизонт 5 лет. Резерв в CAPEX 10 %. Тариф электроэнергии 7,2 ₽/кВт·ч. Стоимость персонала 95 000 ₽/мес. Коэффициент загрузки 0,75. Инфляция и дисконтирование не учитываются. Расчёт на данных каталога от 12.09.2026.',
  },
  {
    scenario_id: 's-raas',
    project_id: 'p-leningradka',
    scenario_kind: 'raas',
    capex_total: 1_200_000,
    capex_breakdown: { integration: 1_200_000 },
    opex_annual: 21_600_000,
    opex_breakdown: { staff: 8_700_000, service: 12_300_000, energy: 600_000 },
    opex_delta_vs_baseline: -9_600_000,
    annual_effect: 9_600_000,
    payback_years: 0.2,
    roi_pct: 412,
    tco_total: 109_200_000,
    npv: 31_000_000,
    warnings: [],
    sensitivity: [
      { parameter: 'Стоимость подписки', delta_pct: 20, resulting_payback_years: 0.3, resulting_roi_pct: 280, resulting_annual_effect: 6_500_000 },
      { parameter: 'Стоимость персонала', delta_pct: -20, resulting_payback_years: 0.3, resulting_roi_pct: 250, resulting_annual_effect: 5_800_000 },
      { parameter: 'Коэффициент загрузки', delta_pct: -20, resulting_payback_years: 0.2, resulting_roi_pct: 390, resulting_annual_effect: 9_100_000 },
    ],
    calculated_at: '2026-09-18T16:38:00+03:00',
    assumptions_note: 'Подписка 1 025 000 ₽/мес за 12 роботов, сервис включён. Интеграция оплачивается отдельно.',
  },
  {
    scenario_id: 's-credit',
    project_id: 'p-leningradka',
    scenario_kind: 'custom',
    capex_total: 42_500_000,
    capex_breakdown: {
      equipment: 33_000_000,
      software: 3_200_000,
      integration: 2_400_000,
      commissioning: 1_600_000,
      training: 400_000,
      reserve: 1_900_000,
    },
    opex_annual: 16_900_000,
    opex_breakdown: { staff: 8_700_000, service: 1_980_000, licenses: 640_000, energy: 820_000, repair: 240_000 },
    opex_delta_vs_baseline: -14_300_000,
    annual_effect: 14_300_000,
    payback_years: 3.1,
    roi_pct: 67,
    tco_total: 112_800_000,
    npv: 5_400_000,
    warnings: [],
    sensitivity: [
      { parameter: 'Ставка кредита', delta_pct: 20, resulting_payback_years: 3.5, resulting_roi_pct: 55, resulting_annual_effect: 11_700_000 },
      { parameter: 'Стоимость персонала', delta_pct: -20, resulting_payback_years: 4.1, resulting_roi_pct: 38, resulting_annual_effect: 8_100_000 },
      { parameter: 'Коэффициент загрузки', delta_pct: -20, resulting_payback_years: 3.8, resulting_roi_pct: 46, resulting_annual_effect: 9_800_000 },
    ],
    calculated_at: '2026-09-18T16:38:00+03:00',
    assumptions_note: 'Кредит 18 % годовых на 5 лет, аннуитет. Проценты включены в OPEX.',
  },
];

export const SCENARIO_TITLES: Record<string, { title: string; sub: string }> = {
  's-base': { title: 'Базовый', sub: 'без роботизации' },
  's-purchase': { title: 'Покупка', sub: 'собственные средства' },
  's-raas': { title: 'RaaS', sub: 'роботы как услуга' },
  's-credit': { title: 'Кредит 18 %', sub: 'свой сценарий' },
};

/**
 * Накопленный денежный поток по годам относительно базового сценария.
 * В контракте такого ряда нет (открытый вопрос 1) — пока линейная прикидка.
 */
export function cumulativeCashflow(s: EconomicsResult, years: number): number[] {
  const out: number[] = [];
  for (let y = 0; y <= years; y++) out.push(-s.capex_total + s.annual_effect * y);
  return out;
}
