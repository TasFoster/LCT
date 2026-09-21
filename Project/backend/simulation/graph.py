"""Контракт 7, §2 плана (Документация/Подбор и симуляция/simulation_design.md): граф
маршрутов и кратчайшие пути.

Строится один раз при загрузке сцены. Узел графа — координата вершины маршрута
(вершины разных маршрутов с совпадающими координатами — один узел, правило из
scene.md); вершина с `ref` дополнительно резолвится в id ключевой точки
(OperationPoint/ChargingPoint), через которую робот входит/выходит из графа.
Вес ребра — расстояние в метрах. Время прохода = distance_m / catalog_item.technical.speed_mps
конкретного робота — считается отдельно, при использовании графа, а не хранится в нём
(граф общий, скорости у разных роботов разные).

Дейкстра — heapq из stdlib: граф маленький (десятки узлов), networkx не нужен.
"""

from __future__ import annotations

import heapq
import math
from dataclasses import dataclass, field

from contracts import Point, Scene

NodeId = tuple[float, float]  # квантованная координата узла, (x, y) в метрах

_PRECISION = 3  # знаков после запятой = миллиметр — гасит шум float, вершины совпадают


def _node_id(x: float, y: float) -> NodeId:
    return (round(x, _PRECISION), round(y, _PRECISION))


def _closest_point_on_segment(p: Point, a: NodeId, b: NodeId) -> tuple[float, float, float]:
    """(x, y, t) ближайшей к p точки отрезка a-b; t в [0,1], 0 = a, 1 = b."""
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    length_sq = dx * dx + dy * dy
    if length_sq == 0:
        return ax, ay, 0.0
    t = ((p.x - ax) * dx + (p.y - ay) * dy) / length_sq
    t = max(0.0, min(1.0, t))
    return ax + t * dx, ay + t * dy, t


@dataclass
class Edge:
    to: NodeId
    distance_m: float


@dataclass
class GraphEntry:
    """Точка входа в граф для позиции, которая сама не является узлом (робот без
    start_point_id) — см. RouteGraph.nearest_entry."""

    approach_m: float  # прямой отрезок от позиции до точки входа на ближайшем ребре
    via: list[tuple[NodeId, float]]  # узлы, до которых можно доехать от точки входа, и расстояние до них


