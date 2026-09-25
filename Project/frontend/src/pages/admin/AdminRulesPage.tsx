import { useState } from 'react';
import { RULES } from '../../shared/mock/admin';
import { VERDICT_LABEL } from '../../shared/mock/dictionaries';
import type { CompatibilityRule, CompatibilityVerdict, RuleCondition, RuleOperator } from '../../shared/types/contracts';
import { Alert, Button, Card, Chip, MockNote, PageHeader, SelectField, TextField } from '../../shared/ui';
import type { Tone } from '../../shared/ui';

const VERDICT_TONE: Record<CompatibilityVerdict, Tone> = { allowed: 'ok', forbidden: 'danger', warning: 'warn', needs_review: 'info' };

const OPERATOR_LABEL: Record<RuleOperator, string> = {
  eq: '=',
  ne: '≠',
  lt: '<',
  lte: '≤',
  gt: '>',
  gte: '≥',
  in: 'в списке',
  has_tag: 'содержит',
};

function cond(c: RuleCondition) {
  const value = Array.isArray(c.value) ? c.value.join(', ') : String(c.value);
  return (
    <span className="mono" style={{ fontSize: 12.5 }}>
      {c.key} <strong style={{ color: 'var(--accent)' }}>{OPERATOR_LABEL[c.operator]}</strong> {value}
    </span>
  );
}

const EMPTY: CompatibilityRule = {
  id: '',
  equipment_condition: { key: '', operator: 'eq', value: '' },
  object_condition: { key: '', operator: 'eq', value: '' },
  verdict: 'forbidden',
  reason: '',
  source: null,
};

/** Правила совместимости: плоская таблица «условие по технике × условие по объекту → вердикт». */
export function AdminRulesPage() {
  const [rules, setRules] = useState<CompatibilityRule[]>(RULES);
  const [filter, setFilter] = useState<'' | CompatibilityVerdict>('');
  const [draft, setDraft] = useState<CompatibilityRule | null>(null);
  const [tried, setTried] = useState(false);

  const list = rules.filter((r) => !filter || r.verdict === filter);
  const setCond = (side: 'equipment_condition' | 'object_condition', patch: Partial<RuleCondition>) =>
    setDraft((d) => (d ? { ...d, [side]: { ...d[side], ...patch } } : d));

  const errors = draft
    ? {
        eq: !draft.equipment_condition.key.trim() ? 'Укажите характеристику техники' : null,
        obj: !draft.object_condition.key.trim() ? 'Укажите параметр объекта' : null,
        reason: !draft.reason.trim() ? 'Причину увидит пользователь в подборе — без неё нельзя' : null,
      }
    : { eq: null, obj: null, reason: null };

  const operators = (Object.keys(OPERATOR_LABEL) as RuleOperator[]).map((k) => ({ value: k, label: OPERATOR_LABEL[k] }));

  return (
    <div className="page" style={{ maxWidth: 'none' }}>
      <PageHeader
        title="Правила совместимости"
        description="Каждое правило проверяет пару «техника — объект». Причина из правила показывается пользователю в подборе как объяснение."
        actions={
          <>
            <MockNote />
            <Button variant="primary" onClick={() => { setDraft({ ...EMPTY, id: `r-${rules.length + 1}` }); setTried(false); }}>
              + Новое правило
            </Button>
          </>
        }
      />

      {draft && (
        <Card title="Новое правило" actions={<Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Отмена</Button>}>
          <div className="stack">
            <div className="grid" style={{ gridTemplateColumns: '1fr 140px 1fr', alignItems: 'end' }}>
              <TextField label="Если у техники" value={draft.equipment_condition.key} onChange={(v) => setCond('equipment_condition', { key: v })} placeholder="aisle_width_mm" error={tried ? errors.eq : null} />
              <SelectField label="Оператор" value={draft.equipment_condition.operator} options={operators} onChange={(v) => setCond('equipment_condition', { operator: v as RuleOperator })} />
              <TextField label="Значение" value={String(draft.equipment_condition.value)} onChange={(v) => setCond('equipment_condition', { value: v })} placeholder="2500" />
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 140px 1fr', alignItems: 'end' }}>
              <TextField label="И у объекта" value={draft.object_condition.key} onChange={(v) => setCond('object_condition', { key: v })} placeholder="layout_constraints" error={tried ? errors.obj : null} />
              <SelectField label="Оператор" value={draft.object_condition.operator} options={operators} onChange={(v) => setCond('object_condition', { operator: v as RuleOperator })} />
              <TextField label="Значение" value={String(draft.object_condition.value)} onChange={(v) => setCond('object_condition', { value: v })} placeholder="Узкие проходы до 2,5 м" />
            </div>
            <div className="grid" style={{ gridTemplateColumns: '220px 1fr 240px', alignItems: 'start' }}>
              <SelectField
                label="То вердикт"
                value={draft.verdict}
                options={(Object.keys(VERDICT_LABEL) as CompatibilityVerdict[]).map((k) => ({ value: k, label: VERDICT_LABEL[k] }))}
                onChange={(v) => setDraft({ ...draft, verdict: v as CompatibilityVerdict })}
              />
              <TextField label="Причина — для пользователя" required value={draft.reason} onChange={(v) => setDraft({ ...draft, reason: v })} error={tried ? errors.reason : null} placeholder="Технике нужен проход шире, чем есть на объекте" />
              <TextField label="Источник" value={draft.source ?? ''} onChange={(v) => setDraft({ ...draft, source: v || null })} placeholder="Артём / каталог оргов" />
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button
                variant="primary"
                onClick={() => {
                  setTried(true);
                  if (Object.values(errors).some(Boolean)) return;
                  setRules((rs) => [draft, ...rs]);
                  setDraft(null);
                }}
              >
                Добавить правило
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="row">
        <span className="muted">Вердикт:</span>
        {(['', 'forbidden', 'warning', 'needs_review', 'allowed'] as const).map((v) => (
          <Button key={v || 'all'} size="sm" variant={filter === v ? 'primary' : 'secondary'} onClick={() => setFilter(v)}>
            {v ? VERDICT_LABEL[v] : 'Все'} <span className="num">{v ? rules.filter((r) => r.verdict === v).length : rules.length}</span>
          </Button>
        ))}
      </div>

      <Card flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Условие по технике</th>
                <th>Условие по объекту</th>
                <th>Вердикт</th>
                <th>Причина для пользователя</th>
                <th>Источник</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td>{cond(r.equipment_condition)}</td>
                  <td>{cond(r.object_condition)}</td>
                  <td>
                    <Chip tone={VERDICT_TONE[r.verdict]}>{VERDICT_LABEL[r.verdict]}</Chip>
                  </td>
                  <td style={{ maxWidth: 360 }}>{r.reason}</td>
                  <td className="muted">{r.source ?? <span className="faint">не указан</span>}</td>
                  <td className="r">
                    <Button size="sm" variant="ghost" onClick={() => setRules((rs) => rs.filter((x) => x.id !== r.id))} aria-label="Удалить правило">
                      Удалить
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Alert tone="info" title="Проверка правила на тестовой паре появится с бэкендом">
        Эвалюатор совместимости живёт в модуле подбора (Стас) — фронт будет отправлять пару «позиция каталога + параметры объекта» и показывать сработавшие правила.
      </Alert>
    </div>
  );
}
