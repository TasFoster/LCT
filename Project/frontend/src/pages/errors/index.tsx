import { useSession } from '../../features/auth/session';
import { ROUTES } from '../../shared/config/routes';
import { ButtonLink, Card, EmptyState } from '../../shared/ui';

export function ForbiddenPage() {
  return (
    <div className="page page--narrow">
      <Card>
        <EmptyState icon="403" title="Этот раздел только для администраторов" action={<ButtonLink to={ROUTES.projects} variant="primary">К моим проектам</ButtonLink>}>
          Вы вошли, но у вашей учётной записи нет прав на управление каталогом. Если они нужны — попросите администратора.
        </EmptyState>
      </Card>
    </div>
  );
}

export function NotFoundPage() {
  const role = useSession((s) => s.role);
  return (
    <div className="page page--narrow">
      <Card>
        <EmptyState
          icon="404"
          title="Такой страницы нет"
          action={
            <ButtonLink to={role === 'guest' ? ROUTES.landing : ROUTES.projects} variant="primary">
              {role === 'guest' ? 'На главную' : 'К моим проектам'}
            </ButtonLink>
          }
        >
          Возможно, ссылка устарела или проект удалён. Проверьте адрес.
        </EmptyState>
      </Card>
    </div>
  );
}
