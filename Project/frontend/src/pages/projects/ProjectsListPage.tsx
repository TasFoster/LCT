import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OBJECT_ICON, PROJECTS } from '../../shared/mock/projects';
import type { ProjectListItem } from '../../shared/mock/projects';
import { OBJECT_TYPES, PROJECT_STATUS_LABEL, objectTypeLabel } from '../../shared/mock/dictionaries';
import { ROUTES, WIZARD_STEPS } from '../../shared/config/routes';
import type { ObjectType, ProjectStatus } from '../../shared/types/contracts';
import { formatDate, formatYears, pluralize } from '../../shared/lib/format';
import { Button, ButtonLink, Card, Chip, EmptyState, MockNote, PageHeader, Progress, Segmented } from '../../shared/ui';
import type { Tone } from '../../shared/ui';

const STATUS_TONE: Record<ProjectStatus, Tone> = { draft: 'warn', calculated: 'ok', archived: 'neutral' };
type StatusFilter = 'active' | ProjectStatus;
type Sort = 'updated' | 'name' | 'payback';

export function ProjectsListPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('active');
  const [type, setType] = useState<'all' | ObjectType>('all');
  const [sort, setSort] = useState<Sort>('updated');
  const [projects, setProjects] = useState<ProjectListItem[]>(PROJECTS);

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
          <>
            <MockNote />
            <ButtonLink to={ROUTES.newProject} variant="primary">
              + Новый проект
            </ButtonLink>
          </>
        }
      />

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
                          <Button size="sm" variant="ghost" onClick={() => duplicate(p)} title="Создать копию проекта">
                            Копия
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => archive(p.id)}>
                            {p.status === 'archived' ? 'Вернуть' : 'В архив'}
                          </Button>
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
