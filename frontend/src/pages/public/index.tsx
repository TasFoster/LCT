import { Link } from 'react-router-dom';
import { Placeholder } from '../../shared/ui/Placeholder';
import { ROUTES } from '../../shared/config/routes';

export function LandingPage() {
  return (
    <Placeholder
      title="Расчёт роботизации объекта"
      purpose="Подбор техники, экономика и сценарии окупаемости для склада, аэропорта или медучреждения."
    >
      <p>
        <Link to={ROUTES.demo}>Попробовать демо-расчёт</Link> · <Link to={ROUTES.catalog}>Каталог решений</Link>
      </p>
      <p className="placeholder__contracts">
        Готовые макеты: <Link to={ROUTES.wireframeParams}>шаг 2 «Параметры объекта»</Link> ·{' '}
        <Link to={ROUTES.wireframeDashboard}>дашборд сравнения сценариев</Link>
      </p>
    </Placeholder>
  );
}

export function CatalogPage() {
  return (
    <Placeholder
      title="Каталог решений"
      purpose="Список решений с фильтрами по типу, отрасли, грузоподъёмности, навигации и доступности. Виден гостю."
      contracts={['CatalogItem']}
    />
  );
}

export function CatalogItemPage() {
  return (
    <Placeholder
      title="Карточка решения"
      purpose="Все характеристики позиции каталога и переход в расчёт под свой объект."
      contracts={['CatalogItem']}
    />
  );
}

export function DemoPage() {
  return (
    <Placeholder
      title="Демо-расчёт"
      purpose="Визард в гостевом режиме: шаги 1–5, один сценарий, без сохранения и экспорта. Черновик — в sessionStorage."
      contracts={['ProjectInput', 'MatchResult', 'EconomicsResult']}
    />
  );
}
