import type { ReactNode } from 'react';
import { WIZARD_STEPS } from '../../shared/config/routes';
import { Button } from '../../shared/ui';
import { useWizard } from './context';

interface WizardFooterProps {
  /** Причина, по которой «Далее» недоступна. Пусто — можно идти дальше. */
  blockedReason?: string | null;
  nextLabel?: string;
  onNext?: () => void;
  extra?: ReactNode;
}

/** Нижняя панель шага: «Назад», причина блокировки, «Сохранить», «Далее». */
export function WizardFooter({ blockedReason, nextLabel, onNext, extra }: WizardFooterProps) {
  const { step, back, next, update, isDemo } = useWizard();
  const index = WIZARD_STEPS.findIndex((s) => s.slug === step);
  const prev = WIZARD_STEPS[index - 1];
  const following = WIZARD_STEPS[index + 1];

  return (
    <div className="wizard-footer">
      {prev ? (
        <Button variant="ghost" onClick={back}>
          ← Назад: {prev.title.toLowerCase()}
        </Button>
      ) : (
        <span />
      )}
      <div className="wizard-footer__right">
        {blockedReason && <span className="wizard-footer__reason">{blockedReason}</span>}
        {extra}
        {!isDemo && (
          <Button onClick={() => update({})} title="Черновик и так сохраняется автоматически">
            Сохранить черновик
          </Button>
        )}
        <Button variant="primary" disabled={Boolean(blockedReason)} onClick={onNext ?? next}>
          {nextLabel ?? (following ? `Далее: ${following.title.toLowerCase()} →` : 'Готово')}
        </Button>
      </div>
    </div>
  );
}
