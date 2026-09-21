"""Контракт 7, §3 плана (Документация/Подбор и симуляция/simulation_design.md):
адаптер ObjectType -> задачи + пуассоновский генератор заявок.

Симуляция не знает про склад/аэропорт/мед. учреждение — это скрыто за маленьким
адаптером на входе. Таксономии категорий Артёма (какая точка сцены обслуживает
какой тип задачи) пока нет, поэтому происхождение/назначение каждой заявки
выбирается случайно среди всех operation_points сцены, равномерно —
задокументированное временное допущение (см. simulation_design.md §3), которое
нужно заменить, когда у Артёма появится таксономия задач по категориям.

Момент появления каждой заявки — пуассоновский поток (экспоненциальные интервалы
между заявками, `random.Random(seed).expovariate(rate)`); несколько типов задач
с разными интенсивностями объединены суперпозицией в один поток на объект —
математически эквивалентно независимым потокам на каждую пару точек при
равномерном случайном выборе пары на каждое прибытие.

service_time_s намеренно НЕ входит в TaskInstance: у робота, который в итоге
выполнит задачу, есть свой catalog_item.technical.throughput_per_hour — длительность
обслуживания считает engine.py в момент назначения задачи конкретному роботу
(так эффективная производительность зависит от реального оборудования, а не
усредняется на этапе генерации потока заявок).
"""

from __future__ import annotations

import hashlib
import random
import re
from dataclasses import dataclass

from contracts import AirportParams, MedicalParams, ObjectParams, Scene, WarehouseParams

DEFAULT_OPERATING_HOURS_PER_DAY = 16.0  # не удалось разобрать operating_mode — документированный дефолт


@dataclass
class TaskStream:
    name: str  # для читаемости/отчётности, напр. "inbound", "мед: медикаменты"
    ops_per_day: float


@dataclass
class TaskInstance:
    id: str
    stream: str
    arrival_t: float  # секунд от начала окна моделирования (после разогрева — см. engine.py)
    origin_point_id: str
    destination_point_id: str


def stable_seed(scenario_id: str) -> int:
    """random.Random(seed) — НЕ встроенный hash(): он рандомизирован между процессами
    Python, а контракт 9 требует одинаковый таймлайн при повторном открытии версии проекта."""
    return int(hashlib.sha256(scenario_id.encode("utf-8")).hexdigest()[:16], 16)


def parse_operating_hours_per_day(operating_mode: str) -> float:
    """Эвристика по тексту режима работы: "24/7"/"круглосуточно" -> 24; "N смен(ы) по
    M ч" -> N*M. Не распозналось -> DEFAULT_OPERATING_HOURS_PER_DAY. Явно не точный
    парсер произвольного текста — задокументированное допущение, обсудить с фронтом
    (см. Документация/Фронтенд и визард/object-data-api.md, открытый вопрос про
    operating_mode/operating_hours_per_year)."""
    text = operating_mode.lower()
    if "24/7" in text or "24х7" in text or "24x7" in text or "круглосуточ" in text:
        return 24.0
    numbers = [float(n) for n in re.findall(r"\d+(?:[.,]\d+)?", text.replace(",", "."))]
    if len(numbers) >= 2:
        shifts, hours = numbers[0], numbers[1]
        if 0 < shifts <= 4 and 0 < hours <= 24:
            return shifts * hours
    return DEFAULT_OPERATING_HOURS_PER_DAY


def task_streams(params: ObjectParams) -> list[TaskStream]:
    if isinstance(params, WarehouseParams):
        return [
            TaskStream("inbound", params.inbound_ops_per_day),
            TaskStream("internal", params.internal_ops_per_day),
            TaskStream("outbound", params.outbound_ops_per_day),
        ]
    if isinstance(params, AirportParams):
        return [TaskStream("ops", params.ops_count_per_day)]
    if isinstance(params, MedicalParams):
        return [
            TaskStream(f"cargo:{category}", volume)
            for category, volume in params.cargo_volume_per_day.items()
            if volume > 0
        ]
    raise TypeError(f"неизвестный тип параметров объекта: {type(params).__name__}")


def generate_arrivals(
    scene: Scene,
    params: ObjectParams,
    *,
    window_s: float,
    scenario_id: str,
    operating_hours_per_day: float | None = None,
) -> list[TaskInstance]:
    """Все заявки на окно моделирования, сгенерированные заранее и детерминированно
    по scenario_id — engine.py на событие "заявка пришла" просто читает этот список,
    сама генерация случайности изолирована здесь."""
    point_ids = [p.id for p in scene.operation_points]
    if len(point_ids) < 2:
        raise ValueError(
            "в сцене меньше двух operation_points — генерировать задачи "
            "происхождение/назначение не из чего (нужно минимум 2 точки операций)"
        )

    if operating_hours_per_day is None:
        operating_mode = getattr(params, "operating_mode", None)
        operating_hours_per_day = (
            parse_operating_hours_per_day(operating_mode) if operating_mode else DEFAULT_OPERATING_HOURS_PER_DAY
        )
    seconds_per_operating_day = operating_hours_per_day * 3600

    rng = random.Random(stable_seed(scenario_id))
    arrivals: list[TaskInstance] = []
    counter = 0
    for stream in task_streams(params):
        if stream.ops_per_day <= 0:
            continue
        rate_per_s = stream.ops_per_day / seconds_per_operating_day
        t = 0.0
        while True:
            t += rng.expovariate(rate_per_s)
            if t >= window_s:
                break
            origin = rng.choice(point_ids)
            destination = rng.choice([p for p in point_ids if p != origin])
            counter += 1
            arrivals.append(
                TaskInstance(
                    id=f"task-{counter}",
                    stream=stream.name,
                    arrival_t=t,
                    origin_point_id=origin,
                    destination_point_id=destination,
                )
            )
    arrivals.sort(key=lambda a: a.arrival_t)
    return arrivals
