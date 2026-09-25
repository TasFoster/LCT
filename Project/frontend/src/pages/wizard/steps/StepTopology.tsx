import { useEffect, useMemo, useRef, useState } from 'react';
import { saveScene, uploadBackground, useApiLog, useProjectState } from '../../../features/projectApi';
import { autoLayout, estimateSize } from '../../../features/planEditor/autoLayout';
import { PlanEditorStub } from '../../../features/planEditor/PlanEditorStub';
import type { PlanEditorContext } from '../../../features/planEditor/types';
import { CATEGORIES } from '../../../shared/dictionaries';
import { catalogById } from '../../../shared/mock/catalog';
import type { FieldError } from '../../../shared/api/projectState';
import type { Scene } from '../../../shared/types/contracts';
import { formatTime } from '../../../shared/lib/format';
import { Alert, Button, Chip, Segmented } from '../../../shared/ui';
import { GuestLock } from '../GuestLock';
import { useWizard } from '../context';
import { WizardFooter } from '../WizardFooter';

type View = '2d' | '3d';

/** Размер области, которую визард отдаёт редактору. */
function useBoxSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1000, height: 480 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ width: Math.floor(e.contentRect.width), height: Math.floor(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, ...size };
}

/**
 * Шаг 7. План объекта. Редактор встроен в визард как модуль того же
 * приложения (features/planEditor) и занимает всю рабочую область.
 * План уходит на сервер через PUT /api/projects/{id}/scene в ту же запись
 * проекта, что и параметры (api-routes.md §6, Документация/Фронтенд и визард/editor-and-api.md).
 */
