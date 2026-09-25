// Контракт 7 — SimulationTimeline, которую отдаёт backend/simulation/service.py.
// Зеркало backend/contracts/simulation.py; поля совпадают 1:1 с тем, что уходит
// в JSON через SimulationTimeline.model_dump_json() (см. Project/backend/simulation/).

export type RobotState = "idle" | "moving" | "loading" | "unloading" | "charging" | "blocked";

export interface TimelineFrame {
  robot_id: string;
  t: number; // секунд от начала окна моделирования (разогрев уже вычтен бэкендом)
  x: number;
  y: number;
  state: RobotState;
}

export interface Bottleneck {
  location: string;
  description: string;
  severity: "low" | "medium" | "high";
}

export interface SimulationKPI {
  utilization_pct: number;
  idle_time_pct: number;
  throughput_per_hour: number;
  bottlenecks: Bottleneck[];
}

export interface SimulationTimeline {
  id: string;
  project_id: string;
  scenario_id: string;
  duration_s: number;
  frames: TimelineFrame[];
  kpi: SimulationKPI;
}

export function isSimulationTimeline(value: unknown): value is SimulationTimeline {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.duration_s === "number" && Array.isArray(v.frames) && typeof v.kpi === "object" && v.kpi !== null;
}
