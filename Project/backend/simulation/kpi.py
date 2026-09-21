"""Контракт 7, §5/§6 плана: агрегация событийного прогона в SimulationKPI/Bottleneck.

Пороги для Bottleneck — доля от среднего времени цикла задачи (время от освобождения
робота до следующего освобождения, усреднённое по всем завершённым задачам в окне).
Задокументированные допущения, коэффициенты не спрятаны в коде без объяснения:
- BOTTLENECK_MEDIUM_RATIO / BOTTLENECK_HIGH_RATIO — во сколько раз среднее ожидание
  на ресурсе должно превышать средний цикл, чтобы считаться узким местом.
- utilization_pct — доля времени робота в MOVING/LOADING/UNLOADING (продуктивная
  работа); idle_time_pct — доля в IDLE. BLOCKED/CHARGING не входят ни в одно из
  двух полей контракта — они видны через сами Bottleneck и через отдельный расчёт
  парка (не в этом контракте).
"""

from __future__ import annotations

from contracts import Bottleneck, RobotState, SimulationKPI

from .engine import Frame, ResourceWaitStats, SimRobot

BOTTLENECK_MEDIUM_RATIO = 0.15
BOTTLENECK_HIGH_RATIO = 0.5

_ACTIVE_STATES = {RobotState.MOVING, RobotState.LOADING, RobotState.UNLOADING}


def _robot_state_durations(frames: list[Frame], robot_id: str, duration_s: float) -> dict[RobotState, float]:
    robot_frames = sorted((f for f in frames if f.robot_id == robot_id), key=lambda f: f.t)
    durations: dict[RobotState, float] = {}
    for i, f in enumerate(robot_frames):
        end_t = robot_frames[i + 1].t if i + 1 < len(robot_frames) else duration_s
        durations[f.state] = durations.get(f.state, 0.0) + max(end_t - f.t, 0.0)
    return durations


def _detect_bottlenecks(
    wait_stats: dict[str, ResourceWaitStats],
    avg_cycle_s: float,
    location_names: dict[str, str],
) -> list[Bottleneck]:
    if avg_cycle_s <= 0:
        return []
    bottlenecks: list[Bottleneck] = []
    for resource_id, stats in wait_stats.items():
        if stats.wait_events == 0:
            continue
        avg_wait = stats.total_wait_s / stats.wait_events
        ratio = avg_wait / avg_cycle_s
        if ratio >= BOTTLENECK_HIGH_RATIO:
            severity = "high"
        elif ratio >= BOTTLENECK_MEDIUM_RATIO:
            severity = "medium"
        else:
            continue
        name = location_names.get(resource_id, resource_id)
        bottlenecks.append(
            Bottleneck(
                location=name,
                description=(
                    f"среднее ожидание {avg_wait:.0f} с ({stats.wait_events} случаев за окно) — "
                    f"{ratio * 100:.0f}% от среднего цикла задачи"
                ),
                severity=severity,
            )
        )
    bottlenecks.sort(key=lambda b: 0 if b.severity == "high" else 1)
    return bottlenecks


def compute_kpi(
    frames: list[Frame],
    robots: list[SimRobot],
    wait_stats: dict[str, ResourceWaitStats],
    duration_s: float,
    completed_tasks: int,
    location_names: dict[str, str] | None = None,
) -> SimulationKPI:
    total_active_s = 0.0
    total_idle_s = 0.0
    for robot in robots:
        durations = _robot_state_durations(frames, robot.id, duration_s)
        total_active_s += sum(durations.get(state, 0.0) for state in _ACTIVE_STATES)
        total_idle_s += durations.get(RobotState.IDLE, 0.0)

    total_capacity_s = duration_s * len(robots)
    utilization_pct = 100 * total_active_s / total_capacity_s if total_capacity_s else 0.0
    idle_time_pct = 100 * total_idle_s / total_capacity_s if total_capacity_s else 0.0
    throughput_per_hour = completed_tasks / (duration_s / 3600) if duration_s else 0.0

    cycles = completed_tasks / len(robots) if robots else 0
    avg_cycle_s = duration_s / cycles if cycles else 0.0
    bottlenecks = _detect_bottlenecks(wait_stats, avg_cycle_s, location_names or {})

    return SimulationKPI(
        utilization_pct=round(utilization_pct, 1),
        idle_time_pct=round(idle_time_pct, 1),
        throughput_per_hour=round(throughput_per_hour, 2),
        bottlenecks=bottlenecks,
    )
