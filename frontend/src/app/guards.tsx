import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../features/auth/session';
import { ROUTES } from '../shared/config/routes';

/** Гость не видит личный кабинет: уводим на вход и запоминаем, куда он шёл. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const role = useSession((s) => s.role);
  const location = useLocation();

  if (role === 'guest') {
    return <Navigate to={`${ROUTES.login}?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <>{children}</>;
}

/** Вошедший без прав видит 403, а не форму входа — проблема в правах, а не в сессии. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const role = useSession((s) => s.role);
  const location = useLocation();

  if (role === 'guest') {
    return <Navigate to={`${ROUTES.login}?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (role !== 'admin') {
    return <Navigate to={ROUTES.forbidden} replace />;
  }
  return <>{children}</>;
}
