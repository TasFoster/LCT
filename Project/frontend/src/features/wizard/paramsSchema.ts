/**
 * Описание полей формы «Параметры объекта». Одна форма, три описания —
 * новый ObjectType добавляется новым описанием, а не новой вёрсткой
 * (Документация/Фронтенд и визард/wireframes/02-object-params.md).
 */

import type { ObjectType } from '../../shared/types/contracts';
import {
  ACCESS_RESTRICTIONS,
  AIRPORT_ZONES,
  FACILITY_TYPES,
  LAYOUT_CONSTRAINTS,
  MEDICAL_CARGO_CATEGORIES,
  OPERATING_MODES,
  ROUTES_AND_ELEVATORS,
  SAFETY_REQUIREMENTS,
  SANITARY_REQUIREMENTS,
  STORAGE_TYPES,
  WAREHOUSE_ZONES,
} from '../../shared/mock/dictionaries';

export type FieldKind = 'number' | 'select' | 'combo' | 'tags' | 'dims' | 'cargo' | 'radio';

export interface ParamField {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  unit?: string;
  hint?: string;
  /** Текст для правой панели, когда поле в фокусе */
  help?: string;
  options?: readonly (string | { value: string; label: string })[];
  min?: number;
  /** Выше этого — не ошибка, а предупреждение «проверьте» */
  typicalMax?: number;
  integer?: boolean;
  wide?: boolean;
}

export interface ParamSection {
  id: string;
  title: string;
  help: string;
  fields: ParamField[];
}

const STAFF_SECTION: ParamSection = {
  id: 'staff',
  title: 'Персонал',
  help: 'Из стоимости персонала считается основной экономический эффект: сколько расходов на людей уйдёт после роботизации.',
  fields: [
    { key: 'staff_count', label: 'Численность персонала', kind: 'number', unit: 'чел.', required: true, min: 1, integer: true, typicalMax: 2000, help: 'Сотрудники, чьи операции могут взять на себя роботы — не весь штат объекта.' },
    { key: 'staff_cost_per_month', label: 'Стоимость персонала в месяц', kind: 'number', unit: '₽/мес', required: true, min: 1, typicalMax: 100_000_000, hint: 'на весь персонал, с налогами и взносами', help: 'Как в ТЗ: расходы на ВЕСЬ замещаемый персонал за месяц, а не на одного человека. Полная стоимость для работодателя: зарплата, НДФЛ, страховые взносы. Рядом покажем, сколько это на одного — так видно, не перепутано ли.' },
  ],
};

