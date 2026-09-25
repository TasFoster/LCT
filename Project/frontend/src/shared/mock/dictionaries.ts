/**
 * Справочники-заглушки. Потом приходят из /admin/dictionaries через API
 * (открытый вопрос 3 в Документация/Фронтенд и визард/architecture/pages.md).
 */

import { CATEGORIES, optionsOf } from '../dictionaries';
import type { ObjectType, ScenarioKind, FinancingType, AvailabilityStatus, MatchStatus, ProjectStatus, NavigationType, CompatibilityVerdict, CatalogDataQuality, AcquisitionModel } from '../types/contracts';

/** Достоверность данных каталога — поле CatalogItem.data_quality.confidence */
export type DataConfidence = CatalogDataQuality['confidence'];

export const OBJECT_TYPES: { value: ObjectType; label: string; short: string; description: string; needs: string[] }[] = [
  {
    value: 'warehouse',
    label: 'Склад',
    short: 'Склад',
    description: 'Приёмка, хранение, комплектация и отгрузка: AMR, штабелёры, тягачи, автоматические хранилища.',
    needs: ['площадь и планировка', 'операции в сутки', 'груз: масса и габариты', 'персонал и его стоимость'],
  },
  {
    value: 'airport',
    label: 'Аэропорт',
    short: 'Аэропорт',
    description: 'Перрон, терминал, багажное отделение: буксировка, доставка, уборка, перевозка багажа.',
    needs: ['зона работ и доступ', 'пассажиро- или грузопоток', 'пиковая нагрузка', 'требования безопасности'],
  },
  {
    value: 'medical',
    label: 'Медучреждение',
    short: 'Медицина',
    description: 'Внутренняя логистика больницы: бельё, питание, медикаменты, отходы — с учётом лифтов и санитарии.',
    needs: ['площадь и этажность', 'потоки грузов по категориям', 'маршруты и лифты', 'санитарные требования'],
  },
];

export const objectTypeLabel = (t: ObjectType) => OBJECT_TYPES.find((o) => o.value === t)?.label ?? t;

/*
 * Списки для форм и фильтров — из единого справочника contracts/dictionaries/categories.json
 * (его же читают редактор плана и бэкенд). Здесь только адаптеры под компоненты.
 */

/** Режим работы по списку ТЗ — свободный текст; справочник даёт только подсказки. */
export const OPERATING_MODES = CATEGORIES.operating_modes.map((m) => m.label);
export const STORAGE_TYPES = optionsOf('storage_types');
export const WAREHOUSE_ZONES = CATEGORIES.working_zones
  .filter((z) => z.object_types.includes('warehouse'))
  .map((z) => ({ value: z.id, label: z.label }));
export const LAYOUT_CONSTRAINTS = optionsOf('layout_constraints');
export const AIRPORT_ZONES = optionsOf('airport_zones');
export const SAFETY_REQUIREMENTS = optionsOf('safety_requirements');
export const FACILITY_TYPES = optionsOf('facility_types');
export const MEDICAL_CARGO_CATEGORIES = CATEGORIES.medical_cargo_categories.map((c) => ({ key: c.id, label: c.label }));
export const ROUTES_AND_ELEVATORS = optionsOf('routes_and_elevators');
export const SANITARY_REQUIREMENTS = optionsOf('sanitary_requirements');
export const ACCESS_RESTRICTIONS = optionsOf('access_restrictions');
export const SOLUTION_TYPES = optionsOf('equipment_categories');
export const PROCESSES = optionsOf('processes');

export const AVAILABILITY_LABEL: Record<AvailabilityStatus, string> = {
  available: 'Доступно',
  limited: 'Ограниченно',
  discontinued: 'Снято с производства',
  upcoming: 'Ожидается',
};

export const NAVIGATION_LABEL: Record<NavigationType, string> = {
  lidar_slam: 'Лидар + SLAM',
  visual_slam: 'Визуальный SLAM',
  magnetic_tape: 'Магнитная лента',
  qr_markers: 'QR-метки',
  wire_guided: 'Индукционный провод',
  other: 'Другое',
};

export const ACQUISITION_LABEL: Record<AcquisitionModel, string> = {
  purchase: 'Покупка',
  leasing: 'Лизинг',
  raas: 'Роботы как услуга',
};

export const CONFIDENCE_LABEL: Record<DataConfidence, string> = {
  verified: 'Проверено',
  partial: 'Частично',
  unverified: 'Не проверено',
};

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  recommended: 'Рекомендовано',
  needs_review: 'Требует проверки',
  excluded: 'Исключено',
};

export const SCENARIO_KIND_LABEL: Record<ScenarioKind, string> = {
  baseline: 'Базовый',
  purchase: 'Покупка',
  raas: 'RaaS',
  custom: 'Свой сценарий',
};

export const FINANCING_LABEL: Record<FinancingType, string> = {
  own_funds: 'Собственные средства',
  credit: 'Кредит',
  leasing: 'Лизинг',
  raas: 'Роботы как услуга',
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: 'Черновик',
  calculated: 'Рассчитан',
  archived: 'В архиве',
};

export const VERDICT_LABEL: Record<CompatibilityVerdict, string> = {
  allowed: 'Совместимо',
  forbidden: 'Несовместимо',
  warning: 'С оговоркой',
  needs_review: 'Проверить вручную',
};

export const CAPEX_LABELS: Record<string, string> = {
  equipment: 'Оборудование',
  infrastructure: 'Инфраструктура',
  software: 'ПО и лицензии',
  integration: 'Интеграция',
  commissioning: 'Пусконаладка',
  training: 'Обучение',
  reserve: 'Резерв',
};

export const OPEX_LABELS: Record<string, string> = {
  service: 'Сервис',
  licenses: 'Лицензии',
  energy: 'Электроэнергия',
  connectivity: 'Связь',
  consumables: 'Расходники',
  repair: 'Ремонт',
  staff: 'Персонал',
};
