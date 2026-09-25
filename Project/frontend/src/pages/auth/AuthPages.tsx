import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../../features/auth/session';
import { useWizardStore } from '../../features/wizard/store';
import { ROUTES } from '../../shared/config/routes';
import { objectTypeLabel } from '../../shared/mock/dictionaries';
import { Alert, Button, Checkbox, TextField } from '../../shared/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth__aside">
        <div className="stack" style={{ gap: 18 }}>
          <span className="label" style={{ color: 'var(--accent)' }}>
            ROBOCALC
          </span>
          <h1 style={{ fontSize: 32, color: 'inherit', maxWidth: '16ch' }}>Расчёт роботизации с явными допущениями</h1>
          <p>Подбор техники под объект, сравнение сценариев финансирования и срок окупаемости — с историей версий каждого расчёта.</p>
        </div>
        {aside ?? (
          <ul className="stack stack--sm" style={{ margin: 0, paddingLeft: 18, color: 'color-mix(in srgb, var(--surface) 70%, transparent)' }}>
            <li>Проекты и версии сохраняются</li>
            <li>Минимум три сценария в сравнении</li>
            <li>Выгрузка отчёта в PDF и Excel</li>
          </ul>
        )}
      </aside>
      <main className="auth__main">{children}</main>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const signInAs = useSession((s) => s.signInAs);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tried, setTried] = useState(false);
  const [failed, setFailed] = useState(false);
  const [remember, setRemember] = useState(true);

  const emailError = tried && !EMAIL_RE.test(email) ? 'Введите e-mail, например ivan@company.ru' : null;
  const passError = tried && !password ? 'Введите пароль' : null;
  const nextPath = params.get('next');

  const submit = () => {
    setTried(true);
    if (!EMAIL_RE.test(email) || !password) return;
    if (password.length < 4) {
      setFailed(true);
      return;
    }
    // Заглушка авторизации: e-mail со словом admin входит администратором
    const role = email.includes('admin') ? 'admin' : 'user';
    signInAs(role);
    navigate(nextPath ?? (role === 'admin' ? ROUTES.admin : ROUTES.projects), { replace: true });
  };

  return (
    <AuthLayout>
      <form
        className="auth__form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="stack stack--sm">
          <h1>Вход</h1>
          <p className="muted">
            Нет аккаунта? <Link to={ROUTES.register}>Зарегистрируйтесь</Link>
          </p>
        </div>
        {nextPath && <Alert tone="info">Войдите, чтобы открыть эту страницу — после входа вернём вас туда.</Alert>}
        {failed && <Alert tone="danger" title="Неверный e-mail или пароль">Проверьте раскладку и Caps Lock или восстановите пароль.</Alert>}
        <TextField label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} error={emailError} />
        <TextField label="Пароль" type="password" autoComplete="current-password" value={password} onChange={setPassword} error={passError} />
        <div className="row row--between">
          <Checkbox checked={remember} onChange={setRemember}>
            Запомнить меня
          </Checkbox>
          <Link to={ROUTES.forgotPassword}>Забыли пароль?</Link>
        </div>
        <Button type="submit" variant="primary" size="lg" block>
          Войти
        </Button>
        <p className="faint" style={{ fontSize: 12 }}>
          Заглушка: подойдёт любой e-mail и пароль от 4 символов; e-mail со словом «admin» входит администратором.
        </p>
      </form>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const signInAs = useSession((s) => s.signInAs);
  const demo = useWizardStore((s) => s.drafts.demo);
  const update = useWizardStore((s) => s.update);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [org, setOrg] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [transfer, setTransfer] = useState(true);
  const [tried, setTried] = useState(false);

  const hasDemo = Boolean(demo?.objectType);
  const errors = {
    name: !name.trim() ? 'Как к вам обращаться?' : null,
    email: !EMAIL_RE.test(email) ? 'Введите e-mail, например ivan@company.ru' : null,
    password: password.length < 8 ? 'Не короче 8 символов' : null,
    agree: !agree ? 'Нужно согласие на обработку данных' : null,
  };
  const show = (k: keyof typeof errors) => (tried ? errors[k] : null);

  const submit = () => {
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    signInAs('user', name.trim());
    if (hasDemo && transfer && demo) {
      const id = `p-${Date.now().toString(36)}`;
      update(id, { ...demo, projectName: `Демо-расчёт: ${objectTypeLabel(demo.objectType!)}`.toString() });
      navigate(ROUTES.project(id), { replace: true });
    } else {
      navigate(ROUTES.projects, { replace: true });
    }
  };

  return (
    <AuthLayout>
      <form
        className="auth__form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="stack stack--sm">
          <h1>Регистрация</h1>
          <p className="muted">
            Уже есть аккаунт? <Link to={ROUTES.login}>Войдите</Link>
          </p>
        </div>
        {hasDemo && (
          <div className="hint-card hint-card--info">
            <strong>У вас есть демо-расчёт</strong>
            <Checkbox checked={transfer} onChange={setTransfer}>
              Перенести его в новый проект
            </Checkbox>
          </div>
        )}
        <TextField label="Имя и фамилия" required autoComplete="name" value={name} onChange={setName} error={show('name')} />
        <TextField label="Рабочий e-mail" required type="email" autoComplete="email" value={email} onChange={setEmail} error={show('email')} />
        <TextField label="Организация" autoComplete="organization" value={org} onChange={setOrg} hint="необязательно" />
        <TextField label="Пароль" required type="password" autoComplete="new-password" value={password} onChange={setPassword} error={show('password')} hint="не короче 8 символов" />
        <div className="stack" style={{ gap: 4 }}>
          <Checkbox checked={agree} onChange={setAgree}>
            Согласен на обработку персональных данных
          </Checkbox>
          {show('agree') && <span className="field__error">{show('agree')}</span>}
        </div>
        <Button type="submit" variant="primary" size="lg" block>
          Создать аккаунт
        </Button>
      </form>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [tried, setTried] = useState(false);
  const error = tried && !EMAIL_RE.test(email) ? 'Введите e-mail, на который зарегистрирован аккаунт' : null;

  return (
    <AuthLayout>
      <form
        className="auth__form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (EMAIL_RE.test(email)) setSent(true);
        }}
      >
        <div className="stack stack--sm">
          <h1>Восстановление пароля</h1>
          <p className="muted">Пришлём ссылку для смены пароля. Она действует 24 часа.</p>
        </div>
        {sent ? (
          <Alert tone="ok" title="Письмо отправлено">
            Проверьте {email}, в том числе папку «Спам». (Заглушка: письмо не уходит.)
          </Alert>
        ) : (
          <>
            <TextField label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} error={error} />
            <Button type="submit" variant="primary" size="lg" block>
              Отправить ссылку
            </Button>
          </>
        )}
        <Link to={ROUTES.login}>← Вернуться ко входу</Link>
      </form>
    </AuthLayout>
  );
}
