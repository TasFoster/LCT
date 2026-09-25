import { createContext, useContext } from 'react';
import type { WizardStepSlug } from '../../shared/config/routes';
import type { Draft } from '../../features/wizard/store';

export interface WizardContextValue {
  projectId: string;
  isDemo: boolean;
  step: WizardStepSlug;
  draft: Draft;
  update: (patch: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => void;
  /** Отметить шаг пройденным и перейти к следующему */
  next: () => void;
  back: () => void;
  goTo: (step: WizardStepSlug) => void;
  path: (step: WizardStepSlug) => string;
}

export const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard вне WizardPage');
  return ctx;
}
