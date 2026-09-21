import { Link, Navigate, useParams } from 'react-router-dom';
import { ROUTES, WIZARD_STEPS } from '../../shared/config/routes';
import type { WizardStepSlug } from '../../shared/config/routes';

const STEP_PURPOSE: Record<WizardStepSlug, { purpose: string; contracts: string[] }> = {
  object: { purpose: 'Выбор типа объекта: склад, аэропорт, медучреждение.', contracts: ['ProjectInput.object_type'] },
  params: {
    purpose: 'Форма параметров объекта: валидация, единицы измерения, подсказки, импорт из Excel/CSV.',
    contracts: ['WarehouseParams', 'AirportParams', 'MedicalParams'],
  },
  matching: {
    purpose: 'Ранжированный список кандидатов с разбором «почему так» и ручными правками.',
    contracts: ['MatchResult'],
  },
  comparison: {
    purpose: 'Сравнение отобранных решений по ТТХ и фиксация состава оборудования.',
    contracts: ['MatchCandidate', 'SelectedEquipment'],
  },
  economics: {
    purpose: 'CAPEX, OPEX, годовой эффект, окупаемость, ROI и TCO по основному сценарию.',
    contracts: ['ScenarioInput', 'EconomicsResult'],
  },
  scenarios: {
    purpose: 'Несколько сценариев финансирования и what-if с анализом чувствительности.',
    contracts: ['ScenarioInput', 'EconomicsResult'],
  },
  topology: {
    purpose: 'Зоны, маршруты, точки операций, расстановка роботов и проигрывание симуляции.',
    contracts: ['TopologyConfig', 'SimulationTimeline'],
  },
  export: {
    purpose: 'Сводка, сохранение версии, выгрузка PDF/Excel.',
    contracts: ['ProjectVersion'],
  },
};

function isStepSlug(value: string): value is WizardStepSlug {
  return WIZARD_STEPS.some((step) => step.slug === value);
}

export function WizardPage() {
  const { projectId = 'demo', step = 'object' } = useParams();

  if (!isStepSlug(step)) {
    return <Navigate to={ROUTES.wizardStep(projectId, 'object')} replace />;
  }

  const current = WIZARD_STEPS.findIndex((s) => s.slug === step);
  const info = STEP_PURPOSE[step];

  return (
    <section className="wizard">
      <ol className="wizard__stepper">
        {WIZARD_STEPS.map((s, index) => (
          <li key={s.slug} className={index === current ? 'is-current' : index < current ? 'is-done' : ''}>
            <Link to={ROUTES.wizardStep(projectId, s.slug)}>
              <span className="wizard__num">{index + 1}</span>
              {s.title}
            </Link>
          </li>
        ))}
      </ol>

      <div className="placeholder">
        <h1>
          Шаг {current + 1}. {WIZARD_STEPS[current].title}
        </h1>
        <p>{info.purpose}</p>
        <p className="placeholder__contracts">Данные: {info.contracts.join(', ')}</p>
        {step === 'params' && (
          <p>
            Макет готов: <Link to={ROUTES.wireframeParams}>вайрфрейм шага «Параметры объекта»</Link>
          </p>
        )}
      </div>

      <div className="wizard__footer">
        <Link
          to={ROUTES.wizardStep(projectId, WIZARD_STEPS[Math.max(0, current - 1)].slug)}
          aria-disabled={current === 0}
        >
          ← Назад
        </Link>
        <span>Сохранить черновик</span>
        <Link
          to={
            current === WIZARD_STEPS.length - 1
              ? ROUTES.dashboard(projectId)
              : ROUTES.wizardStep(projectId, WIZARD_STEPS[current + 1].slug)
          }
        >
          {current === WIZARD_STEPS.length - 1 ? 'К дашборду →' : 'Далее →'}
        </Link>
      </div>
    </section>
  );
}
