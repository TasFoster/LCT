"""Демо-скрипт: прогоняет run_simulation на scene.example.json и сохраняет
SimulationTimeline в JSON — способ получить файл для проигрывания в
frontend/src/features/planEditor/playback (кнопка «Открыть таймлайн симуляции»)
без реального API-слоя, которого пока нет.

Запуск из Project/backend/:
    python -m simulation.demo путь_к_файлу.json
    python -m simulation.demo   # без аргумента — печатает JSON в stdout
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from contracts import Scene, WarehouseParams

from .service import run_simulation

SCENE_EXAMPLE_PATH = Path(__file__).resolve().parents[2] / "scene.example.json"

DEMO_PARAMS = WarehouseParams(
    area_sqm=1000,
    operating_mode="24/7",
    inbound_ops_per_day=600,
    internal_ops_per_day=400,
    outbound_ops_per_day=600,
    storage_type="pallet",
    sku_count=500,
    unit_load_weight_kg=300,
    unit_load_dimensions_mm="1200x800x1500",
    staff_count=10,
    staff_cost_per_month=80000,
    current_throughput_per_hour=20,
    route_length_m=100,
)


def main() -> None:
    scene = Scene.model_validate(json.loads(SCENE_EXAMPLE_PATH.read_text(encoding="utf-8")))
    timeline = run_simulation(scene, DEMO_PARAMS, project_id="demo-project", scenario_id="demo-scenario")
    output = timeline.model_dump_json(indent=2)
    if len(sys.argv) > 1:
        Path(sys.argv[1]).write_text(output, encoding="utf-8")
        print(f"{len(timeline.frames)} кадров, KPI {timeline.kpi} -> {sys.argv[1]}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
