import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDraft, useProject } from '../../features/wizard/store';
import { VERSIONS } from '../../shared/mock/projects';
import { ROUTES } from '../../shared/config/routes';
import { formatDateTime, formatYears } from '../../shared/lib/format';
import { Alert, Button, ButtonLink, Card, Chip, MockNote, PageHeader } from '../../shared/ui';
import { ProjectBar } from '../../widgets/ProjectBar';

/** История версий: снапшоты открываются только для чтения, «сделать текущей» — копией. */
export function ProjectVersionsPage() {
  const { projectId = '' } = useParams();
  const project = useProject(projectId);
  const draft = useDraft(projectId);
  const [restored, setRestored] = useState<number | null>(null);
  const versions = project.current_version > 1 ? VERSIONS : VERSIONS.slice(-1).map((v) => ({ ...v, is_current: true }));

  return (
    <>
      <ProjectBar project={project} savedAt={draft.savedAt} />
      <div className="page">
        <PageHeader
          title="История версий"
          description="Каждая версия — снимок входных данных, подбора и сценариев. Открыв старую версию, вы увидите ровно те же данные и результат, что тогда, даже если каталог с тех пор изменился."
          actions={<MockNote />}
        />

        {restored && (
          <Alert tone="ok" title={`Создана версия ${project.current_version + 1} — копия версии ${restored}`}>
            Исходная версия не изменилась. (Заглушка: на сервер ничего не ушло.)
          </Alert>
        )}

        <Card flush>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Версия</th>
                <th>Что изменилось</th>
                <th>Автор</th>
                <th className="r">Сценариев</th>
                <th className="r">Лучшая окупаемость</th>
                <th className="r">Создана</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.version}>
                  <td>
                    <strong className="num">v{v.version}</strong>
                  </td>
                  <td>
                    <div className="row">
                      {v.summary}
                      {v.is_current && <Chip tone="ok">текущая</Chip>}
                    </div>
                  </td>
                  <td className="muted">{v.author}</td>
                  <td className="r">{v.scenarios}</td>
                  <td className="r">{formatYears(v.best_payback_years)}</td>
                  <td className="r nowrap">{formatDateTime(v.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      <ButtonLink size="sm" to={ROUTES.dashboard(projectId)} title="Для старых версий откроется снапшот только для чтения">
                        Открыть
                      </ButtonLink>
                      {!v.is_current && (
                        <Button size="sm" variant="ghost" onClick={() => setRestored(v.version)}>
                          Сделать текущей
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
