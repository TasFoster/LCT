import type { ReactNode } from 'react';
import { catalogById } from '../../../shared/mock/catalog';
import { MATCH_RESULT } from '../../../shared/mock/results';
import { ACQUISITION_LABEL, NAVIGATION_LABEL } from '../../../shared/mock/dictionaries';
import type { CatalogItem } from '../../../shared/types/contracts';
import { formatNumber, formatRub, formatRubShort } from '../../../shared/lib/format';
import { Button, Card, Chip, EmptyState } from '../../../shared/ui';
import { useWizard } from '../context';
import { WizardFooter } from '../WizardFooter';
import { solutionTypeLabel } from '../../../shared/dictionaries';

interface Row {
  label: string;
  unit?: string;
  get: (c: CatalogItem) => number | string | null;
  /** 'max' — лучше больше, 'min' — лучше меньше */
  better?: 'max' | 'min';
  group?: string;
}

const ROWS: Row[] = [
  { group: 'Технические характеристики', label: 'Грузоподъёмность', unit: 'кг', get: (c) => c.technical.payload_kg, better: 'max' },
  { label: 'Производительность', unit: 'оп./ч', get: (c) => c.technical.throughput_per_hour, better: 'max' },
  { label: 'Скорость', unit: 'м/с', get: (c) => c.technical.speed_mps, better: 'max' },
  { label: 'Автономность', unit: 'ч', get: (c) => c.technical.autonomy_hours, better: 'max' },
  { label: 'Точность позиционирования', unit: 'мм', get: (c) => c.technical.positioning_accuracy_mm, better: 'min' },
  { label: 'Навигация', get: (c) => (c.technical.navigation_type ? NAVIGATION_LABEL[c.technical.navigation_type] : null) },
  { group: 'Инфраструктура', label: 'Минимальная ширина прохода', unit: 'мм', get: (c) => c.infrastructure.aisle_width_mm, better: 'min' },
  { label: 'Зарядка', get: (c) => c.infrastructure.charging_type },
  { label: 'Связь', get: (c) => c.infrastructure.connectivity },
  { group: 'Экономика единицы', label: 'Оборудование', unit: '₽', get: (c) => c.economics.equipment_cost, better: 'min' },
  { label: 'Обслуживание', unit: '₽/год', get: (c) => c.economics.maintenance_cost_per_year, better: 'min' },
  { label: 'Срок службы', unit: 'лет', get: (c) => c.economics.service_life_years, better: 'max' },
  { label: 'Модель приобретения', get: (c) => ACQUISITION_LABEL[c.economics.acquisition_model] },
];

function fmt(v: number | string | null, unit?: string): ReactNode {
  if (v === null || v === undefined) return <span className="faint">нет данных</span>;
  if (typeof v === 'string') return v;
  if (unit === '₽') return formatRub(v);
  return `${formatNumber(v, 1)}${unit ? ` ${unit}` : ''}`;
}

