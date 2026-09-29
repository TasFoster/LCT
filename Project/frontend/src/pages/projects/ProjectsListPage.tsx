import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OBJECT_ICON, PROJECTS } from '../../shared/mock/projects';
import type { ProjectListItem } from '../../shared/mock/projects';
import { listProjects } from '../../features/projectApi';
import type { ProjectState } from '../../shared/api/projectState';
import { OBJECT_TYPES, PROJECT_STATUS_LABEL, objectTypeLabel } from '../../shared/mock/dictionaries';
import { ROUTES, WIZARD_STEPS } from '../../shared/config/routes';
import type { WizardStepSlug } from '../../shared/config/routes';
import type { ObjectType, ProjectStatus } from '../../shared/types/contracts';
import { formatDate, formatYears, pluralize } from '../../shared/lib/format';
import { Alert, Button, ButtonLink, Card, Chip, EmptyState, PageHeader, Progress, Segmented } from '../../shared/ui';
import type { Tone } from '../../shared/ui';

const STATUS_TONE: Record<ProjectStatus, Tone> = { draft: 'warn', calculated: 'ok', archived: 'neutral' };
type StatusFilter = 'active' | ProjectStatus;
type Sort = 'updated' | 'name' | 'payback';

/** Реальный ProjectState (contract 9, минимальный срез) не несёт last_step/
 * best_payback_years/scenarios_count — подбор и экономика в этом репозитории
 * без сохранения состояния, сервер их не знает. Честные заглушки вместо
 * выдуманных чисел: последний шаг — по факту того, что реально сохранено. */
function realToListItem(s: ProjectState): ProjectListItem {
  const lastStep: WizardStepSlug = s.scene.state !== 'missing' ? 'topology' : s.input.state !== 'missing' ? 'params' : 'object';
  return {
    id: s.project_id,
    owner_user_id: 'me',
    name: s.name,
    object_type: s.object_type,
    status: s.status,
    created_at: s.created_at,
    updated_at: s.updated_at,
    current_version: s.current_version,
    last_step: lastStep,
    best_payback_years: null,
    scenarios_count: 0,
    site: s.site ?? '',
  };
}

