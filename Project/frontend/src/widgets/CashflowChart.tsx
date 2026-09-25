import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { formatNumber, formatRubShort } from '../shared/lib/format';

export interface CashflowSeries {
  id: string;
  title: string;
  /** Накопленный поток по годам, индекс = год (0 — момент вложений) */
  values: number[];
}

const HEIGHT = 260;
const PAD = { top: 28, right: 110, bottom: 28, left: 64 };

function niceStep(range: number, ticks: number): number {
  const raw = range / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n >= 5 ? 10 : n >= 2 ? 5 : n >= 1 ? 2 : 1) * pow;
}

/**
 * Накопленный денежный поток относительно базового сценария: одна шкала,
 * ноль выделен как точка безубыточности, цвет закреплён за сценарием по
 * порядку, подписи на концах линий, наведение показывает значения по году.
 */
export function CashflowChart({ series }: { series: CashflowSeries[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(320, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const years = Math.max(1, ...series.map((s) => s.values.length - 1));
  const all = series.flatMap((s) => s.values).concat(0);
  const rawMin = Math.min(...all);
  const rawMax = Math.max(...all);
  const step = niceStep(rawMax - rawMin || 1, 5);
  const yMin = Math.floor(rawMin / step) * step;
  const yMax = Math.ceil(rawMax / step) * step;

  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (year: number) => PAD.left + (year / years) * innerW;
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin || 1)) * innerH;

  const ticks: number[] = [];
  for (let v = yMin; v <= yMax + step / 2; v += step) ticks.push(v);

  /** Год, когда линия пересекает ноль, — линейной интерполяцией. */
  const breakEven = (values: number[]) => {
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] < 0 && values[i] >= 0) return i - 1 + -values[i - 1] / (values[i] - values[i - 1]);
    }
    return values[0] >= 0 ? 0 : null;
  };

  // Подписи на концах линий: разводим по вертикали, чтобы не слипались
  const endLabels = series
    .map((s, i) => ({ s, i, y: y(s.values[s.values.length - 1]) }))
    .sort((a, b) => a.y - b.y);
  for (let k = 1; k < endLabels.length; k++) {
    if (endLabels[k].y - endLabels[k - 1].y < 16) endLabels[k].y = endLabels[k - 1].y + 16;
  }

  const onMove = (e: MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(years, Math.round(rel * years))));
  };

  return (
    <div className="viz stack stack--sm" ref={wrap}>
      <div className="viz__legend" aria-hidden>
        {series.map((s, i) => (
          <span key={s.id}>
            <span className="viz__swatch" style={{ background: `var(--series-${i + 1})` }} />
            {s.title}
          </span>
        ))}
        <span>
          <span className="viz__swatch" style={{ background: 'var(--ink)', height: 1 }} />
          ноль — базовый сценарий
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${HEIGHT}`} height={HEIGHT} role="img" aria-label="Накопленный денежный поток по сценариям относительно базового, по годам">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--ink)' : 'var(--grid)'} strokeWidth={t === 0 ? 1.25 : 1} strokeDasharray={t === 0 ? undefined : '2 4'} />
            <text x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">
              {formatNumber(t / 1_000_000)}
            </text>
          </g>
        ))}
        <text x={PAD.left - 8} y={PAD.top - 16} textAnchor="end">
          млн ₽
        </text>

        {Array.from({ length: years + 1 }, (_, i) => (
          <text key={i} x={x(i)} y={HEIGHT - 8} textAnchor="middle">
            {i === 0 ? 'старт' : `${i} г.`}
          </text>
        ))}

        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--line-strong)" strokeWidth={1} />}

        {series.map((s, i) => {
          const d = s.values.map((v, yr) => `${yr === 0 ? 'M' : 'L'}${x(yr).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
          const be = breakEven(s.values);
          const color = `var(--series-${i + 1})`;
          return (
            <g key={s.id}>
              <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {be !== null && be > 0 && (
                <circle cx={x(be)} cy={y(0)} r={4.5} fill={color} stroke="var(--surface)" strokeWidth={2}>
                  <title>
                    {s.title}: безубыточность через {formatNumber(be, 1)} г.
                  </title>
                </circle>
              )}
              {hover !== null && s.values[hover] !== undefined && (
                <circle cx={x(hover)} cy={y(s.values[hover])} r={4} fill={color} stroke="var(--surface)" strokeWidth={2} />
              )}
            </g>
          );
        })}

        {endLabels.map(({ s, i, y: ly }) => (
          <text key={s.id} x={width - PAD.right + 8} y={ly} dominantBaseline="middle" style={{ fill: 'var(--ink)' }}>
            <tspan style={{ fill: `var(--series-${i + 1})` }}>● </tspan>
            {s.title}
          </text>
        ))}

        <rect x={PAD.left} y={PAD.top} width={innerW} height={innerH} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>

      {hover !== null && (
        <div className="viz__tooltip" style={{ left: Math.min(x(hover) + 12, width - 210) }}>
          <strong>{hover === 0 ? 'Старт — вложения' : `Конец ${hover}-го года`}</strong>
          {series.map((s, i) => (
            <div key={s.id} className="viz__tooltip-row">
              <span>
                <span className="viz__swatch" style={{ background: `var(--series-${i + 1})` }} />
                {s.title}
              </span>
              <span>{formatRubShort(s.values[hover] ?? null)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