export function StepTopology() {
  const { draft, isDemo, next, projectId } = useWizard();
  const server = useProjectState(projectId, !isDemo);
  const apiLog = useApiLog();
  const box = useBoxSize();
  const fileInput = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('2d');
  const [plan, setPlan] = useState<Scene | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [showApi, setShowApi] = useState(false);

  // План с сервера — стартовое состояние (в т. ч. когда пользователь вернулся через день)
  const serverScene = server?.scene.data ?? null;
  const serverSceneRevision = server?.scene.revision ?? null;
  useEffect(() => {
    if (!dirty) setPlan(serverScene);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverSceneRevision]);

  const type = draft.objectType ?? 'warehouse';
  const context: PlanEditorContext = useMemo(() => {
    const params = draft.params[type] ?? {};
    const robots = draft.selected.map((id) => {
      const c = catalogById(id);
      return { catalog_item_id: id, name: c?.identification.product_name ?? id, category_id: c?.identification.solution_type ?? '', quantity: draft.quantities[id] ?? 1 };
    });
    const aisles = draft.selected.map((id) => catalogById(id)?.infrastructure.aisle_width_mm).filter((x): x is number => typeof x === 'number');
    return {
      objectType: type,
      areaSqm: typeof params.available_area_sqm === 'number' ? params.available_area_sqm : typeof params.area_sqm === 'number' ? params.area_sqm : null,
      routeLengthM: typeof params.route_length_m === 'number' ? params.route_length_m : null,
      workingZoneIds: Array.isArray(params.working_zones) ? (params.working_zones as string[]) : [],
      robots,
      minAisleWidthM: aisles.length ? Math.max(...aisles) / 1000 : null,
    };
  }, [draft.selected, draft.quantities, draft.params, type]);

  if (isDemo) {
    return <GuestLock title="План объекта доступен после регистрации" benefit="На плане можно расставить зоны и роботов, проиграть симуляцию и найти узкие места." />;
  }

  const edit = (p: Scene) => {
    setPlan(p);
    setDirty(true);
    setErrors([]);
  };

  const save = async () => {
    if (!server || !plan) return;
    setSaving(true);
    setErrors([]);
    const res = await saveScene(
      projectId,
      { base_revision: server.revision, based_on_input_revision: server.input.revision ?? 0, scene: plan },
      { minAisleWidthM: context.minAisleWidthM, formAreaSqm: context.areaSqm },
    );
    setSaving(false);
    if (res.status === 200) {
      setDirty(false);
      setNotice(null);
    } else if (res.status === 422) {
      setErrors(res.body.errors);
    } else {
      setNotice('Проект за это время сохранили в другой вкладке. Загружена актуальная версия — повторите сохранение плана.');
    }
  };

  /** Подложка грузится отдельной ручкой: в план кладём только ссылку */
  const onPickBackground = async (file: File) => {
    if (!plan) {
      setNotice('Сначала создайте черновик плана — кнопка «Черновик из параметров»');
      return;
    }
    const uploaded = await uploadBackground(projectId, file);
    // Подложку растягиваем по ширине площадки, высоту берём по пропорциям файла
    const width = plan.site.width || 100;
    const ratio = uploaded.width_px ? uploaded.height_px / uploaded.width_px : 0.6;
    edit({
      ...plan,
      site: {
        ...plan.site,
        background: {
          image_url: uploaded.image_url,
          x: 0,
          y: 0,
          width,
          height: Math.round(width * ratio),
          opacity: 0.5,
        },
      },
    });
  };

  const sceneState = server?.scene.state ?? 'missing';
  const warnings = server?.scene.warnings ?? [];
  const status = dirty ? (
    <Chip tone="warn">есть несохранённые изменения</Chip>
  ) : sceneState === 'missing' ? (
    <Chip tone="info">черновик: плана ещё нет</Chip>
  ) : sceneState === 'stale' ? (
    <Chip tone="warn">план устарел: параметры менялись после него</Chip>
  ) : (
    <Chip tone="ok">план сохранён{server?.scene.saved_at ? ` в ${formatTime(new Date(server.scene.saved_at))}` : ''}</Chip>
  );

  const size = estimateSize(context);
  const lastExchange = apiLog.find((e) => e.url.startsWith(`/api/projects/${projectId}`));

  return (
    <>
      <section className="editor-step" aria-label="План объекта">
        <div className="editor-step__bar">
          <span className="editor-step__title">План объекта</span>
          <span className="faint">шаг 7 из 8 · необязательный</span>
          {status}
          {warnings.length > 0 && !dirty && (
            <Chip tone={warnings.some((w) => w.severity === 'error') ? 'danger' : 'warn'}>
              замечаний: {warnings.length}
            </Chip>
          )}
          <span className="spacer" />
          <Segmented<View>
            label="Вид"
            value={view}
            onChange={setView}
            options={[
              { value: '2d', label: '2D-план' },
              { value: '3d', label: '3D' },
            ]}
          />
          <Button size="sm" onClick={() => edit(autoLayout(projectId, context))} title="Построить черновик плана по площади и рабочим зонам из формы">
            {plan ? 'Пересобрать из параметров' : 'Черновик из параметров'}
          </Button>
          <Button size="sm" onClick={() => fileInput.current?.click()} title="Скан или чертёж: файл грузится отдельно, в плане остаётся ссылка">
            Подложка
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void onPickBackground(file);
            }}
          />
          <Button size="sm" variant={showApi ? 'primary' : 'ghost'} onClick={() => setShowApi((v) => !v)} aria-pressed={showApi}>
            Запрос и ответ
          </Button>
          <Button size="sm" variant="primary" disabled={!plan || !dirty || saving || !server} onClick={save}>
            {saving ? 'Сохраняем…' : 'Сохранить план'}
          </Button>
        </div>

        <div className="editor-step__body" ref={box.ref}>
          {view === '2d' ? (
            <PlanEditorStub
              value={plan}
              onChange={edit}
              context={context}
              categories={CATEGORIES}
              warnings={warnings}
              onUploadBackground={onPickBackground}
              width={box.width}
              height={box.height}
            />
          ) : (
            <div className="plan-editor__empty" style={{ background: 'var(--surface-2)' }}>
              <span className="stub__badge">Заглушка</span>
              <strong>3D-вид и проигрывание симуляции</strong>
              <span className="muted">Та же сцена в объёме и таймлайн SimulationTimeline — встраиваются в эту область тем же способом, что и 2D-редактор.</span>
            </div>
          )}

          {(errors.length > 0 || notice || sceneState === 'stale' || (size.source !== 'area' && !plan)) && (
            <div className="editor-step__notice stack stack--sm">
              {notice && <Alert tone="warn" title={notice} />}
              {errors.length > 0 && (
                <Alert tone="danger" title="Сервер не принял план">
                  {errors.map((e) => e.message).join(' · ')}
                </Alert>
              )}
              {sceneState === 'stale' && !dirty && errors.length === 0 && (
                <Alert tone="warn" title="Параметры объекта менялись после этого плана">
                  Проверьте зоны и площадь или пересоберите план из параметров.
                </Alert>
              )}
              {size.source === 'default' && !plan && (
                <Alert tone="info" title="Площади объекта нет в параметрах">
                  Черновик будет стандартного размера {size.width} × {size.depth} м — растяните границы на плане под свой объект.
                </Alert>
              )}
            </div>
          )}

          {showApi && (
            <aside className="api-drawer" aria-label="Запрос и ответ сервера">
              <div className="api-drawer__head">
                <strong>{lastExchange ? `${lastExchange.method} ${lastExchange.url} → ${lastExchange.status}` : `Запись проекта ${projectId}`}</strong>
                <Button size="sm" variant="ghost" onClick={() => setShowApi(false)}>
                  Закрыть
                </Button>
              </div>
              <pre>
                {lastExchange && lastExchange.method === 'PUT'
                  ? `// Запрос\n${JSON.stringify(lastExchange.request, null, 2)}\n\n// Ответ\n${JSON.stringify(lastExchange.response, null, 2)}`
                  : `// Состояние записи проекта (GET)\n${JSON.stringify(server ?? null, null, 2)}`}
              </pre>
            </aside>
          )}
        </div>
      </section>
      <WizardFooter
        nextLabel={dirty ? 'Дальше без сохранения плана →' : sceneState === 'missing' ? 'Пропустить и перейти к сохранению →' : 'Далее: сохранение и экспорт →'}
        onNext={next}
      />
    </>
  );
}
