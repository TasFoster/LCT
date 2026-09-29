import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDraft, useProject } from '../../features/wizard/store';
import { VERSIONS } from '../../shared/mock/projects';
import { listVersions, promoteVersion, useProjectState } from '../../features/projectApi';
import type { VersionSummary } from '../../features/projectApi';
import { ROUTES } from '../../shared/config/routes';
import { formatDateTime, formatYears } from '../../shared/lib/format';
import { Alert, Button, ButtonLink, Card, Chip, PageHeader } from '../../shared/ui';
import { ProjectBar } from '../../widgets/ProjectBar';

interface VersionRow {
  version: number;
  created_at: string;
  author: string;
  summary: string;
  scenarios: number | null;
  best_payback_years: number | null;
  is_current: boolean;
}

/** История версий: снапшоты открываются только для чтения, «сделать текущей» — копией. */
export function ProjectVersionsPage() {
  const { projectId = '' } = useParams();
  const project = useProject(projectId);
  const draft = useDraft(projectId);
  const server = useProjectState(projectId);
  const [restored, setRestored] = useState<number | null>(null);
  const [realVersions, setRealVersions] = useState<VersionSummary[] | null>(null);
  const [promoting, setPromoting] = useState<number | null>(null);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  // Реальные версии есть только для проектов, созданных через POST /api/projects
  // (см. StepExport.tsx «Сохранить версию»). Для демо-карточек из старого мока
  // (p-old-kazan и т.п.) запрос закономерно не найдёт проект — тогда показываем
  // прежние иллюстративные VERSIONS, а не пустой список/ошибку.
  const reload = () => listVersions(projectId).then(setRealVersions).catch(() => setRealVersions(null));
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const promote = async (version: number) => {
    if (!server) return;
    setPromoting(version);
    setPromoteError(null);
    setRestored(null);
    try {
      const res = await promoteVersion(projectId, version, server.revision);
      if (res.status === 201) {
        await reload();
        setRestored(version);
      } else if (res.status === 409) {
        setPromoteError('Проект изменили в другой вкладке — обновите страницу и попробуйте снова');
      } else if (res.status === 403) {
        setPromoteError('Этот проект принадлежит другому пользователю');
      } else {
        setPromoteError(res.body.detail);
      }
    } catch {
      setPromoteError(`Не удалось сделать версию ${version} текущей — проверьте, что сервер запущен`);
    } finally {
      setPromoting(null);
    }
  };

  const versions: VersionRow[] =
    realVersions !== null
      ? realVersions.length > 0
        ? realVersions.map((v, i) => ({
            version: v.version,
            created_at: v.created_at,
            author: '—',
            summary: v.comment || 'Без комментария',
            scenarios: null,
            best_payback_years: null,
            is_current: i === 0,
          }))
        : [{ version: 1, created_at: project.created_at, author: '—', summary: 'Текущее состояние — версия ещё не сохранялась', scenarios: null, best_payback_years: null, is_current: true }]
      : project.current_version > 1
        ? VERSIONS
        : VERSIONS.slice(-1).map((v) => ({ ...v, is_current: true }));

  return (
    <>
      <ProjectBar project={project} savedAt={draft.savedAt} />
      <div className="page">
        <PageHeader
          title="История версий"
          description={
            realVersions !== null
              ? 'Каждая версия — снимок сохранённых параметров и плана на момент нажатия «Сохранить версию» (шаг 8).'
              : 'Каждая версия — снимок входных данных, подбора и сценариев. Открыв старую версию, вы увидите ровно те же данные и результат, что тогда, даже если каталог с тех пор изменился.'
          }
        />

        {restored && (
          <Alert tone="ok" title={`Создана новая версия — копия версии ${restored}`}>
            Исходная версия {restored} не изменилась — историю нельзя переписать, только скопировать вперёд.
          </Alert>
        )}
        {promoteError && <Alert tone="danger" title="Не удалось восстановить версию">{promoteError}</Alert>}

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
                  <td className="r">{v.scenarios ?? '—'}</td>
                  <td className="r">{formatYears(v.best_payback_years)}</td>
                  <td className="r nowrap">{formatDateTime(v.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      {realVersions !== null ? (
                        <ButtonLink size="sm" to={ROUTES.versionSnapshot(projectId, v.version)}>
                          Открыть
                        </ButtonLink>
                      ) : (
                        <ButtonLink size="sm" to={ROUTES.dashboard(projectId)} title="Иллюстративные версии — снапшота нет, показан текущий дашборд">
                          Открыть
                        </ButtonLink>
                      )}
                      {!v.is_current && realVersions !== null && (
                        <Button size="sm" variant="ghost" onClick={() => void promote(v.version)} disabled={promoting !== null || !server}>
                          {promoting === v.version ? 'Восстанавливаем…' : 'Сделать текущей'}
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
