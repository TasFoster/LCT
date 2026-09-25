import { NavLink, Outlet } from 'react-router-dom';
import { CATALOG } from '../../shared/mock/catalog';
import { RULES, USERS } from '../../shared/mock/admin';
import { ROUTES } from '../../shared/config/routes';

export function AdminLayout() {
  return (
    <div className="admin-shell">
      <nav className="admin-nav" aria-label="Администрирование">
        <span className="label">Администрирование</span>
        <NavLink to={ROUTES.admin} end>
          Сводка
        </NavLink>
        <span className="label" style={{ marginTop: 10 }}>
          Каталог
        </span>
        <NavLink to={ROUTES.adminCatalog}>
          Позиции <span className="faint num">{CATALOG.length}</span>
        </NavLink>
        <NavLink to={ROUTES.adminRules}>
          Правила совместимости <span className="faint num">{RULES.length}</span>
        </NavLink>
        <span className="label" style={{ marginTop: 10 }}>
          Настройки
        </span>
        <NavLink to={ROUTES.adminDictionaries}>Справочники</NavLink>
        <NavLink to={ROUTES.adminAssumptions}>Допущения расчёта</NavLink>
        <NavLink to={ROUTES.adminUsers}>
          Пользователи <span className="faint num">{USERS.length}</span>
        </NavLink>
      </nav>
      <div>
        <Outlet />
      </div>
    </div>
  );
}
