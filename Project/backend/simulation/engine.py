"""Контракт 7, §4/§5 плана: событийный цикл, конечный автомат робота, ресурсы.

Тот же принцип, что разбирали на игрушечном примере (heapq + колбэки-продолжения),
но для многих роботов и нескольких видов ресурсов (точки операций/зарядки, узкие
рёбра маршрутов). `Resource` — счётчик занятости + очередь ожидающих колбэков
(семафор), НЕ автомат состояний; автомат состояний — это `RobotState` у `SimRobot`.

Явные, документированные допущения (пойдут в assumptions_note, когда оно появится
у SimulationTimeline — simulation_design.md §8 п.3):
- DEFAULT_SERVICE_TIME_S / DEFAULT_AUTONOMY_HOURS / DEFAULT_SPEED_MPS — если у
  каталожной позиции нет нужного поля.
- Заряд тратится только во время MOVING/LOADING/UNLOADING (не во время IDLE/BLOCKED —
  считаем, что робот "спит"/стоит на месте без активного расхода).
- CHARGE_RATE = 1.0 — секунда зарядки восполняет секунду автономности (нет реальных
  данных по скорости зарядки, взято наиболее простое линейное допущение).
- CHARGE_SAFETY_MARGIN — запас времени поверх пути до дома-зарядки, при котором робот
  уезжает заряжаться заранее, а не в притык.
- Проверка заряда — только между задачами (см. §4 п.6 плана), не прерывает задачу
  на середине: робот, у которого заряд кончился в процессе выполнения текущей задачи,
  всё равно её доведёт (граница допущения, не описана в плане отдельно).
"""

from __future__ import annotations

import heapq
import math
from dataclasses import dataclass, field
from typing import Callable

from contracts import CatalogItem, Point, RobotState

from .graph import NodeId, RouteGraph
from .tasks import TaskInstance

DEFAULT_SERVICE_TIME_S = 60.0
DEFAULT_AUTONOMY_HOURS = 4.0
DEFAULT_SPEED_MPS = 1.0
CHARGE_SAFETY_MARGIN = 1.2
CHARGE_RATE = 1.0

Callback = Callable[[float], None]


@dataclass
class SimRobot:
    id: str
    name: str
    catalog_item: CatalogItem
    position: Point
    home_charging_point_id: str | None
    state: RobotState = RobotState.IDLE
    current_task: TaskInstance | None = None
    charge_remaining_s: float = 0.0

    @property
    def speed_mps(self) -> float:
        return self.catalog_item.technical.speed_mps or DEFAULT_SPEED_MPS

    @property
    def autonomy_s(self) -> float:
        return (self.catalog_item.technical.autonomy_hours or DEFAULT_AUTONOMY_HOURS) * 3600

    @property
    def service_time_s(self) -> float:
        throughput = self.catalog_item.technical.throughput_per_hour
        return 3600 / throughput if throughput else DEFAULT_SERVICE_TIME_S


@dataclass
class Frame:
    robot_id: str
    t: float  # секунд от начала окна (разогрев уже вычтен, см. Engine.emit_frame)
    x: float
    y: float
    state: RobotState


@dataclass
class ResourceWaitStats:
    """Суммарное время ожидания по ресурсу (только после разогрева) — сырьё для kpi.py."""

    total_wait_s: float = 0.0
    wait_events: int = 0


class Resource:
    """Семафор: capacity мест + очередь ожидающих колбэков-продолжений. Не путать с
    автоматом состояний — см. обсуждение в чате про разницу между ними."""

    def __init__(self, resource_id: str, capacity: int, stats: dict[str, ResourceWaitStats], warmup_s: float):
        self.resource_id = resource_id
        self.capacity = capacity
        self.busy = 0
        self.waiting: list[tuple[float, Callback]] = []
        self._stats = stats
        self._warmup_s = warmup_s

    def acquire(self, clock: float, on_acquired: Callback, on_wait_start: Callback | None = None) -> None:
        if self.busy < self.capacity:
            self.busy += 1
            on_acquired(clock)
        else:
            if on_wait_start is not None:
                on_wait_start(clock)
            self.waiting.append((clock, on_acquired))

    def release(self, clock: float) -> None:
        self.busy -= 1
        if self.waiting:
            requested_at, on_acquired = self.waiting.pop(0)
            self.busy += 1
            if clock >= self._warmup_s:
                stats = self._stats.setdefault(self.resource_id, ResourceWaitStats())
                stats.total_wait_s += clock - requested_at
                stats.wait_events += 1
            on_acquired(clock)


