/**
 * Каталог-заглушка. Производители и модели вымышленные, характеристики —
 * правдоподобные порядки величин, а не данные реальных продуктов.
 */

import type { CatalogItem } from '../types/contracts';

type Partial2<T> = { [K in keyof T]?: Partial<T[K]> };

function item(id: string, base: Partial2<CatalogItem> & { tags?: string[] }): CatalogItem {
  return {
    id,
    identification: {
      manufacturer: '',
      product_name: '',
      solution_type: 'amr',
      purpose: '',
      country: 'Россия',
      availability_status: 'available',
      ...base.identification,
    },
    technical: {
      payload_kg: null,
      dimensions_mm: null,
      speed_mps: null,
      throughput_per_hour: null,
      autonomy_hours: null,
      positioning_accuracy_mm: null,
      navigation_type: null,
      operating_conditions: null,
      ...base.technical,
    },
    infrastructure: {
      aisle_width_mm: null,
      charging_type: null,
      connectivity: null,
      integration_notes: null,
      service_model: null,
      ...base.infrastructure,
    },
    economics: {
      equipment_cost: null,
      software_cost: null,
      implementation_cost: null,
      maintenance_cost_per_year: null,
      acquisition_model: 'purchase',
      service_life_years: null,
      ...base.economics,
    },
    applicability: {
      supported_object_types: [],
      supported_processes: [],
      limitations: [],
      case_studies: [],
      ...base.applicability,
    },
    data_quality: {
      source: 'Сайт производителя',
      source_url: null,
      last_updated: '2026-09-12',
      confidence: 'partial',
      ...base.data_quality,
    },
    tags: base.tags ?? [],
    attributes: {},
  };
}

