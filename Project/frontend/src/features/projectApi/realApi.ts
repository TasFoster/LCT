/**
 * Клиент реального бэкенда (Project/backend/api/main.py) — три эндпоинта без
 * хранения состояния между запросами (см. докстринг main.py): каталог,
 * подбор, симуляция. Проекты/параметры/план по-прежнему живут в mockServer —
 * этот файл их не трогает, только добавляет реальные данные там, где раньше
 * были моковые (CATALOG, MATCH_RESULT).
 *
 * Адрес сервера — VITE_API_BASE_URL, по умолчанию локальный uvicorn
 * (см. CLAUDE.md, «Команды разработки»: `uvicorn api.main:app --port 8000`).
 */

import type { CatalogItem, EconomicsResult, MatchResult, ObjectType, Scene, SimulationTimeline } from '../../shared/types/contracts';
import type { ParamValues } from '../wizard/paramsSchema';
import type { Draft } from '../wizard/store';
import type { ScenarioDef } from '../wizard/mockEconomics';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:8000';

export class RealApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new RealApiError('Сервер подбора недоступен — запущен ли `uvicorn api.main:app --port 8000` в Project/backend?');
  }
  if (!res.ok) {
    const body = await res.text();
    throw new RealApiError(`Сервер вернул ошибку ${res.status}: ${body.slice(0, 300)}`, res.status);
  }
  return res.json() as Promise<T>;
}

/** GET /api/catalog — реальный каталог, 223 позиции */
export function fetchRealCatalog(): Promise<CatalogItem[]> {
  return request<CatalogItem[]>('/api/catalog');
}

/** ProjectInput для отправки в /api/matching/run и /api/simulation/run — та же
 * форма, что и у contracts.ProjectInput, но собранная из черновика визарда
 * (draft.params[type] иногда не несёт свой object_type, см. StepParams.tsx
 * DEMO_VALUES — довносим его явно, а не полагаемся на форму). */
export function buildProjectInput(projectId: string, objectType: ObjectType, params: ParamValues) {
  return {
    id: `pi-${projectId}`,
    project_id: projectId,
    object_type: objectType,
    params: { ...params, object_type: objectType },
    created_at: new Date().toISOString(),
    source: 'manual' as const,
  };
}

/** POST /api/matching/run */
export function runRealMatching(projectInput: ReturnType<typeof buildProjectInput>): Promise<MatchResult> {
  return request<MatchResult>('/api/matching/run', { method: 'POST', body: JSON.stringify(projectInput) });
}

/** POST /api/simulation/run */
export function runRealSimulation(
  scene: Scene,
  projectInput: ReturnType<typeof buildProjectInput>,
  scenarioId: string,
): Promise<SimulationTimeline> {
  return request<SimulationTimeline>('/api/simulation/run', {
    method: 'POST',
    body: JSON.stringify({ scene, project_input: projectInput, scenario_id: scenarioId }),
  });
}

interface SelectedEquipmentDto {
  catalog_item_id: string;
  quantity: number;
}

/** Состав оборудования для econWrapper — количество берём из того, что
 * пользователь выставил на шаге «Сравнение» (draft.quantities), 1 по
 * умолчанию для добавленного вручную без явного количества. */
export function selectedEquipmentFrom(draft: Draft): SelectedEquipmentDto[] {
  return draft.selected.map((id) => ({ catalog_item_id: id, quantity: draft.quantities[id] ?? 1 }));
}

/** Сумма equipment_cost по составу — нужна отдельно от selectedEquipmentFrom,
 * чтобы посчитать «изменение цены оборудования» сценария (% от текущей суммы),
 * см. buildScenarioInput. */
export function equipmentCostTotalFrom(draft: Draft, catalogItemById: (id: string) => CatalogItem | undefined): number {
  return draft.selected.reduce((sum, id) => {
    const item = catalogItemById(id);
    const qty = draft.quantities[id] ?? 1;
    return sum + (item?.economics.equipment_cost ?? 0) * qty;
  }, 0);
}

/** ScenarioInput для /api/economics/run — переносит те же допущения
 * (financing/credit rate/load factor/staff cost), что и мок
 * `features/wizard/mockEconomics.ts`, в форму реального контракта 8.
 * equipmentPriceDeltaPct сценария (наценка/скидка поставщика) реальный
 * econWrapper пока не принимает отдельным полем — считается через
 * assumptions_overrides.equipment_cost_total, если задан. */
export function buildScenarioInput(
  projectId: string,
  draft: Draft,
  def: ScenarioDef,
  staffCount: number,
  equipmentCostTotal: number,
) {
  const econ = draft.economics;
  const rate = (def.creditRatePct ?? (def.financing === 'leasing' ? 14 : def.financing === 'raas' ? 20 : 18)) / 100;
  const assumptions_overrides: Record<string, number> =
    def.equipmentPriceDeltaPct
      ? { equipment_cost_total: equipmentCostTotal * (1 + def.equipmentPriceDeltaPct / 100) }
      : {};
  return {
    project_id: projectId,
    match_result_id: `mr-${projectId}`,
    scenario_kind: def.kind,
    financing_type: def.financing,
    financing_rate: def.financing === 'own_funds' ? 0 : rate,
    financing_term_years: def.financing === 'own_funds' ? 0 : def.financing === 'raas' ? 3 : 5,
    discount_rate: 0.15,
    staff_count: staffCount,
    // ScenarioInput.staff_salary_per_month — ₽/мес НА ОДНОГО сотрудника (contracts/economics.py);
    // в форме визарда (econ.staffCostPerMonth, шаг 5) это, наоборот, сумма на ВЕСЬ персонал за
    // месяц (так короче формулируется в ТЗ) — делим на staff_count при переводе в контракт.
    staff_salary_per_month: (def.staffCostPerMonth ?? econ.staffCostPerMonth) / Math.max(1, staffCount),
    staff_tax_rate: 0.3,
    operating_hours_per_year: econ.hoursPerYear,
    load_factor: def.loadFactor ?? econ.loadFactor,
    horizon_years: econ.horizonYears,
    assumptions_overrides,
  };
}

/** POST /api/economics/run */
export function runRealEconomics(
  scenario: ReturnType<typeof buildScenarioInput>,
  selectedEquipment: SelectedEquipmentDto[],
): Promise<EconomicsResult> {
  return request<EconomicsResult>('/api/economics/run', {
    method: 'POST',
    body: JSON.stringify({ scenario, selected_equipment: selectedEquipment }),
  });
}