export const PARAMS_SCHEMA: Record<ObjectType, ParamSection[]> = {
  warehouse: [
    {
      id: 'operations',
      title: 'Режим и объём операций',
      help: 'Приёмку, внутренние перемещения и отгрузку считаем отдельно: у них разная нагрузка на технику и разные маршруты.',
      fields: [
        { key: 'operating_mode', label: 'Режим работы', kind: 'combo', options: OPERATING_MODES, required: true, hint: 'выберите или впишите своё', help: 'От режима зависит, сколько часов в год работает техника, и сколько смен персонала она заменяет.' },
        { key: 'current_throughput_per_hour', label: 'Текущая производительность', kind: 'number', unit: 'операций/ч', required: true, min: 1, typicalMax: 5000, hint: 'сколько объект делает сейчас', help: 'Средняя производительность до роботизации. С ней сравнивается результат симуляции.' },
        { key: 'inbound_ops_per_day', label: 'Приёмка, входящие операции', kind: 'number', unit: 'операций/сутки', required: true, min: 0, typicalMax: 50_000, help: 'Сколько грузовых единиц принимается за сутки.' },
        { key: 'internal_ops_per_day', label: 'Внутрискладские операции', kind: 'number', unit: 'операций/сутки', required: true, min: 0, typicalMax: 100_000, help: 'Перемещения между зонами. Если учёт ведётся только суммарно — впишите всё сюда, подбор это допускает.' },
        { key: 'outbound_ops_per_day', label: 'Отгрузка, исходящие операции', kind: 'number', unit: 'операций/сутки', required: true, min: 0, typicalMax: 50_000, wide: true, help: 'Сколько грузовых единиц отгружается за сутки.' },
      ],
    },
    {
      id: 'cargo',
      title: 'Груз',
      help: 'По массе и габаритам груза отсекается техника, которая его физически не увезёт.',
      fields: [
        { key: 'unit_load_weight_kg', label: 'Масса грузовой единицы', kind: 'number', unit: 'кг', required: true, min: 0.1, typicalMax: 3000, help: 'Масса типичной паллеты или короба с товаром. Если грузы разные — укажите максимальную массу, которую нужно возить.' },
        { key: 'unit_load_dimensions_mm', label: 'Габариты грузовой единицы', kind: 'dims', unit: 'мм, Д×Ш×В', required: true, hint: 'например 1200×800×1450', help: 'Европаллета — 1200×800, финская — 1200×1000. Высота — вместе с грузом.' },
        { key: 'sku_count', label: 'Количество SKU', kind: 'number', unit: 'шт.', required: true, min: 1, integer: true, typicalMax: 500_000, help: 'Число уникальных товарных позиций. Влияет на выбор между «человек к товару» и «товар к человеку».' },
      ],
    },
    {
      id: 'premises',
      title: 'Помещение',
      help: 'Площадь и ограничения планировки определяют, какая техника вообще проедет по объекту.',
      fields: [
        { key: 'area_sqm', label: 'Площадь склада', kind: 'number', unit: 'м²', required: true, min: 1, typicalMax: 300_000, help: 'Общая площадь складского помещения.' },
        { key: 'available_area_sqm', label: 'Доступная площадь под роботизацию', kind: 'number', unit: 'м²', min: 0, hint: 'необязательно; не больше площади склада', help: 'Если роботизируется только часть склада — укажите её площадь. Пустое поле = весь склад.' },
        { key: 'storage_type', label: 'Тип хранения', kind: 'select', options: STORAGE_TYPES, required: true, help: 'Тип стеллажей определяет, нужен ли подъём груза на высоту.' },
        { key: 'route_length_m', label: 'Протяжённость маршрутов', kind: 'number', unit: 'м', required: true, min: 1, typicalMax: 20_000, help: 'Суммарная длина основных маршрутов перемещения грузов.' },
        { key: 'working_zones', label: 'Рабочие зоны', kind: 'tags', options: WAREHOUSE_ZONES, required: true, wide: true, help: 'Зоны потом появятся на 2D-плане на шаге «Визуализация».' },
        { key: 'layout_constraints', label: 'Ограничения планировки', kind: 'tags', options: LAYOUT_CONSTRAINTS, wide: true, hint: 'необязательно; влияет на подбор: техника, которой нужен проход шире, будет исключена', help: 'Каждое ограничение проверяется правилами совместимости — несовместимая техника уйдёт в «Исключено» с объяснением.' },
      ],
    },
    STAFF_SECTION,
  ],

  airport: [
    {
      id: 'zone',
      title: 'Зона и режим',
      help: 'В закрытой зоне допуск техники согласуется со службой безопасности — это отражается в подборе как «требует проверки».',
      fields: [
        { key: 'operation_zone', label: 'Зона операции', kind: 'select', options: AIRPORT_ZONES, required: true, help: 'Где будет работать техника.' },
        { key: 'operating_mode', label: 'Режим работы', kind: 'combo', options: OPERATING_MODES, required: true, help: 'От режима зависит годовая наработка техники.' },
        {
          key: 'zone_access',
          label: 'Доступность зоны',
          kind: 'radio',
          required: true,
          options: [
            { value: 'open', label: 'Открытая' },
            { value: 'closed', label: 'Закрытая' },
          ],
          help: 'Закрытая зона — контролируемая территория с пропускным режимом.',
        },
      ],
    },
    {
      id: 'flows',
      title: 'Потоки',
      help: 'Пассажиро- и грузопоток необязательны по отдельности, но хотя бы один из них нужен — иначе подбор не на чем строить.',
      fields: [
        { key: 'passenger_flow_per_day', label: 'Пассажиропоток', kind: 'number', unit: 'пасс./сутки', hint: 'необязательно, если указан грузопоток', min: 0, typicalMax: 300_000, help: 'Среднесуточный пассажиропоток в зоне работ.' },
        { key: 'cargo_flow_tons_per_day', label: 'Грузопоток', kind: 'number', unit: 'т/сутки', hint: 'необязательно, если указан пассажиропоток', min: 0, typicalMax: 5000, help: 'Масса багажа или грузов в сутки.' },
        { key: 'ops_count_per_day', label: 'Количество операций в сутки', kind: 'number', unit: 'операций/сутки', required: true, min: 1, typicalMax: 100_000, help: 'Рейсы тележек, перевозки, циклы уборки — то, что будет делать техника.' },
        { key: 'peak_load_per_hour', label: 'Пиковая нагрузка', kind: 'number', unit: 'операций/ч', required: true, min: 1, typicalMax: 10_000, help: 'Техника подбирается под пик, а не под среднее.' },
      ],
    },
    {
      id: 'cargo',
      title: 'Груз и маршруты',
      help: 'Масса и габариты перевозимого объекта отсекают технику, которая его не увезёт.',
      fields: [
        { key: 'unit_weight_kg', label: 'Масса объекта перевозки', kind: 'number', unit: 'кг', required: true, min: 0.1, typicalMax: 10_000, help: 'Например, гружёная багажная тележка.' },
        { key: 'unit_dimensions_mm', label: 'Габариты объекта', kind: 'dims', unit: 'мм, Д×Ш×В', required: true, help: 'Габариты с грузом.' },
        { key: 'route_length_m', label: 'Протяжённость маршрутов', kind: 'number', unit: 'м', required: true, min: 1, typicalMax: 50_000, wide: true, help: 'Длина основных маршрутов в одну сторону.' },
      ],
    },
    STAFF_SECTION,
    {
      id: 'safety',
      title: 'Безопасность',
      help: 'Требования безопасности проверяются правилами совместимости.',
      fields: [{ key: 'safety_requirements', label: 'Требования безопасности', kind: 'tags', options: SAFETY_REQUIREMENTS, required: true, wide: true, hint: 'если особых требований нет — выберите «Особых требований нет»', help: 'Например, работа при низких температурах или ограничение скорости.' }],
    },
  ],

  medical: [
    {
      id: 'facility',
      title: 'Учреждение',
      help: 'Этажность важна: техника без работы с лифтами на многоэтажном объекте будет исключена.',
      fields: [
        { key: 'facility_type', label: 'Тип учреждения', kind: 'select', options: FACILITY_TYPES, required: true, help: 'Тип учреждения влияет на санитарные требования по умолчанию.' },
        { key: 'operating_mode', label: 'Режим работы', kind: 'combo', options: OPERATING_MODES, required: true, help: 'Стационар обычно работает 24/7.' },
        { key: 'area_sqm', label: 'Площадь', kind: 'number', unit: 'м²', required: true, min: 1, typicalMax: 500_000, help: 'Площадь корпусов, где будет работать техника.' },
        { key: 'floors_count', label: 'Количество этажей', kind: 'number', unit: 'этажей', required: true, min: 1, integer: true, typicalMax: 40, help: 'Максимальная этажность корпусов на маршрутах.' },
      ],
    },
    {
      id: 'flows',
      title: 'Потоки грузов',
      help: 'Потоки по категориям нужны раздельно: бельё и отходы не возят той же техникой, что медикаменты.',
      fields: [{ key: 'cargo_volume_per_day', label: 'Объём перевозок по категориям', kind: 'cargo', unit: 'рейсов/сутки', wide: true, help: 'Сколько рейсов в сутки по каждой категории. Пустые категории не учитываются.' }],
    },
    {
      id: 'routes',
      title: 'Маршруты и лифты',
      help: 'Лифты — главное узкое место внутренней логистики больницы.',
      fields: [{ key: 'routes_and_elevators', label: 'Маршруты и лифты', kind: 'tags', options: ROUTES_AND_ELEVATORS, required: true, wide: true, help: 'Перечислите лифты и переходы, которыми может пользоваться техника.' }],
    },
    STAFF_SECTION,
    {
      id: 'sanitary',
      title: 'Санитария и доступ',
      help: 'Санитарные требования и ограничения доступа проверяются правилами совместимости.',
      fields: [
        { key: 'sanitary_requirements', label: 'Санитарные требования', kind: 'tags', options: SANITARY_REQUIREMENTS, required: true, wide: true, help: 'Например, раздельные потоки чистого и грязного.' },
        { key: 'access_restrictions', label: 'Ограничения доступа', kind: 'tags', options: ACCESS_RESTRICTIONS, required: true, wide: true, hint: 'если ограничений нет — выберите «Ограничений нет»', help: 'Зоны, куда технике нельзя.' },
      ],
    },
  ],
};

