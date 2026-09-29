import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { bestScenario } from '../../../features/wizard/mockEconomics';
import { catalogById } from '../../../shared/mock/catalog';
import { objectTypeLabel } from '../../../shared/mock/dictionaries';
import { useProject } from '../../../features/wizard/store';
import { saveVersion, useProjectState } from '../../../features/projectApi';
import { ROUTES } from '../../../shared/config/routes';
import { formatRubShort, formatYears } from '../../../shared/lib/format';
import { Alert, Button, Card, Stat } from '../../../shared/ui';
import { downloadCsv } from '../../../shared/lib/csvExport';
import { GuestLock } from '../GuestLock';
import { useWizard } from '../context';
import { WizardFooter } from '../WizardFooter';
import { solutionTypeLabel } from '../../../shared/dictionaries';

/** Шаг 8. Сводка, сохранение версии, выгрузка. */
export function StepExport() {
  const { draft, isDemo, projectId, goTo, path } = useWizard();
  const navigate = useNavigate();
  const project = useProject(projectId);
  const server = useProjectState(projectId, !isDemo);
  const [comment, setComment] = useState('');
  const [saved, setSaved] = useState<number | null>(null);
  const [savingVersion, setSavingVersion] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const currentVersion = server?.current_version ?? project.current_version;

  const saveVersionNow = async () => {
    if (!server) return;
    setSavingVersion(true);
    setVersionError(null);
    try {
      const res = await saveVersion(projectId, server.revision, comment.trim() || null);
      if (res.status === 201) setSaved(res.body.current_version);
      else if (res.status === 409) setVersionError('Проект изменили в другой вкладке — обновите страницу и попробуйте снова');
      else if (res.status === 403) setVersionError('Этот проект принадлежит другому пользователю');
      else setVersionError(res.body.detail);
    } catch {
      setVersionError('Не удалось сохранить версию — проверьте, что сервер запущен');
    } finally {
      setSavingVersion(false);
    }
  };

  const results = draft.economicsResults ?? [];
  const best = bestScenario(results, draft.economics.horizonYears);
  const hasEconomics = results.length > 0;

  const exportCsv = () => {
    const rows: unknown[][] = [
      ['Состав оборудования'],
      ['Решение', 'Тип', 'Количество', 'Стоимость, ₽'],
      ...draft.selected.map((id) => {
        const c = catalogById(id);
        const q = draft.quantities[id] ?? 1;
        return [c?.identification.product_name ?? id, solutionTypeLabel(c?.identification.solution_type ?? ''), q, (c?.economics.equipment_cost ?? 0) * q];
      }),
      [],
      ['Сценарии'],
      ['Сценарий', 'Финансирование', 'CAPEX, ₽', 'OPEX/год, ₽', 'Годовой эффект, ₽', 'Срок окупаемости, лет', 'ROI, %', 'TCO на горизонте, ₽'],
      ...results.map(({ def, result }) => [
        def.title,
        def.kind === 'baseline' ? 'без роботизации' : def.financing,
        result.capex_total,
        result.opex_annual,
        def.kind === 'baseline' ? '' : result.annual_effect,
        def.kind === 'baseline' ? '' : result.payback_years,
        def.kind === 'baseline' ? '' : result.roi_pct,
        result.tco_total,
      ]),
    ];
    downloadCsv(`${project.name || 'расчёт'}.csv`, rows);
  };

  if (isDemo) {
    return <GuestLock title="Сохранение и экспорт — после регистрации" benefit="Расчёт сохранится как проект с историей версий, его можно выгрузить в PDF и Excel." />;
  }

  const type = draft.objectType;
  const topologyDone = draft.completed.includes('topology');

  const checklist = [
    { label: 'Тип объекта', ok: Boolean(type), value: type ? objectTypeLabel(type) : 'не выбран', step: 'object' as const },
    { label: 'Параметры объекта', ok: draft.completed.includes('params'), value: draft.staleAfterParams ? 'изменены после расчёта' : 'заполнены', step: 'params' as const },
    { label: 'Состав оборудования', ok: draft.selected.length > 0, value: `${draft.selected.length} поз.`, step: 'comparison' as const },
    { label: 'Сценарии', ok: draft.scenarios.length >= 3 && hasEconomics, value: hasEconomics ? `${draft.scenarios.length} шт., рассчитано` : 'не рассчитаны — откройте шаг и нажмите «Рассчитать»', step: 'scenarios' as const },
    { label: 'Визуализация', ok: topologyDone, value: topologyDone ? 'пройдена' : 'пропущена — необязательно', step: 'topology' as const, optional: true },
  ];

  return (
    <>
      <div className="page wizard-body">
        <div className="page-head">
          <div className="page-head__text">
            <span className="label">Шаг 8 из 8</span>
            <h1>Сохранение и экспорт</h1>
            <p className="muted">Проверьте сводку, сохраните версию расчёта и выгрузите отчёт.</p>
          </div>
        </div>

        {draft.staleAfterParams && (
          <Alert tone="warn" title="Часть результатов посчитана по старым параметрам" action={<Button size="sm" onClick={() => goTo('matching')}>Пересчитать подбор</Button>}>
            Версию можно сохранить и так — в ней будет пометка об этом.
          </Alert>
        )}

        <div className="grid grid--4">
          <Stat label="Лучший сценарий" value={best?.def.title ?? '—'} sub="по выгоде за горизонт" accent />
          <Stat label="Окупаемость" value={formatYears(best?.result.payback_years ?? null)} />
          <Stat label="Годовой эффект" value={formatRubShort(best?.result.annual_effect ?? null)} />
          <Stat label="CAPEX" value={formatRubShort(best?.result.capex_total ?? null)} />
        </div>

        <div className="step-2col" style={{ gridTemplateColumns: 'minmax(0, 1fr) 380px' }}>
          <div className="stack">
            <Card title="Сводка" flush>
              <table className="table">
                <tbody>
                  {checklist.map((c) => (
                    <tr key={c.label}>
                      <td style={{ width: 36 }}>{c.ok ? <span style={{ color: 'var(--ok)' }}>✓</span> : <span style={{ color: c.optional ? 'var(--faint)' : 'var(--warn)' }}>{c.optional ? '–' : '!'}</span>}</td>
                      <td>{c.label}</td>
                      <td className="muted">{c.value}</td>
                      <td className="r">
                        <Link to={path(c.step)}>
                          Изменить
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card title="Состав оборудования">
              <div className="stack stack--sm">
                {draft.selected.map((id) => {
                  const c = catalogById(id);
                  const q = draft.quantities[id] ?? 1;
                  return (
                    <div key={id} className="row row--between">
                      <span>
                        <strong className="num">{q} ×</strong> {c?.identification.product_name}{' '}
                        <span className="faint">· {solutionTypeLabel(c?.identification.solution_type ?? '')}</span>
                      </span>
                      <span className="num muted">{formatRubShort((c?.economics.equipment_cost ?? 0) * q)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <aside className="stack">
            <Card title="Сохранить версию">
              <div className="stack">
                <p className="muted">
                  Будет создана версия {currentVersion + 1} — снимок сохранённых параметров и плана. Старые версии не меняются, их можно открыть отдельно.
                </p>
                <label className="field">
                  <span className="field__label">Что изменилось</span>
                  <textarea className="textarea" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Например: добавлен сценарий с кредитом" />
                </label>
                <Button variant="primary" block onClick={() => void saveVersionNow()} disabled={saved !== null || savingVersion}>
                  {savingVersion ? 'Сохраняем…' : saved ? `✓ Версия ${saved} сохранена` : 'Сохранить версию'}
                </Button>
                {versionError && (
                  <Alert tone="danger" title="Не удалось сохранить">
                    {versionError}
                  </Alert>
                )}
              </div>
            </Card>

            <Card title="Выгрузить">
              <div className="stack stack--sm">
                <Button block disabled={!hasEconomics} onClick={() => navigate(`${ROUTES.report(projectId)}?print=1`)}>
                  Отчёт PDF
                </Button>
                <Button block disabled={!hasEconomics} onClick={exportCsv}>
                  Таблицы Excel (CSV)
                </Button>
                <Button block variant="ghost" onClick={() => navigate(ROUTES.report(projectId))}>
                  Предпросмотр отчёта
                </Button>
                {!hasEconomics && (
                  <p className="field__hint">Сначала рассчитайте сценарии на шаге 6 — выгружать пока нечего.</p>
                )}
              </div>
            </Card>
          </aside>
        </div>
      </div>
      <WizardFooter nextLabel="Открыть итоговый дашборд →" />
    </>
  );
}
