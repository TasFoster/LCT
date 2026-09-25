import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CATALOG } from '../../shared/mock/catalog';
import { AVAILABILITY_LABEL, CONFIDENCE_LABEL, SOLUTION_TYPES } from '../../shared/mock/dictionaries';
import { ROUTES } from '../../shared/config/routes';
import type { DataConfidence } from '../../shared/mock/dictionaries';
import { formatDate, formatNumber, formatRubShort } from '../../shared/lib/format';
import { Alert, Button, ButtonLink, Card, Chip, MockNote, PageHeader } from '../../shared/ui';
import { solutionTypeLabel } from '../../shared/dictionaries';

/** Каталог для администратора: таблица, фильтры, массовые действия, импорт. */
export function AdminCatalogPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [confidence, setConfidence] = useState<'' | DataConfidence>('');
  const [checked, setChecked] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const list = useMemo(
    () =>
      CATALOG.filter((c) => {
        const q = query.trim().toLowerCase();
        if (q && !`${c.identification.product_name} ${c.identification.manufacturer} ${c.id}`.toLowerCase().includes(q)) return false;
        if (type && c.identification.solution_type !== type) return false;
        if (confidence && c.data_quality.confidence !== confidence) return false;
        return true;
      }),
    [query, type, confidence],
  );

  const allChecked = list.length > 0 && list.every((c) => checked.includes(c.id));

  return (
    <div className="page" style={{ maxWidth: 'none' }}>
      <PageHeader
        title="Позиции каталога"
        description="Всё, из чего строится подбор. Правка позиции влияет на новые расчёты, но не на сохранённые версии проектов."
        actions={
          <>
            <MockNote />
            <Button onClick={() => setNote('Импорт CSV/Excel появится с бэкендом. Формат шаблона — по группам полей CatalogItem.')}>Импорт CSV / Excel</Button>
            <Button onClick={() => setNote('Экспорт появится с бэкендом.')}>Экспорт</Button>
            <ButtonLink to={ROUTES.adminCatalogItem('new')} variant="primary">
              + Добавить позицию
            </ButtonLink>
          </>
        }
      />

      {note && <Alert tone="info" title={note} action={<Button size="sm" variant="ghost" onClick={() => setNote(null)}>Закрыть</Button>} />}

      <div className="row row--between">
        <div className="row">
          <div className="control" style={{ width: 280 }}>
            <span className="control__icon" aria-hidden>
              ⌕
            </span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Модель, производитель, id" aria-label="Поиск" />
          </div>
          <div className="control" style={{ width: 220 }}>
            <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Тип решения">
              <option value="">Все типы решений</option>
              {SOLUTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="control" style={{ width: 200 }}>
            <select value={confidence} onChange={(e) => setConfidence(e.target.value as '' | DataConfidence)} aria-label="Достоверность">
              <option value="">Любая достоверность</option>
              {(Object.keys(CONFIDENCE_LABEL) as DataConfidence[]).map((k) => (
                <option key={k} value={k}>
                  {CONFIDENCE_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
        </div>
        {checked.length > 0 && (
          <div className="row">
            <span className="muted num">Выбрано: {checked.length}</span>
            <Button size="sm" onClick={() => setNote(`${checked.length} поз. отмечены как проверенные (заглушка)`)}>
              Отметить проверенными
            </Button>
            <Button size="sm" variant="danger" onClick={() => setNote(`${checked.length} поз. сняты с публикации (заглушка)`)}>
              Снять с публикации
            </Button>
          </div>
        )}
      </div>

      <Card flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" aria-label="Выбрать все" checked={allChecked} onChange={(e) => setChecked(e.target.checked ? list.map((c) => c.id) : [])} style={{ accentColor: 'var(--accent)' }} />
                </th>
                <th>Позиция</th>
                <th>Тип</th>
                <th className="r">Груз, кг</th>
                <th className="r">Цена</th>
                <th>Наличие</th>
                <th>Достоверность</th>
                <th className="r">Обновлено</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className={checked.includes(c.id) ? 'is-selected' : undefined} style={{ cursor: 'pointer' }} onClick={() => navigate(ROUTES.adminCatalogItem(c.id))}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Выбрать ${c.identification.product_name}`}
                      checked={checked.includes(c.id)}
                      onChange={(e) => setChecked((xs) => (e.target.checked ? [...xs, c.id] : xs.filter((x) => x !== c.id)))}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                  </td>
                  <td>
                    <strong>{c.identification.product_name}</strong>
                    <div className="faint mono">{c.id}</div>
                  </td>
                  <td>{solutionTypeLabel(c.identification.solution_type)}</td>
                  <td className="r">{formatNumber(c.technical.payload_kg)}</td>
                  <td className="r nowrap">{formatRubShort(c.economics.equipment_cost)}</td>
                  <td>{AVAILABILITY_LABEL[c.identification.availability_status]}</td>
                  <td>
                    <Chip tone={c.data_quality.confidence === 'verified' ? 'ok' : c.data_quality.confidence === 'partial' ? 'info' : 'warn'}>{CONFIDENCE_LABEL[c.data_quality.confidence]}</Chip>
                  </td>
                  <td className="r nowrap">{formatDate(c.data_quality.last_updated)}</td>
                  <td className="r" onClick={(e) => e.stopPropagation()}>
                    <Link to={ROUTES.adminCatalogItem(c.id)}>Изменить</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
