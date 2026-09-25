import { Link } from 'react-router-dom';
import { CATALOG } from '../../shared/mock/catalog';
import { RULES, USERS } from '../../shared/mock/admin';
import { CONFIDENCE_LABEL } from '../../shared/mock/dictionaries';
import { ROUTES } from '../../shared/config/routes';
import { formatDate } from '../../shared/lib/format';
import { Card, Chip, MockNote, PageHeader, Stat } from '../../shared/ui';

const STALE_DAYS = 120;

/** Сводка админа: что в каталоге требует внимания. */
export function AdminHomePage() {
  const now = new Date('2026-09-21').getTime();
  const unverified = CATALOG.filter((c) => c.data_quality.confidence === 'unverified');
  const stale = CATALOG.filter((c) => (now - new Date(c.data_quality.last_updated).getTime()) / 86_400_000 > STALE_DAYS);
  const attention = Array.from(new Set([...unverified, ...stale]));

  return (
    <div className="page">
      <PageHeader title="Сводка" description="Состояние каталога и справочников, на которых строится подбор." actions={<MockNote />} />

      <div className="grid grid--4">
        <Stat label="Позиций в каталоге" value={CATALOG.length} sub={`${new Set(CATALOG.map((c) => c.identification.solution_type)).size} типов решений`} />
        <Stat label="Не проверено" value={unverified.length} sub="данные без подтверждения" accent={unverified.length > 0} />
        <Stat label={`Старше ${STALE_DAYS} дней`} value={stale.length} sub="пора актуализировать" />
        <Stat label="Правил совместимости" value={RULES.length} sub={`${USERS.length} пользователей`} />
      </div>

      <Card title="Требуют внимания" flush actions={<Link to={ROUTES.adminCatalog}>Весь каталог →</Link>}>
        <table className="table">
          <thead>
            <tr>
              <th>Позиция</th>
              <th>Достоверность</th>
              <th className="r">Обновлено</th>
              <th>Почему здесь</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {attention.map((c) => {
              const isStale = stale.includes(c);
              return (
                <tr key={c.id}>
                  <td>
                    <strong>{c.identification.product_name}</strong>
                    <div className="faint">{c.identification.manufacturer}</div>
                  </td>
                  <td>
                    <Chip tone={c.data_quality.confidence === 'unverified' ? 'warn' : 'info'}>{CONFIDENCE_LABEL[c.data_quality.confidence]}</Chip>
                  </td>
                  <td className="r">{formatDate(c.data_quality.last_updated)}</td>
                  <td className="muted">
                    {[c.data_quality.confidence === 'unverified' && 'данные не проверены', isStale && 'давно не обновлялось'].filter(Boolean).join(', ')}
                  </td>
                  <td className="r">
                    <Link to={ROUTES.adminCatalogItem(c.id)}>Открыть</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <p className="faint">Изменения каталога влияют на новые подборы, но не на сохранённые версии проектов — там снапшоты.</p>
    </div>
  );
}
