import { useEffect, useMemo } from 'react';
import type { ComponentType } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { GUEST_LOCKED_STEPS, ROUTES, WIZARD_STEPS, stepPath } from '../../shared/config/routes';
import type { WizardStepSlug } from '../../shared/config/routes';
import { useDraft, useProject, useWizardStore } from '../../features/wizard/store';
import { firstOpenStep, isReachable } from '../../features/wizard/progress';
import { ProjectBar } from '../../widgets/ProjectBar';
import { WizardContext } from './context';
import type { WizardContextValue } from './context';
import { StepObject } from './steps/StepObject';
import { StepParams } from './steps/StepParams';
import { StepMatching } from './steps/StepMatching';
import { StepComparison } from './steps/StepComparison';
import { StepEconomics } from './steps/StepEconomics';
import { StepScenarios } from './steps/StepScenarios';
import { StepTopology } from './steps/StepTopology';
import { StepExport } from './steps/StepExport';

const STEP_COMPONENTS: Record<WizardStepSlug, ComponentType> = {
  object: StepObject,
  params: StepParams,
  matching: StepMatching,
  comparison: StepComparison,
  economics: StepEconomics,
  scenarios: StepScenarios,
  topology: StepTopology,
  export: StepExport,
};

const DEMO_ID = 'demo';

function isStepSlug(value: string | undefined): value is WizardStepSlug {
  return WIZARD_STEPS.some((s) => s.slug === value);
}

export function WizardEntry({ demo }: { demo?: boolean }) {
  const { projectId = DEMO_ID } = useParams();
  const id = demo ? DEMO_ID : projectId;
  const draft = useDraft(id);
  return <Navigate to={stepPath(id, firstOpenStep(draft), Boolean(demo))} replace />;
}

export function WizardPage({ demo }: { demo?: boolean }) {
  const params = useParams();
  const navigate = useNavigate();
  const isDemo = Boolean(demo);
  const projectId = isDemo ? DEMO_ID : (params.projectId ?? DEMO_ID);
  const step = params.step;

  const ensure = useWizardStore((s) => s.ensure);
  const updateDraft = useWizardStore((s) => s.update);
  const completeStep = useWizardStore((s) => s.complete);
  const draft = useDraft(projectId);
  const project = useProject(projectId);

  useEffect(() => ensure(projectId), [ensure, projectId]);

  const ctx = useMemo<WizardContextValue | null>(() => {
    if (!isStepSlug(step)) return null;
    const index = WIZARD_STEPS.findIndex((s) => s.slug === step);
    const path = (s: WizardStepSlug) => stepPath(projectId, s, isDemo);
    return {
      projectId,
      isDemo,
      step,
      draft,
      update: (patch) => updateDraft(projectId, patch),
      goTo: (s) => navigate(path(s)),
      path,
      back: () => index > 0 && navigate(path(WIZARD_STEPS[index - 1].slug)),
      next: () => {
        completeStep(projectId, step);
        const following = WIZARD_STEPS[index + 1];
        navigate(following ? path(following.slug) : isDemo ? ROUTES.register : ROUTES.dashboard(projectId));
        window.scrollTo({ top: 0 });
      },
    };
  }, [step, projectId, isDemo, draft, updateDraft, completeStep, navigate]);

  if (!ctx) return <Navigate to={stepPath(projectId, firstOpenStep(draft), isDemo)} replace />;

  const current = ctx.step;
  if (!isReachable(draft, current)) {
    return <Navigate to={stepPath(projectId, firstOpenStep(draft), isDemo)} replace />;
  }

  const Step = STEP_COMPONENTS[current];
  const staleSteps: WizardStepSlug[] = draft.staleAfterParams ? ['matching', 'comparison', 'economics', 'scenarios'] : [];

  return (
    <WizardContext.Provider value={ctx}>
      <ProjectBar project={project} savedAt={draft.savedAt} isDemo={isDemo} />
      <nav className="stepper" aria-label="Шаги расчёта">
        {WIZARD_STEPS.map((s, i) => {
          const done = draft.completed.includes(s.slug);
          const reachable = isReachable(draft, s.slug);
          const lockedForGuest = isDemo && GUEST_LOCKED_STEPS.includes(s.slug);
          const cls = [
            'stepper__item',
            s.slug === current && 'is-current',
            done && s.slug !== current && 'is-done',
            staleSteps.includes(s.slug) && 'is-stale',
            (!reachable || lockedForGuest) && s.slug !== current && 'is-locked',
          ]
            .filter(Boolean)
            .join(' ');
          const title = lockedForGuest
            ? 'Доступно после регистрации'
            : staleSteps.includes(s.slug)
              ? 'Параметры изменились — результат нужно пересчитать'
              : !reachable
                ? 'Сначала пройдите предыдущие шаги'
                : undefined;
          const content = (
            <>
              <span className="stepper__num">{done && s.slug !== current ? '✓' : i + 1}</span>
              {s.title}
              {lockedForGuest && (
                <svg width="11" height="12" viewBox="0 0 11 12" aria-label="после регистрации" role="img" style={{ flex: 'none' }}>
                  <rect x="1" y="5" width="9" height="6.5" rx="1.5" fill="currentColor" />
                  <path d="M3 5V3.5a2.5 2.5 0 0 1 5 0V5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              )}
            </>
          );
          return reachable ? (
            <Link key={s.slug} to={ctx.path(s.slug)} className={cls} title={title} aria-current={s.slug === current ? 'step' : undefined}>
              {content}
            </Link>
          ) : (
            <span key={s.slug} className={cls} title={title} aria-disabled>
              {content}
            </span>
          );
        })}
      </nav>
      <Step />
    </WizardContext.Provider>
  );
}
