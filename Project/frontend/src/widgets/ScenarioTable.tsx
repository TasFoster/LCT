import { Fragment, useState } from 'react';
import type { ReactNode } from 'react';
import type { EconomicsResult } from '../shared/types/contracts';
import type { ScenarioDef } from '../features/wizard/mockEconomics';
import { CAPEX_LABELS, FINANCING_LABEL, OPEX_LABELS } from '../shared/mock/dictionaries';
import { formatNumber, formatPct, formatSigned, formatYears } from '../shared/lib/format';

export interface ScenarioColumn {
  def: ScenarioDef;
  result: EconomicsResult;
}

interface Metric {
  label: string;
  get: (r: EconomicsResult) => number | null;
  fmt: (v: number | null) => ReactNode;
  better?: 'min' | 'max';
  breakdown?: 'capex' | 'opex';
  baselineDash?: boolean;
}

const METRICS: Metric[] = [
  { label: 'CAPEX, ₽', get: (r) => r.capex_total, fmt: (v) => formatNumber(v), breakdown: 'capex' },
  { label: 'OPEX, ₽/год', get: (r) => r.opex_annual, fmt: (v) => formatNumber(v), better: 'min', breakdown: 'opex' },
  { label: 'Изменение OPEX к базовому, ₽/год', get: (r) => r.opex_delta_vs_baseline, fmt: (v) => (v ? formatSigned(v) : '—'), baselineDash: true },
  { label: 'Годовой эффект, ₽', get: (r) => r.annual_effect, fmt: (v) => formatNumber(v), better: 'max', baselineDash: true },
  { label: 'Срок окупаемости', get: (r) => r.payback_years, fmt: (v) => formatYears(v), better: 'min', baselineDash: true },
  { label: 'ROI', get: (r) => r.roi_pct, fmt: (v) => formatPct(v), better: 'max', baselineDash: true },
  { label: 'TCO на горизонте, ₽', get: (r) => r.tco_total, fmt: (v) => formatNumber(v), better: 'min' },
];

const LABELS: Record<string, string> = { ...CAPEX_LABELS, ...OPEX_LABELS, interest: 'Проценты по кредиту' };

interface ScenarioTableProps {
  columns: ScenarioColumn[];
  actions?: (col: ScenarioColumn) => ReactNode;
}

/**
 * Сравнение сценариев: показатели — строки, сценарии — колонки. Базовый
 * первым и приглушён; лучшее значение в строке отмечено; разбивки
 * раскрываются по клику (Документация/Фронтенд и визард/wireframes/dashboard-scenarios.md).
 */
export function ScenarioTable({ columns, actions }: ScenarioTableProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const bestIn = (m: Metric) => {
    if (!m.better) return null;
    const vals = columns
      .filter((c) => c.def.kind !== 'baseline')
      .map((c) => m.get(c.result))
      .filter((v): v is number => v !== null && Number.isFinite(v));
    if (vals.length < 2) return null;
    return m.better === 'min' ? Math.min(...vals) : Math.max(...vals);
  };

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 280, position: 'sticky', left: 0 }}>Показатель</th>
            {columns.map((c) => (
              <th key={c.def.id} className="r" style={{ minWidth: 190, textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)' }}>
                <div style={{ fontWeight: 600 }}>{c.def.title}</div>
                <div className="faint" style={{ fontWeight: 400, fontSize: 12 }}>
                  {c.def.kind === 'baseline' ? 'без роботизации' : FINANCING_LABEL[c.def.financing].toLowerCase()}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {METRICS.map((m) => {
            const best = bestIn(m);
            const isOpen = m.breakdown ? open[m.breakdown] : false;
            const keys = m.breakdown
              ? Array.from(new Set(columns.flatMap((c) => Object.keys(m.breakdown === 'capex' ? c.result.capex_breakdown : c.result.opex_breakdown))))
              : [];
            return (
              <Fragment key={m.label}>
                <tr>
                  <td style={{ fontWeight: m.breakdown ? 600 : 400 }}>
                    {m.breakdown ? (
                      <button type="button" className="link-btn" style={{ color: 'var(--ink)', fontWeight: 600 }} onClick={() => setOpen((o) => ({ ...o, [m.breakdown!]: !o[m.breakdown!] }))} aria-expanded={isOpen}>
                        {isOpen ? '▾' : '▸'} {m.label}
                      </button>
                    ) : (
                      m.label
                    )}
                  </td>
                  {columns.map((c) => {
                    const v = m.get(c.result);
                    const base = c.def.kind === 'baseline';
                    const isBest = !base && best !== null && v === best;
                    return (
                      <td key={c.def.id} className="r" style={{ background: base ? 'var(--surface-2)' : undefined, color: base ? 'var(--muted)' : isBest ? 'var(--ok)' : undefined, fontWeight: isBest ? 600 : undefined }}>
                        {base && m.baselineDash ? '—' : m.fmt(v)}
                        {isBest && ' ★'}
                      </td>
                    );
                  })}
                </tr>
                {isOpen &&
                  keys.map((k) => (
                    <tr key={k}>
                      <td className="muted" style={{ paddingLeft: 32 }}>
                        {LABELS[k] ?? k}
                      </td>
                      {columns.map((c) => {
                        const src = m.breakdown === 'capex' ? c.result.capex_breakdown : c.result.opex_breakdown;
                        return (
                          <td key={c.def.id} className="r muted" style={{ background: c.def.kind === 'baseline' ? 'var(--surface-2)' : undefined }}>
                            {formatNumber(src[k] ?? 0)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </Fragment>
            );
          })}
          {actions && (
            <tr>
              <td />
              {columns.map((c) => (
                <td key={c.def.id} className="r" style={{ background: c.def.kind === 'baseline' ? 'var(--surface-2)' : undefined }}>
                  {actions(c)}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
