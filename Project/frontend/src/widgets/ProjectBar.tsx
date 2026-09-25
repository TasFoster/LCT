import { Link, NavLink } from 'react-router-dom';
import { ROUTES } from '../shared/config/routes';
import { PROJECT_STATUS_LABEL, objectTypeLabel } from '../shared/mock/dictionaries';
import type { ProjectListItem } from '../shared/mock/projects';
import { formatTime } from '../shared/lib/format';
import { Chip } from '../shared/ui';
import type { Tone } from '../shared/ui';

const STATUS_TONE: Record<ProjectListItem['status'], Tone> = {
  draft: 'warn',
  calculated: 'ok',
  archived: 'neutral',
};

interface ProjectBarProps {
  project: ProjectListItem;
  savedAt?: string | null;
  isDemo?: boolean;
}

/** Контекстная полоса проекта: где я, в каком состоянии проект, куда можно уйти. */
export function ProjectBar({ project, savedAt, isDemo }: ProjectBarProps) {
  if (isDemo) {
    return (
      <div className="projectbar">
        <span className="projectbar__name">Демо-расчёт</span>
        <Chip tone="info">без сохранения</Chip>
        <span>Данные хранятся только в этой вкладке браузера</span>
        <div className="projectbar__right">
          <Link to={ROUTES.register} className="btn btn--primary btn--sm">
            Зарегистрироваться и сохранить
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="projectbar">
      <Link to={ROUTES.projects} className="btn btn--ghost btn--sm">
        ‹ Мои проекты
      </Link>
      <span className="projectbar__sep" />
      <span className="projectbar__name">{project.name}</span>
      <span>{objectTypeLabel(project.object_type)}</span>
      <Chip tone={STATUS_TONE[project.status]}>{PROJECT_STATUS_LABEL[project.status]}</Chip>
      <span className="num">версия {project.current_version}</span>
      {savedAt && <span className="faint">сохранено в {formatTime(new Date(savedAt))}</span>}
      <div className="projectbar__right">
        <NavLink to={ROUTES.project(project.id)} end className="btn btn--ghost btn--sm">
          Обзор
        </NavLink>
        <NavLink to={ROUTES.wizard(project.id)} className="btn btn--ghost btn--sm">
          Визард
        </NavLink>
        <NavLink to={ROUTES.dashboard(project.id)} className="btn btn--ghost btn--sm">
          Дашборд
        </NavLink>
        <NavLink to={ROUTES.versions(project.id)} className="btn btn--ghost btn--sm">
          Версии
        </NavLink>
      </div>
    </div>
  );
}
