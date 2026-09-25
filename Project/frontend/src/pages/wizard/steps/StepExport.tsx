import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { bestScenario, computeScenario } from '../../../features/wizard/mockEconomics';
import { catalogById } from '../../../shared/mock/catalog';
import { objectTypeLabel } from '../../../shared/mock/dictionaries';
import { useProject } from '../../../features/wizard/store';
import { ROUTES } from '../../../shared/config/routes';
import { formatRubShort, formatYears } from '../../../shared/lib/format';
import { Alert, Button, Card, Chip, Stat } from '../../../shared/ui';
import { GuestLock } from '../GuestLock';
import { useWizard } from '../context';
import { WizardFooter } from '../WizardFooter';
import { solutionTypeLabel } from '../../../shared/dictionaries';

/** Шаг 8. Сводка, сохранение версии, выгрузка. */
export function StepExport() {
  const { draft, isDemo, projectId, goTo, path } = useWizard();
  const navigate = useNavigate();
  const project = useProject(projectId);
  const [comment, setComment] = useState('');
  const [saved, setSaved] = useState<number | null>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);

  const results = useMemo(() => draft.scenarios.map((def) => ({ def, result: computeScenario(draft, def) })), [draft]);
  const best = bestScenario(results, draft.economics.horizonYears);

  if (isDemo) {
    return <GuestLock title="Сохранение и экспорт — после регистрации" benefit="Расчёт сохранится как проект с историей версий, его можно выгрузить в PDF и Excel." />;
  }

  const type = draft.objectType;
  const topologyDone = draft.completed.includes('topology');

  const checklist = [
    { label: 'Тип объекта', ok: Boolean(type), value: type ? objectTypeLabel(type) : 'не выбран', step: 'object' as const },
    { label: 'Параметры объекта', ok: draft.completed.includes('params'), value: draft.staleAfterParams ? 'изменены после расчёта' : 'заполнены', step: 'params' as const },
    { label: 'Состав оборудования', ok: draft.selected.length > 0, value: `${draft.selected.length} поз.`, step: 'comparison' as const },
    { label: 'Сценарии', ok: draft.scenarios.length >= 3, value: `${draft.scenarios.length} шт.`, step: 'scenarios' as const },
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
                  Будет создана версия {project.current_version + 1}. Старые версии не меняются — их можно открыть и увидеть те же данные и результат.
                </p>
                <label className="field">
                  <span className="field__label">Что изменилось</span>
                  <textarea className="textarea" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Например: добавлен сценарий с кредитом" />
                </label>
                <Button variant="primary" block onClick={() => setSaved(project.current_version + 1)} disabled={saved !== null}>
                  {saved ? `✓ Версия ${saved} сохранена` : 'Сохранить версию'}
                </Button>
                {saved && (
                  <Chip tone="warn" plain>
                    Заглушка: версия не уходит на сервер
                  </Chip>
                )}
              </div>
            </Card>

            <Card title="Выгрузить">
              <div className="stack stack--sm">
                <Button block onClick={() => setExportNote('PDF')}>Отчёт PDF</Button>
                <Button block onClick={() => setExportNote('Excel')}>Таблицы Excel</Button>
                <Button block variant="ghost" onClick={() => navigate(ROUTES.report(projectId))}>
                  Предпросмотр отчёта
                </Button>
                {exportNote && (
                  <p className="field__hint">
                    Выгрузка {exportNote} появится с бэкендом. Пока можно открыть предпросмотр и распечатать его в PDF средствами браузера.
                  </p>
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