export { MEDICAL_CARGO_CATEGORIES };

/** Значение поля для показа (отчёт, сводка): id справочника → подпись. */
export function displayParamValue(f: ParamField, v: unknown): string {
  const opts = (f.options ?? []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const one = (x: unknown) => {
    const str = String(x);
    return opts.find((o) => o.value === str)?.label ?? (str.startsWith('custom:') ? str.slice(7) : str);
  };
  if (Array.isArray(v)) return v.map(one).join(', ');
  if (typeof v === 'number') return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(v) + (f.unit ? ` ${f.unit}` : '');
  if (v && typeof v === 'object') {
    return Object.entries(v as Record<string, number>)
      .map(([k, n]) => `${MEDICAL_CARGO_CATEGORIES.find((c) => c.key === k)?.label ?? k}: ${n}`)
      .join(', ');
  }
  return one(v);
}

export type ParamValues = Record<string, unknown>;

export interface FieldIssue {
  error?: string;
  warning?: string;
}

const DIMS_RE = /^\s*\d+(?:[.,]\d+)?\s*[×xх*]\s*\d+(?:[.,]\d+)?\s*[×xх*]\s*\d+(?:[.,]\d+)?\s*$/i;

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
}

/** Проверка значений по описанию: ошибки блокируют «Далее», предупреждения — нет. */
export function validateParams(type: ObjectType, values: ParamValues): Record<string, FieldIssue> {
  const issues: Record<string, FieldIssue> = {};
  for (const section of PARAMS_SCHEMA[type]) {
    for (const f of section.fields) {
      const v = values[f.key];
      if (f.required && isEmpty(v)) {
        issues[f.key] = { error: 'Заполните поле — без него расчёт не построить' };
        continue;
      }
      if (f.kind === 'number' && typeof v === 'number') {
        if (f.min !== undefined && v < f.min) {
          issues[f.key] = {
            error: f.min > 0 ? `Укажите значение больше 0` : `Значение не может быть отрицательным`,
          };
        } else if (f.integer && !Number.isInteger(v)) {
          issues[f.key] = { error: 'Укажите целое число' };
        } else if (f.typicalMax !== undefined && v > f.typicalMax) {
          issues[f.key] = { warning: 'Необычно большое значение — проверьте, нет ли лишнего нуля' };
        }
      }
      if (f.kind === 'dims' && typeof v === 'string' && v && !DIMS_RE.test(v)) {
        issues[f.key] = { error: 'Введите три числа через «×»: длина×ширина×высота' };
      }
    }
  }

  // Межполевые правила
  if (type === 'warehouse') {
    const area = values.area_sqm;
    const avail = values.available_area_sqm;
    if (typeof area === 'number' && typeof avail === 'number' && avail > area) {
      issues.available_area_sqm = { error: 'Доступная площадь не может быть больше площади склада' };
    }
    if (values.outbound_ops_per_day === 0 && !issues.outbound_ops_per_day) {
      issues.outbound_ops_per_day = { warning: 'Отгрузки нет? Тогда техника под отгрузку подбираться не будет' };
    }
  }
  if (type === 'airport') {
    if (isEmpty(values.passenger_flow_per_day) && isEmpty(values.cargo_flow_tons_per_day)) {
      issues.passenger_flow_per_day = { error: 'Укажите пассажиропоток или грузопоток — хотя бы одно' };
    }
  }
  if (type === 'medical') {
    const cargo = (values.cargo_volume_per_day ?? {}) as Record<string, number>;
    if (!Object.values(cargo).some((n) => typeof n === 'number' && n > 0)) {
      issues.cargo_volume_per_day = { error: 'Укажите объём хотя бы по одной категории' };
    }
  }
  return issues;
}

export function sectionProgress(type: ObjectType, values: ParamValues, sectionId: string) {
  const section = PARAMS_SCHEMA[type].find((s) => s.id === sectionId);
  if (!section) return { filled: 0, total: 0 };
  const req = section.fields.filter((f) => f.required || f.kind === 'cargo');
  const filled = req.filter((f) => {
    const v = values[f.key];
    if (f.kind === 'cargo') return Object.values((v ?? {}) as Record<string, number>).some((n) => n > 0);
    return !isEmpty(v);
  }).length;
  return { filled, total: req.length };
}
