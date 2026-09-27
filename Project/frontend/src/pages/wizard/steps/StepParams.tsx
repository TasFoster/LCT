import { useEffect, useMemo, useRef, useState } from 'react';
import { saveInput, saveScene, uploadBackground, useProjectState } from '../../../features/projectApi';
import type { FieldError } from '../../../shared/api/projectState';
import type { ObjectParams, Scene } from '../../../shared/types/contracts';
import { Navigate } from 'react-router-dom';
import {
  MEDICAL_CARGO_CATEGORIES,
  PARAMS_SCHEMA,
  sectionProgress,
  validateParams,
} from '../../../features/wizard/paramsSchema';
import type { ParamField, ParamValues } from '../../../features/wizard/paramsSchema';
import { DEMO_WAREHOUSE_PARAMS } from '../../../shared/mock/projects';
import { objectTypeLabel } from '../../../shared/mock/dictionaries';
import { formatRub, pluralize } from '../../../shared/lib/format';
import { Alert, Button, ComboField, Field, NumberField, Progress, Segmented, SelectField, TagsField, TextField } from '../../../shared/ui';
import { autoLayout } from '../../../features/planEditor/autoLayout';
import { PlanEditor } from '../../../features/planEditor';
import type { PlanEditorContext } from '../../../features/planEditor/types';
import { CATEGORIES } from '../../../shared/dictionaries';
import { useWizard } from '../context';
import { WizardFooter } from '../WizardFooter';

/** Размер области, которую форма отдаёт встроенному редактору плана. */
function usePlanBoxSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 420 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ width: Math.floor(e.contentRect.width), height: Math.floor(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, ...size };
}

const DEMO_VALUES: Record<string, ParamValues> = {
  warehouse: { ...DEMO_WAREHOUSE_PARAMS },
  airport: {
    operation_zone: 'baggage_hall',
    operating_mode: '24/7',
    zone_access: 'closed',
    passenger_flow_per_day: 42_000,
    cargo_flow_tons_per_day: 310,
    ops_count_per_day: 2600,
    peak_load_per_hour: 240,
    unit_weight_kg: 900,
    unit_dimensions_mm: '3000×1500×1600',
    route_length_m: 1200,
    staff_count: 60,
    staff_cost_per_month: 5_280_000,
    safety_requirements: ['security_check', 'speed_6kmh'],
  },
  medical: {
    facility_type: 'multi_hospital',
    operating_mode: '24/7',
    area_sqm: 64_000,
    floors_count: 9,
    cargo_volume_per_day: { linen: 60, food: 90, drugs: 140, waste: 45 },
    routes_and_elevators: ['freight_elevator_each', 'tunnel'],
    staff_count: 38,
    staff_cost_per_month: 2_356_000,
    sanitary_requirements: ['clean_dirty_split', 'closed_containers'],
    access_restrictions: ['operating_block'],
  },
};

