"""Контракт 7, §7 плана: оркестрация — Scene + ProjectInput + каталог -> SimulationTimeline.

Точка входа для остального бэкенда (когда появится API-слой/async-джоба): один
вызов, на входе реальные контракты, на выходе готовый `SimulationTimeline`
(контракт 7). Каталог/matching пока болванки из `fixtures.py` (см.
simulation_design.md §0, §8.4) — когда появится настоящий matching, единственное
место для правки — `build_robots` ниже (взять `catalog_item_id` из реального
`MatchResult`, а не из fixtures.resolve_catalog_item); engine.py/kpi.py уже
работают через типы `CatalogItem`/`SimRobot`, а не через хардкод, их трогать
не придётся.
"""

from __future__ import annotations

from contracts import ObjectParams, Scene, SimulationTimeline, TimelineFrame

from .engine import Engine, SimRobot
from .fixtures import resolve_catalog_item
from .graph import RouteGraph
from .kpi import compute_kpi
from .tasks import generate_arrivals

DEFAULT_WARMUP_S = 300.0  # 5 минут разогрева, не идёт в статистику/таймлайн (§6)
DEFAULT_WINDOW_S = 1800.0  # 30 минут представительного окна (§6: 30-60 мин)


def build_robots(scene: Scene) -> list[SimRobot]:
    """Флот и его стартовое состояние — прямо из Scene.robots (см. открытый вопрос
    simulation_design.md §8.4: пока нет matching, источник истины по количеству и
    размещению роботов — то, что реально расставлено в редакторе, а не
    MatchResult.selected_equipment.quantity)."""
    robots = []
    for placement in scene.robots:
        item = resolve_catalog_item(placement)
        robots.append(
            SimRobot(
                id=placement.id,
                name=placement.name,
                catalog_item=item,
                position=placement.start_position,
                home_charging_point_id=placement.home_charging_point_id,
                charge_remaining_s=(item.technical.autonomy_hours or 4.0) * 3600,
            )
        )
    return robots


def run_simulation(
    scene: Scene,
    params: ObjectParams,
    *,
    project_id: str,
    scenario_id: str,
    warmup_s: float = DEFAULT_WARMUP_S,
    window_s: float = DEFAULT_WINDOW_S,
) -> SimulationTimeline:
    """Один прогон: строит граф и флот, генерирует заявки (детерминированно по
    scenario_id), прогоняет событийный цикл, агрегирует KPI — и отдаёт готовый
    contracts.SimulationTimeline. Тот же scenario_id -> побитово тот же результат
    (нужно контракту 9: открыл старую версию проекта — увидел тот же таймлайн)."""
    graph = RouteGraph.from_scene(scene)
    robots = build_robots(scene)
    engine = Engine(
        graph=graph,
        robots=robots,
        operation_point_ids=[p.id for p in scene.operation_points],
        charging_point_slots={p.id: p.slots for p in scene.charging_points},
        warmup_s=warmup_s,
    )
    arrivals = generate_arrivals(scene, params, window_s=warmup_s + window_s, scenario_id=scenario_id)
    engine.run(arrivals, duration_s=window_s)

    location_names = {p.id: p.name for p in scene.operation_points}
    location_names.update({p.id: p.name for p in scene.charging_points})
    kpi = compute_kpi(
        engine.frames,
        robots,
        engine.wait_stats,
        duration_s=window_s,
        completed_tasks=engine.completed_tasks,
        location_names=location_names,
    )

    frames = [TimelineFrame(robot_id=f.robot_id, t=f.t, x=f.x, y=f.y, state=f.state) for f in engine.frames]

    return SimulationTimeline(
        id=f"timeline-{scenario_id}",
        project_id=project_id,
        scenario_id=scenario_id,
        duration_s=window_s,
        frames=frames,
        kpi=kpi,
    )
