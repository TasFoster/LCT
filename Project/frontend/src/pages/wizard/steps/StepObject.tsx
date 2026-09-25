import { OBJECT_TYPES } from '../../../shared/mock/dictionaries';
import { OBJECT_ICON } from '../../../shared/mock/projects';
import { Alert } from '../../../shared/ui';
import { useWizard } from '../context';
import { WizardFooter } from '../WizardFooter';

/** Шаг 1. Тип объекта: три крупные карточки и что понадобится дальше. */
export function StepObject() {
  const { draft, update } = useWizard();
  const selected = draft.objectType;
  const hasLaterResults = draft.completed.includes('matching');

  return (
    <>
      <div className="page wizard-body">
        <div className="page-head">
          <div className="page-head__text">
            <span className="label">Шаг 1 из 8</span>
            <h1>Какой объект роботизируем?</h1>
            <p className="muted">
              От типа объекта зависят параметры, которые мы спросим дальше, и техника, из которой будем выбирать.
            </p>
          </div>
        </div>

        <div className="grid grid--3">
          {OBJECT_TYPES.map((o) => (
            <button
              key={o.value}
              type="button"
              className="choice"
              aria-pressed={selected === o.value}
              onClick={() =>
                update({
                  objectType: o.value,
                  staleAfterParams: hasLaterResults && selected !== o.value ? true : draft.staleAfterParams,
                })
              }
            >
              <div className="row row--between">
                <span style={{ fontSize: 28, lineHeight: 1 }} aria-hidden>
                  {OBJECT_ICON[o.value]}
                </span>
                {selected === o.value && <span className="chip chip--accent">Выбрано</span>}
              </div>
              <h2>{o.label}</h2>
              <p className="muted">{o.description}</p>
              <div className="stack stack--sm" style={{ marginTop: 4 }}>
                <span className="label">Понадобится</span>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--muted)' }}>
                  {o.needs.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            </button>
          ))}
        </div>

        {hasLaterResults && (
          <Alert tone="warn" title="Смена типа объекта сделает подбор и экономику неактуальными">
            Результаты не удалятся: вы сможете вернуться к ним или пересчитать заново.
          </Alert>
        )}

        <p className="faint">
          Нет вашего типа объекта? Напишите нам — новый тип добавляется описанием параметров, без переделки сервиса.
        </p>
      </div>
      <WizardFooter blockedReason={selected ? null : 'Выберите тип объекта'} />
    </>
  );
}
