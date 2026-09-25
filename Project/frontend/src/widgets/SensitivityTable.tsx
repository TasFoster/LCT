import type { EconomicsResult, SensitivityResultPoint } from '../shared/types/contracts';
import { formatNumber, formatPct, formatYears } from '../shared/lib/format';
import { Chip } from '../shared/ui';

/** Чувствительность в формате «было → стало»: важна устойчивость вывода, а не новое число. */
export function SensitivityTable({ base, points }: { base: EconomicsResult; points: SensitivityResultPoint[] }) {
  if (!points.length) return <p className="muted">Для базового сценария чувствительность не считается.</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Параметр</th>
            <th className="r">Изменение</th>
            <th className="r">Срок окупаемости</th>
            <th className="r">ROI</th>
            <th>Вывод</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => {
            const payback = Number.isFinite(p.resulting_payback_years) ? p.resulting_payback_years : null;
            const worse = base.payback_years !== null && payback !== null ? payback / base.payback_years : Infinity;
            const tone = payback === null ? 'danger' : worse > 1.3 ? 'warn' : 'ok';
            const text = payback === null ? 'перестаёт окупаться' : worse > 1.3 ? 'ключевой риск' : 'вывод устойчив';
            return (
              <tr key={p.parameter}>
                <td>{p.parameter}</td>
                <td className="r">
                  {p.delta_pct > 0 ? '+' : '−'}
                  {formatNumber(Math.abs(p.delta_pct))} %
                </td>
                <td className="r">
                  {formatYears(base.payback_years)} → {formatYears(payback)}
                </td>
                <td className="r">
                  {formatPct(base.roi_pct)} → {formatPct(p.resulting_roi_pct)}
                </td>
                <td>
                  <Chip tone={tone}>{text}</Chip>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
