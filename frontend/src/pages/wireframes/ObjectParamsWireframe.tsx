import { Link } from 'react-router-dom';
import { ROUTES, WIZARD_STEPS } from '../../shared/config/routes';
import './wireframes.css';

/**
 * Вайрфрейм шага 2 «Параметры объекта» (склад).
 * Не дизайн — расположение блоков и поведение формы.
 * Описание: docs/wireframes/02-object-params.md
 * Данные: WarehouseParams (contracts/project_input.md)
 */
export function ObjectParamsWireframe() {
  return (
    <div className="wf-page">
      <div className="wf-page__caption">
        <h1>Вайрфрейм: шаг 2 «Параметры объекта» (склад)</h1>
        <p>
          Кадр 1366×768 — рабочее разрешение по НФТ. Прокручивается только колонка формы: навигация по
          разделам и кнопка «Далее» видны всегда. Описание — docs/wireframes/02-object-params.md ·{' '}
          <Link to={ROUTES.wireframeDashboard}>второй макет: дашборд</Link>
        </p>
      </div>

      <div className="wf-frame wf-frame--fixed">
        <div className="wf-bar wf-bar--app">
          <span>ROBOCALC</span>
          <span style={{ fontWeight: 400 }}>Каталог</span>
          <span style={{ fontWeight: 400 }}>Мои проекты</span>
          <div className="wf-bar__right" style={{ fontWeight: 400 }}>
            <span>Иван Петров ▾</span>
          </div>
        </div>

        <div className="wf-bar wf-bar--project">
          <span>‹ К проектам</span>
          <strong style={{ color: '#1c1f24' }}>Склад на Ленинградке ✎</strong>
          <span className="wf-chip">Черновик</span>
          <span>Сохранено в 12:04</span>
          <div className="wf-bar__right">
            <span className="wf-btn">Версии</span>
            <span className="wf-btn">Дашборд</span>
          </div>
        </div>

        <ol className="wf-stepper">
          {WIZARD_STEPS.map((step, index) => (
            <li
              key={step.slug}
              className={`wf-stepper__item ${index === 1 ? 'is-current' : index < 1 ? 'is-done' : ''}`}
            >
              <span className="wf-stepper__num">{index + 1}</span>
              {step.title}
            </li>
          ))}
        </ol>

        <div className="wf-body">
          {/* Левая колонка: разделы формы и состояние заполнения */}
          <aside className="wf-col wf-col--nav">
            <p className="wf-label">Разделы</p>
            <ul className="wf-navlist">
              <li>
                <span>✓ Помещение</span>
                <span>6 / 6</span>
              </li>
              <li className="is-current">
                <span>Режим и объём</span>
                <span>3 / 5</span>
              </li>
              <li>
                <span>Груз</span>
                <span>1 / 3</span>
              </li>
              <li>
                <span>Персонал</span>
                <span>0 / 2</span>
              </li>
            </ul>

            <p className="wf-label" style={{ marginBottom: 2 }}>
              Заполнено 10 из 16
            </p>
            <div className="wf-progress">
              <span style={{ width: '62%' }} />
            </div>

            <div className="wf-note wf-note--warning" style={{ marginTop: 16 }}>
              1 ошибка в разделе «Режим и объём»
              <br />
              <u>Перейти к ней →</u>
            </div>
          </aside>

          {/* Центральная колонка: сама форма, единственная прокручиваемая область */}
          <section className="wf-col wf-col--form">
            <div className="wf-blocktitle">
              <span style={{ fontSize: 15 }}>Параметры склада</span>
              <span className="wf-btn wf-btn--ghost">Импорт из Excel / CSV ⭱</span>
            </div>
            <p style={{ color: '#6b7280', marginTop: 0 }}>
              Поля со звёздочкой обязательны. Единицы измерения указаны в каждом поле — вводите числа как
              есть.
            </p>

            <div className="wf-section">
              <h3 className="wf-section__title">Режим и объём операций</h3>
              <div className="wf-grid2">
                <div>
                  <span className="wf-field__label">
                    Режим работы <span className="wf-field__req">*</span>
                  </span>
                  <div className="wf-input">
                    <span>24/7</span>
                    <span className="wf-input__unit">▾</span>
                  </div>
                  <div className="wf-field__hint">из справочника, можно добавить свой</div>
                </div>
                <div>
                  <span className="wf-field__label">
                    Текущая производительность <span className="wf-field__req">*</span>
                  </span>
                  <div className="wf-input">
                    <span>120</span>
                    <span className="wf-input__unit">операций/час</span>
                  </div>
                  <div className="wf-field__hint">сколько объект делает сейчас, до роботизации</div>
                </div>
                <div>
                  <span className="wf-field__label">
                    Приёмка, входящие операции <span className="wf-field__req">*</span>
                  </span>
                  <div className="wf-input">
                    <span>1 200</span>
                    <span className="wf-input__unit">операций/сутки</span>
                  </div>
                </div>
                <div>
                  <span className="wf-field__label">
                    Внутрискладские операции <span className="wf-field__req">*</span>
                  </span>
                  <div className="wf-input">
                    <span>3 400</span>
                    <span className="wf-input__unit">операций/сутки</span>
                  </div>
                </div>
                <div className="wf-field--wide">
                  <span className="wf-field__label">
                    Отгрузка, исходящие операции <span className="wf-field__req">*</span>
                  </span>
                  <div className="wf-input wf-input--error">
                    <span>0</span>
                    <span className="wf-input__unit">операций/сутки</span>
                  </div>
                  <div className="wf-field__msg">
                    Укажите значение больше 0 — иначе подбор не найдёт технику под отгрузку. Если отгрузки
                    нет, отметьте раздел «Отгрузки нет» ниже.
                  </div>
                </div>
              </div>
            </div>

            <div className="wf-section">
              <h3 className="wf-section__title">Груз</h3>
              <div className="wf-grid2">
                <div>
                  <span className="wf-field__label">
                    Масса грузовой единицы <span className="wf-field__req">*</span>
                  </span>
                  <div className="wf-input wf-input--empty">
                    <span>не заполнено</span>
                    <span className="wf-input__unit">кг</span>
                  </div>
                </div>
                <div>
                  <span className="wf-field__label">
                    Габариты грузовой единицы <span className="wf-field__req">*</span>
                  </span>
                  <div className="wf-input">
                    <span>1200 × 800 × 1450</span>
                    <span className="wf-input__unit">мм, Д×Ш×В</span>
                  </div>
                </div>
                <div>
                  <span className="wf-field__label">
                    Количество SKU <span className="wf-field__req">*</span>
                  </span>
                  <div className="wf-input wf-input--empty">
                    <span>не заполнено</span>
                    <span className="wf-input__unit">шт.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="wf-section">
              <h3 className="wf-section__title">Помещение</h3>
              <div className="wf-grid2">
                <div>
                  <span className="wf-field__label">
                    Площадь склада <span className="wf-field__req">*</span>
                  </span>
                  <div className="wf-input">
                    <span>12 500</span>
                    <span className="wf-input__unit">м²</span>
                  </div>
                </div>
                <div>
                  <span className="wf-field__label">Доступная площадь под роботизацию</span>
                  <div className="wf-input">
                    <span>4 200</span>
                    <span className="wf-input__unit">м²</span>
                  </div>
                  <div className="wf-field__hint">необязательно; не больше площади склада</div>
                </div>
                <div>
                  <span className="wf-field__label">
                    Тип хранения <span className="wf-field__req">*</span>
                  </span>
                  <div className="wf-input">
                    <span>Фронтальные стеллажи</span>
                    <span className="wf-input__unit">▾</span>
                  </div>
                </div>
                <div>
                  <span className="wf-field__label">
                    Протяжённость маршрутов <span className="wf-field__req">*</span>
                  </span>
                  <div className="wf-input">
                    <span>1 800</span>
                    <span className="wf-input__unit">м</span>
                  </div>
                </div>
                <div className="wf-field--wide">
                  <span className="wf-field__label">Рабочие зоны</span>
                  <div className="wf-input">
                    <span>Приёмка ✕ · Хранение ✕ · Комплектация ✕ · Отгрузка ✕ &nbsp; + Добавить</span>
                  </div>
                </div>
                <div className="wf-field--wide">
                  <span className="wf-field__label">Ограничения планировки</span>
                  <div className="wf-input">
                    <span>Проходы 2,2 м ✕ · Колонны 6×6 м ✕ &nbsp; + Добавить</span>
                  </div>
                  <div className="wf-field__hint">
                    влияет на подбор: техника с требованием прохода шире 2,2 м будет исключена
                  </div>
                </div>
              </div>
            </div>

            <div className="wf-section">
              <h3 className="wf-section__title">Персонал</h3>
              <div className="wf-grid2">
                <div>
                  <span className="wf-field__label">
                    Численность персонала <span className="wf-field__req">*</span>
                  </span>
                  <div className="wf-input wf-input--empty">
                    <span>не заполнено</span>
                    <span className="wf-input__unit">чел.</span>
                  </div>
                </div>
                <div>
                  <span className="wf-field__label">
                    Стоимость одного сотрудника <span className="wf-field__req">*</span>
                  </span>
                  <div className="wf-input wf-input--empty">
                    <span>не заполнено</span>
                    <span className="wf-input__unit">₽/мес</span>
                  </div>
                  <div className="wf-field__hint">с налогами и взносами — из этого считается эффект</div>
                </div>
              </div>
            </div>
          </section>

          {/* Правая колонка: подсказка к активному полю и связь с подбором */}
          <aside className="wf-col wf-col--hints">
            <p className="wf-label">Подсказка</p>
            <div className="wf-note wf-note--info">
              <strong>Операции в сутки</strong>
              <p style={{ margin: '6px 0 0' }}>
                Приёмку, внутренние перемещения и отгрузку считаем отдельно: у них разная нагрузка на
                технику и разные маршруты.
              </p>
              <p style={{ margin: '6px 0 0' }}>
                Если учёт ведётся только суммарно — впишите всё во «Внутрискладские операции», подбор это
                допускает.
              </p>
            </div>

            <p className="wf-label" style={{ marginTop: 20 }}>
              Что дальше
            </p>
            <div className="wf-note">
              По этим данным на шаге 3 подберём технику из каталога:
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                <li>грузоподъёмность ≥ массы грузовой единицы</li>
                <li>ширина прохода ≤ ограничений планировки</li>
                <li>производительность покрывает операции в сутки</li>
              </ul>
            </div>

            <p className="wf-label" style={{ marginTop: 20 }}>
              Черновик
            </p>
            <div className="wf-note">
              Автосохранение каждые 2 секунды. Можно закрыть вкладку и вернуться — введённое не пропадёт.
            </div>
          </aside>
        </div>

        <div className="wf-footer">
          <span className="wf-btn">← Назад: тип объекта</span>
          <div className="wf-footer__right">
            <span style={{ color: '#6b7280' }}>Заполните 4 обязательных поля и исправьте 1 ошибку</span>
            <span className="wf-btn">Сохранить черновик</span>
            <span className="wf-btn wf-btn--disabled">Далее: подбор →</span>
          </div>
        </div>
      </div>
    </div>
  );
}
