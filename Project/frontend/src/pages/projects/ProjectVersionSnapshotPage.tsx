import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getVersion } from '../../features/projectApi';
import type { VersionDetail } from '../../features/projectApi';
import { useProject } from '../../features/wizard/store';
import { ROUTES } from '../../shared/config/routes';
import { objectTypeLabel } from '../../shared/mock/dictionaries';
import { formatDateTime } from '../../shared/lib/format';
import { Alert, ButtonLink, Card, PageHeader } from '../../shared/ui';
import { ProjectBar } from '../../widgets/ProjectBar';
import type { ObjectType, Scene } from '../../shared/types/contracts';

type InputSnapshot = Record<string, unknown> & { object_type?: ObjectType };

function formatSnapshotValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'boolean') return value ? 'да' : 'нет';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Снимок версии — только чтение. Показывает ровно то, что реально лежит в
 * БД на момент сохранения этой версии (contract 9: `project_versions`), без
 * подбора/сценариев — они не версионируются (matching и economics в этом
 * репозитории считаются без сохранения состояния, см. db/storage.py).
 */
export function ProjectVersionSnapshotPage() {
  const { projectId = '', version: versionParam = '' } = useParams();
  const version = Number(versionParam);
  const project = useProject(projectId);
  const [detail, setDetail] = useState<VersionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDetail(null);
    setError(null);
    getVersion(projectId, version)
      .then(setDetail)
      .catch(() => setError('Не удалось открыть версию — возможно, у вас нет доступа к этому проекту, или эта версия существует только в демонстрационных данных.'));
  }, [projectId, version]);

  const input = detail?.input as InputSnapshot | null | undefined;
  const scene = detail?.scene as Scene | null | undefined;

  return (
    <>
      <ProjectBar project={project} />
      <div className="page">
        <PageHeader
          eyebrow={`Версия ${versionParam} · только чтение`}
          title={project.name}
          description={detail ? `Сохранено ${formatDateTime(detail.created_at)}${detail.comment ? ` — ${detail.comment}` : ''}` : undefined}
          actions={<ButtonLink to={ROUTES.versions(projectId)}>← Все версии</ButtonLink>}
        />

        {error && <Alert tone="danger" title="Не удалось открыть версию">{error}</Alert>}
        {!error && !detail && <p className="muted">Загрузка…</p>}

        {detail && (
          <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
            <Card title="Входные параметры">
              {input ? (
                <div className="stack">
                  <p className="muted">Тип объекта: {input.object_type ? objectTypeLabel(input.object_type) : '—'}</p>
                  <div className="table-wrap">
                    <table className="table">
                      <tbody>
                        {Object.entries(input)
                          .filter(([key]) => key !== 'object_type')
                          .map(([key, value]) => (
                            <tr key={key}>
                              <td className="muted">{key}</td>
                              <td className="r num">{formatSnapshotValue(value)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="muted">Параметры ещё не были сохранены на момент этой версии.</p>
              )}
            </Card>

            <Card title="План объекта">
              {scene ? (
                <div className="stack stack--sm">
                  <div className="row row--between">
                    <span className="muted">Площадка</span>
                    <span className="num">
                      {scene.site.width} × {scene.site.height} м
                    </span>
                  </div>
                  <div className="row row--between">
                    <span className="muted">Стены</span>
                    <span className="num">{scene.walls.length}</span>
                  </div>
                  <div className="row row--between">
                    <span className="muted">Зоны</span>
                    <span className="num">{scene.zones.length}</span>
                  </div>
                  <div className="row row--between">
                    <span className="muted">Точки операций</span>
                    <span className="num">{scene.operation_points.length}</span>
                  </div>
                  <div className="row row--between">
                    <span className="muted">Точки зарядки</span>
                    <span className="num">{scene.charging_points.length}</span>
                  </div>
                  <div className="row row--between">
                    <span className="muted">Маршруты</span>
                    <span className="num">{scene.routes.length}</span>
                  </div>
                  <div className="row row--between">
                    <span className="muted">Роботы</span>
                    <span className="num">{scene.robots.length}</span>
                  </div>
                </div>
              ) : (
                <p className="muted">План ещё не был сохранён на момент этой версии.</p>
              )}
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
