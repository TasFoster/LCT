"""Оценка требуемого количества единиц оборудования (MatchCandidate.
quantity_if_selected) — по формуле из CLAUDE.md §"Экономическая модель":
"Количество роботов = пиковая потребность в операциях / эффективная
производительность одного робота (с учётом загрузки, доступности, резерва)".

Реализовано для всех трёх типов объектов. У склада и аэропорта в контракте
есть прямое поле пиковой нагрузки (peak_load_factor / peak_load_per_hour).
У медучреждения (MedicalParams) такого поля нет — cargo_volume_per_day даёт
только суточный объём по категориям, без явного коэффициента пика и без
явных часов работы логистики. Вместо того чтобы возвращать None (как было
раньше), считаем через два документированных допущения — MEDICAL_SHIFT_HOURS
и MEDICAL_PEAK_LOAD_FACTOR ниже, — а не через встроенные в код магические
числа без объяснения: часы работы = medical_staff_shifts_per_day (это поле
в контракте уже есть) × длительность смены; пик — тот же коэффициент 1.5,
что и для склада (нет оснований предполагать, что суточная неравномерность
у больничной логистики принципиально другая). Если у команды будет
измеренное значение — заменить константы, не трогая формулу.

DEFAULT_UTILIZATION — доля времени, которую робот реально работает на
задаче (не в резерве/на обслуживании/в очереди) — документированное
допущение MVP, а не измеренная величина; резерв/избыточность сверх этого не
закладываются здесь намеренно (решение о резерве — на усмотрение
econWrapper/пользователя, а не жёстко зашито в matching).
"""

from __future__ import annotations

import math

from contracts import AirportParams, CatalogItem, MedicalParams, ProjectInput, WarehouseParams

DEFAULT_UTILIZATION = 0.85
MEDICAL_SHIFT_HOURS = 8.0  # длительность одной смены медперсонала, ч — нет в контракте, стандартная смена
MEDICAL_PEAK_LOAD_FACTOR = 1.5  # макс./среднечасовая — то же допущение, что peak_load_factor у склада


def _peak_ops_per_hour(project_input: ProjectInput) -> float | None:
    params = project_input.params
    if isinstance(params, WarehouseParams):
        daily_ops = params.inbound_ops_per_day + params.internal_ops_per_day + params.outbound_ops_per_day
        operating_hours_per_day = params.shifts_per_day * params.shift_duration_hours
        if operating_hours_per_day <= 0:
            return None
        return (daily_ops / operating_hours_per_day) * params.peak_load_factor
    if isinstance(params, AirportParams):
        return params.peak_load_per_hour
    if isinstance(params, MedicalParams):
        daily_ops = sum(params.cargo_volume_per_day.values())
        if daily_ops <= 0:
            return None
        operating_hours_per_day = params.medical_staff_shifts_per_day * MEDICAL_SHIFT_HOURS
        if operating_hours_per_day <= 0:
            return None
        return (daily_ops / operating_hours_per_day) * MEDICAL_PEAK_LOAD_FACTOR
    return None


def estimate_quantity(
    item: CatalogItem, project_input: ProjectInput, *, utilization: float = DEFAULT_UTILIZATION
) -> int | None:
    """Сколько единиц item нужно, если закрывать ВЕСЬ пиковый спрос этой
    моделью в одиночку (реальный подбор — обычно микс моделей; финальный
    состав/количество выбирает пользователь в selected_equipment). None —
    не хватает данных (throughput_per_hour в каталоге или пиковое поле в
    ProjectInput для этого типа объекта)."""
    throughput = item.technical.throughput_per_hour
    if not throughput:
        return None
    peak = _peak_ops_per_hour(project_input)
    if peak is None or peak <= 0:
        return None
    effective_throughput = throughput * utilization
    if effective_throughput <= 0:
        return None
    return max(1, math.ceil(peak / effective_throughput))
