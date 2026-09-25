import { Link } from 'react-router-dom';
import { useSession } from '../../features/auth/session';
import { CATALOG } from '../../shared/mock/catalog';
import { OBJECT_TYPES } from '../../shared/mock/dictionaries';
import { OBJECT_ICON } from '../../shared/mock/projects';
import { ROUTES } from '../../shared/config/routes';
import { ButtonLink } from '../../shared/ui';

const HOW = [
  { n: '01', title: 'Опишите объект', text: 'Площадь, операции в сутки, груз, персонал — с подсказками к каждому полю.' },
  { n: '02', title: 'Получите подбор', text: 'Техника из каталога, ранжированная под ваш объект, с объяснением каждой оценки.' },
  { n: '03', title: 'Сравните сценарии', text: 'Покупка, кредит, лизинг или роботы как услуга — CAPEX, OPEX, окупаемость, ROI.' },
  { n: '04', title: 'Сохраните отчёт', text: 'Версии расчёта, итоговый дашборд и выгрузка для руководства.' },
];

/** Главная: что считает сервис и вход в демо-расчёт. */
export function LandingPage() {
  const role = useSession((s) => s.role);
  const solutionTypes = new Set(CATALOG.map((c) => c.identification.solution_type)).size;

  return (
    <div className="page stack--lg" style={{ gap: 40 }}>
      <section className="hero">
        <div className="stack" style={{ gap: 20 }}>
          <span className="label" style={{ color: 'var(--accent)' }}>
            Подбор роботизации и расчёт окупаемости
          </span>
          <h1>Окупится ли роботизация вашего склада — посчитаем за 15 минут</h1>
          <p className="hero__lede">
            Подберём технику под параметры объекта, сравним способы финансирования и покажем срок окупаемости с явными допущениями — без продавца
            и без Excel.
          </p>
          <div className="row" style={{ gap: 12 }}>
            {role === 'guest' ? (
              <>
                <ButtonLink to={ROUTES.demo} variant="primary" size="lg">
                  Рассчитать бесплатно
                </ButtonLink>
                <ButtonLink to={ROUTES.catalog} size="lg">
                  Смотреть каталог
                </ButtonLink>
              </>
            ) : (
              <>
                <ButtonLink to={ROUTES.newProject} variant="primary" size="lg">
                  Новый проект
                </ButtonLink>
                <ButtonLink to={ROUTES.projects} size="lg">
                  Мои проекты
                </ButtonLink>
              </>
            )}
          </div>
          {role === 'guest' && <p className="faint">Демо-расчёт — без регистрации. Чтобы сохранить результат, понадобится аккаунт.</p>}
        </div>

        <div className="hero__visual" aria-hidden>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }} className="row row--between">
            <strong>Склад в Химках · 12 500 м²</strong>
            <span className="chip chip--ok">рассчитан</span>
          </div>
          <div className="grid grid--2" style={{ padding: 18, gap: 12 }}>
            <div className="stat stat--accent">
              <span className="label">Окупаемость</span>
              <span className="stat__value">2,4 года</span>
            </div>
            <div className="stat">
              <span className="label">Годовой эффект</span>
              <span className="stat__value">17 млн ₽</span>
            </div>
          </div>
          <div style={{ padding: '0 18px 18px' }} className="stack stack--sm">
            {[
              ['Покупка', 88, 'var(--ok)'],
              ['Кредит 18 %', 68, 'var(--info)'],
              ['RaaS', 52, 'var(--faint)'],
            ].map(([t, w, c]) => (
              <div key={t as string} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10, alignItems: 'center' }}>
                <span className="muted">{t}</span>
                <div className="bar">
                  <span style={{ width: `${w}%`, background: c as string }} />
                </div>
              </div>
            ))}
            <span className="faint" style={{ fontSize: 12 }}>
              Пример расчёта — демонстрационные данные
            </span>
          </div>
        </div>
      </section>

      <section className="steps-strip">
        {HOW.map((h) => (
          <div key={h.n}>
            <span className="mono">{h.n}</span>
            <h3>{h.title}</h3>
            <p className="muted">{h.text}</p>
          </div>
        ))}
      </section>

      <section className="stack">
        <div className="row row--between">
          <h2>Для каких объектов</h2>
          <Link to={ROUTES.catalog}>
            {CATALOG.length} решений {solutionTypes} типов в каталоге →
          </Link>
        </div>
        <div className="grid grid--3">
          {OBJECT_TYPES.map((o) => (
            <div key={o.value} className="card card__body stack stack--sm">
              <span style={{ fontSize: 26 }} aria-hidden>
                {OBJECT_ICON[o.value]}
              </span>
              <h3>{o.label}</h3>
              <p className="muted">{o.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="row row--between faint" style={{ borderTop: '1px solid var(--line)', paddingTop: 18 }}>
        <span>
          ROBOCALC · расчёт роботизации объектов ·{' '}
          <a href={`${import.meta.env.BASE_URL}screen-map.html`}>Карта экранов и макеты</a>
        </span>
        <span>Цифры в расчёте ориентировочные; допущения показываются в каждом результате.</span>
      </footer>
    </div>
  );
}