/** Шаг 4. Сравнение отобранных решений и фиксация состава оборудования. */
export function StepComparison() {
  const { draft, update, goTo } = useWizard();
  const items = draft.compare.map((id) => catalogById(id)).filter((x): x is CatalogItem => Boolean(x));

  const qty = (id: string) =>
    draft.quantities[id] ?? MATCH_RESULT.candidates.find((c) => c.catalog_item_id === id)?.quantity_if_selected ?? 1;

  const setQty = (id: string, n: number) => update((d) => ({ quantities: { ...d.quantities, [id]: Math.max(1, Math.round(n)) } }));

  const toggleSelected = (id: string) =>
    update((d) => ({ selected: d.selected.includes(id) ? d.selected.filter((x) => x !== id) : [...d.selected, id] }));

  const total = draft.selected.reduce((sum, id) => sum + (catalogById(id)?.economics.equipment_cost ?? 0) * qty(id), 0);

  if (items.length === 0) {
    return (
      <>
        <div className="page wizard-body">
          <Card>
            <EmptyState
              title="Нечего сравнивать"
              action={
                <Button variant="primary" onClick={() => goTo('matching')}>
                  Вернуться к подбору
                </Button>
              }
            >
              Отметьте на шаге «Подбор» от одного до четырёх решений.
            </EmptyState>
          </Card>
        </div>
        <WizardFooter blockedReason="Отметьте решения на шаге «Подбор»" />
      </>
    );
  }

  return (
    <>
      <div className="page wizard-body">
        <div className="page-head">
          <div className="page-head__text">
            <span className="label">Шаг 4 из 8</span>
            <h1>Сравнение решений</h1>
            <p className="muted">
              Лучшее значение в строке отмечено зелёным. Включите в состав одно или несколько решений и уточните количество.
            </p>
          </div>
        </div>

        <div className="step-2col">
          <Card flush>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 240 }}>Характеристика</th>
                    {items.map((c) => (
                      <th key={c.id} className="r" style={{ minWidth: 190 }}>
                        {c.identification.product_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="muted">Производитель, тип</td>
                    {items.map((c) => (
                      <td key={c.id} className="r">
                        {c.identification.manufacturer}
                        <div className="faint">{solutionTypeLabel(c.identification.solution_type)}</div>
                      </td>
                    ))}
                  </tr>
                  {ROWS.map((row) => {
                    const vals = items.map((c) => row.get(c));
                    const nums = vals.filter((v): v is number => typeof v === 'number');
                    const best = row.better && nums.length > 1 ? (row.better === 'max' ? Math.max(...nums) : Math.min(...nums)) : null;
                    return (
                      <FragmentRow key={row.label} group={row.group} colSpan={items.length + 1}>
                        <tr>
                          <td className="muted">{row.label}</td>
                          {vals.map((v, i) => (
                            <td key={items[i].id} className="r" style={best !== null && v === best ? { color: 'var(--ok)', fontWeight: 600 } : undefined}>
                              {fmt(v, row.unit)}
                            </td>
                          ))}
                        </tr>
                      </FragmentRow>
                    );
                  })}
                  <tr>
                    <td className="muted">Ограничения</td>
                    {items.map((c) => (
                      <td key={c.id} className="r" style={{ whiteSpace: 'normal' }}>
                        {c.applicability.limitations.join('; ') || '—'}
                      </td>
                    ))}
                  </tr>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <td>
                      <strong>Количество единиц</strong>
                    </td>
                    {items.map((c) => (
                      <td key={c.id} className="r">
                        <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                          <Button size="sm" variant="ghost" onClick={() => setQty(c.id, qty(c.id) - 1)} aria-label="Меньше">
                            −
                          </Button>
                          <div className="control" style={{ width: 70, height: 30 }}>
                            <input
                              aria-label={`Количество ${c.identification.product_name}`}
                              inputMode="numeric"
                              value={qty(c.id)}
                              onChange={(e) => setQty(c.id, Number(e.target.value) || 1)}
                              style={{ textAlign: 'right' }}
                            />
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => setQty(c.id, qty(c.id) + 1)} aria-label="Больше">
                            +
                          </Button>
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <td>
                      <strong>В состав оборудования</strong>
                    </td>
                    {items.map((c) => (
                      <td key={c.id} className="r">
                        <Button size="sm" variant={draft.selected.includes(c.id) ? 'primary' : 'secondary'} onClick={() => toggleSelected(c.id)}>
                          {draft.selected.includes(c.id) ? '✓ Включено' : 'Включить'}
                        </Button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <aside className="sticky-side stack">
            <Card title="Состав оборудования">
              {draft.selected.length === 0 ? (
                <p className="muted">Пока ничего не включено. Нажмите «Включить» под решением.</p>
              ) : (
                <div className="stack stack--sm">
                  {draft.selected.map((id) => {
                    const c = catalogById(id);
                    if (!c) return null;
                    return (
                      <div key={id} className="row row--between">
                        <span>
                          <strong className="num">{qty(id)} ×</strong> {c.identification.product_name}
                        </span>
                        <span className="num muted">{formatRubShort((c.economics.equipment_cost ?? 0) * qty(id))}</span>
                      </div>
                    );
                  })}
                  <div className="row row--between" style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 4 }}>
                    <span className="muted">Оборудование итого</span>
                    <strong className="num">{formatRubShort(total)}</strong>
                  </div>
                </div>
              )}
            </Card>
            <div className="hint-card hint-card--info">
              <span className="label">Подсказка</span>
              <p className="muted">
                Количество предложено по нагрузке: операции в сутки ÷ производительность единицы с учётом загрузки 75 %.
                Меняйте его, если знаете о пиках.
              </p>
            </div>
            {items.some((c) => c.data_quality.confidence === 'unverified') && (
              <div className="hint-card">
                <Chip tone="warn">Непроверенные данные</Chip>
                <p className="muted">У части решений данные каталога не проверены — цифры стоит уточнить у поставщика.</p>
              </div>
            )}
          </aside>
        </div>
      </div>
      <WizardFooter blockedReason={draft.selected.length === 0 ? 'Включите хотя бы одно решение в состав' : null} />
    </>
  );
}

function FragmentRow({ group, colSpan, children }: { group?: string; colSpan: number; children: ReactNode }) {
  return (
    <>
      {group && (
        <tr>
          <td colSpan={colSpan} className="label" style={{ background: 'var(--surface-2)', paddingTop: 14 }}>
            {group}
          </td>
        </tr>
      )}
      {children}
    </>
  );
}
