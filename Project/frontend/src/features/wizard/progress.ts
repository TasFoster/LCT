import { WIZARD_STEPS } from '../../shared/config/routes';
import type { WizardStepSlug } from '../../shared/config/routes';
import type { Draft } from './store';

/** Первый шаг, который ещё не пройден, — туда ведёт «Продолжить». */
export function firstOpenStep(draft: Draft): WizardStepSlug {
  return WIZARD_STEPS.find((s) => !draft.completed.includes(s.slug))?.slug ?? 'export';
}

/** Можно ли зайти на шаг: все предыдущие пройдены (шаг 7 не обязателен для 8). */
export function isReachable(draft: Draft, step: WizardStepSlug): boolean {
  const index = WIZARD_STEPS.findIndex((s) => s.slug === step);
  return WIZARD_STEPS.slice(0, index).every((s) => s.slug === 'topology' || draft.completed.includes(s.slug));
}
