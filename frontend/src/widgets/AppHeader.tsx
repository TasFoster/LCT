import { Link, NavLink } from 'react-router-dom';
import { useSession } from '../features/auth/session';
import { ROUTES } from '../shared/config/routes';

export function AppHeader() {
  const { role, userName, signInAs, signOut } = useSession();

  return (
    <header className="app-header">
      <Link to={ROUTES.landing} className="app-header__logo">
        ROBOCALC
      </Link>
      <nav className="app-header__nav">
        <NavLink to={ROUTES.catalog}>Каталог</NavLink>
        {role !== 'guest' && <NavLink to={ROUTES.projects}>Мои проекты</NavLink>}
        {role === 'admin' && <NavLink to={ROUTES.admin}>Администрирование</NavLink>}
      </nav>
      <div className="app-header__user">
        {/* Переключатель роли — временная заглушка вместо авторизации */}
        {role === 'guest' ? (
          <>
            <button type="button" onClick={() => signInAs('user')}>
              Войти как пользователь
            </button>
            <button type="button" onClick={() => signInAs('admin')}>
              Войти как админ
            </button>
          </>
        ) : (
          <>
            <span>{userName}</span>
            <button type="button" onClick={signOut}>
              Выйти
            </button>
          </>
        )}
      </div>
    </header>
  );
}
