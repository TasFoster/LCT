import { Link, useParams } from 'react-router-dom';
import { Placeholder } from '../../shared/ui/Placeholder';
import { ROUTES } from '../../shared/config/routes';

export function ProjectsListPage() {
  return (
    <Placeholder
      title="Мои проекты"
      purpose="Список проектов владельца: название, тип объекта, статус, дата изменения, лучший срок окупаемости."
      contracts={['ProjectRecord']}
    >
      <p>
        <Link to={ROUTES.newProject}>Новый проект</Link> ·{' '}
        <Link to={ROUTES.project('demo')}>Открыть демо-проект</Link>
      </p>
    </Placeholder>
  );
}

export function NewProjectPage() {
  return (
    <Placeholder
      title="Новый проект"
      purpose="Название и тип объекта — дальше сразу шаг 2 визарда."
      contracts={['ProjectRecord']}
    />
  );
}

export function ProjectOverviewPage() {
  const { projectId = 'demo' } = useParams();
  return (
    <Placeholder
      title="Обзор проекта"
      purpose="Хаб проекта: статус, прогресс по шагам, краткие KPI, версии."
      contracts={['ProjectRecord']}
    >
      <p>
        <Link to={ROUTES.wizardStep(projectId, 'object')}>Продолжить визард</Link> ·{' '}
        <Link to={ROUTES.dashboard(projectId)}>Дашборд</Link> ·{' '}
        <Link to={ROUTES.versions(projectId)}>Версии</Link>
      </p>
    </Placeholder>
  );
}

export function ProjectVersionsPage() {
  return (
    <Placeholder
      title="История версий"
      purpose="Снапшоты расчёта: открыть версию только для чтения или сделать её текущей копией."
      contracts={['ProjectVersion']}
    />
  );
}

export function ProjectDashboardPage() {
  return (
    <Placeholder
      title="Итоговый дашборд"
      purpose="Сравнение сценариев, чувствительность, допущения, экспорт."
      contracts={['EconomicsResult']}
    >
      <p>
        Макет готов: <Link to={ROUTES.wireframeDashboard}>вайрфрейм дашборда</Link>
      </p>
    </Placeholder>
  );
}

export function ProjectReportPage() {
  return (
    <Placeholder
      title="Отчёт"
      purpose="Печатная вёрстка того, что уходит в PDF."
      contracts={['ProjectVersion']}
    />
  );
}

export function ProfilePage() {
  return <Placeholder title="Профиль" purpose="Имя, e-mail, смена пароля, организация." />;
}
