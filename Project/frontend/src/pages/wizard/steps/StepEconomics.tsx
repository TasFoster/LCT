import { computeScenario, DEFAULT_SCENARIOS } from '../../../features/wizard/mockEconomics';
import type { EconomicsInputs } from '../../../features/wizard/store';
import { FINANCING_LABEL } from '../../../shared/mock/dictionaries';
import type { FinancingType } from '../../../shared/types/contracts';
import { formatDateTime, formatPct, formatRub, formatRubShort, formatSigned, formatYears } from '../../../shared/lib/format';
import { Alert, Button, Card, EmptyState, MockNote, NumberField, SelectField, Stat } from '../../../shared/ui';
import { useMockCalc } from '../../../features/wizard/useMockCalc';
import { CalcStatus } from '../../../widgets/CalcStatus';
import { Breakdown } from '../../../widgets/EconomicsBreakdown';
import { useWizard } from '../context';
import { WizardFooter } from '../WizardFooter';

/** Шаг 5. Экономика основного сценария против базового. */
export function StepEconomics() {
  const { draft, update } = useWizard();
  const econ = draft.economics;
  const calc = useMockCalc(1800);

  const setEcon = (patch: Partial<EconomicsInputs>) => update((d) => ({ economics: { ...d.economics, ...patch }, econCalculatedAt: null }));

  const main = draft.scenarios.find((s) => s.kind !== 'baseline') ?? DEFAULT_SCENARIOS[1];
  const mainDef = { ...main, financing: econ.financing };
  const result = computeScenario(draft, mainDef);
  const baseline = computeScenario(draft, DEFAULT_SCENARIOS[0]);

  const issues = {
    hours: econ.hoursPerYear <= 0 || econ.hoursPerYear > 8784 ? 'От 1 до 8 784 часов в году' : null,
    load: econ.loadFactor <= 0 || econ.loadFactor > 1 ? 'Доля от 0 до 1, например 0,75' : null,
    horizon: econ.horizonYears < 5 ? 'По ТЗ горизонт не меньше 5 лет' : null,
    staff: econ.staffCostPerMonth <= 0 ? 'Укажите стоимость больше 0' : null,
  };
  const invalid = Object.values(issues).some(Boolean);
  const calculated = Boolean(draft.econCalculatedAt);

  const run = () => calc.start(() => update({ econCalculatedAt: new Date().toISOString() }));

  return (
    <>
      <div className="page wizard-body">
        <div className="page-head">
          <div className="page-head__text">
            <span className="label">Шаг 5 из 8</span>
            <h1>Экономика</h1>
            <p className="muted">Задайте условия эксплуатации — посчитаем затраты, эффект и окупаемость относительно работы без роботов.</p>
          </div>
          <div className="page-head__actions">
            <MockNote>Расчёт-заглушка на фронте</MockNote>
          </div>
        </div>

        <div className="step-2col" style={{ gridTemplateColumns: '360px minmax(0, 1fr)' }}>
          <aside className="sticky-side">
            <Card
              title="Условия расчёта"
              actions={
                <Button size="sm" variant="primary" onClick={run} disabled={invalid || calc.running}>
                  {calculated ? 'Пересчитать' : 'Рассчитать'}
                </Button>
              }
            >
              <div className="stack">
                <NumberField label="Часы работы в год" required unit="ч/год" value={econ.hoursPerYear} error={issues.hours} hint="24/7 — это 8 760 ч" onChange={(n) => setEcon({ hoursPerYear: n ?? 0 })} />
                <NumberField label="Коэффициент загрузки" required unit="0…1" value={econ.loadFactor} error={issues.load} hint="доля времени, когда техника занята" onChange={(n) => setEcon({ loadFactor: n ?? 0 })} />
                <NumberField label="Стоимость замещаемого персонала" required unit="₽/мес" value={econ.staffCostPerMonth} error={issues.staff} hint="на весь персонал за месяц, как в ТЗ" onChange={(n) => setEcon({ staffCostPerMonth: n ?? 0 })} />
                <NumberField label="Горизонт расчёта TCO" required unit="лет" value={econ.horizonYears} error={issues.horizon} onChange={(n) => setEcon({ horizonYears: n ?? 0 })} />
                <SelectField
                  label="Способ финансирования"
                  required
                  value={econ.financing}
                  onChange={(v) => setEcon({ financing: v as FinancingType })}
                  options={(Object.keys(FINANCING_LABEL) as FinancingType[]).map((k) => ({ value: k, label: FINANCING_LABEL[k] }))}
                />
              </div>
            </Card>
          </aside>

          <div className="stack">
            {calc.running && <CalcStatus progress={calc.progress} label="Считаем экономику" />}

            {!calculated && !calc.running ? (
              <Card>
                <EmptyState icon="₽" title="Здесь появится расчёт">
                  Проверьте условия слева и нажмите «Рассчитать». Если условия поменяются, результат нужно будет пересчитать.
                </EmptyState>
              </Card>
            ) : (
              <div className="stack" style={{ opacity: calc.running ? 0.5 : 1 }}>
                {draft.econCalculatedAt && (
                  <span className="faint">
                    Сценарий «{FINANCING_LABEL[econ.financing]}» против базового · рассчитано {formatDateTime(draft.econCalculatedAt)}
                  </span>
                )}
                <div className="grid grid--3">
                  <Stat label="CAPEX" value={formatRubShort(result.capex_total)} sub="единовременные вложения" />
                  <Stat label="OPEX в год" value={formatRubShort(result.opex_annual)} sub={`${formatSigned(result.opex_delta_vs_baseline)} ₽ к базовому`} />
                  <Stat label="Годовой эффект" value={formatRubShort(result.annual_effect)} sub="экономия против работы без роботов" accent />
                  <Stat
                    label="Срок окупаемости"
                    value={formatYears(result.payback_years)}
                    sub={result.payback_years === null ? 'годовой эффект ≤ 0' : 'простая, без дисконтирования'}
                  />
                  <Stat label={`ROI за ${econ.horizonYears} лет`} value={formatPct(result.roi_pct)} />
                  <Stat label={`TCO за ${econ.horizonYears} лет`} value={formatRubShort(result.tco_total)} sub={`базовый: ${formatRubShort(baseline.tco_total)}`} />
                </div>

                {result.payback_years === null && (
                  <Alert tone="warn" title="Сценарий не окупается">
                    Затраты на технику больше, чем экономия на персонале. Попробуйте другой состав оборудования или способ финансирования.
                  </Alert>
                )}

                <div className="grid grid--2">
                  <Card title="CAPEX по статьям" actions={<span className="num muted">{formatRub(result.capex_total)}</span>}>
                    <Breakdown data={result.capex_breakdown} tone="accent" />
                  </Card>
                  <Card title="OPEX по статьям, в год" actions={<span className="num muted">{formatRub(result.opex_annual)}</span>}>
                    <Breakdown data={result.opex_breakdown} />
                  </Card>
                </div>

                <Alert tone="info" title="Допущения расчёта">
                  {result.assumptions_note}
                </Alert>
              </div>
            )}

            {draft.selected.length === 0 && (
              <EmptyState title="Не выбрано оборудование">Вернитесь на шаг «Сравнение» и включите решения в состав.</EmptyState>
            )}
          </div>
        </div>
      </div>
      <WizardFooter
        blockedReason={calc.running ? 'Дождитесь окончания расчёта' : invalid ? 'Исправьте условия расчёта' : !calculated ? 'Нажмите «Рассчитать»' : null}
      />
    </>
  );
}
