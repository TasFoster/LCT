import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { bestScenario, computeScenario } from '../../features/wizard/mockEconomics';
import { useDraft, useProject } from '../../features/wizard/store';
import { PARAMS_SCHEMA, displayParamValue } from '../../features/wizard/paramsSchema';
import { catalogById } from '../../shared/mock/catalog';
import { FINANCING_LABEL, objectTypeLabel } from '../../shared/mock/dictionaries';
import { ROUTES } from '../../shared/config/routes';
import { formatDate, formatNumber, formatPct, formatRub, formatYears } from '../../shared/lib/format';
import { Button, ButtonLink } from '../../shared/ui';
import { solutionTypeLabel } from '../../shared/dictionaries';

/** Предпросмотр отчёта: печатная вёрстка того, что уйдёт в PDF. */
export function ReportPage() {
  const { projectId = '' } = useParams();
  const project = useProject(projectId);
  const draft = useDraft(projectId);
  const type = draft.objectType ?? project.object_type;
  const values = draft.params[type] ?? {};
  const results = useMemo(() => draft.scenarios.map((def) => ({ def, result: computeScenario(draft, def) })), [draft]);
  const best = bestScenario(results, draft.economics.horizonYears);

  const shownFields = PARAMS_SCHEMA[type]
    .flatMap((s) => s.fields)
    .filter((f) => f.kind !== 'radio' || values[f.key])
    .filter((f) => values[f.key] !== undefined && values[f.key] !== null && values[f.key] !== '' && !(Array.isArray(values[f.key]) && (values[f.key] as unknown[]).length === 0));

  return (
    <div className="page" style={{ maxWidth: 1000 }}>
      <div className="row row--between no-print">
        <ButtonLink to={ROUTES.dashboard(projectId)} variant="ghost">
          ‹ К дашборду
        </ButtonLink>
        <div className="row">
          <span className="faint">PDF — через «Печать» → «Сохранить как PDF»</span>
          <Button variant="primary" onClick={() => window.print()}>
            Печать / PDF
          </Button>
        </div>
      </div>

      <article className="report-sheet stack stack--lg">
        <header className="stack stack--sm" style={{ borderBottom: '2px solid #15181c', paddingBottom: 16 }}>
          <span className="label" style={{ color: '#c2410c' }}>
            Отчёт о расчёте роботизации · версия {project.current_version} · {formatDate(new Date().toISOString())}
          </span>
          <h1 style={{ fontSize: 28 }}>{project.name}</h1>
          <p style={{ color: '#5c6673' }}>
            {objectTypeLabel(type)}
            {project.site ? ` · ${project.site}` : ''}
          </p>
        </header>

        <section className="stack stack--sm">
          <h2>Вывод</h2>
          <p>
            {best
              ? `Наиболее выгоден сценарий «${best.def.title}»: вложения ${formatRub(best.result.capex_total)}, годовой эффект ${formatRub(best.result.annual_effect)}, окупаемость ${formatYears(best.result.payback_years)}, ROI за ${draft.economics.horizonYears} лет — ${formatPct(best.result.roi_pct)}.`
              : `Ни один сценарий не окупается на горизонте ${draft.economics.horizonYears} лет.`}
          </p>
        </section>

        <section className="stack stack--sm">
          <h2>Параметры объекта</h2>
          <table className="table">
            <tbody>
              {shownFields.map((f) => (
                <tr key={f.key}>
                  <td style={{ width: '50%', color: '#5c6673' }}>{f.label}</td>
                  <td>
                    {displayParamValue(f, values[f.key])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="stack stack--sm">
          <h2>Состав оборудования</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Решение</th>
                <th>Тип</th>
                <th className="r">Кол-во</th>
                <th className="r">Стоимость</th>
              </tr>
            </thead>
            <tbody>
              {draft.selected.map((id) => {
                const c = catalogById(id);
                const q = draft.quantities[id] ?? 1;
                return (
                  <tr key={id}>
                    <td>{c?.identification.product_name}</td>
                    <td>{solutionTypeLabel(c?.identification.solution_type ?? '')}</td>
                    <td className="r">{q}</td>
                    <td className="r">{formatRub((c?.economics.equipment_cost ?? 0) * q)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="stack stack--sm">
          <h2>Сценарии</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Сценарий</th>
                <th className="r">CAPEX</th>
                <th className="r">OPEX, в год</th>
                <th className="r">Эффект, в год</th>
                <th className="r">Окупаемость</th>
                <th className="r">ROI</th>
              </tr>
            </thead>
            <tbody>
              {results.map(({ def, result }) => (
                <tr key={def.id}>
                  <td>
                    {def.title}
                    <div style={{ color: '#8b95a1', fontSize: 12 }}>{def.kind === 'baseline' ? 'без роботизации' : FINANCING_LABEL[def.financing]}</div>
                  </td>
                  <td className="r">{formatNumber(result.capex_total)}</td>
                  <td className="r">{formatNumber(result.opex_annual)}</td>
                  <td className="r">{def.kind === 'baseline' ? '—' : formatNumber(result.annual_effect)}</td>
                  <td className="r">{def.kind === 'baseline' ? '—' : formatYears(result.payback_years)}</td>
                  <td className="r">{def.kind === 'baseline' ? '—' : formatPct(result.roi_pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ color: '#8b95a1', fontSize: 12 }}>Суммы в рублях с НДС.</p>
        </section>

        <section className="stack stack--sm">
          <h2>Допущения</h2>
          <p style={{ color: '#5c6673' }}>{(best ?? results[0]).result.assumptions_note}</p>
        </section>
      </article>
    </div>
  );
}
