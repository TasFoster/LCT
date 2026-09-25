import { CAPEX_LABELS, OPEX_LABELS } from '../shared/mock/dictionaries';
import { formatRubShort } from '../shared/lib/format';
import { Bar } from '../shared/ui';

const LABELS: Record<string, string> = { ...CAPEX_LABELS, ...OPEX_LABELS, interest: 'Проценты по кредиту' };

/** Разбивка затрат по статьям: подпись, полоса доли, сумма. */
export function Breakdown({ data, tone }: { data: Record<string, number>; tone?: 'accent' | 'ok' | 'warn' }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!entries.length) return <p className="muted">Затрат нет</p>;
  return (
    <div className="stack stack--sm">
      {entries.map(([key, value]) => (
        <div key={key} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 96px', gap: 10, alignItems: 'center' }}>
          <span className="muted">{LABELS[key] ?? key}</span>
          <Bar value={(value / total) * 100} tone={tone} />
          <span className="num" style={{ textAlign: 'right' }}>
            {formatRubShort(value)}
          </span>
        </div>
      ))}
    </div>
  );
}
