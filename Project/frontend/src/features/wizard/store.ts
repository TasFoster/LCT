/**
 * Черновик визарда. Пока API нет — живёт в sessionStorage (у гостя так и
 * останется, у пользователя потом уедет на бэкенд через автосохранение).
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { FinancingType, ObjectType } from '../../shared/types/contracts';
import { WIZARD_STEPS } from '../../shared/config/routes';
import type { WizardStepSlug } from '../../shared/config/routes';
import { DEMO_WAREHOUSE_PARAMS, projectById } from '../../shared/mock/projects';
import type { ProjectListItem } from '../../shared/mock/projects';
import { MATCH_RESULT } from '../../shared/mock/results';
import type { ParamValues } from './paramsSchema';
import { DEFAULT_SCENARIOS } from './mockEconomics';
import type { ScenarioDef } from './mockEconomics';

export interface EconomicsInputs {
  hoursPerYear: number;
  loadFactor: number;
  staffCostPerMonth: number;
  horizonYears: number;
  financing: FinancingType;
}

export interface Draft {
  /** Название и площадка проекта, созданного в этой сессии (для моков) */
  projectName?: string;
  projectSite?: string;
  objectType: ObjectType | null;
  params: Partial<Record<ObjectType, ParamValues>>;
  /** Параметры правились после расчёта — шаги 3–6 устарели, но не стёрты */
  staleAfterParams: boolean;
  compare: string[];
  /** Итоговый состав оборудования (SelectedEquipment) */
  selected: string[];
  quantities: Record<string, number>;
  manuallyExcluded: string[];
  economics: EconomicsInputs;
  scenarios: ScenarioDef[];
  /** Когда последний раз нажимали «Рассчитать» на шаге 5 */
  econCalculatedAt: string | null;
  completed: WizardStepSlug[];
  savedAt: string | null;
}

const DEFAULT_ECON: EconomicsInputs = {
  hoursPerYear: 8760,
  loadFactor: 0.75,
  staffCostPerMonth: 4_370_000,
  horizonYears: 5,
  financing: 'own_funds',
};

function emptyDraft(): Draft {
  return {
    objectType: null,
    params: {},
    staleAfterParams: false,
    compare: [],
    selected: [],
    quantities: {},
    manuallyExcluded: [],
    economics: DEFAULT_ECON,
    scenarios: DEFAULT_SCENARIOS.slice(0, 2),
    econCalculatedAt: null,
    completed: [],
    savedAt: null,
  };
}

/** Начальное состояние черновика по моковому проекту — чтобы экраны открывались «в работе». */
function seedDraft(projectId: string): Draft {
  const project = projectById(projectId);
  if (!project) return emptyDraft();

  const lastIndex = WIZARD_STEPS.findIndex((s) => s.slug === project.last_step);
  const completed = WIZARD_STEPS.slice(0, Math.max(0, lastIndex)).map((s) => s.slug);
  const draft: Draft = {
    ...emptyDraft(),
    objectType: project.object_type,
    completed: project.status === 'calculated' || project.status === 'archived' ? WIZARD_STEPS.map((s) => s.slug) : completed,
    savedAt: project.updated_at,
  };

  if (project.object_type === 'warehouse' && lastIndex >= 1) {
    draft.params.warehouse = project.last_step === 'params'
      ? { ...DEMO_WAREHOUSE_PARAMS, sku_count: null, staff_count: null, staff_cost_per_month: null, outbound_ops_per_day: 0 }
      : { ...DEMO_WAREHOUSE_PARAMS };
  }
  if (lastIndex >= 3 || project.status !== 'draft') {
    const byType = {
      warehouse: { compare: ['amr-vektor-600', 'amr-vektor-1500'], selected: ['amr-vektor-600'] },
      airport: { compare: ['baggage-aero-b2', 'tug-gruz-t3'], selected: ['tug-gruz-t3'] },
      medical: { compare: ['delivery-med-kurier', 'amr-vektor-600'], selected: ['delivery-med-kurier'] },
    }[project.object_type];
    draft.compare = byType.compare;
    draft.selected = byType.selected;
    draft.quantities = Object.fromEntries(MATCH_RESULT.candidates.map((c) => [c.catalog_item_id, c.quantity_if_selected ?? 1]));
  }
  if (lastIndex >= 4 || project.status !== 'draft') draft.econCalculatedAt = project.updated_at;
  if (lastIndex >= 5 || project.status !== 'draft') draft.scenarios = [...DEFAULT_SCENARIOS];
  return draft;
}

interface WizardState {
  drafts: Record<string, Draft>;
  ensure: (projectId: string) => void;
  update: (projectId: string, patch: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => void;
  complete: (projectId: string, step: WizardStepSlug) => void;
  reset: (projectId: string) => void;
}

export const useWizardStore = create<WizardState>()(
  persist(
    (set, get) => ({
      drafts: {},
      ensure: (projectId) => {
        if (!get().drafts[projectId]) set((s) => ({ drafts: { ...s.drafts, [projectId]: seedDraft(projectId) } }));
      },
      update: (projectId, patch) =>
        set((s) => {
          const current = s.drafts[projectId] ?? seedDraft(projectId);
          const next = typeof patch === 'function' ? patch(current) : patch;
          return {
            drafts: { ...s.drafts, [projectId]: { ...current, ...next, savedAt: new Date().toISOString() } },
          };
        }),
      complete: (projectId, step) =>
        set((s) => {
          const current = s.drafts[projectId] ?? seedDraft(projectId);
          if (current.completed.includes(step)) return s;
          return { drafts: { ...s.drafts, [projectId]: { ...current, completed: [...current.completed, step] } } };
        }),
      reset: (projectId) => set((s) => ({ drafts: { ...s.drafts, [projectId]: emptyDraft() } })),
    }),
    {
      name: 'robocalc-wizard-v2',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

/** Черновик проекта; создаёт его при первом обращении. */
export function useDraft(projectId: string): Draft {
  const draft = useWizardStore((s) => s.drafts[projectId]);
  return draft ?? seedDraft(projectId);
}

/**
 * Проект для шапки и страниц: из моков, а для созданного в этой сессии —
 * собранный из черновика.
 */
export function useProject(projectId: string): ProjectListItem {
  const draft = useDraft(projectId);
  const known = projectById(projectId);
  if (known) return known;
  const now = draft.savedAt ?? new Date().toISOString();
  return {
    id: projectId,
    owner_user_id: 'u-1',
    name: draft.projectName ?? 'Новый проект',
    site: draft.projectSite ?? '',
    object_type: draft.objectType ?? 'warehouse',
    status: 'draft',
    created_at: now,
    updated_at: now,
    current_version: 1,
    last_step: 'object',
    best_payback_years: null,
    scenarios_count: draft.scenarios.length,
  };
}
