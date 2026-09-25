import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { bestScenario, computeScenario } from '../../features/wizard/mockEconomics';
import { useDraft, useProject } from '../../features/wizard/store';
import { firstOpenStep } from '../../features/wizard/progress';
import { catalogById } from '../../shared/mock/catalog';
import { VERSIONS } from '../../shared/mock/projects';
import { objectTypeLabel } from '../../shared/mock/dictionaries';
import { ROUTES, WIZARD_STEPS } from '../../shared/config/routes';
import { formatDate, formatDateTime, formatRubShort, formatYears } from '../../shared/lib/format';
import { ButtonLink, Card, Chip, Progress, Stat } from '../../shared/ui';
import { ProjectBar } from '../../widgets/ProjectBar';
import { solutionTypeLabel } from '../../shared/dictionaries';

/** Хаб проекта: где остановились, главные цифры, версии. */
export function ProjectOverviewPage() {
  const { projectId = '' } = useParams();
  const project = useProject(projectId);
  const draft = useDraft(projectId);

  const results = useMemo(() => draft.scenarios.map((def) => ({ def, result: computeScenario(draft, def) })), [draft]);
  const best = draft.econCalculatedAt ? bestScenario(results, draft.economics.horizonYears) : undefined;
  const doneCount = WIZARD_STEPS.filter((s) => draft.completed.includes(s.slug)).length;
  const next = firstOpenStep(draft);
  const allDone = doneCount === WIZARD_STEPS.length;

  return (
    <>
      <ProjectBar project={project} savedAt={draft.savedAt} />
      <div className="page">
        <div className="page-head">
          <div className="page-head__text">
            <span className="label">
              {objectTypeLabel(project.object_type)}
              {project.site ? ` · ${project.site}` : ''}
            </span>
            <h1>{project.name}</h1>
            <p className="muted">
              Создан {formatDate(project.created_at)}, изменён {formatDateTime(draft.savedAt ?? project.updated_at)}
            </p>
          </div>
          <div className="page-head__actions">
            {allDone && <ButtonLink to={ROUTES.dashboard(projectId)}>Открыть дашборд</ButtonLink>}
            <ButtonLink to={ROUTES.wizardStep(projectId, next)} variant="primary">
              {allDone ? 'Открыть визард' : `Продолжить: ${WIZARD_STEPS.find((s) => s.slug === next)?.title.toLowerCase()} →`}
            </ButtonLink>
          </div>
        </div>

        <div className="grid grid--4">
          <Stat label="Лучший сценарий" value={best?.def.title ?? '—'} sub={best ? 'по выгоде за горизонт' : 'ещё не рассчитан'} accent={Boolean(best)} />
          <Stat label="Окупаемость" value={best ? formatYears(best.result.payback_years) : '—'} />
          <Stat label="Годовой эффект" value={best ? formatRubShort(best.result.annual_effect) : '—'} />
          <Stat label="CAPEX" value={best ? formatRubShort(best.result.capex_total) : '—'} />
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)' }}>
          <Card title="Шаги расчёта" actions={<span className="num muted">{doneCount} из {WIZARD_STEPS.length}</span>}>
            <div className="stack">
              <Progress value={(doneCount / WIZARD_STEPS.length) * 100} tone={allDone ? 'ok' : undefined} />
              <ol className="stack stack--sm" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {WIZARD_STEPS.map((s, i) => {
                  const done = draft.completed.includes(s.slug);
                  const stale = draft.staleAfterParams && ['matching', 'comparison', 'economics', 'scenarios'].includes(s.slug);
                  return (
                    <li key={s.slug} className="row row--between" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                      <span className="row" style={{ gap: 10 }}>
                        <span className="stepper__num" style={{ color: done ? 'var(--ok)' : 'var(--faint)' }}>
                          {done ? '✓' : i + 1}
                        </span>
                        <Link to={ROUTES.wizardStep(projectId, s.slug)} style={{ color: 'var(--ink)' }}>
                          {s.title}
                        </Link>
                        {s.slug === 'topology' && <span className="faint">необязательный</span>}
                      </span>
                      {stale ? <Chip tone="warn">пересчитать</Chip> : done ? <Chip tone="ok">готово</Chip> : s.slug === next ? <Chip tone="accent">следующий</Chip> : null}
                    </li>
                  );
                })}
              </ol>
            </div>
          </Card>

          <div className="stack">
            <Card title="Состав оборудования">
              {draft.selected.length ? (
                <div className="stack stack--sm">
                  {draft.selected.map((id) => (
                    <div key={id} className="row row--between">
                      <span>
                        <strong className="num">{draft.quantities[id] ?? 1} ×</strong> {catalogById(id)?.identification.product_name}
                      </span>
                      <span className="faint">{solutionTypeLabel(catalogById(id)?.identification.solution_type ?? '')}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Ещё не выбран — это шаг «Сравнение».</p>
              )}
            </Card>

            <Card title="Версии" actions={<Link to={ROUTES.versions(projectId)}>Все версии →</Link>}>
              <div className="stack stack--sm">
                {(project.current_version > 1 ? VERSIONS : VERSIONS.slice(-1)).slice(0, 3).map((v) => (
                  <div key={v.version} className="row row--between">
                    <span>
                      <strong className="num">v{v.version}</strong> <span className="muted">{v.summary}</span>
                    </span>
                    <span className="faint num">{formatDate(v.created_at)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
