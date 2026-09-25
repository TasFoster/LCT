import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { computeScenario, computeSensitivity } from '../../../features/wizard/mockEconomics';
import type { ScenarioDef } from '../../../features/wizard/mockEconomics';
import { FINANCING_LABEL } from '../../../shared/mock/dictionaries';
import { ROUTES } from '../../../shared/config/routes';
import type { FinancingType } from '../../../shared/types/contracts';
import { pluralize } from '../../../shared/lib/format';
import { Alert, Button, Card, MockNote, NumberField, SelectField, TextField } from '../../../shared/ui';
import { ScenarioTable } from '../../../widgets/ScenarioTable';
import { SensitivityTable } from '../../../widgets/SensitivityTable';
import { useWizard } from '../context';
import { WizardFooter } from '../WizardFooter';

const MIN_SCENARIOS = 3;

/** Шаг 6. Сценарии и what-if: несколько вариантов финансирования и допущений. */
export function StepScenarios() {
  const { draft, update, isDemo } = useWizard();
  const [editing, setEditing] = useState<string | null>(null);
  const [sensId, setSensId] = useState<string>(draft.scenarios.find((s) => s.kind !== 'baseline')?.id ?? '');

  const columns = useMemo(() => draft.scenarios.map((def) => ({ def, result: computeScenario(draft, def) })), [draft]);
  const nonBase = draft.scenarios.filter((s) => s.kind !== 'baseline');
  const guestLimitReached = isDemo && nonBase.length >= 1;

  const sensDef = draft.scenarios.find((s) => s.id === sensId) ?? nonBase[0];
  const sensBase = sensDef ? computeScenario(draft, sensDef) : null;
  const sensPoints = sensDef ? computeSensitivity(draft, sensDef) : [];

  const addScenario = (financing: FinancingType) => {
    const id = `sc-${Date.now().toString(36)}`;
    const def: ScenarioDef = {
      id,
      title: financing === 'credit' ? 'Кредит' : financing === 'leasing' ? 'Лизинг' : financing === 'raas' ? 'RaaS' : 'What-if',
      kind: financing === 'raas' ? 'raas' : financing === 'own_funds' ? 'purchase' : 'custom',
      financing,
      creditRatePct: financing === 'credit' ? 18 : financing === 'leasing' ? 14 : undefined,
    };
    update((d) => ({ scenarios: [...d.scenarios, def] }));
    setEditing(id);
  };

  const patch = (id: string, p: Partial<ScenarioDef>) =>
    update((d) => ({ scenarios: d.scenarios.map((s) => (s.id === id ? { ...s, ...p } : s)) }));

  const remove = (id: string) => {
    update((d) => ({ scenarios: d.scenarios.filter((s) => s.id !== id) }));
    if (editing === id) setEditing(null);
  };

  const editDef = draft.scenarios.find((s) => s.id === editing);
  const tooFew = !isDemo && draft.scenarios.length < MIN_SCENARIOS;

  return (
    <>
      <div className="page wizard-body">
        <div className="page-head">
          <div className="page-head__text">
            <span className="label">Шаг 6 из 8</span>
            <h1>Сценарии</h1>
            <p className="muted">
              Сравните способы финансирования и проверьте, что будет, если изменятся допущения. По ТЗ нужно минимум {MIN_SCENARIOS}{' '}
              {pluralize(MIN_SCENARIOS, ['сценарий', 'сценария', 'сценариев'])}, включая базовый.
            </p>
          </div>
          <div className="page-head__actions">
            <MockNote>Расчёт-заглушка на фронте</MockNote>
          </div>
        </div>

        {isDemo && (
          <Alert tone="info" title="В демо-режиме — один сценарий против базового" action={<Link className="btn btn--primary btn--sm" to={ROUTES.register}>Зарегистрироваться</Link>}>
            Чтобы сравнить несколько сценариев, зарегистрируйтесь — введённые данные перенесутся в проект.
          </Alert>
        )}

        <Card
          title="Сравнение сценариев"
          flush
          actions={
            guestLimitReached ? null : (
              <>
                <span className="muted">Добавить:</span>
                <Button size="sm" onClick={() => addScenario('own_funds')}>Покупка</Button>
                <Button size="sm" onClick={() => addScenario('credit')}>Кредит</Button>
                <Button size="sm" onClick={() => addScenario('leasing')}>Лизинг</Button>
                <Button size="sm" onClick={() => addScenario('raas')}>RaaS</Button>
              </>
            )
          }
        >
          <ScenarioTable
            columns={columns}
            actions={(c) =>
              c.def.kind === 'baseline' ? (
                <span className="faint">точка отсчёта</span>
              ) : (
                <div className="table-actions">
                  <Button size="sm" variant={editing === c.def.id ? 'primary' : 'secondary'} onClick={() => setEditing(editing === c.def.id ? null : c.def.id)}>
                    Допущения
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(c.def.id)} aria-label={`Удалить сценарий ${c.def.title}`}>
                    Удалить
                  </Button>
                </div>
              )
            }
          />
        </Card>

        {editDef && (
          <Card title={`Допущения сценария «${editDef.title}»`} actions={<Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Готово</Button>}>
            <div className="grid grid--3">
              <TextField label="Название" value={editDef.title} onChange={(v) => patch(editDef.id, { title: v })} />
              <SelectField
                label="Финансирование"
                value={editDef.financing}
                onChange={(v) => patch(editDef.id, { financing: v as FinancingType, kind: v === 'raas' ? 'raas' : v === 'own_funds' ? 'purchase' : 'custom' })}
                options={(Object.keys(FINANCING_LABEL) as FinancingType[]).map((k) => ({ value: k, label: FINANCING_LABEL[k] }))}
              />
              {(editDef.financing === 'credit' || editDef.financing === 'leasing') && (
                <NumberField label="Ставка" unit="% годовых" value={editDef.creditRatePct ?? null} onChange={(n) => patch(editDef.id, { creditRatePct: n ?? undefined })} />
              )}
              <NumberField label="Коэффициент загрузки" unit="0…1" value={editDef.loadFactor ?? draft.economics.loadFactor} hint="по умолчанию — из шага «Экономика»" onChange={(n) => patch(editDef.id, { loadFactor: n ?? undefined })} />
              <NumberField label="Стоимость персонала (на всех)" unit="₽/мес" value={editDef.staffCostPerMonth ?? draft.economics.staffCostPerMonth} onChange={(n) => patch(editDef.id, { staffCostPerMonth: n ?? undefined })} />
              <NumberField label="Изменение цены оборудования" unit="%" value={editDef.equipmentPriceDeltaPct ?? 0} hint="например −10 при скидке поставщика" onChange={(n) => patch(editDef.id, { equipmentPriceDeltaPct: n ?? 0 })} />
            </div>
          </Card>
        )}

        {sensDef && sensBase && (
          <Card
            title="Чувствительность"
            actions={
              <div className="control" style={{ width: 220, height: 30 }}>
                <select value={sensDef.id} onChange={(e) => setSensId(e.target.value)} aria-label="Сценарий для анализа чувствительности">
                  {nonBase.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            }
            flush
          >
            <SensitivityTable base={sensBase} points={sensPoints} />
          </Card>
        )}
      </div>
      <WizardFooter
        blockedReason={
          tooFew
            ? `Добавьте ещё ${MIN_SCENARIOS - draft.scenarios.length} ${pluralize(MIN_SCENARIOS - draft.scenarios.length, ['сценарий', 'сценария', 'сценариев'])}`
            : nonBase.length === 0
              ? 'Добавьте хотя бы один сценарий с роботизацией'
              : null
        }
      />
    </>
  );
}
