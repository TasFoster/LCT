import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CATALOG } from '../../shared/mock/catalog';
import { AVAILABILITY_LABEL, CONFIDENCE_LABEL, NAVIGATION_LABEL, OBJECT_TYPES, SOLUTION_TYPES } from '../../shared/mock/dictionaries';
import { ROUTES } from '../../shared/config/routes';
import type { AvailabilityStatus, CatalogItem, ObjectType } from '../../shared/types/contracts';
import { formatNumber, formatRubShort, pluralize } from '../../shared/lib/format';
import { Button, Checkbox, Chip, EmptyState, MockNote, PageHeader, Segmented } from '../../shared/ui';
import type { Tone } from '../../shared/ui';
import { solutionTypeLabel } from '../../shared/dictionaries';

type View = 'cards' | 'table';

const AVAIL_TONE: Record<AvailabilityStatus, Tone> = { available: 'ok', limited: 'warn', discontinued: 'danger', upcoming: 'info' };

/** Публичный каталог решений с фильтрами. Виден гостю. */
export function CatalogPage() {
  const [query, setQuery] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [objects, setObjects] = useState<ObjectType[]>([]);
  const [minPayload, setMinPayload] = useState<number | ''>('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [view, setView] = useState<View>('cards');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((c) => {
      const id = c.identification;
      if (q && !`${id.product_name} ${id.manufacturer} ${id.purpose}`.toLowerCase().includes(q)) return false;
      if (types.length && !types.includes(id.solution_type)) return false;
      if (objects.length && !objects.some((o) => c.applicability.supported_object_types.includes(o))) return false;
      if (minPayload !== '' && (c.technical.payload_kg ?? 0) < minPayload) return false;
      if (onlyAvailable && id.availability_status !== 'available') return false;
      return true;
    });
  }, [query, types, objects, minPayload, onlyAvailable]);

  const reset = () => {
    setQuery('');
    setTypes([]);
    setObjects([]);
    setMinPayload('');
    setOnlyAvailable(false);
  };
  const hasFilters = query || types.length || objects.length || minPayload !== '' || onlyAvailable;

  return (
    <div className="page">
      <PageHeader
        title="Каталог решений"
        description="Роботизированная техника для складов, аэропортов и медучреждений: характеристики, требования к инфраструктуре и ориентировочные цены."
        actions={<MockNote>Вымышленные модели для демонстрации</MockNote>}
      />

      <div className="with-sidebar">
        <aside className="filters" aria-label="Фильтры">
          <div className="control">
            <span className="control__icon" aria-hidden>
              ⌕
            </span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Модель, производитель" aria-label="Поиск по каталогу" />
          </div>

          <div className="filters__group">
            <span className="label">Тип решения</span>
            {SOLUTION_TYPES.map((t) => (
              <Checkbox key={t.value} checked={types.includes(t.value)} onChange={(on) => setTypes((xs) => (on ? [...xs, t.value] : xs.filter((x) => x !== t.value)))}>
                {t.label} <span className="faint num">{CATALOG.filter((c) => c.identification.solution_type === t.value).length}</span>
              </Checkbox>
            ))}
          </div>

          <div className="filters__group">
            <span className="label">Тип объекта</span>
            {OBJECT_TYPES.map((o) => (
              <Checkbox key={o.value} checked={objects.includes(o.value)} onChange={(on) => setObjects((xs) => (on ? [...xs, o.value] : xs.filter((x) => x !== o.value)))}>
                {o.label}
              </Checkbox>
            ))}
          </div>

          <div className="filters__group">
            <span className="label">Грузоподъёмность от</span>
            <div className="control">
              <input inputMode="numeric" value={minPayload} onChange={(e) => setMinPayload(e.target.value === '' ? '' : Number(e.target.value.replace(/\D/g, '')))} placeholder="любая" aria-label="Минимальная грузоподъёмность" />
              <span className="control__unit">кг</span>
            </div>
          </div>

          <Checkbox checked={onlyAvailable} onChange={setOnlyAvailable}>
            Только доступные к поставке
          </Checkbox>

          {hasFilters ? (
            <Button variant="ghost" onClick={reset}>
              Сбросить фильтры
            </Button>
          ) : null}
        </aside>

        <div className="stack">
          <div className="row row--between">
            <span className="muted">
              {list.length} {pluralize(list.length, ['решение', 'решения', 'решений'])}
            </span>
            <Segmented<View>
              label="Вид"
              value={view}
              onChange={setView}
              options={[
                { value: 'cards', label: 'Карточки' },
                { value: 'table', label: 'Таблица' },
              ]}
            />
          </div>

          {list.length === 0 ? (
            <div className="card">
              <EmptyState title="Под эти фильтры ничего нет" action={<Button onClick={reset}>Сбросить фильтры</Button>}>
                Попробуйте убрать часть условий.
              </EmptyState>
            </div>
          ) : view === 'cards' ? (
            <div className="grid grid--3">
              {list.map((c) => (
                <ItemCard key={c.id} item={c} />
              ))}
            </div>
          ) : (
            <div className="card table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Решение</th>
                    <th>Тип</th>
                    <th className="r">Груз, кг</th>
                    <th className="r">Произв., оп./ч</th>
                    <th className="r">Проход, мм</th>
                    <th>Навигация</th>
                    <th className="r">Цена</th>
                    <th>Наличие</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link to={ROUTES.catalogItem(c.id)} style={{ fontWeight: 600, color: 'var(--ink)' }}>
                          {c.identification.product_name}
                        </Link>
                        <div className="faint">{c.identification.manufacturer}</div>
                      </td>
                      <td>{solutionTypeLabel(c.identification.solution_type)}</td>
                      <td className="r">{formatNumber(c.technical.payload_kg)}</td>
                      <td className="r">{formatNumber(c.technical.throughput_per_hour)}</td>
                      <td className="r">{formatNumber(c.infrastructure.aisle_width_mm)}</td>
                      <td>{c.technical.navigation_type ? NAVIGATION_LABEL[c.technical.navigation_type] : '—'}</td>
                      <td className="r nowrap">{formatRubShort(c.economics.equipment_cost)}</td>
                      <td>
                        <Chip tone={AVAIL_TONE[c.identification.availability_status]}>{AVAILABILITY_LABEL[c.identification.availability_status]}</Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ItemCard({ item: c }: { item: CatalogItem }) {
  return (
    <Link to={ROUTES.catalogItem(c.id)} className="item-card">
      <div className="item-card__img">{solutionTypeLabel(c.identification.solution_type).toUpperCase()}</div>
      <div className="stack" style={{ gap: 4 }}>
        <div className="row row--between">
          <span className="faint">{c.identification.manufacturer}</span>
          <Chip tone={AVAIL_TONE[c.identification.availability_status]}>{AVAILABILITY_LABEL[c.identification.availability_status]}</Chip>
        </div>
        <h3>{c.identification.product_name}</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          {c.identification.purpose}
        </p>
      </div>
      <div className="item-card__specs">
        <div>
          <b>{c.technical.payload_kg ? formatNumber(c.technical.payload_kg) : '—'}</b>
          <span>кг груз</span>
        </div>
        <div>
          <b>{formatNumber(c.technical.throughput_per_hour)}</b>
          <span>оп./ч</span>
        </div>
        <div>
          <b>{formatRubShort(c.economics.equipment_cost).replace(' ₽', '')}</b>
          <span>₽ за ед.</span>
        </div>
      </div>
      <span className="faint" style={{ fontSize: 12 }}>
        Данные: {CONFIDENCE_LABEL[c.data_quality.confidence].toLowerCase()}
      </span>
    </Link>
  );
}