@dataclass
class RouteGraph:
    """Граф маршрутов сцены: узлы = вершины Route.points (совпадающие координаты
    слиты в один узел), рёбра = соседние точки внутри одного маршрута."""

    nodes: set[NodeId] = field(default_factory=set)
    adjacency: dict[NodeId, list[Edge]] = field(default_factory=dict)
    node_of_point: dict[str, NodeId] = field(default_factory=dict)  # id ключевой точки -> узел
    point_of_node: dict[NodeId, str] = field(default_factory=dict)  # узел -> id ключевой точки (если есть)

    @classmethod
    def from_scene(cls, scene: Scene) -> RouteGraph:
        graph = cls()
        for route in scene.routes:
            nodes = [_node_id(p.x, p.y) for p in route.points]
            for node, point in zip(nodes, route.points):
                graph._add_node(node)
                if point.ref is not None:
                    graph.node_of_point[point.ref] = node
                    graph.point_of_node[node] = point.ref
            for a, b in zip(nodes, nodes[1:]):
                graph._add_edge(a, b, route.bidirectional)
        return graph

    def _add_node(self, node: NodeId) -> None:
        self.nodes.add(node)
        self.adjacency.setdefault(node, [])

    def _add_edge(self, a: NodeId, b: NodeId, bidirectional: bool) -> None:
        dist = math.dist(a, b)
        self.adjacency[a].append(Edge(to=b, distance_m=dist))
        if bidirectional:
            self.adjacency[b].append(Edge(to=a, distance_m=dist))

    def _has_edge(self, a: NodeId, b: NodeId) -> bool:
        return any(e.to == b for e in self.adjacency.get(a, ()))

    def _dijkstra(self, source: NodeId, target: NodeId | None = None) -> tuple[dict[NodeId, float], dict[NodeId, NodeId]]:
        dist: dict[NodeId, float] = {source: 0.0}
        prev: dict[NodeId, NodeId] = {}
        visited: set[NodeId] = set()
        queue: list[tuple[float, NodeId]] = [(0.0, source)]
        while queue:
            d, node = heapq.heappop(queue)
            if node in visited:
                continue
            visited.add(node)
            if target is not None and node == target:
                break
            for edge in self.adjacency.get(node, []):
                nd = d + edge.distance_m
                if nd < dist.get(edge.to, math.inf):
                    dist[edge.to] = nd
                    prev[edge.to] = node
                    heapq.heappush(queue, (nd, edge.to))
        return dist, prev

    def distances_from(self, source: NodeId) -> dict[NodeId, float]:
        dist, _ = self._dijkstra(source)
        return dist

    def shortest_path(self, source: NodeId, target: NodeId) -> tuple[float, list[NodeId]] | None:
        """(расстояние_м, путь_по_узлам) или None, если target недостижим."""
        if source == target:
            return 0.0, [source]
        dist, prev = self._dijkstra(source, target)
        if target not in dist:
            return None
        path = [target]
        while path[-1] != source:
            path.append(prev[path[-1]])
        path.reverse()
        return dist[target], path

    def node_for_key_point(self, point_id: str) -> NodeId:
        """Узел графа для id операционной/зарядной точки. KeyError, если точка не
        привязана ни к одному маршруту (ни одна вершина Route.points не сослалась
        на неё через ref) — до такой точки нельзя проложить путь по графу."""
        try:
            return self.node_of_point[point_id]
        except KeyError as exc:
            raise KeyError(
                f"точка {point_id!r} не привязана ни к одному маршруту (нет вершины с ref={point_id!r}) "
                "— до неё нельзя проложить путь по графу"
            ) from exc

    def all_pairs_among_key_points(self, point_ids: list[str]) -> dict[tuple[str, str], float | None]:
        """Кратчайшие расстояния между всеми парами переданных точек — по одному
        прогону Дейкстры на источник (не наивным перебором пар)."""
        nodes = {pid: self.node_for_key_point(pid) for pid in point_ids}
        result: dict[tuple[str, str], float | None] = {}
        for src_id, src_node in nodes.items():
            dist = self.distances_from(src_node)
            for dst_id, dst_node in nodes.items():
                result[(src_id, dst_id)] = dist.get(dst_node)
        return result

    def nearest_entry(self, position: Point) -> GraphEntry:
        """Ближайшая точка на любом ребре графа — для робота без start_point_id:
        разовая проекция на ближайшее ребро маршрута (см. §2 плана). Для одностороннего
        ребра a->b точка входа может продолжить путь только вперёд, к b — назад, к a,
        только если ребро двустороннее (иначе это движение против одностороннего маршрута)."""
        best_approach = math.inf
        best_via: list[tuple[NodeId, float]] = []
        pos = (position.x, position.y)
        seen: set[frozenset[NodeId]] = set()
        for a, edges in self.adjacency.items():
            for edge in edges:
                b = edge.to
                seg_key = frozenset((a, b))
                if seg_key in seen:  # двусторонний отрезок иначе рассмотрели бы дважды
                    continue
                seen.add(seg_key)
                cx, cy, t = _closest_point_on_segment(position, a, b)
                approach = math.dist(pos, (cx, cy))
                if approach < best_approach:
                    via = [(b, (1 - t) * edge.distance_m)]
                    if self._has_edge(b, a):
                        via.append((a, t * edge.distance_m))
                    best_approach = approach
                    best_via = via
        if not best_via:
            raise ValueError("граф пуст — нет ни одного маршрута, некуда проецировать позицию")
        return GraphEntry(approach_m=best_approach, via=best_via)

    def shortest_from_position(self, position: Point, target_point_id: str) -> float | None:
        """Расстояние от произвольной позиции (не обязательно на графе) до ключевой
        точки: прямой довесок до графа (nearest_entry) + путь по графу (Дейкстра)."""
        target_node = self.node_for_key_point(target_point_id)
        entry = self.nearest_entry(position)
        best: float | None = None
        for node, via_dist in entry.via:
            dist = self.distances_from(node).get(target_node)
            if dist is None:
                continue
            total = entry.approach_m + via_dist + dist
            if best is None or total < best:
                best = total
        return best
