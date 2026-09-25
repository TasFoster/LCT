"""Контракт 4: ProjectInput. Граница Владимиров (визард) -> Стас (matching,
simulation, econWrapper).

Discriminated union по object_type: добавление нового типа объекта — это
новый *Params класс + новое значение ObjectType, без изменения кода
matching/economics (они читают params через теги/общие поля, а не через
знание о конкретном типе объекта).

2026-09-25: поля расширены под официальный демо-датасет хакатона
(`Датасет/Датасет/Датасеты_хакатон.xlsx`, листы Склад/Аэропорт/Медучреждение).
Дефолт каждого нового поля — «Базовое значение» датасета; диапазон
min/max из датасета — в description (справочно для валидации формы на
фронте, НЕ pydantic-констрейнт: реальный объект может выходить за типовой
диапазон демо-датасета, а платформа не должна его из-за этого отвергать).
Существующие поля (inbound_ops_per_day/ops_count_per_day/cargo_volume_per_day
и т.п.) не переименованы и не удалены — их читает simulation/tasks.py по
имени; новые поля добавляют детализацию рядом, а не заменяют старые.
"""

from datetime import datetime
from typing import Literal, Optional, Union

from pydantic import BaseModel, Field

from .enums import ObjectType


class WarehouseParams(BaseModel):
    object_type: Literal[ObjectType.WAREHOUSE] = ObjectType.WAREHOUSE

    # ── Общие параметры объекта ──
    area_sqm: float = Field(..., description="Площадь склада, м²")
    working_zones: list[str] = Field(default_factory=list)
    available_area_sqm: Optional[float] = None
    layout_constraints: list[str] = Field(default_factory=list)
    ceiling_height_m: float = Field(10, description="Высота потолков в зоне хранения, м (5..16)")
    mezzanine_floors_count: int = Field(1, description="Кол-во этажей/мезонинов (1..3); ≥2 — нужны лифты в CAPEX")
    main_aisle_width_m: float = Field(3.5, description="Ширина главных проездов, м (2.5..6) — ограничивает габариты робота")
    rack_aisle_width_m: float = Field(2.8, description="Ширина рабочих проходов между стеллажами, м (1.5..4.5)")
    floor_surface_type: str = Field("Промышленный бетон", description="Тип напольного покрытия")
    floor_flatness_mm_per_2m: float = Field(3, description="Ровность пола, мм/2м по DIN 15185/FM2 (1..8); критично для AutoStore")

    # ── Режим работы ──
    operating_mode: str = Field(..., description="Напр. '24/7' или '2 смены по 12ч'")
    shifts_per_day: int = Field(2, description="Количество рабочих смен в сутки (1..3)")
    working_days_per_year: int = Field(365, description="Рабочих дней в году")
    shift_duration_hours: float = Field(11, description="Продолжительность смены, ч (10..11), с учётом перерывов")
    peak_load_factor: float = Field(1.5, description="Пиковый коэффициент нагрузки — макс./среднечасовая (1.2..2.5)")

    # ── Операции: объём и производительность ──
    inbound_ops_per_day: float
    internal_ops_per_day: float
    outbound_ops_per_day: float
    inbound_pallets_per_day: float = Field(1000, description="Объём приёмки, поддон/сутки (500..5000)")
    outbound_pallets_per_day: float = Field(1000, description="Объём отгрузки, поддон/сутки (500..5000)")
    picking_lines_per_day: float = Field(100000, description="Объём отбора, строк/сутки (50000..500000)")
    picking_units_per_day: float = Field(150000, description="Объём отбора, шт./сутки (75000..750000)")
    piece_pick_share_pct: float = Field(30, description="Доля мелкоштучного отбора (piece-pick), % (10..80)")
    sku_count: int
    fast_moving_sku_share_pct: float = Field(20, description="Доля SKU с быстрым оборотом (A-класс), % (10..40)")

    # ── Персонал ──
    staff_count: int
    pickers_count: int = Field(100, description="Из них отборщики/комплектовщики, чел. (15..500) — целевая группа роботизации")
    forklift_operators_count: int = Field(25, description="Из них операторы погрузчиков, чел. (5..80)")
    packing_operators_count: int = Field(20, description="Из них операторы упаковочных линий, чел. (5..60)")
    staff_cost_per_month: float = Field(..., description="₽/мес на одного сотрудника")
    picker_salary_per_month: float = Field(100000, description="₽/мес отборщика, gross (70000..150000)")
    forklift_operator_salary_per_month: float = Field(120000, description="₽/мес оператора погрузчика, gross (80000..170000)")
    payroll_tax_rate: float = Field(1.302, description="Коэффициент начислений на ФОТ (страховые взносы, 30.2%)")
    picker_throughput_lines_per_hour: float = Field(150, description="Выработка отборщика до роботизации, строк/ч (80..200)")
    labor_loss_factor_pct: float = Field(25, description="Потери рабочего времени: отпуск/болезнь/текучесть, % (15..35)")

    # ── Маршруты и планировка ──
    route_length_m: float
    picker_route_length_per_line_m: float = Field(25, description="Средняя длина маршрута отборщика на 1 строку, м (15..60)")
    conveyor_length_m: float = Field(350, description="Протяжённость конвейерной/транспортной системы, м (0 — если нет)")

    # ── Хранение и характеристики грузов ──
    storage_type: str
    rack_system_type: str = Field("Фронтальные паллетные", description="Тип стеллажной системы (альт.: Shuttle/AutoStore/Miniload/Drive-in/Push-back)")
    pallet_positions_count: float = Field(20000, description="Количество паллетомест, ёмкость склада (10000..100000)")
    unit_load_weight_kg: float
    unit_load_dimensions_mm: str
    pallet_weight_kg: float = Field(800, description="Средняя масса грузовой единицы (паллет), кг (200..1500)")
    sku_unit_weight_kg: float = Field(1.8, description="Средняя масса штучной единицы (SKU), кг (0.1..20) — критично для G2P")
    pallet_dimensions_mm: str = Field("1200x800x1600", description="Средние габариты паллеты Д×Ш×В, мм (евростандарт)")
    sku_unit_dimensions_mm: str = Field("300x200x150", description="Средние габариты штучной единицы Д×Ш×В, мм")
    oversized_cargo_share_pct: float = Field(5, description="Доля негабаритных/нестандартных грузов, % (0..30)")
    current_throughput_per_hour: float

    # ── Инфраструктура и ограничения ──
    available_power_kw: float = Field(500, description="Мощность электроснабжения (доступная), кВт (100..3000) — для зарядных станций")
    has_wms: bool = Field(True, description="Наличие WMS — обязательно для роботизации")
    erp_system: Optional[str] = Field("1С:ERP", description="Наличие ERP/1С, интеграция через REST API/COM")
    planned_capex_mln_rub: float = Field(80, description="Планируемый бюджет на роботизацию (CAPEX), млн ₽ (10..500)")
    payback_horizon_years: float = Field(5, description="Горизонт расчёта окупаемости, лет (3..10)")


