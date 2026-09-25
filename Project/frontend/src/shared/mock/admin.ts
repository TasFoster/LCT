import type { CompatibilityRule } from '../types/contracts';

export const RULES: CompatibilityRule[] = [
  {
    id: 'r-aisle',
    equipment_condition: { key: 'aisle_width_mm', operator: 'gt', value: 2500 },
    object_condition: { key: 'layout_constraints', operator: 'has_tag', value: 'Узкие проходы до 2,5 м' },
    verdict: 'forbidden',
    reason: 'Технике нужен проход шире, чем есть на объекте',
    source: 'Документированное допущение команды',
  },
  {
    id: 'r-payload',
    equipment_condition: { key: 'payload_kg', operator: 'lt', value: 'unit_load_weight_kg' },
    object_condition: { key: 'object_type', operator: 'eq', value: 'warehouse' },
    verdict: 'forbidden',
    reason: 'Грузоподъёмность меньше массы грузовой единицы',
    source: 'Артём',
  },
  {
    id: 'r-cold',
    equipment_condition: { key: 'operating_conditions', operator: 'has_tag', value: 'indoor' },
    object_condition: { key: 'safety_requirements', operator: 'has_tag', value: 'Работа при −30 °C' },
    verdict: 'forbidden',
    reason: 'Оборудование рассчитано только на отапливаемые помещения',
    source: 'Каталог оргов',
  },
  {
    id: 'r-qr',
    equipment_condition: { key: 'navigation_type', operator: 'eq', value: 'qr_markers' },
    object_condition: { key: 'route_length_m', operator: 'gt', value: 3000 },
    verdict: 'warning',
    reason: 'Разметка маршрутов длиннее 3 км заметно увеличит стоимость внедрения',
    source: 'Документированное допущение команды',
  },
  {
    id: 'r-elevator',
    equipment_condition: { key: 'tags', operator: 'has_tag', value: 'elevator' },
    object_condition: { key: 'floors_count', operator: 'gt', value: 1 },
    verdict: 'allowed',
    reason: 'Умеет ездить на лифте — подходит для многоэтажных корпусов',
    source: 'Артём',
  },
  {
    id: 'r-airside',
    equipment_condition: { key: 'tags', operator: 'has_tag', value: 'airside' },
    object_condition: { key: 'zone_access', operator: 'eq', value: 'closed' },
    verdict: 'needs_review',
    reason: 'Допуск в закрытую зону согласуется со службой безопасности аэропорта',
    source: null,
  },
];

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: 'user' | 'admin';
  projects: number;
  last_seen: string;
  blocked: boolean;
}

export const USERS: AdminUser[] = [
  { id: 'u-1', name: 'Иван Петров', email: 'petrov@example.ru', organization: 'ООО «Логистик Групп»', role: 'user', projects: 5, last_seen: '2026-09-21T09:14:00+03:00', blocked: false },
  { id: 'u-2', name: 'Артём Соколов', email: 'sokolov@example.ru', organization: 'Команда проекта', role: 'admin', projects: 2, last_seen: '2026-09-21T10:02:00+03:00', blocked: false },
  { id: 'u-3', name: 'Мария Ким', email: 'kim@example.ru', organization: 'АО «Аэропорт-Сервис»', role: 'user', projects: 1, last_seen: '2026-09-20T17:45:00+03:00', blocked: false },
  { id: 'u-4', name: 'Олег Васильев', email: 'vasiliev@example.ru', organization: 'ГКБ №7', role: 'user', projects: 1, last_seen: '2026-09-05T12:00:00+03:00', blocked: false },
  { id: 'u-5', name: 'Тестовый аккаунт', email: 'test@example.ru', organization: '—', role: 'user', projects: 0, last_seen: '2026-06-01T08:00:00+03:00', blocked: true },
];

export interface AssumptionItem {
  key: string;
  label: string;
  value: number;
  unit: string;
  hint: string;
}

export const ASSUMPTIONS: AssumptionItem[] = [
  { key: 'energy_tariff', label: 'Тариф электроэнергии', value: 7.2, unit: '₽/кВт·ч', hint: 'Средний тариф для юрлиц, без НДС' },
  { key: 'credit_rate', label: 'Ставка кредита', value: 18, unit: '% годовых', hint: 'Для сценария «Кредит» по умолчанию' },
  { key: 'reserve_ratio', label: 'Резерв в CAPEX', value: 10, unit: '%', hint: 'Непредвиденные расходы при внедрении' },
  { key: 'horizon_years', label: 'Горизонт TCO по умолчанию', value: 5, unit: 'лет', hint: 'По ТЗ — не меньше 5 лет' },
  { key: 'load_factor', label: 'Коэффициент загрузки', value: 0.75, unit: '0…1', hint: 'Доля рабочего времени, когда техника занята' },
  { key: 'connectivity_per_unit', label: 'Связь на единицу техники', value: 20_000, unit: '₽/год', hint: 'Wi-Fi-инфраструктура и SIM' },
  { key: 'sensitivity_step', label: 'Шаг анализа чувствительности', value: 20, unit: '%', hint: 'На сколько варьируются параметры' },
];

export const DICTIONARY_GROUPS = [
  { key: 'solution_types', title: 'Типы решений', usedIn: 'Каталог, подбор' },
  { key: 'processes', title: 'Процессы', usedIn: 'Каталог, подбор' },
  { key: 'operating_modes', title: 'Режимы работы', usedIn: 'Параметры объекта' },
  { key: 'storage_types', title: 'Типы хранения', usedIn: 'Параметры склада' },
  { key: 'warehouse_zones', title: 'Рабочие зоны склада', usedIn: 'Параметры склада, сцена' },
  { key: 'layout_constraints', title: 'Ограничения планировки', usedIn: 'Параметры объекта, правила' },
  { key: 'airport_zones', title: 'Зоны аэропорта', usedIn: 'Параметры аэропорта' },
  { key: 'safety', title: 'Требования безопасности', usedIn: 'Параметры аэропорта, правила' },
  { key: 'facility_types', title: 'Типы медучреждений', usedIn: 'Параметры медучреждения' },
  { key: 'sanitary', title: 'Санитарные требования', usedIn: 'Параметры медучреждения' },
] as const;