class Engine:
    def __init__(self, graph: RouteGraph, robots: list[SimRobot], operation_point_ids: list[str],
                 charging_point_slots: dict[str, int], warmup_s: float):
        self.graph = graph
        self.robots: dict[str, SimRobot] = {r.id: r for r in robots}
        self.warmup_s = warmup_s
        self.clock = 0.0

        self._events: list[tuple[float, int, Callback]] = []
        self._counter = 0
        self.frames: list[Frame] = []
        self._last_frame: dict[str, Frame] = {}  # для дедупликации в emit_frame
        self.wait_stats: dict[str, ResourceWaitStats] = {}
        self.pending_tasks: list[TaskInstance] = []
        self.idle_robot_ids: set[str] = set()
        self.completed_tasks = 0  # завершённых (после разогрева) — сырьё для throughput_per_hour в kpi.py
        self._narrow_edges: dict[frozenset[NodeId], Resource] = {}

        self._op_points = {pid: Resource(pid, 1, self.wait_stats, warmup_s) for pid in operation_point_ids}
        self._charge_points = {
            pid: Resource(pid, slots, self.wait_stats, warmup_s) for pid, slots in charging_point_slots.items()
        }

    # --- инфраструктура событийного цикла -------------------------------

    def schedule(self, t: float, callback: Callback) -> None:
        self._counter += 1
        heapq.heappush(self._events, (t, self._counter, callback))

    def emit_frame(self, robot: SimRobot) -> None:
        """Разогрев не идёт в таймлайн/статистику (§6). Кадр, идентичный последнему
        кадру этого же робота (тот же t/x/y/state — переход между рёбрами без
        ожидания на ресурс), не добавляется — не несёт новой информации."""
        if self.clock < self.warmup_s:
            return
        t = self.clock - self.warmup_s
        last = self._last_frame.get(robot.id)
        if last is not None and last.t == t and last.x == robot.position.x and last.y == robot.position.y and last.state == robot.state:
            return
        frame = Frame(robot.id, t, robot.position.x, robot.position.y, robot.state)
        self.frames.append(frame)
        self._last_frame[robot.id] = frame

    def _edge_resource(self, a: NodeId, b: NodeId) -> Resource | None:
        if not self.graph.is_narrow(a, b):
            return None
        key = frozenset((a, b))
        if key not in self._narrow_edges:
            self._narrow_edges[key] = Resource(f"edge:{a}-{b}", 1, self.wait_stats, self.warmup_s)
        return self._narrow_edges[key]

    def run(self, arrivals: list[TaskInstance], duration_s: float) -> None:
        self.idle_robot_ids.update(self.robots)
        for arrival in arrivals:
            self.schedule(arrival.arrival_t, lambda clock, a=arrival: self._on_task_arrived(clock, a))
        end_t = self.warmup_s + duration_s
        while self._events and self._events[0][0] <= end_t:
            t, _, callback = heapq.heappop(self._events)
            self.clock = t
            callback(self.clock)

    # --- диспетчер --------------------------------------------------------

    def _on_task_arrived(self, clock: float, task: TaskInstance) -> None:
        self.pending_tasks.append(task)
        self._try_dispatch(clock)

    def _try_dispatch(self, clock: float) -> None:
        while self.pending_tasks and self.idle_robot_ids:
            best: tuple[float, str, TaskInstance, list[NodeId]] | None = None
            for robot_id in self.idle_robot_ids:
                robot = self.robots[robot_id]
                for task in self.pending_tasks:
                    result = self.graph.path_from_position(robot.position, task.origin_point_id)
                    if result is None:
                        continue
                    dist, path = result
                    time_s = dist / robot.speed_mps
                    if best is None or time_s < best[0]:
                        best = (time_s, robot_id, task, path)
            if best is None:
                break  # ни один свободный робот не может добраться ни до одной задачи
            _, robot_id, task, path = best
            self.idle_robot_ids.discard(robot_id)
            self.pending_tasks.remove(task)
            robot = self.robots[robot_id]
            robot.current_task = task
            self._move_along(robot, path, clock, lambda c, r=robot, tsk=task: self._on_arrived_origin(c, r, tsk))

    # --- движение по графу -------------------------------------------------

    def _move_along(self, robot: SimRobot, path: list[NodeId], clock: float, on_arrival: Callback) -> None:
        if len(path) < 2:
            on_arrival(clock)
            return
        robot.state = RobotState.MOVING
        self._advance_edge(robot, path, 0, clock, on_arrival)

    def _advance_edge(self, robot: SimRobot, path: list[NodeId], i: int, clock: float, on_arrival: Callback) -> None:
        a, b = path[i], path[i + 1]
        edge_resource = self._edge_resource(a, b)

        def proceed(clock: float) -> None:
            distance = math.dist(a, b)
            travel_s = distance / robot.speed_mps
            robot.charge_remaining_s -= travel_s
            robot.state = RobotState.MOVING
            self.emit_frame(robot)  # кадр в момент выезда на ребро — не только в вершинах прибытия

            def arrive(clock: float) -> None:
                robot.position = Point(x=b[0], y=b[1])
                self.emit_frame(robot)
                if edge_resource is not None:
                    edge_resource.release(clock)
                if i + 2 < len(path):
                    self._advance_edge(robot, path, i + 1, clock, on_arrival)
                else:
                    on_arrival(clock)

            self.schedule(clock + travel_s, arrive)

        if edge_resource is not None:
            def on_wait_start(clock: float) -> None:
                robot.state = RobotState.BLOCKED
                self.emit_frame(robot)

            edge_resource.acquire(clock, proceed, on_wait_start)
        else:
            proceed(clock)

    # --- задача: загрузка/выгрузка ------------------------------------------

    def _on_arrived_origin(self, clock: float, robot: SimRobot, task: TaskInstance) -> None:
        point = self._op_points[task.origin_point_id]

        def on_wait_start(clock: float) -> None:
            robot.state = RobotState.BLOCKED
            self.emit_frame(robot)

        def loading(clock: float) -> None:
            robot.state = RobotState.LOADING
            self.emit_frame(robot)
            duration = robot.service_time_s
            robot.charge_remaining_s -= duration
            self.schedule(clock + duration, lambda c: self._on_loaded(c, robot, task, point))

        point.acquire(clock, loading, on_wait_start)

    def _on_loaded(self, clock: float, robot: SimRobot, task: TaskInstance, point: Resource) -> None:
        point.release(clock)
        result = self.graph.path_from_position(robot.position, task.destination_point_id)
        if result is None:
            # недостижимо — не должно происходить на связной сцене, но не роняем прогон
            self._return_to_idle(clock, robot)
            return
        _, path = result
        self._move_along(robot, path, clock, lambda c: self._on_arrived_destination(c, robot, task))

    def _on_arrived_destination(self, clock: float, robot: SimRobot, task: TaskInstance) -> None:
        point = self._op_points[task.destination_point_id]

        def on_wait_start(clock: float) -> None:
            robot.state = RobotState.BLOCKED
            self.emit_frame(robot)

        def unloading(clock: float) -> None:
            robot.state = RobotState.UNLOADING
            self.emit_frame(robot)
            duration = robot.service_time_s
            robot.charge_remaining_s -= duration
            self.schedule(clock + duration, lambda c: self._on_unloaded(c, robot, point))

        point.acquire(clock, unloading, on_wait_start)

    def _on_unloaded(self, clock: float, robot: SimRobot, point: Resource) -> None:
        point.release(clock)
        robot.current_task = None
        if clock >= self.warmup_s:
            self.completed_tasks += 1
        if self._needs_charging(robot):
            self._go_charge(clock, robot)
        else:
            self._return_to_idle(clock, robot)

    def _return_to_idle(self, clock: float, robot: SimRobot) -> None:
        robot.state = RobotState.IDLE
        self.emit_frame(robot)
        self.idle_robot_ids.add(robot.id)
        self._try_dispatch(clock)

    # --- зарядка ------------------------------------------------------------

    def _needs_charging(self, robot: SimRobot) -> bool:
        if robot.home_charging_point_id is None:
            return False
        result = self.graph.path_from_position(robot.position, robot.home_charging_point_id)
        if result is None:
            return False
        dist, _ = result
        time_to_charge_s = dist / robot.speed_mps
        return robot.charge_remaining_s < time_to_charge_s * CHARGE_SAFETY_MARGIN

    def _go_charge(self, clock: float, robot: SimRobot) -> None:
        result = self.graph.path_from_position(robot.position, robot.home_charging_point_id)
        if result is None:
            self._return_to_idle(clock, robot)
            return
        _, path = result
        self._move_along(robot, path, clock, lambda c: self._on_arrived_charging(c, robot))

    def _on_arrived_charging(self, clock: float, robot: SimRobot) -> None:
        point = self._charge_points[robot.home_charging_point_id]

        def on_wait_start(clock: float) -> None:
            robot.state = RobotState.BLOCKED
            self.emit_frame(robot)

        def charging(clock: float) -> None:
            robot.state = RobotState.CHARGING
            self.emit_frame(robot)
            missing_s = max(robot.autonomy_s - robot.charge_remaining_s, 0.0)
            duration = missing_s * CHARGE_RATE
            self.schedule(clock + duration, lambda c: self._on_charged(c, robot, point))

        point.acquire(clock, charging, on_wait_start)

    def _on_charged(self, clock: float, robot: SimRobot, point: Resource) -> None:
        robot.charge_remaining_s = robot.autonomy_s
        point.release(clock)
        self._return_to_idle(clock, robot)