class AirportParams(BaseModel):
    object_type: Literal[ObjectType.AIRPORT] = ObjectType.AIRPORT

    # ── Общие параметры объекта ──
    operation_zone: str = Field(..., description="Перрон / терминал / багажное отделение и т.п.")
    terminal_area_sqm: float = Field(85000, description="Суммарная площадь терминала(ов), м² (8000..500000)")
    apron_area_sqm: float = Field(100000, description="Площадь перрона и технических зон, м² (10000..800000) — открытая зона")
    terminals_count: int = Field(2, description="Количество терминалов (1..6)")
    gates_count: int = Field(20, description="Количество выходов на посадку (гейтов), шт. (8..50)")
    runways_count: int = Field(2, description="Количество взлётно-посадочных полос (1..4)")

    # ── Пассажирский поток ──
    passenger_flow_per_day: Optional[float] = None
    passenger_flow_per_year_mln: float = Field(8.5, description="Пассажиропоток, млн пассажиров/год (0.5..50)")
    peak_passengers_per_hour: float = Field(3200, description="Пиковое кол-во пассажиров в час, PHF (200..18000)")
    transfer_passengers_share_pct: float = Field(15, description="Доля трансферных пассажиров, % (5..45)")
    check_in_desks_count: int = Field(50, description="Количество стоек регистрации, шт. (15..350)")

    # ── Наземное обслуживание (RAMP) ──
    ops_count_per_day: float
    daily_flights_count: float = Field(280, description="Среднесуточное количество рейсов, взлёт+посадка (30..1200)")
    peak_flights_per_hour: float = Field(32, description="Пиковое количество рейсов в час (4..120)")
    aircraft_turnaround_time_min: float = Field(45, description="Среднее время оборота ВС (TAT), мин (25..90)")
    ground_ops_per_flight: float = Field(18, description="Операций наземного обслуживания на 1 рейс (10..25)")
    baggage_units_per_day: float = Field(35000, description="Объём перемещения багажа, ед./сутки (3000..300000)")
    baggage_unit_weight_kg: float = Field(18, description="Средняя масса единицы багажа, кг (10..35)")
    baggage_carousels_count: int = Field(8, description="Количество стоек выдачи багажа (каруселей), шт. (3..30)")
    catering_portions_per_day: float = Field(22000, description="Объём бортового питания, порций/сутки (1000..200000)")
    refueling_flights_per_day: float = Field(280, description="Объём заправки ВС, рейсов/сутки (30..1200)")

    # ── Внутрипортовая логистика и уборка ──
    internal_cart_trips_per_day: float = Field(420, description="Рейсов внутренних грузовых тележек внутри терминала (50..3000)")
    cleaning_machines_count: int = Field(8, description="Количество уборочных машин (терминал), шт. (2..40)")
    cleaning_area_sqm: float = Field(51000, description="Площадь роботизированной уборки, м² (~60-70% площади терминала)")
    waste_containers_per_day: float = Field(85, description="Суточный объём вывоза мусора, контейнеров/сутки (10..500)")

    # ── Персонал ──
    staff_count: int
    ramp_staff_count: int = Field(320, description="Численность персонала наземного обслуживания (рамп), чел. (50..2000)")
    terminal_staff_count: int = Field(180, description="Численность персонала внутри терминала (логистика/уборка), чел. (30..800)")
    staff_cost_per_month: float
    ramp_staff_salary_per_month: float = Field(100000, description="₽/мес сотрудника наземного обслуживания, gross (70000..150000)")
    terminal_cleaner_salary_per_month: float = Field(65000, description="₽/мес уборщика терминала, gross (38000..85000)")
    payroll_tax_rate: float = Field(1.302, description="Коэффициент начислений на ФОТ")
    annual_staff_turnover_pct: float = Field(35, description="Годовая текучесть персонала терминала, % (15..60)")

    # ── Безопасность и ограничения ──
    safety_requirements: list[str] = Field(default_factory=list)
    security_zones_count: int = Field(4, description="Зонирование: кол-во режимных зон (2..8) — airside/landside/стерильная/перрон")
    has_access_control: bool = Field(True, description="Наличие СКУД (OSDP) — роботы интегрируются для прохода через двери")
    airside_certification_requirements: str = Field("EASA/ИКАО", description="Требования по сертификации оборудования для airside")
    noise_limit_dba: float = Field(70, description="Ограничение по уровню шума в зоне, дБА (55..80)")
    unheated_zone_min_temp_c: float = Field(-25, description="Мин. температура в неотапливаемых зонах зимой, °C (-40..0)")

    # ── Инфраструктура ──
    has_fids_aodb: bool = Field(True, description="Наличие FIDS/AODB — источник данных для расписания роботов")
    has_bms: bool = Field(True, description="Наличие BMS — интеграция AMR с лифтами/дверями/освещением")
    available_charging_power_kw: float = Field(300, description="Доступная мощность для зарядной инфраструктуры, кВт (50..2000)")
    planned_capex_mln_rub: float = Field(120, description="Планируемый бюджет на роботизацию (CAPEX), млн ₽ (20..800)")
    payback_horizon_years: float = Field(7, description="Горизонт расчёта окупаемости, лет (5..15)")

    cargo_flow_tons_per_day: Optional[float] = None
    peak_load_per_hour: float
    route_length_m: float
    unit_weight_kg: float
    unit_dimensions_mm: str
    zone_access: str = Field(..., description="closed / open")


