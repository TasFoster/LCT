import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useSession } from '../features/auth/session';
import type { UserRole } from '../features/auth/session';
import { ROUTES } from '../shared/config/routes';
import { initials } from '../shared/lib/format';
import { ButtonLink } from '../shared/ui';

type Theme = 'system' | 'light' | 'dark';

function readTheme(): Theme {
  try {
    const t = localStorage.getItem('robocalc-theme');
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('robocalc-theme', theme);
    } catch {
      /* приватный режим — тема просто не запомнится */
    }
  }, [theme]);
  return [theme, setTheme];
}

const THEME_NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
const THEME_LABEL: Record<Theme, string> = { system: 'Тема: как в системе', light: 'Тема: светлая', dark: 'Тема: тёмная' };
const THEME_ICON: Record<Theme, string> = { system: '◐', light: '☀', dark: '☾' };

export function AppHeader() {
  const { role, userName, signInAs, signOut } = useSession();
  const [theme, setTheme] = useTheme();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <Link to={ROUTES.landing} className="topbar__logo" aria-label="ROBOCALC — на главную">
        <span className="topbar__mark" aria-hidden>
          R
        </span>
        ROBOCALC
      </Link>

      <nav className="topbar__nav" aria-label="Основные разделы">
        <NavLink to={ROUTES.catalog}>Каталог решений</NavLink>
        {role === 'guest' && <NavLink to={ROUTES.demo}>Демо-расчёт</NavLink>}
        {role !== 'guest' && <NavLink to={ROUTES.projects}>Мои проекты</NavLink>}
        {role === 'admin' && <NavLink to={ROUTES.admin}>Администрирование</NavLink>}
      </nav>

      <div className="topbar__right">
        {/* Переключатель роли — временная заглушка вместо авторизации */}
        <label className="role-switch" title="Заглушка вместо авторизации: переключает роль для проверки экранов">
          Роль
          <select
            value={role}
            onChange={(e) => {
              const next = e.target.value as UserRole;
              if (next === 'guest') signOut();
              else signInAs(next);
              navigate(next === 'guest' ? ROUTES.landing : next === 'admin' ? ROUTES.admin : ROUTES.projects);
            }}
          >
            <option value="guest">гость</option>
            <option value="user">пользователь</option>
            <option value="admin">админ</option>
          </select>
        </label>

        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setTheme(THEME_NEXT[theme])}
          title={THEME_LABEL[theme]}
          aria-label={THEME_LABEL[theme]}
        >
          {THEME_ICON[theme]}
        </button>

        {role === 'guest' ? (
          <>
            <ButtonLink to={ROUTES.login} variant="ghost" size="sm">
              Войти
            </ButtonLink>
            <ButtonLink to={ROUTES.register} variant="primary" size="sm">
              Регистрация
            </ButtonLink>
          </>
        ) : (
          <>
            <Link to={ROUTES.profile} className="topbar__user" title="Профиль">
              <span className="avatar">{initials(userName ?? '')}</span>
              <span>{userName}</span>
            </Link>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                signOut();
                navigate(ROUTES.landing);
              }}
            >
              Выйти
            </button>
          </>
        )}
      </div>
    </header>
  );
}
