import { useState } from 'react';
import { ASSUMPTIONS, DICTIONARY_GROUPS, USERS } from '../../shared/mock/admin';
import type { AdminUser } from '../../shared/mock/admin';
import {
  AIRPORT_ZONES,
  FACILITY_TYPES,
  LAYOUT_CONSTRAINTS,
  OPERATING_MODES,
  PROCESSES,
  SAFETY_REQUIREMENTS,
  SANITARY_REQUIREMENTS,
  SOLUTION_TYPES,
  STORAGE_TYPES,
  WAREHOUSE_ZONES,
} from '../../shared/mock/dictionaries';
import { formatDateTime } from '../../shared/lib/format';
import { Alert, Button, Card, Chip, MockNote, NumberField, PageHeader } from '../../shared/ui';

const asLabels = (xs: readonly (string | { label: string })[]) => xs.map((x) => (typeof x === 'string' ? x : x.label));

/** Показываем подписи из единого справочника contracts/dictionaries/categories.json. */
const DICT_VALUES: Record<string, readonly string[]> = {
  solution_types: asLabels(SOLUTION_TYPES),
  processes: asLabels(PROCESSES),
  operating_modes: OPERATING_MODES,
  storage_types: asLabels(STORAGE_TYPES),
  warehouse_zones: asLabels(WAREHOUSE_ZONES),
  layout_constraints: asLabels(LAYOUT_CONSTRAINTS),
  airport_zones: asLabels(AIRPORT_ZONES),
  safety: asLabels(SAFETY_REQUIREMENTS),
  facility_types: asLabels(FACILITY_TYPES),
  sanitary: asLabels(SANITARY_REQUIREMENTS),
};

/** Справочники: список групп слева, значения выбранной группы справа. */
export function AdminDictionariesPage() {
  const [groupKey, setGroupKey] = useState<string>(DICTIONARY_GROUPS[0].key);
  const [values, setValues] = useState<Record<string, string[]>>(() => Object.fromEntries(Object.entries(DICT_VALUES).map(([k, v]) => [k, [...v]])));
  const [draft, setDraft] = useState('');
  const group = DICTIONARY_GROUPS.find((g) => g.key === groupKey)!;
  const items = values[groupKey] ?? [];

  const add = () => {
    const v = draft.trim();
    if (!v || items.includes(v)) return;
    setValues((all) => ({ ...all, [groupKey]: [...items, v] }));
    setDraft('');
  };

  return (
    <div className="page">
      <PageHeader title="Справочники" description="Значения для выпадающих списков в формах и для правил совместимости." actions={<MockNote />} />
      <div className="grid" style={{ gridTemplateColumns: '300px minmax(0, 1fr)', alignItems: 'start' }}>
        <Card flush>
          <div className="sections-nav" style={{ padding: 8 }}>
            {DICTIONARY_GROUPS.map((g) => (
              <a
                key={g.key}
                href={`#${g.key}`}
                onClick={(e) => {
                  e.preventDefault();
                  setGroupKey(g.key);
                }}
                style={g.key === groupKey ? { background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 500 } : undefined}
              >
                <span>{g.title}</span>
                <span className="num faint">{values[g.key]?.length ?? 0}</span>
              </a>
            ))}
          </div>
        </Card>

        <Card title={group.title} actions={<span className="faint">используется: {group.usedIn}</span>}>
          <div className="stack">
            <div className="stack stack--sm">
              {items.map((v, i) => (
                <div key={v} className="row row--between" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                  <span>
                    <span className="faint num" style={{ display: 'inline-block', width: 28 }}>
                      {i + 1}
                    </span>
                    {v}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setValues((all) => ({ ...all, [groupKey]: items.filter((x) => x !== v) }))} aria-label={`Удалить «${v}»`}>
                    Удалить
                  </Button>
                </div>
              ))}
            </div>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <div className="control" style={{ flex: 1 }}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Новое значение" aria-label="Новое значение справочника" />
              </div>
              <Button onClick={add} disabled={!draft.trim()}>
                Добавить
              </Button>
            </div>
            <p className="faint">Удаление значения не меняет сохранённые проекты — в них остаётся прежний текст.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

/** Дефолтные допущения экономики — подставляются во все новые расчёты. */
export function AdminAssumptionsPage() {
  const [values, setValues] = useState<Record<string, number | null>>(() => Object.fromEntries(ASSUMPTIONS.map((a) => [a.key, a.value])));
  const [saved, setSaved] = useState(false);
  const horizonError = (values.horizon_years ?? 0) < 5 ? 'По ТЗ горизонт не меньше 5 лет' : null;
  const loadError = values.load_factor !== null && (values.load_factor! <= 0 || values.load_factor! > 1) ? 'От 0 до 1' : null;

  return (
    <div className="page page--narrow">
      <PageHeader
        title="Допущения расчёта"
        description="Значения по умолчанию для новых расчётов. Пользователь может переопределить их в своём сценарии; в каждом результате допущения показываются явно."
        actions={<MockNote />}
      />
      {saved && <Alert tone="ok" title="Сохранено">Новые значения применятся к следующим расчётам. Сохранённые версии проектов не пересчитываются.</Alert>}
      <Card
        footer={
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="primary" disabled={Boolean(horizonError || loadError)} onClick={() => setSaved(true)}>
              Сохранить
            </Button>
          </div>
        }
      >
        <div className="form-grid">
          {ASSUMPTIONS.map((a) => (
            <NumberField
              key={a.key}
              label={a.label}
              unit={a.unit}
              hint={a.hint}
              value={values[a.key]}
              error={a.key === 'horizon_years' ? horizonError : a.key === 'load_factor' ? loadError : null}
              onChange={(v) => {
                setSaved(false);
                setValues((all) => ({ ...all, [a.key]: v }));
              }}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

/** Пользователи: роли и блокировка. */
export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>(USERS);
  const patch = (id: string, p: Partial<AdminUser>) => setUsers((us) => us.map((u) => (u.id === id ? { ...u, ...p } : u)));

  return (
    <div className="page">
      <PageHeader title="Пользователи" description="Проекты пользователей администратору не видны — только учётные записи и роли." actions={<MockNote />} />
      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Организация</th>
              <th>Роль</th>
              <th className="r">Проектов</th>
              <th className="r">Последний вход</th>
              <th>Статус</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.blocked ? 'is-muted' : undefined}>
                <td>
                  <strong>{u.name}</strong>
                  <div className="faint">{u.email}</div>
                </td>
                <td>{u.organization}</td>
                <td>
                  <div className="control" style={{ height: 30, width: 150 }}>
                    <select value={u.role} onChange={(e) => patch(u.id, { role: e.target.value as AdminUser['role'] })} aria-label={`Роль ${u.name}`}>
                      <option value="user">Пользователь</option>
                      <option value="admin">Администратор</option>
                    </select>
                  </div>
                </td>
                <td className="r">{u.projects}</td>
                <td className="r nowrap">{formatDateTime(u.last_seen)}</td>
                <td>{u.blocked ? <Chip tone="danger">Заблокирован</Chip> : <Chip tone="ok">Активен</Chip>}</td>
                <td className="r">
                  <Button size="sm" variant={u.blocked ? 'secondary' : 'danger'} onClick={() => patch(u.id, { blocked: !u.blocked })}>
                    {u.blocked ? 'Разблокировать' : 'Заблокировать'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
