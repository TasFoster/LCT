import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { MATCH_RESULT } from '../../../shared/mock/results';
import { CATALOG, catalogById } from '../../../shared/mock/catalog';
import { CONFIDENCE_LABEL, MATCH_STATUS_LABEL } from '../../../shared/mock/dictionaries';
import { ROUTES } from '../../../shared/config/routes';
import type { MatchCandidate, MatchStatus } from '../../../shared/types/contracts';
import { formatNumber, formatRubShort, pluralize } from '../../../shared/lib/format';
import { Alert, Bar, Button, Card, Chip, MockNote, Segmented } from '../../../shared/ui';
import type { Tone } from '../../../shared/ui';
import { useMockCalc } from '../../../features/wizard/useMockCalc';
import { CalcStatus } from '../../../widgets/CalcStatus';
import { useWizard } from '../context';
import { WizardFooter } from '../WizardFooter';
import { solutionTypeLabel } from '../../../shared/dictionaries';

const STATUS_TONE: Record<MatchStatus, Tone> = { recommended: 'ok', needs_review: 'warn', excluded: 'danger' };
type Filter = 'all' | MatchStatus;

/** Шаг 3. Подбор: ранжированные кандидаты с объяснением и ручными правками. */
export function StepMatching() {
  const { draft, update } = useWizard();
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(MATCH_RESULT.candidates[0].catalog_item_id);
  const [addId, setAddId] = useState('');
  const calc = useMockCalc();

  const manual = MATCH_RESULT.manual_additions.concat(
    Object.keys(draft.quantities).filter((id) => !MATCH_RESULT.candidates.some((c) => c.catalog_item_id === id)),
  );
  const candidates: MatchCandidate[] = [
    ...MATCH_RESULT.candidates,
    ...manual.map((id) => ({
      catalog_item_id: id,
      status: 'needs_review' as const,
      score: 0,
      factors: [],
      reasons: ['Добавлено вручную — автоподбор эту позицию не оценивал'],
      quantity_if_selected: 1,
    })),
  ].map((c) =>
    draft.manuallyExcluded.includes(c.catalog_item_id)
      ? { ...c, status: 'excluded' as const, reasons: ['Исключено вами вручную', ...c.reasons] }
      : c,
  );

  const counts = {
    recommended: candidates.filter((c) => c.status === 'recommended').length,
    needs_review: candidates.filter((c) => c.status === 'needs_review').length,
    excluded: candidates.filter((c) => c.status === 'excluded').length,
  };
  const visible = candidates.filter((c) => filter === 'all' || c.status === filter);

  const toggleCompare = (id: string, on: boolean) =>
    update((d) => ({ compare: on ? [...d.compare, id].slice(-4) : d.compare.filter((x) => x !== id) }));

  const toggleExcluded = (id: string) =>
    update((d) => ({
      manuallyExcluded: d.manuallyExcluded.includes(id) ? d.manuallyExcluded.filter((x) => x !== id) : [...d.manuallyExcluded, id],
      compare: d.compare.filter((x) => x !== id),
    }));

  const rerun = () => calc.start(() => update({ staleAfterParams: false }));

  return (
    <>
      <div className="page wizard-body">
        <div className="page-head">
          <div className="page-head__text">
            <span className="label">Шаг 3 из 8</span>
            <h1>Подбор оборудования</h1>
            <p className="muted">
              Рассмотрено {candidates.length} {pluralize(candidates.length, ['решение', 'решения', 'решений'])} из каталога.
              Отметьте до четырёх — их сравним бок о бок на следующем шаге.
            </p>
          </div>
          <div className="page-head__actions">
            <MockNote />
            <Button onClick={rerun} disabled={calc.running}>
              Пересчитать подбор
            </Button>
          </div>
        </div>

        {calc.running && <CalcStatus progress={calc.progress} label="Подбираем технику под параметры объекта" />}
        {!calc.running && draft.staleAfterParams && (
          <Alert tone="warn" title="Параметры объекта изменились — подбор устарел" action={<Button size="sm" variant="primary" onClick={rerun}>Пересчитать</Button>}>
            Ниже — результат по прежним параметрам.
          </Alert>
        )}

        <div className="row row--between">
          <Segmented<Filter>
            label="Фильтр по статусу"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `Все · ${candidates.length}` },
              { value: 'recommended', label: `Рекомендовано · ${counts.recommended}` },
              { value: 'needs_review', label: `Проверить · ${counts.needs_review}` },
              { value: 'excluded', label: `Исключено · ${counts.excluded}` },
            ]}
          />
          <div className="row">
            <div className="control" style={{ width: 280 }}>
              <select value={addId} onChange={(e) => setAddId(e.target.value)} aria-label="Добавить решение из каталога вручную">
                <option value="">Добавить из каталога вручную…</option>
                {CATALOG.filter((c) => !candidates.some((x) => x.catalog_item_id === c.id)).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.identification.product_name} — {solutionTypeLabel(c.identification.solution_type)}
                  </option>
                ))}
              </select>
            </div>
            <Button
              disabled={!addId}
              onClick={() => {
                update((d) => ({ quantities: { ...d.quantities, [addId]: 1 } }));
                setAddId('');
              }}
            >
              Добавить
            </Button>
          </div>
        </div>

        <Card flush>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 44 }} className="c">
                    Сравн.
                  </th>
                  <th>Решение</th>
                  <th>Статус</th>
                  <th style={{ width: 200 }}>Оценка</th>
                  <th className="r">Нужно единиц</th>
                  <th className="r">CAPEX оборудования</th>
                  <th>Данные</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => {
                  const item = catalogById(c.catalog_item_id);
                  if (!item) return null;
                  const isOpen = open === c.catalog_item_id;
                  const excluded = c.status === 'excluded';
                  const inCompare = draft.compare.includes(c.catalog_item_id);
                  const qty = c.quantity_if_selected ?? 0;
                  return (
                    <Fragment key={c.catalog_item_id}>
                      <tr className={[inCompare && 'is-selected', excluded && 'is-muted'].filter(Boolean).join(' ')}>
                        <td className="c">
                          <input
                            type="checkbox"
                            aria-label={`Сравнить ${item.identification.product_name}`}
                            checked={inCompare}
                            disabled={excluded || (!inCompare && draft.compare.length >= 4)}
                            onChange={(e) => toggleCompare(c.catalog_item_id, e.target.checked)}
                            style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                          />
                        </td>
                        <td>
                          <div className="stack" style={{ gap: 2 }}>
                            <Link to={ROUTES.catalogItem(item.id)} target="_blank" style={{ color: 'var(--ink)', fontWeight: 600 }}>
                              {item.identification.product_name}
                            </Link>
                            <span className="faint">
                              {solutionTypeLabel(item.identification.solution_type)} · {item.identification.manufacturer}
                            </span>
                          </div>
                        </td>
                        <td>
                          <Chip tone={STATUS_TONE[c.status]}>{MATCH_STATUS_LABEL[c.status]}</Chip>
                        </td>
                        <td>
                          {c.score > 0 ? (
                            <div className="row" style={{ flexWrap: 'nowrap' }}>
                              <Bar value={c.score * 100} tone={c.status === 'recommended' ? 'ok' : c.status === 'needs_review' ? 'warn' : undefined} />
                              <span className="num" style={{ minWidth: 34 }}>
                                {Math.round(c.score * 100)}
                              </span>
                            </div>
                          ) : (
                            <span className="faint">не оценивалось</span>
                          )}
                        </td>
                        <td className="r">{excluded ? '—' : formatNumber(qty)}</td>
                        <td className="r">{excluded ? '—' : formatRubShort((item.economics.equipment_cost ?? 0) * Math.max(qty, 1))}</td>
                        <td>
                          <Chip tone={item.data_quality.confidence === 'verified' ? 'ok' : item.data_quality.confidence === 'partial' ? 'info' : 'warn'} plain>
                            {CONFIDENCE_LABEL[item.data_quality.confidence]}
                          </Chip>
                        </td>
                        <td className="r nowrap">
                          <Button size="sm" variant="ghost" onClick={() => setOpen(isOpen ? null : c.catalog_item_id)} aria-expanded={isOpen}>
                            {isOpen ? 'Свернуть' : 'Почему так?'}
                          </Button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td />
                          <td colSpan={7} style={{ background: 'var(--surface-2)' }}>
                            <div className="grid grid--2" style={{ padding: '6px 0 10px' }}>
                              <div className="stack stack--sm">
                                <span className="label">Причины</span>
                                <ul style={{ margin: 0, paddingLeft: 18 }}>
                                  {c.reasons.map((r) => (
                                    <li key={r}>{r}</li>
                                  ))}
                                </ul>
                                <div className="row" style={{ marginTop: 6 }}>
                                  <Button size="sm" variant={draft.manuallyExcluded.includes(c.catalog_item_id) ? 'secondary' : 'danger'} onClick={() => toggleExcluded(c.catalog_item_id)}>
                                    {draft.manuallyExcluded.includes(c.catalog_item_id) ? 'Вернуть в подбор' : 'Исключить вручную'}
                                  </Button>
                                </div>
                              </div>
                              {c.factors.length > 0 && (
                                <div className="stack stack--sm">
                                  <span className="label">Из чего сложилась оценка</span>
                                  <table className="table" style={{ background: 'var(--surface)' }}>
                                    <thead>
                                      <tr>
                                        <th>Критерий</th>
                                        <th className="r">Вес</th>
                                        <th className="r">Вклад</th>
                                        <th>Пояснение</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {c.factors.map((f) => (
                                        <tr key={f.name}>
                                          <td>{f.name}</td>
                                          <td className="r">{Math.round(f.weight * 100)} %</td>
                                          <td className="r">
                                            {Math.round(f.contribution * 100)} из {Math.round(f.weight * 100)}
                                          </td>
                                          <td className="muted">{f.note ?? '—'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="faint">
          Оценка 0–100 — взвешенная сумма критериев. Исключённые решения не удаляются: видно, почему они не подошли.
        </p>
      </div>
      <WizardFooter
        blockedReason={
          calc.running
            ? 'Дождитесь окончания подбора'
            : draft.compare.length === 0
              ? 'Отметьте хотя бы одно решение для сравнения'
              : null
        }
        extra={draft.compare.length > 0 && <span className="muted num">Выбрано для сравнения: {draft.compare.length} из 4</span>}
      />
    </>
  );
}
