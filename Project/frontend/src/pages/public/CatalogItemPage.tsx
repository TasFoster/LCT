import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSession } from '../../features/auth/session';
import { labelOf, solutionTypeLabel } from '../../shared/dictionaries';
import { catalogById } from '../../shared/mock/catalog';
import { ACQUISITION_LABEL, AVAILABILITY_LABEL, CONFIDENCE_LABEL, NAVIGATION_LABEL, objectTypeLabel } from '../../shared/mock/dictionaries';
import { ROUTES } from '../../shared/config/routes';
import type { ObjectType } from '../../shared/types/contracts';
import { formatDate, formatNumber, formatRub } from '../../shared/lib/format';
import { ButtonLink, Card, Chip, EmptyState } from '../../shared/ui';

function v(value: number | string | null | undefined, unit?: string): ReactNode {
  if (value === null || value === undefined || value === '') return <span className="faint">нет данных</span>;
  if (typeof value === 'number') return `${formatNumber(value, 1)}${unit ? ` ${unit}` : ''}`;
  return value;
}

/** Карточка решения: все группы полей CatalogItem. */
export function CatalogItemPage() {
  const { itemId } = useParams();
  const role = useSession((s) => s.role);
  const c = catalogById(itemId ?? '');

  if (!c) {
    return (
      <div className="page">
        <Card>
          <EmptyState title="Решение не найдено" action={<ButtonLink to={ROUTES.catalog}>В каталог</ButtonLink>}>
            Возможно, позицию убрали из каталога.
          </EmptyState>
        </Card>
      </div>
    );
  }

  const id = c.identification;
  const t = c.technical;
  const inf = c.infrastructure;
  const e = c.economics;

  return (
    <div className="page">
      <nav className="faint" aria-label="Навигация">
        <Link to={ROUTES.catalog}>Каталог</Link> / {solutionTypeLabel(id.solution_type)}
      </nav>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 360px', alignItems: 'start' }}>
        <div className="stack">
          <div className="page-head__text">
            <span className="label">
              {id.manufacturer} · {id.country}
            </span>
            <h1>{id.product_name}</h1>
            <p className="muted">{id.purpose}</p>
            <div className="row" style={{ marginTop: 6 }}>
              <Chip tone={id.availability_status === 'available' ? 'ok' : 'warn'}>{AVAILABILITY_LABEL[id.availability_status]}</Chip>
              <Chip plain>{solutionTypeLabel(id.solution_type)}</Chip>
              {c.applicability.supported_object_types.map((o) => (
                <Chip key={o} plain>
                  {objectTypeLabel(o as ObjectType)}
                </Chip>
              ))}
            </div>
          </div>

          <div className="item-card__img" style={{ aspectRatio: '21 / 8' }}>
            ФОТО РЕШЕНИЯ
          </div>

          <div className="grid grid--2">
            <Card title="Технические характеристики">
              <dl className="kv">
                <dt>Грузоподъёмность</dt>
                <dd>{v(t.payload_kg, 'кг')}</dd>
                <dt>Габариты Д×Ш×В</dt>
                <dd>{v(t.dimensions_mm, '')}</dd>
                <dt>Скорость</dt>
                <dd>{v(t.speed_mps, 'м/с')}</dd>
                <dt>Производительность</dt>
                <dd>{v(t.throughput_per_hour, 'оп./ч')}</dd>
                <dt>Автономность</dt>
                <dd>{v(t.autonomy_hours, 'ч')}</dd>
                <dt>Точность позиционирования</dt>
                <dd>{v(t.positioning_accuracy_mm, 'мм')}</dd>
                <dt>Навигация</dt>
                <dd>{v(t.navigation_type ? NAVIGATION_LABEL[t.navigation_type] : null)}</dd>
                <dt>Условия эксплуатации</dt>
                <dd>{v(t.operating_conditions)}</dd>
              </dl>
            </Card>
            <Card title="Инфраструктура">
              <dl className="kv">
                <dt>Мин. ширина прохода</dt>
                <dd>{v(inf.aisle_width_mm, 'мм')}</dd>
                <dt>Зарядка</dt>
                <dd>{v(inf.charging_type)}</dd>
                <dt>Связь</dt>
                <dd>{v(inf.connectivity)}</dd>
                <dt>Интеграция</dt>
                <dd>{v(inf.integration_notes)}</dd>
                <dt>Сервис</dt>
                <dd>{v(inf.service_model)}</dd>
              </dl>
            </Card>
          </div>

          <Card title="Применимость">
            <div className="grid grid--2">
              <div className="stack stack--sm">
                <span className="label">Процессы</span>
                <div className="row">
                  {c.applicability.supported_processes.map((p) => (
                    <Chip key={p} plain>
                      {labelOf('processes', p)}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="stack stack--sm">
                <span className="label">Ограничения</span>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {c.applicability.limitations.length ? c.applicability.limitations.map((l) => <li key={l}>{l}</li>) : <li className="faint">не указаны</li>}
                </ul>
              </div>
              {c.applicability.case_studies.length > 0 && (
                <div className="stack stack--sm">
                  <span className="label">Внедрения</span>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {c.applicability.case_studies.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        </div>

        <aside className="stack" style={{ position: 'sticky', top: 'calc(var(--header-h) + 16px)' }}>
          <Card title="Экономика единицы">
            <dl className="kv" style={{ gridTemplateColumns: '1fr auto' }}>
              <dt>Оборудование</dt>
              <dd>{e.equipment_cost ? formatRub(e.equipment_cost) : '—'}</dd>
              <dt>ПО и лицензии</dt>
              <dd>{e.software_cost ? formatRub(e.software_cost) : '—'}</dd>
              <dt>Внедрение</dt>
              <dd>{e.implementation_cost ? formatRub(e.implementation_cost) : '—'}</dd>
              <dt>Обслуживание в год</dt>
              <dd>{e.maintenance_cost_per_year ? formatRub(e.maintenance_cost_per_year) : '—'}</dd>
              <dt>Срок службы</dt>
              <dd>{v(e.service_life_years, 'лет')}</dd>
              <dt>Модель</dt>
              <dd>{ACQUISITION_LABEL[e.acquisition_model]}</dd>
            </dl>
            <p className="faint" style={{ marginTop: 10 }}>
              Ориентировочно, с НДС. Точную цену даёт поставщик.
            </p>
          </Card>
          <ButtonLink to={role === 'guest' ? ROUTES.demo : ROUTES.newProject} variant="primary" size="lg" block>
            Подобрать под мой объект
          </ButtonLink>
          <div className="hint-card">
            <span className="label">Качество данных</span>
            <div className="row">
              <Chip tone={c.data_quality.confidence === 'verified' ? 'ok' : c.data_quality.confidence === 'partial' ? 'info' : 'warn'}>{CONFIDENCE_LABEL[c.data_quality.confidence]}</Chip>
            </div>
            <p className="muted">
              Источник: {c.data_quality.source}. Обновлено {formatDate(c.data_quality.last_updated)}.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
