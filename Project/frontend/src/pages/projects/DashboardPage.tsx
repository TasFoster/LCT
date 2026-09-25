import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { bestScenario, cashflow, computeScenario, computeSensitivity, fastestPayback, horizonGain } from '../../features/wizard/mockEconomics';
import { useDraft, useProject, useWizardStore } from '../../features/wizard/store';
import { catalogById } from '../../shared/mock/catalog';
import { ROUTES } from '../../shared/config/routes';
import { formatNumber, formatPct, formatRubShort, formatYears, pluralize } from '../../shared/lib/format';
import { Alert, Button, ButtonLink, Card, EmptyState, MockNote, Segmented, Stat } from '../../shared/ui';
import { useMockCalc } from '../../features/wizard/useMockCalc';
import { CalcStatus } from '../../widgets/CalcStatus';
import { CashflowChart } from '../../widgets/CashflowChart';
import { Breakdown } from '../../widgets/EconomicsBreakdown';
import { ProjectBar } from '../../widgets/ProjectBar';
import { ScenarioTable } from '../../widgets/ScenarioTable';
import { SensitivityTable } from '../../widgets/SensitivityTable';

type ChartView = 'chart' | 'table';

/** Итоговый дашборд: KPI → таблица сравнения → графики → чувствительность → допущения. */
export function DashboardPage() {
  const { projectId = '' } = useParams();
  const project = useProject(projectId);
  const draft = useDraft(projectId);
  const update = useWizardStore((s) => s.update);
  const calc = useMockCalc(2200);
  const [structureId, setStructureId] = useState<string | null>(null);
  const [sensId, setSensId] = useState<string | null>(null);
  const [chartView, setChartView] = useState<ChartView>('chart');
  const [capexOrOpex, setCapexOrOpex] = useState<'capex' | 'opex'>('capex');
  const [exportNote, setExportNote] = useState(false);

  const horizon = draft.economics.horizonYears;
  const columns = useMemo(() => draft.scenarios.map((def) => ({ def, result: computeScenario(draft, def) })), [draft]);
  const nonBase = columns.filter((c) => c.def.kind !== 'baseline');
  const best = bestScenario(columns, horizon);
  const fastest = fastestPayback(columns);

  const ready = draft.econCalculatedAt && nonBase.length > 0 && draft.selected.length > 0;

  if (!ready) {
    return (
      <>
        <ProjectBar project={project} savedAt={draft.savedAt} />
        <div className="page">
          <Card>
            <EmptyState
              icon="▤"
              title="Дашборд появится после расчёта"
              action={
                <ButtonLink to={ROUTES.wizard(projectId)} variant="primary">
                  Продолжить расчёт
                </ButtonLink>
              }
            >
              Пройдите визард до шага «Сценарии» — здесь соберётся сравнение сценариев, окупаемость, чувствительность и допущения.
            </EmptyState>
          </Card>
        </div>
      </>
    );
  }

  const structure = nonBase.find((c) => c.def.id === structureId) ?? best ?? nonBase[0];
  const sens = nonBase.find((c) => c.def.id === sensId) ?? best ?? nonBase[0];
  const series = nonBase.map((c) => ({ id: c.def.id, title: c.def.title, values: cashflow(c.result, horizon) }));

  return (
    <>
      <ProjectBar project={project} savedAt={draft.savedAt} />
      <div className="page">
        <div className="page-head">
          <div className="page-head__text">
            <span className="label">Итоговый дашборд</span>
            <h1>{project.name}</h1>
            <p className="muted">
              {columns.length} {pluralize(columns.length, ['сценарий', 'сценария', 'сценариев'])} на горизонте {horizon} лет · состав: {draft.selected.map((id) => `${draft.quantities[id] ?? 1} × ${catalogById(id)?.identification.product_name}`).join(', ')}
            </p>
          </div>
          <div className="page-head__actions">
            <MockNote>Расчёт-заглушка на фронте</MockNote>
            <div className="control" style={{ width: 150, height: 34 }}>
              <select
                aria-label="Горизонт расчёта"
                value={horizon}
                onChange={(e) => {
                  const h = Number(e.target.value);
                  calc.start(() => update(projectId, (d) => ({ economics: { ...d.economics, horizonYears: h } })));
                }}
              >
                {[5, 7, 10].map((h) => (
                  <option key={h} value={h}>
                    Горизонт {h} лет
                  </option>
                ))}
              </select>
            </div>
            <ButtonLink to={ROUTES.wizardStep(projectId, 'scenarios')}>Изменить сценарии</ButtonLink>
            <ButtonLink to={ROUTES.report(projectId)}>Отчёт</ButtonLink>
            <Button variant="primary" onClick={() => setExportNote(true)}>
              Экспорт
            </Button>
          </div>
        </div>

        {exportNote && (
          <Alert tone="info" title="Экспорт в PDF и Excel появится с бэкендом" action={<Button size="sm" variant="ghost" onClick={() => setExportNote(false)}>Понятно</Button>}>
            Пока откройте «Отчёт» и распечатайте его в PDF средствами браузера.
          </Alert>
        )}
        {draft.staleAfterParams && (
          <Alert tone="warn" title="Входные данные изменились после расчёта" action={<ButtonLink size="sm" to={ROUTES.wizardStep(projectId, 'matching')}>Пересчитать</ButtonLink>}>
            Показан расчёт по прежним параметрам объекта.
          </Alert>
        )}
        {calc.running && <CalcStatus progress={calc.progress} label="Пересчитываем сценарии" />}

        <div className="grid grid--4" style={{ opacity: calc.running ? 0.5 : 1 }}>
          <Stat
            label="Лучший сценарий"
            value={best?.def.title ?? 'нет'}
            sub={
              best
                ? `выгода за ${horizon} лет ${formatRubShort(horizonGain(best.result, horizon))}${fastest && fastest.def.id !== best.def.id ? ` · быстрее окупается ${fastest.def.title}` : ''}`
                : `ни один не окупается за ${horizon} лет`
            }
            accent
          />
          <Stat label="Срок окупаемости" value={formatYears(best?.result.payback_years ?? null)} sub="простой, без дисконтирования" />
          <Stat label="Годовой эффект" value={formatRubShort(best?.result.annual_effect ?? null)} sub="против работы без роботов" />
          <Stat label={`ROI за ${horizon} лет`} value={formatPct(best?.result.roi_pct ?? null)} sub={`TCO ${formatRubShort(best?.result.tco_total ?? null)}`} />
        </div>

        <Card title="Сравнение сценариев" flush actions={<span className="faint">★ — лучшее значение в строке; строки CAPEX и OPEX раскрываются</span>}>
          <div style={{ opacity: calc.running ? 0.5 : 1 }}>
            <ScenarioTable columns={columns} />
          </div>
        </Card>

        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)' }}>
          <Card
            title={`Накопленный денежный поток, ${horizon} лет`}
            actions={<Segmented<ChartView> label="Вид" value={chartView} onChange={setChartView} options={[{ value: 'chart', label: 'График' }, { value: 'table', label: 'Таблица' }]} />}
          >
            {chartView === 'chart' ? (
              <CashflowChart series={series} />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Сценарий</th>
                      {series[0].values.map((_, y) => (
                        <th key={y} className="r">
                          {y === 0 ? 'Старт' : `${y} г.`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {series.map((s) => (
                      <tr key={s.id}>
                        <td>{s.title}</td>
                        {s.values.map((v, y) => (
                          <td key={y} className="r" style={{ color: v < 0 ? 'var(--danger)' : undefined }}>
                            {formatNumber(v / 1_000_000, 1)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="faint" style={{ padding: '8px 0 0' }}>
                  Млн ₽, накопленным итогом относительно базового сценария.
                </p>
              </div>
            )}
            <p className="faint" style={{ marginTop: 8 }}>
              Ряд по годам построен линейно из годового эффекта: в контракте EconomicsResult его пока нет (открытый вопрос 1).
            </p>
          </Card>

          <Card
            title="Структура затрат"
            actions={
              <>
                <div className="control" style={{ height: 30, width: 150 }}>
                  <select value={structure.def.id} onChange={(e) => setStructureId(e.target.value)} aria-label="Сценарий">
                    {nonBase.map((c) => (
                      <option key={c.def.id} value={c.def.id}>
                        {c.def.title}
                      </option>
                    ))}
                  </select>
                </div>
                <Segmented label="Вид затрат" value={capexOrOpex} onChange={setCapexOrOpex} options={[{ value: 'capex', label: 'CAPEX' }, { value: 'opex', label: 'OPEX' }]} />
              </>
            }
          >
            <div className="stack">
              <span className="muted num">
                {capexOrOpex === 'capex' ? 'Единовременно' : 'В год'}: <strong style={{ color: 'var(--ink)' }}>{formatRubShort(capexOrOpex === 'capex' ? structure.result.capex_total : structure.result.opex_annual)}</strong>
              </span>
              <Breakdown data={capexOrOpex === 'capex' ? structure.result.capex_breakdown : structure.result.opex_breakdown} tone={capexOrOpex === 'capex' ? 'accent' : undefined} />
            </div>
          </Card>
        </div>

        <Card
          title="Чувствительность"
          flush
          actions={
            <div className="control" style={{ height: 30, width: 180 }}>
              <select value={sens.def.id} onChange={(e) => setSensId(e.target.value)} aria-label="Сценарий для анализа чувствительности">
                {nonBase.map((c) => (
                  <option key={c.def.id} value={c.def.id}>
                    {c.def.title}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          <SensitivityTable base={sens.result} points={computeSensitivity(draft, sens.def)} />
        </Card>

        <Alert tone="info" title={`Допущения расчёта · сценарий «${structure.def.title}»`}>
          {structure.result.assumptions_note}
        </Alert>
      </div>
    </>
  );
}