export const CATALOG: CatalogItem[] = [
  item('amr-vektor-600', {
    identification: {
      manufacturer: 'Роботех',
      product_name: 'Вектор-600',
      solution_type: 'amr',
      purpose: 'Перемещение паллет и тележек между зонами склада',
    },
    technical: {
      payload_kg: 600,
      dimensions_mm: '1150 × 780 × 320',
      speed_mps: 1.8,
      throughput_per_hour: 22,
      autonomy_hours: 10,
      positioning_accuracy_mm: 10,
      navigation_type: 'lidar_slam',
      operating_conditions: '+5…+40 °C, без пыли',
    },
    infrastructure: {
      aisle_width_mm: 1600,
      charging_type: 'Автоматическая док-станция',
      connectivity: 'Wi-Fi 5 ГГц',
      integration_notes: 'REST API, готовый коннектор к 1С:WMS',
      service_model: 'Выезд инженера за 48 ч',
    },
    economics: {
      equipment_cost: 2_750_000,
      software_cost: 180_000,
      implementation_cost: 200_000,
      maintenance_cost_per_year: 165_000,
      service_life_years: 8,
    },
    applicability: {
      supported_object_types: ['warehouse', 'medical'],
      supported_processes: ['transport', 'receiving', 'shipping'],
      limitations: ['Не работает на пандусах круче 3°'],
      case_studies: ['Распределительный центр ритейлера, 40 единиц'],
    },
    data_quality: { confidence: 'verified', last_updated: '2026-09-02' },
    tags: ['amr', 'pallet', 'indoor'],
  }),
  item('amr-vektor-1500', {
    identification: {
      manufacturer: 'Роботех',
      product_name: 'Вектор-1500',
      solution_type: 'amr',
      purpose: 'Перемещение тяжёлых паллет, подъём с пола',
    },
    technical: {
      payload_kg: 1500,
      dimensions_mm: '1650 × 1080 × 360',
      speed_mps: 1.5,
      throughput_per_hour: 16,
      autonomy_hours: 8,
      positioning_accuracy_mm: 10,
      navigation_type: 'lidar_slam',
      operating_conditions: '+5…+40 °C',
    },
    infrastructure: {
      aisle_width_mm: 2200,
      charging_type: 'Автоматическая док-станция',
      connectivity: 'Wi-Fi 5 ГГц',
      service_model: 'Выезд инженера за 48 ч',
    },
    economics: {
      equipment_cost: 4_300_000,
      software_cost: 180_000,
      implementation_cost: 320_000,
      maintenance_cost_per_year: 240_000,
      service_life_years: 8,
    },
    applicability: {
      supported_object_types: ['warehouse'],
      supported_processes: ['transport', 'receiving', 'shipping'],
      limitations: ['Требует ровного пола, перепад ≤ 5 мм/м'],
    },
    tags: ['amr', 'pallet', 'heavy'],
  }),
  item('stacker-neva-s14', {
    identification: {
      manufacturer: 'НеваТрансРобот',
      product_name: 'Штабелёр S14',
      solution_type: 'stacker',
      purpose: 'Размещение паллет в стеллажи до 6 м',
    },
    technical: {
      payload_kg: 1400,
      dimensions_mm: '1900 × 900 × 2100',
      speed_mps: 1.2,
      throughput_per_hour: 14,
      autonomy_hours: 7,
      positioning_accuracy_mm: 5,
      navigation_type: 'lidar_slam',
    },
    infrastructure: {
      aisle_width_mm: 2800,
      charging_type: 'Ручная замена АКБ',
      connectivity: 'Wi-Fi',
    },
    economics: {
      equipment_cost: 6_900_000,
      software_cost: 250_000,
      implementation_cost: 600_000,
      maintenance_cost_per_year: 420_000,
      service_life_years: 10,
    },
    applicability: {
      supported_object_types: ['warehouse'],
      supported_processes: ['receiving', 'shipping', 'transport'],
      limitations: ['Проход не уже 2,8 м', 'Высота подъёма до 6 м'],
    },
    tags: ['stacker', 'pallet', 'lift'],
  }),
  item('tug-gruz-t3', {
    identification: {
      manufacturer: 'ГрузАвтоматика',
      product_name: 'Тягач Т3',
      solution_type: 'tug',
      purpose: 'Буксировка поездов тележек по фиксированным маршрутам',
    },
    technical: {
      payload_kg: 3000,
      dimensions_mm: '1400 × 700 × 600',
      speed_mps: 2,
      throughput_per_hour: 9,
      autonomy_hours: 12,
      positioning_accuracy_mm: 20,
      navigation_type: 'qr_markers',
    },
    infrastructure: {
      aisle_width_mm: 1800,
      charging_type: 'Оппортунистическая зарядка',
      connectivity: 'Wi-Fi / LTE',
    },
    economics: {
      equipment_cost: 3_100_000,
      software_cost: 90_000,
      implementation_cost: 450_000,
      maintenance_cost_per_year: 190_000,
      service_life_years: 10,
    },
    applicability: {
      supported_object_types: ['warehouse', 'airport'],
      supported_processes: ['towing', 'transport'],
      limitations: ['Нужна разметка QR-метками'],
    },
    data_quality: { confidence: 'unverified', last_updated: '2026-03-18' },
    tags: ['tug', 'towing'],
  }),
  item('storage-sever-cube', {
    identification: {
      manufacturer: 'Северный Робот',
      product_name: 'Куб-хранилище С9',
      solution_type: 'asrs',
      purpose: 'Компактное хранение мелкоштучного товара «товар к человеку»',
    },
    technical: {
      payload_kg: 30,
      throughput_per_hour: 450,
      positioning_accuracy_mm: 2,
      navigation_type: 'other',
    },
    infrastructure: {
      charging_type: 'Станции на верхней решётке',
      connectivity: 'Проводная сеть',
      integration_notes: 'Интеграция с WMS обязательна',
    },
    economics: {
      equipment_cost: 38_000_000,
      software_cost: 2_800_000,
      implementation_cost: 6_500_000,
      maintenance_cost_per_year: 1_900_000,
      service_life_years: 15,
    },
    applicability: {
      supported_object_types: ['warehouse'],
      supported_processes: ['picking', 'inventory'],
      limitations: ['Только короба до 30 кг', 'Нужна свободная площадь от 400 м²'],
    },
    data_quality: { confidence: 'verified', last_updated: '2026-08-21' },
    tags: ['asrs', 'goods-to-person'],
  }),
  item('forklift-avto-l16', {
    identification: {
      manufacturer: 'АвтоЛифт',
      product_name: 'Беспилотный погрузчик Л16',
      solution_type: 'forklift',
      purpose: 'Погрузка и разгрузка фур, перемещение паллет на улице и в здании',
    },
    technical: {
      payload_kg: 1600,
      speed_mps: 1.6,
      throughput_per_hour: 18,
      autonomy_hours: 8,
      positioning_accuracy_mm: 15,
      navigation_type: 'visual_slam',
      operating_conditions: '−20…+40 °C',
    },
    infrastructure: {
      aisle_width_mm: 3200,
      charging_type: 'Ручная зарядка',
      connectivity: 'LTE / Wi-Fi',
    },
    economics: {
      equipment_cost: 7_800_000,
      software_cost: 300_000,
      implementation_cost: 700_000,
      maintenance_cost_per_year: 520_000,
      service_life_years: 8,
    },
    applicability: {
      supported_object_types: ['warehouse', 'airport'],
      supported_processes: ['receiving', 'shipping'],
      limitations: ['Проход не уже 3,2 м'],
    },
    tags: ['forklift', 'outdoor'],
  }),
  item('cleaner-chisto-2', {
    identification: {
      manufacturer: 'ЧистоРобот',
      product_name: 'Уборщик Ч2',
      solution_type: 'cleaner',
      purpose: 'Влажная и сухая уборка больших площадей',
    },
    technical: {
      payload_kg: null,
      speed_mps: 1,
      throughput_per_hour: 2500,
      autonomy_hours: 5,
      navigation_type: 'lidar_slam',
    },
    economics: {
      equipment_cost: 1_450_000,
      software_cost: 60_000,
      implementation_cost: 50_000,
      maintenance_cost_per_year: 110_000,
      acquisition_model: 'raas',
      service_life_years: 6,
    },
    applicability: {
      supported_object_types: ['airport', 'medical', 'warehouse'],
      supported_processes: ['cleaning'],
      limitations: ['Производительность указана в м²/ч'],
    },
    tags: ['cleaning'],
  }),
  item('delivery-med-kurier', {
    identification: {
      manufacturer: 'МедЛогистик',
      product_name: 'Курьер-М',
      solution_type: 'delivery',
      purpose: 'Доставка медикаментов и анализов между отделениями, работа с лифтами',
    },
    technical: {
      payload_kg: 60,
      dimensions_mm: '650 × 500 × 1200',
      speed_mps: 1.2,
      throughput_per_hour: 6,
      autonomy_hours: 10,
      navigation_type: 'lidar_slam',
    },
    infrastructure: {
      aisle_width_mm: 1000,
      charging_type: 'Автоматическая док-станция',
      connectivity: 'Wi-Fi, интеграция с лифтами',
    },
    economics: {
      equipment_cost: 2_200_000,
      software_cost: 240_000,
      implementation_cost: 380_000,
      maintenance_cost_per_year: 150_000,
      acquisition_model: 'raas',
      service_life_years: 7,
    },
    applicability: {
      supported_object_types: ['medical'],
      supported_processes: ['delivery'],
      limitations: ['Нужна интеграция с системой управления лифтами'],
    },
    data_quality: { confidence: 'verified', last_updated: '2026-07-30' },
    tags: ['delivery', 'elevator', 'sanitary'],
  }),
  item('baggage-aero-b2', {
    identification: {
      manufacturer: 'AeroMove',
      product_name: 'Багажный тягач B2',
      solution_type: 'tug',
      purpose: 'Перевозка багажных тележек между терминалом и перроном',
      country: 'Россия',
      availability_status: 'upcoming',
    },
    technical: {
      payload_kg: 4000,
      speed_mps: 3,
      throughput_per_hour: 7,
      autonomy_hours: 9,
      navigation_type: 'visual_slam',
      operating_conditions: '−35…+45 °C',
    },
    economics: {
      equipment_cost: 9_500_000,
      software_cost: 500_000,
      implementation_cost: 1_200_000,
      maintenance_cost_per_year: 600_000,
      service_life_years: 10,
    },
    applicability: {
      supported_object_types: ['airport'],
      supported_processes: ['towing'],
      limitations: ['Досмотр СБ перед допуском на перрон'],
    },
    data_quality: { confidence: 'unverified', last_updated: '2026-05-04' },
    tags: ['tug', 'outdoor', 'airside'],
  }),
  item('sorter-neva-p60', {
    identification: {
      manufacturer: 'НеваТрансРобот',
      product_name: 'Сортировщик П60',
      solution_type: 'sorter',
      purpose: 'Сортировка посылок по направлениям на мезонине',
      availability_status: 'limited',
    },
    technical: {
      payload_kg: 5,
      speed_mps: 3,
      throughput_per_hour: 1200,
      autonomy_hours: 4,
      navigation_type: 'qr_markers',
    },
    economics: {
      equipment_cost: 520_000,
      software_cost: 40_000,
      implementation_cost: 90_000,
      maintenance_cost_per_year: 30_000,
      service_life_years: 5,
    },
    applicability: {
      supported_object_types: ['warehouse'],
      supported_processes: ['shipping'],
      limitations: ['Только посылки до 5 кг', 'Нужен мезонин с люками'],
    },
    tags: ['sorting', 'parcel'],
  }),
];

export const catalogById = (id: string) => CATALOG.find((c) => c.id === id);
export const catalogName = (id: string) => {
  const c = catalogById(id);
  return c ? `${c.identification.product_name}` : id;
};
