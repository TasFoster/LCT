import { Link } from 'react-router-dom';
import { ROUTES } from '../../shared/config/routes';
import './wireframes.css';

/**
 * Вайрфрейм итогового дашборда сравнения сценариев.
 * Описание: docs/wireframes/dashboard-scenarios.md
 * Данные: EconomicsResult[] (contracts/economics.md), минимум 3 сценария по ТЗ.
 */

const SCENARIOS = [
  { title: 'Базовый', sub: 'без роботизации', base: true },
  { title: 'Покупка ★', sub: 'собственные средства', base: false },
  { title: 'RaaS', sub: 'роботы как услуга', base: false },
  { title: 'Кредит 18 %', sub: 'свой сценарий', base: false },
];

export function DashboardWireframe() {
  return (
    <div className="wf-page">
      <div className="wf-page__caption">
        <h1>Вайрфрейм: итоговый дашборд сравнения сценариев</h1>
        <p>
          Красная линия — граница первого экрана при 1366×768: KPI и таблица сравнения помещаются над ней,
          графики и чувствительность уходят под прокрутку. Описание — docs/wireframes/dashboard-scenarios.md
          · <Link to={ROUTES.wireframeParams}>первый макет: параметры объекта</Link>
        </p>
      </div>

      <div className="wf-frame">
        <div className="wf-fold">
          <span>граница первого экрана — 768 px</span>
        </div>

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
          <strong style={{ color: '#1c1f24' }}>Склад на Ленинградке</strong>
          <span className="wf-chip">Рассчитан</span>
          <span>Версия 3 от 18.09.2026</span>
          <div className="wf-bar__right">
            <span className="wf-btn">Версии</span>
          </div>
        </div>

        <div className="wf-bar wf-bar--actions">
          <strong>Дашборд</strong>
          <span style={{ color: '#6b7280' }}>Отчёт</span>
          <span style={{ color: '#6b7280' }}>Визард</span>
          <div className="wf-bar__right">
            <span style={{ color: '#6b7280' }}>Горизонт расчёта:</span>
            <span className="wf-btn">5 лет ▾</span>
            <span className="wf-btn">Пересчитать</span>
            <span className="wf-btn wf-btn--primary">Экспорт ▾</span>
          </div>
        </div>

        <div className="wf-content">
          {/* Главный ответ — до всякой таблицы */}
          <div className="wf-kpis">
            <div className="wf-kpi">
              <div className="wf-kpi__label">Лучший сценарий</div>
              <div className="wf-kpi__value">Покупка</div>
              <div className="wf-kpi__sub">по сроку окупаемости из 4 сценариев</div>
            </div>
            <div className="wf-kpi">
              <div className="wf-kpi__label">Срок окупаемости</div>
              <div className="wf-kpi__value">2,4 года</div>
              <div className="wf-kpi__sub">простая окупаемость, без дисконтирования</div>
            </div>
            <div className="wf-kpi">
              <div className="wf-kpi__label">Годовой эффект</div>
              <div className="wf-kpi__value">18,4 млн ₽</div>
              <div className="wf-kpi__sub">относительно базового сценария</div>
            </div>
            <div className="wf-kpi">
              <div className="wf-kpi__label">ROI за 5 лет</div>
              <div className="wf-kpi__value">108 %</div>
              <div className="wf-kpi__sub">TCO 96,2 млн ₽</div>
            </div>
          </div>

          <div className="wf-blocktitle">
            <span>Сравнение сценариев</span>
            <span className="wf-btn">+ Добавить сценарий</span>
          </div>

          <table className="wf-table">
            <thead>
              <tr>
                <th>Показатель</th>
                {SCENARIOS.map((s) => (
                  <th key={s.title} className={s.base ? 'wf-col-base' : undefined}>
                    {s.title}
                    <small>{s.sub}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="wf-row-group">
                <td>CAPEX, ₽</td>
                <td className="wf-col-base">0</td>
                <td>42 500 000</td>
                <td>1 200 000</td>
                <td>42 500 000</td>
              </tr>
              <tr className="wf-row-sub">
                <td>оборудование</td>
                <td className="wf-col-base">0</td>
                <td>33 000 000</td>
                <td>0</td>
                <td>33 000 000</td>
              </tr>
              <tr className="wf-row-sub">
                <td>ПО и лицензии</td>
                <td className="wf-col-base">0</td>
                <td>3 200 000</td>
                <td>0</td>
                <td>3 200 000</td>
              </tr>
              <tr className="wf-row-sub">
                <td>внедрение и интеграция</td>
                <td className="wf-col-base">0</td>
                <td>2 400 000</td>
                <td>1 200 000</td>
                <td>2 400 000</td>
              </tr>
              <tr className="wf-row-sub">
                <td className="wf-expand">▸ ещё 4 статьи</td>
                <td className="wf-col-base" />
                <td />
                <td />
                <td />
              </tr>

              <tr className="wf-row-group">
                <td>OPEX, ₽/год</td>
                <td className="wf-col-base">31 200 000</td>
                <td>12 800 000</td>
                <td>21 600 000</td>
                <td>16 900 000</td>
              </tr>
              <tr className="wf-row-sub">
                <td>изменение к базовому</td>
                <td className="wf-col-base">—</td>
                <td>−18 400 000</td>
                <td>−9 600 000</td>
                <td>−14 300 000</td>
              </tr>
              <tr className="wf-row-sub">
                <td className="wf-expand">▸ по статьям: сервис, ПО, энергия, персонал…</td>
                <td className="wf-col-base" />
                <td />
                <td />
                <td />
              </tr>

              <tr>
                <td>Годовой эффект, ₽</td>
                <td className="wf-col-base">—</td>
                <td>18 400 000</td>
                <td>9 600 000</td>
                <td>14 300 000</td>
              </tr>
              <tr>
                <td>Срок окупаемости, лет</td>
                <td className="wf-col-base">—</td>
                <td className="wf-best">2,4 ★</td>
                <td>0,2</td>
                <td>3,1</td>
              </tr>
              <tr>
                <td>ROI за 5 лет, %</td>
                <td className="wf-col-base">—</td>
                <td>108</td>
                <td className="wf-best">412 ★</td>
                <td>67</td>
              </tr>
              <tr>
                <td>TCO за 5 лет, ₽</td>
                <td className="wf-col-base">156 000 000</td>
                <td className="wf-best">96 200 000 ★</td>
                <td>109 200 000</td>
                <td>112 800 000</td>
              </tr>
              <tr>
                <td />
                <td className="wf-col-base">
                  <span className="wf-btn">Открыть</span>
                </td>
                <td>
                  <span className="wf-btn">Открыть</span>
                </td>
                <td>
                  <span className="wf-btn">Открыть</span>
                </td>
                <td>
                  <span className="wf-btn">Открыть</span> <span className="wf-btn">Удалить</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Ниже границы первого экрана */}
          <div className="wf-two">
            <div className="wf-chart">
              <div className="wf-chart__title">Накопленный денежный поток, 5 лет</div>
              <div className="wf-chart__stub">
                Линии по сценариям + точка безубыточности
                <br />
                (в контракте EconomicsResult пока нет ряда по годам — см. открытый вопрос 1)
              </div>
              <div style={{ color: '#6b7280', marginTop: 6 }}>
                Покупка · RaaS · Кредит 18 % — базовый как ноль отсчёта
              </div>
            </div>

            <div className="wf-chart">
              <div className="wf-chart__title">
                Структура затрат: Покупка <span className="wf-btn">CAPEX / OPEX</span>
              </div>
              <div className="wf-bars" style={{ marginTop: 10 }}>
                <div className="wf-bars__row">
                  <span>Оборудование</span>
                  <span className="wf-bars__bar" style={{ width: '78%' }} />
                  <span style={{ textAlign: 'right' }}>33,0 млн</span>
                </div>
                <div className="wf-bars__row">
                  <span>ПО и лицензии</span>
                  <span className="wf-bars__bar" style={{ width: '8%' }} />
                  <span style={{ textAlign: 'right' }}>3,2 млн</span>
                </div>
                <div className="wf-bars__row">
                  <span>Внедрение</span>
                  <span className="wf-bars__bar" style={{ width: '6%' }} />
                  <span style={{ textAlign: 'right' }}>2,4 млн</span>
                </div>
                <div className="wf-bars__row">
                  <span>Пусконаладка</span>
                  <span className="wf-bars__bar" style={{ width: '4%' }} />
                  <span style={{ textAlign: 'right' }}>1,6 млн</span>
                </div>
                <div className="wf-bars__row">
                  <span>Обучение</span>
                  <span className="wf-bars__bar" style={{ width: '2%' }} />
                  <span style={{ textAlign: 'right' }}>0,4 млн</span>
                </div>
                <div className="wf-bars__row">
                  <span>Резерв 10 %</span>
                  <span className="wf-bars__bar" style={{ width: '5%' }} />
                  <span style={{ textAlign: 'right' }}>1,9 млн</span>
                </div>
              </div>
            </div>
          </div>

          <div className="wf-blocktitle">
            <span>Чувствительность — сценарий «Покупка»</span>
            <span className="wf-btn">Сменить сценарий ▾</span>
          </div>
          <table className="wf-table" style={{ marginBottom: 16 }}>
            <thead>
              <tr>
                <th>Параметр</th>
                <th>Изменение</th>
                <th>Срок окупаемости, лет</th>
                <th>ROI, %</th>
                <th>Вывод</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Стоимость оборудования</td>
                <td>+20 %</td>
                <td>2,4 → 2,9</td>
                <td>108 → 84</td>
                <td>окупаемость сохраняется</td>
              </tr>
              <tr>
                <td>Стоимость персонала</td>
                <td>−20 %</td>
                <td>2,4 → 3,2</td>
                <td>108 → 71</td>
                <td>ключевой риск</td>
              </tr>
              <tr>
                <td>Коэффициент загрузки</td>
                <td>−20 %</td>
                <td>2,4 → 3,0</td>
                <td>108 → 79</td>
                <td>окупаемость сохраняется</td>
              </tr>
            </tbody>
          </table>

          <div className="wf-assumptions">
            <strong>ⓘ Допущения расчёта</strong> <span className="wf-expand">Развернуть</span>
            <div style={{ marginTop: 4 }}>
              Горизонт 5 лет. Резерв в CAPEX 10 %. Тариф электроэнергии 7,2 ₽/кВт·ч. Стоимость персонала
              95 000 ₽/мес. Коэффициент загрузки 0,75. Инфляция и дисконтирование не учитываются. Расчёт на
              данных каталога от 12.09.2026.
            </div>
          </div>

          <div className="wf-blocktitle">
            <span>Состав оборудования (сценарий «Покупка»)</span>
            <span className="wf-btn">Изменить на шаге 4 →</span>
          </div>
          <div className="wf-note" style={{ marginBottom: 8 }}>
            12 × AMR X200 (Geek+) · 2 × станция зарядки · 1 × лицензия WMS-интеграции
          </div>
        </div>
      </div>
    </div>
  );
}