/** Шаг 2. Параметры объекта: форма из описания, валидация, единицы, подсказки. */
export function StepParams() {
  const { draft, update, path, next, isDemo, projectId } = useWizard();
  const server = useProjectState(projectId, !isDemo);
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldError[]>([]);
  const [conflict, setConflict] = useState(false);
  const type = draft.objectType;
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [triedNext, setTriedNext] = useState(false);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [importNote, setImportNote] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [plan, setPlan] = useState<Scene | null>(null);
  const [planDirty, setPlanDirty] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const planBox = usePlanBoxSize();

  const values: ParamValues = useMemo(() => (type ? (draft.params[type] ?? {}) : {}), [draft.params, type]);
  const issues = useMemo(() => (type ? validateParams(type, values) : {}), [type, values]);

  // План можно набросать уже здесь — та же запись сцены, что открывается на шаге 7
  // (contract 6, `Project/scene.md`), сохраняется тем же PUT /api/projects/{id}/scene.
  const serverScene = server?.scene.data ?? null;
  const serverSceneRevision = server?.scene.revision ?? null;
  useEffect(() => {
    if (!planDirty) setPlan(serverScene);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverSceneRevision]);

  if (!type) return <Navigate to={path('object')} replace />;

  const sections = PARAMS_SCHEMA[type];

  // Оборудование ещё не подобрано (это шаг 3) — палитра роботов пуста, план
  // рисуется по площади/рабочим зонам из формы, как и на шаге 7 до подбора.
  const planContext: PlanEditorContext = {
    objectType: type,
    areaSqm: typeof values.available_area_sqm === 'number' ? values.available_area_sqm : typeof values.area_sqm === 'number' ? values.area_sqm : null,
    routeLengthM: typeof values.route_length_m === 'number' ? values.route_length_m : null,
    workingZoneIds: Array.isArray(values.working_zones) ? (values.working_zones as string[]) : [],
    robots: [],
    minAisleWidthM: null,
  };

  const editPlan = (p: Scene) => {
    setPlan(p);
    setPlanDirty(true);
  };

  const savePlan = async () => {
    if (!server || !plan) return;
    setPlanSaving(true);
    const res = await saveScene(
      projectId,
      { base_revision: server.revision, based_on_input_revision: server.input.revision ?? 0, scene: plan },
      { minAisleWidthM: planContext.minAisleWidthM, formAreaSqm: planContext.areaSqm },
    );
    setPlanSaving(false);
    if (res.status === 200) setPlanDirty(false);
  };

  const onPickPlanBackground = async (file: File) => {
    if (!plan) return;
    const uploaded = await uploadBackground(projectId, file);
    const width = plan.site.width || 100;
    const ratio = uploaded.width_px ? uploaded.height_px / uploaded.width_px : 0.6;
    editPlan({
      ...plan,
      site: { ...plan.site, background: { image_url: uploaded.image_url, x: 0, y: 0, width, height: Math.round(width * ratio), opacity: 0.5 } },
    });
  };

  const errorKeys = Object.keys(issues).filter((k) => issues[k].error);
  const visibleIssue = (key: string) => (touched[key] || triedNext ? issues[key] : issues[key]?.warning ? issues[key] : undefined);

  const totals = sections.reduce(
    (acc, s) => {
      const p = sectionProgress(type, values, s.id);
      return { filled: acc.filled + p.filled, total: acc.total + p.total };
    },
    { filled: 0, total: 0 },
  );

  const setValue = (key: string, value: unknown) =>
    update((d) => ({
      params: { ...d.params, [type]: { ...(d.params[type] ?? {}), [key]: value } },
      staleAfterParams: d.completed.includes('matching') ? true : d.staleAfterParams,
    }));

  const touch = (key: string) => setTouched((t) => ({ ...t, [key]: true }));

  const focusedField = sections.flatMap((s) => s.fields).find((f) => f.key === focusedKey);
  const focusedSection = sections.find((s) => s.fields.some((f) => f.key === focusedKey)) ?? sections[0];

  const firstError = () => {
    const key = errorKeys[0];
    if (!key) return;
    const section = sections.find((s) => s.fields.some((f) => f.key === key));
    document.getElementById(`sec-${section?.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderField = (f: ParamField) => {
    const issue = visibleIssue(f.key);
    const common = {
      label: f.label,
      required: f.required,
      hint: f.hint,
      error: issue?.error,
      warning: issue?.warning,
      wide: f.wide,
      onFocusCapture: () => setFocusedKey(f.key),
    };
    let v = values[f.key];

    // Как в ТЗ: это расходы на весь персонал за месяц. Показываем рядом,
    // сколько выходит на одного, — так сразу видно, если ввели зарплату одного.
    if (f.key === 'staff_cost_per_month' && typeof v === 'number' && typeof values.staff_count === 'number' && (values.staff_count as number) > 0) {
      const perPerson = v / (values.staff_count as number);
      common.hint = `на весь персонал, с налогами · это ${formatRub(perPerson)} на одного человека`;
    }

    switch (f.kind) {
      case 'number':
        return (
          <NumberField
            key={f.key}
            {...common}
            unit={f.unit ?? ''}
            value={typeof v === 'number' ? v : null}
            onChange={(n) => setValue(f.key, n)}
            onBlur={() => touch(f.key)}
          />
        );
      case 'select':
        return (
          <SelectField
            key={f.key}
            {...common}
            value={typeof v === 'string' ? v : ''}
            placeholder="Выберите из списка"
            options={f.options ?? []}
            onChange={(s) => {
              setValue(f.key, s);
              touch(f.key);
            }}
          />
        );
      case 'combo':
        return (
          <ComboField
            key={f.key}
            {...common}
            value={typeof v === 'string' ? v : ''}
            placeholder="Например, 24/7"
            suggestions={(f.options ?? []).map((o) => (typeof o === 'string' ? o : o.label))}
            onChange={(s) => setValue(f.key, s)}
          />
        );
      case 'tags':
        return (
          <TagsField
            key={f.key}
            {...common}
            value={Array.isArray(v) ? (v as string[]) : []}
            suggestions={f.options ?? []}
            placeholder="Выберите или впишите своё и нажмите Enter"
            onChange={(list) => setValue(f.key, list)}
          />
        );
      case 'dims':
        return (
          <TextField
            key={f.key}
            {...common}
            unit={f.unit}
            placeholder="1200×800×1450"
            value={typeof v === 'string' ? v : ''}
            onChange={(s) => setValue(f.key, s)}
            onBlur={() => touch(f.key)}
          />
        );
      case 'radio':
        return (
          <Field key={f.key} {...common}>
            <Segmented
              label={f.label}
              value={typeof v === 'string' ? v : ''}
              options={(f.options ?? []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o))}
              onChange={(s) => setValue(f.key, s)}
            />
          </Field>
        );
      case 'cargo': {
        const cargo = (v ?? {}) as Record<string, number>;
        return (
          <Field key={f.key} {...common}>
            <div className="grid grid--3" style={{ gap: 12 }}>
              {MEDICAL_CARGO_CATEGORIES.map((c) => (
                <NumberField
                  key={c.key}
                  label={c.label}
                  unit={f.unit ?? ''}
                  value={typeof cargo[c.key] === 'number' ? cargo[c.key] : null}
                  onChange={(n) => {
                    const next = { ...cargo };
                    if (n === null) delete next[c.key];
                    else next[c.key] = n;
                    setValue(f.key, next);
                  }}
                  onBlur={() => touch(f.key)}
                />
              ))}
            </div>
          </Field>
        );
      }
    }
  };

  const blockedReason =
    totals.filled < totals.total
      ? `Заполните ещё ${totals.total - totals.filled} ${pluralize(totals.total - totals.filled, ['обязательное поле', 'обязательных поля', 'обязательных полей'])}`
      : errorKeys.length
        ? `Исправьте ${errorKeys.length} ${pluralize(errorKeys.length, ['ошибку', 'ошибки', 'ошибок'])}`
        : null;

  return (
    <>
      <div className="page wizard-body">
        <div className="page-head">
          <div className="page-head__text">
            <span className="label">Шаг 2 из 8 · {objectTypeLabel(type)}</span>
            <h1>Параметры объекта</h1>
            <p className="muted">
              Поля со звёздочкой обязательны. Единица измерения указана в каждом поле — вводите числа как есть.
            </p>
          </div>
          <div className="page-head__actions">
            <Button variant="ghost" onClick={() => update((d) => ({ params: { ...d.params, [type]: { ...DEMO_VALUES[type] } } }))}>
              Заполнить примером
            </Button>
            <Button onClick={() => setImportNote(true)}>Импорт из Excel / CSV</Button>
            {!isDemo && (
              <Button variant={showPlan ? 'primary' : 'secondary'} onClick={() => setShowPlan((v) => !v)} aria-pressed={showPlan}>
                {showPlan ? 'Скрыть план' : 'План объекта'}
              </Button>
            )}
          </div>
        </div>

        {importNote && (
          <Alert
            tone="info"
            title="Импорт из файла появится позже"
            action={
              <Button variant="ghost" size="sm" onClick={() => setImportNote(false)}>
                Понятно
              </Button>
            }
          >
            Формат шаблона ещё согласуется (открытый вопрос 2 в карте экранов). Пока заполните поля вручную или примером.
          </Alert>
        )}

        {serverErrors.length > 0 && (
          <Alert tone="danger" title="Сервер не принял параметры">
            {serverErrors.map((e) => e.message).join(' · ')}
          </Alert>
        )}
        {conflict && (
          <Alert tone="warn" title="Проект за это время сохранили в другой вкладке">
            Загружена актуальная запись проекта. Проверьте поля и нажмите «Далее» ещё раз.
          </Alert>
        )}
        {!isDemo && server && server.scene.state !== 'missing' && (
          <Alert tone="info" title="У проекта уже есть план объекта">
            Если поменять площадь или рабочие зоны, план на шаге 7 будет помечен как устаревший — он не удалится.
          </Alert>
        )}

        {draft.staleAfterParams && (
          <Alert tone="warn" title="Параметры изменились после расчёта">
            Подбор и экономика остались от прошлых параметров — после этого шага их нужно будет пересчитать.
          </Alert>
        )}

        {showPlan && !isDemo && (
          <section className="card" style={{ padding: 0 }}>
            <div className="editor-step__bar" style={{ padding: 12 }}>
              <span className="editor-step__title">План объекта — необязательный черновик</span>
              <span className="faint">та же сцена, что и на шаге 7; можно нарисовать сейчас или пропустить</span>
              <span className="spacer" />
              <Button size="sm" onClick={() => editPlan(autoLayout(projectId, planContext))}>
                {plan ? 'Пересобрать из параметров' : 'Черновик из параметров'}
              </Button>
              <Button size="sm" variant="primary" disabled={!plan || !planDirty || planSaving || !server} onClick={() => void savePlan()}>
                {planSaving ? 'Сохраняем…' : 'Сохранить план'}
              </Button>
            </div>
            <div ref={planBox.ref} style={{ height: 420 }}>
              <PlanEditor
                value={plan}
                onChange={editPlan}
                context={planContext}
                categories={CATEGORIES}
                warnings={server?.scene.warnings ?? []}
                onUploadBackground={onPickPlanBackground}
                width={planBox.width}
                height={planBox.height}
              />
            </div>
          </section>
        )}

        <div className="step-3col">
          <aside className="sticky-side stack">
            <nav className="card" aria-label="Разделы формы">
              <div className="card__body stack stack--sm">
                <span className="label">Разделы</span>
                <div className="sections-nav">
                  {sections.map((s) => {
                    const p = sectionProgress(type, values, s.id);
                    const complete = p.filled === p.total;
                    return (
                      <a key={s.id} href={`#sec-${s.id}`} className={complete ? 'is-complete' : undefined}>
                        <span>
                          {complete ? '✓ ' : ''}
                          {s.title}
                        </span>
                        <span className="num faint">
                          {p.filled}/{p.total}
                        </span>
                      </a>
                    );
                  })}
                </div>
                <div className="stack stack--sm" style={{ marginTop: 8 }}>
                  <span className="muted num">
                    Заполнено {totals.filled} из {totals.total}
                  </span>
                  <Progress value={totals.total ? (totals.filled / totals.total) * 100 : 0} tone={totals.filled === totals.total ? 'ok' : undefined} />
                </div>
              </div>
            </nav>
            {triedNext && errorKeys.length > 0 && (
              <Alert tone="danger" title={`${errorKeys.length} ${pluralize(errorKeys.length, ['ошибка', 'ошибки', 'ошибок'])}`} action={<button type="button" className="link-btn" onClick={firstError}>Перейти →</button>} />
            )}
          </aside>

          <div className="stack stack--lg">
            {sections.map((s) => (
              <section key={s.id} id={`sec-${s.id}`} className="card form-section" style={{ padding: 18 }}>
                <h2 className="form-section__title">{s.title}</h2>
                <div className="form-grid">{s.fields.map(renderField)}</div>
              </section>
            ))}
          </div>

          <aside className="sticky-side stack">
            <div className="hint-card hint-card--info">
              <span className="label">Подсказка</span>
              <strong>{focusedField?.label ?? focusedSection.title}</strong>
              <p className="muted">{focusedField?.help ?? focusedSection.help}</p>
            </div>
            <div className="hint-card">
              <span className="label">Что дальше</span>
              <p className="muted">По этим данным на шаге 3 подберём технику из каталога:</p>
              <ul>
                <li>грузоподъёмность — не меньше массы груза;</li>
                <li>нужная ширина прохода — в пределах ограничений планировки;</li>
                <li>производительность — под операции в сутки.</li>
              </ul>
            </div>
            <div className="hint-card">
              <span className="label">Черновик</span>
              <p className="muted">Всё введённое сохраняется автоматически — вкладку можно закрыть и вернуться.</p>
            </div>
          </aside>
        </div>
      </div>
      <WizardFooter
        blockedReason={saving ? 'Сохраняем параметры…' : triedNext ? blockedReason : null}
        onNext={
          blockedReason
            ? () => {
                setTriedNext(true);
                firstError();
              }
            : async () => {
                // Гость ничего не отправляет: демо живёт только во вкладке
                if (isDemo) return next();
                if (!server) return;
                setSaving(true);
                setServerErrors([]);
                setConflict(false);
                // PUT /api/projects/{id}/input — параметры уходят в ту же запись проекта
                const res = await saveInput(projectId, {
                  base_revision: server.revision,
                  object_type: type,
                  params: { ...values, object_type: type } as unknown as ObjectParams,
                  source: 'manual',
                });
                setSaving(false);
                if (res.status === 200) next();
                else if (res.status === 422) setServerErrors(res.body.errors);
                else setConflict(true);
              }
        }
      />
    </>
  );
}