class MedicalParams(BaseModel):
    object_type: Literal[ObjectType.MEDICAL] = ObjectType.MEDICAL

    # ── Общие параметры объекта ──
    facility_type: str = Field(..., description="Варианты: Поликлиника / Многопрофильная больница / Онкоцентр / Диагностический центр")
    area_sqm: float
    floors_count: int
    elevators_count: int = Field(4, description="Количество лифтов (грузовых/медицинских), шт. (1..12) — частое узкое место")
    beds_count: int = Field(650, description="Количество коек (стационар) (50..2500)")
    bed_occupancy_pct: float = Field(82, description="Коечный фонд в эксплуатации, средняя занятость, % (60..95)")
    operating_rooms_count: int = Field(12, description="Количество операционных, шт. (2..40) — доставка стерильных наборов")
    outpatient_visits_per_day: float = Field(850, description="Количество амбулаторных посещений в сутки (100..5000)")

    # ── Режим работы ──
    operating_mode: str
    outpatient_operating_mode: str = Field("5/2, 08:00-20:00", description="Режим работы амбулатории/поликлиники")
    medical_staff_shifts_per_day: int = Field(3, description="Количество смен медперсонала (уход за пациентами), смен/сут (2..3)")
    peak_logistics_hours: str = Field("07:00-10:00 и 15:00-17:00", description="Пиковое время логистической нагрузки")

    # ── Внутрибольничная логистика ──
    cargo_volume_per_day: dict[str, float] = Field(
        default_factory=dict, description="По категориям: грузы/бельё/питание/медикаменты/отходы"
    )
    meals_per_day_count: int = Field(3, description="Количество кормлений в сутки (3..5)")
    kitchen_to_ward_distance_m: float = Field(180, description="Среднее расстояние от пищеблока до отделения, м (30..500)")
    meal_delivery_points_count: int = Field(18, description="Количество точек раздачи питания (отделений), шт. (4..60)")
    meal_cart_weight_kg: float = Field(120, description="Средняя масса тележки с питанием (брутто), кг (40..250)")
    meal_delivery_time_norm_min: float = Field(20, description="Норматив доставки питания, мин от пищеблока до отделения (10..35)")
    dirty_linen_kg_per_day: float = Field(1800, description="Объём грязного белья, кг/сутки (200..8000)")
    clean_linen_kg_per_day: float = Field(1800, description="Объём чистого белья на раздачу, кг/сутки (200..8000)")
    linen_points_count: int = Field(18, description="Количество точек сбора/выдачи белья, шт. (4..60)")
    linen_change_frequency_per_day: float = Field(1.3, description="Периодичность смены белья, раз/сутки в среднем (1..3)")
    linen_container_weight_kg: float = Field(55, description="Средняя масса контейнера с бельём, кг (20..120)")
    medication_sku_count: int = Field(2800, description="Количество наименований медикаментов в обращении (300..8000)")
    medication_requests_per_day: float = Field(340, description="Объём выдачи медикаментов, заявок/сутки (40..1500)")
    pharmacy_points_count: int = Field(2, description="Количество аптечных точек выдачи, шт. (1..6)")
    delivery_points_count: int = Field(22, description="Количество точек доставки (отделения + ОР + реанимация), шт. (5..70)")
    pharmacy_fulfillment_time_min: float = Field(12, description="Среднее время комплектации 1 заявки в аптеке, мин (5..30)")
    stat_delivery_share_pct: float = Field(8, description="Доля срочных (STAT) доставок медикаментов, % (2..20)")
    consumables_trips_per_day: float = Field(45, description="Объём доставки расходных материалов, рейсов/сутки (10..200)")
    biosample_count_per_day: float = Field(1200, description="Количество биоматериалов (проб) в сутки (100..6000)")
    labs_count: int = Field(2, description="Количество клинико-диагностических лабораторий (КДЛ), шт. (1..5)")
    sample_delivery_time_norm_min: float = Field(30, description="Норматив времени доставки пробы, мин (10..60, ГОСТ Р 53079.4-2008)")
    lab_results_trips_per_day: float = Field(28, description="Объём выдачи результатов анализов, рейсов/сутки (5..120)")
    waste_class_a_kg_per_day: float = Field(850, description="Объём мед. отходов класса А (ненасыщенные), кг/сутки (80..4000)")
    waste_class_b_kg_per_day: float = Field(220, description="Объём мед. отходов класса Б (инфицированные), кг/сутки (20..1200)")
    waste_points_count: int = Field(20, description="Количество точек сбора отходов, шт. (4..70)")
    waste_collection_frequency_per_day: float = Field(2, description="Периодичность вывоза отходов из отделений, раз/сутки (1..4)")
    routes_and_elevators: list[str] = Field(default_factory=list)

    # ── Персонал (немедицинский, задействованный в логистике) ──
    staff_count: int
    orderlies_count: int = Field(65, description="Численность санитаров и транспортировщиков, чел. (10..300) — целевая группа замещения")
    kitchen_staff_count: int = Field(28, description="Численность сотрудников пищеблока (раздача), чел. (5..100)")
    laundry_staff_count: int = Field(18, description="Численность сотрудников прачечной (транспорт белья), чел. (3..60)")
    staff_cost_per_month: float
    orderly_salary_per_month: float = Field(55000, description="₽/мес санитара/транспортировщика, gross (38000..85000)")
    kitchen_staff_salary_per_month: float = Field(52000, description="₽/мес сотрудника пищеблока, gross (35000..75000)")
    payroll_tax_rate: float = Field(1.302, description="Коэффициент начислений на ФОТ")
    annual_staff_turnover_pct: float = Field(45, description="Годовая текучесть немедицинского персонала, % (20..70)")

    # ── Требования безопасности и санитарные нормы ──
    sanitary_requirements: list[str] = Field(default_factory=list)
    robot_disinfection_required: str = Field("Обязательно для Б-маршрутов", description="Обеззараживание робота между рейсами (УФ/дез. средство — учитывается в OPEX)")
    ward_noise_limit_dba: float = Field(30, description="Требования к уровню шума в палатах ночью, дБА (25..40, СанПиН 2.1.3.2630-10)")
    has_access_control: bool = Field(True, description="Наличие СКУД (контроль доступа по зонам)")
    robot_surface_material_requirements: str = Field(
        "Нержавеющая сталь или ABS с антибактериальным покрытием", description="Требования к материалу поверхностей робота"
    )

    # ── Инфраструктура ──
    has_mis: bool = Field(True, description="Наличие МИС (мед. информационная система, напр. ЕМИАС)")
    has_lis: bool = Field(True, description="Наличие ЛИС (лабораторная информационная система)")
    has_bms: bool = Field(True, description="Наличие системы управления лифтами (BMS) — критично для межэтажного AMR")
    corridor_width_m: float = Field(2.4, description="Ширина коридоров (основных), м (1.8..3.5) — мин. 1.8 для AMR с разминовкой")
    has_ramps_or_lifts: bool = Field(False, description="Наличие пандусов/подъёмников для межэтажного AMR без лифта")
    available_charging_power_kw: float = Field(80, description="Доступная мощность для зарядной инфраструктуры, кВт (15..400)")
    planned_capex_mln_rub: float = Field(35, description="Планируемый бюджет на роботизацию (CAPEX), млн ₽ (5..200)")
    payback_horizon_years: float = Field(7, description="Горизонт расчёта окупаемости, лет (5..15)")

    access_restrictions: list[str] = Field(default_factory=list)


ObjectParams = Union[WarehouseParams, AirportParams, MedicalParams]


class ProjectInput(BaseModel):
    id: str
    project_id: str
    object_type: ObjectType
    params: ObjectParams = Field(..., discriminator="object_type")
    created_at: datetime
    source: str = Field("manual", description="manual / excel_import / csv_import")
