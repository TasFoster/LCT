import { Placeholder } from '../../shared/ui/Placeholder';

export function AdminHomePage() {
  return (
    <Placeholder
      title="Администрирование"
      purpose="Сводка: позиций в каталоге, из них непроверенных, правил совместимости, устаревших записей, пользователей."
    />
  );
}

export function AdminCatalogPage() {
  return (
    <Placeholder
      title="Каталог: управление"
      purpose="Таблица позиций, массовые действия, импорт и экспорт CSV/Excel, фильтр по достоверности и доступности."
      contracts={['CatalogItem']}
    />
  );
}

export function AdminCatalogItemPage() {
  return (
    <Placeholder
      title="Позиция каталога"
      purpose="Форма по группам полей: идентификация, технические, инфраструктура, экономика, применимость, качество данных."
      contracts={['CatalogItem']}
    />
  );
}

export function AdminRulesPage() {
  return (
    <Placeholder
      title="Правила совместимости"
      purpose="Плоская таблица правил: условие по оборудованию, условие по объекту, вердикт, причина, источник."
      contracts={['CompatibilityRule']}
    />
  );
}

export function AdminDictionariesPage() {
  return (
    <Placeholder
      title="Справочники"
      purpose="Типы решений, процессы, зоны, режимы работы, ограничения планировки, единицы измерения."
    />
  );
}

export function AdminAssumptionsPage() {
  return (
    <Placeholder
      title="Допущения расчёта"
      purpose="Дефолты экономики: тариф электроэнергии, ставка, резерв CAPEX, горизонт TCO, наборы для чувствительности."
      contracts={['EconInput']}
    />
  );
}

export function AdminUsersPage() {
  return <Placeholder title="Пользователи" purpose="Список пользователей, роли, блокировка." />;
}
