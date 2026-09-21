import { Placeholder } from '../../shared/ui/Placeholder';

export function LoginPage() {
  return <Placeholder title="Вход" purpose="E-mail и пароль. После входа — возврат на запрошенный экран (?next=)." />;
}

export function RegisterPage() {
  return (
    <Placeholder
      title="Регистрация"
      purpose="Создание аккаунта и перенос демо-расчёта из sessionStorage в новый проект."
    />
  );
}

export function ForgotPasswordPage() {
  return <Placeholder title="Восстановление пароля" purpose="Отправка ссылки для смены пароля на e-mail." />;
}