export function ProjectsListPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('active');
  const [type, setType] = useState<'all' | ObjectType>('all');
  const [sort, setSort] = useState<Sort>('updated');
  const [projects, setProjects] = useState<ProjectListItem[]>(PROJECTS);
  const [realIds, setRealIds] = useState<ReadonlySet<string>>(() => new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const realProjectsApplied = useRef(false);

  // Реальные проекты (этот владелец, X-User-Id) — впереди демо-карточек, не вместо них:
  // старые демо-id (p-old-kazan и т.п.) никогда не создавались через POST /api/projects
  // и по ним ничего не сохранить, но их удобно оставить для показа интерфейса. Флаг
  // вместо голого useEffect(..., []) — StrictMode вызывает эффект дважды на монтировании,
  // без него список из POST /api/projects задваивался бы (дубли ключей в таблице).
  useEffect(() => {
    listProjects()
      .then((real) => {
        if (realProjectsApplied.current) return;
        realProjectsApplied.current = true;
        setProjects((prev) => [...real.map(realToListItem), ...prev]);
        setRealIds(new Set(real.map((r) => r.project_id)));
      })
      .catch(() => setLoadError('Не удалось загрузить сохранённые проекты — показаны только демонстрационные.'));
  }, []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects
      .filter((p) => (status === 'active' ? p.status !== 'archived' : p.status === status))
      .filter((p) => type === 'all' || p.object_type === type)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.site.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name, 'ru');
        if (sort === 'payback') return (a.best_payback_years ?? Infinity) - (b.best_payback_years ?? Infinity);
        return b.updated_at.localeCompare(a.updated_at);
      });
  }, [projects, query, status, type, sort]);

  const counts = {
    active: projects.filter((p) => p.status !== 'archived').length,
    draft: projects.filter((p) => p.status === 'draft').length,
    calculated: projects.filter((p) => p.status === 'calculated').length,
    archived: projects.filter((p) => p.status === 'archived').length,
  };

  const archive = (id: string) =>
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, status: p.status === 'archived' ? 'draft' : 'archived' } : p)));

  const duplicate = (p: ProjectListItem) =>
    setProjects((ps) => [{ ...p, id: `${p.id}-copy-${ps.length}`, name: `${p.name} (копия)`, status: 'draft', current_version: 1, updated_at: new Date().toISOString() }, ...ps]);

  return (
    <div className="page">
      <PageHeader
        title="Мои проекты"
        description={`${counts.active} ${pluralize(counts.active, ['активный проект', 'активных проекта', 'активных проектов'])}: ${counts.calculated} рассчитано, ${counts.draft} в работе.`}
        actions={
          <ButtonLink to={ROUTES.newProject} variant="primary">
            + Новый проект
          </ButtonLink>
        }
      />

      {loadError && <Alert tone="warn" title={loadError} />}

      <div className="row row--between">
        <Segmented<StatusFilter>
          label="Статус"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'active', label: `Активные · ${counts.active}` },
            { value: 'draft', label: `Черновики · ${counts.draft}` },
            { value: 'calculated', label: `Рассчитаны · ${counts.calculated}` },
            { value: 'archived', label: `Архив · ${counts.archived}` },
          ]}
        />
        <div className="row">
          <div className="control" style={{ width: 280 }}>
            <span className="control__icon" aria-hidden>
              ⌕
            </span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по названию или площадке" aria-label="Поиск проектов" />
          </div>
          <div className="control" style={{ width: 180 }}>
            <select value={type} onChange={(e) => setType(e.target.value as 'all' | ObjectType)} aria-label="Тип объекта">
              <option value="all">Все типы объектов</option>
              {OBJECT_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="control" style={{ width: 210 }}>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Сортировка">
              <option value="updated">Сначала недавние</option>
              <option value="name">По названию</option>
              <option value="payback">По сроку окупаемости</option>
            </select>
          </div>
        </div>
      </div>

      <Card flush>
        {list.length === 0 ? (
          <EmptyState
            title={query ? 'Ничего не нашлось' : 'Здесь пока пусто'}
            action={
              query ? (
                <Button onClick={() => setQuery('')}>Сбросить поиск</Button>
              ) : (
                <ButtonLink to={ROUTES.newProject} variant="primary">
                  Создать проект
                </ButtonLink>
              )
            }
          >
            {query ? `По запросу «${query}» проектов нет.` : 'Создайте проект — визард проведёт по восьми шагам от параметров объекта до экономики.'}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Проект</th>
                  <th>Тип</th>
                  <th>Статус</th>
                  <th style={{ width: 170 }}>Прогресс</th>
                  <th className="r">Лучшая окупаемость</th>
                  <th className="r">Изменён</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const stepIndex = WIZARD_STEPS.findIndex((s) => s.slug === p.last_step);
                  const done = p.status === 'draft' ? stepIndex : WIZARD_STEPS.length;
                  return (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(ROUTES.project(p.id))}>
                      <td>
                        <div className="row" style={{ flexWrap: 'nowrap', gap: 12 }}>
                          <span className="avatar" aria-hidden style={{ borderRadius: 8 }}>
                            {OBJECT_ICON[p.object_type]}
                          </span>
                          <div className="stack" style={{ gap: 0 }}>
                            <Link to={ROUTES.project(p.id)} onClick={(e) => e.stopPropagation()} style={{ color: 'var(--ink)', fontWeight: 600 }}>
                              {p.name}
                            </Link>
                            <span className="faint">{p.site}</span>
                          </div>
                        </div>
                      </td>
                      <td>{objectTypeLabel(p.object_type)}</td>
                      <td>
                        <Chip tone={STATUS_TONE[p.status]}>{PROJECT_STATUS_LABEL[p.status]}</Chip>
                      </td>
                      <td>
                        <div className="stack" style={{ gap: 4 }}>
                          <Progress value={(done / WIZARD_STEPS.length) * 100} tone={done === WIZARD_STEPS.length ? 'ok' : undefined} />
                          <span className="faint num" style={{ fontSize: 12 }}>
                            {done === WIZARD_STEPS.length ? 'все шаги пройдены' : `шаг ${stepIndex + 1}: ${WIZARD_STEPS[stepIndex].title.toLowerCase()}`}
                          </span>
                        </div>
                      </td>
                      <td className="r">{p.best_payback_years === null ? <span className="faint">ещё не считали</span> : formatYears(p.best_payback_years)}</td>
                      <td className="r nowrap">{formatDate(p.updated_at)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="table-actions">
                          {p.status === 'calculated' && (
                            <ButtonLink size="sm" to={ROUTES.dashboard(p.id)}>
                              Дашборд
                            </ButtonLink>
                          )}
                          {/* «Копия»/«В архив» — для сохранённых проектов бэкенд пока не умеет
                              ни то, ни другое (нет эндпоинтов статуса/дублирования, см. api/projects.py):
                              честнее не показывать действие, которое не переживёт обновление страницы,
                              чем притвориться, что оно сохраняется. */}
                          {!realIds.has(p.id) && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => duplicate(p)} title="Создать копию проекта">
                                Копия
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => archive(p.id)}>
                                {p.status === 'archived' ? 'Вернуть' : 'В архив'}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
