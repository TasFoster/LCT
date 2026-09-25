import { ButtonLink, Card, EmptyState } from '../../shared/ui';
import { ROUTES } from '../../shared/config/routes';
import { useWizard } from './context';
import { WizardFooter } from './WizardFooter';

/** Экран шага, закрытого для гостя: объясняет, что даст регистрация. */
export function GuestLock({ title, benefit }: { title: string; benefit: string }) {
  const { goTo } = useWizard();
  return (
    <>
      <div className="page wizard-body">
        <Card>
          <EmptyState
            icon="🔒"
            title={title}
            action={
              <div className="row" style={{ justifyContent: 'center' }}>
                <ButtonLink to={ROUTES.register} variant="primary">
                  Зарегистрироваться и сохранить расчёт
                </ButtonLink>
                <ButtonLink to={ROUTES.login} variant="ghost">
                  У меня есть аккаунт
                </ButtonLink>
              </div>
            }
          >
            {benefit} Данные, которые вы уже ввели в демо-расчёте, перенесутся в новый проект.
          </EmptyState>
        </Card>
      </div>
      <WizardFooter nextLabel="К результатам демо-расчёта" onNext={() => goTo('scenarios')} />
    </>
  );
}
