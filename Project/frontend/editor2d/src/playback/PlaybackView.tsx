import { useEffect, useMemo, useRef, useState } from "react";
import { Arrow, Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import { CHARGE_COLOR, OP_COLOR, ROUTE_COLOR, WALL_COLOR, ZONE_COLORS } from "../scene/colors";
import { useSize } from "../editor/useSize";
import type { Point, Scene } from "../scene/types";
import { isSimulationTimeline, type RobotState, type SimulationTimeline, type TimelineFrame } from "./timeline";

const flat = (pts: Point[]) => pts.flatMap((p) => [p.x, p.y]);
const FIT_PAD = 32;
const SPEEDS = [1, 2, 5, 10, 30];

const ROBOT_STATE_COLORS: Record<RobotState, string> = {
  idle: "#8A8A82",
  moving: "#185FA5",
  loading: "#1D9E75",
  unloading: "#EF9F27",
  charging: "#639922",
  blocked: "#E24B4A",
};

const ROBOT_STATE_LABELS: Record<RobotState, string> = {
  idle: "простой",
  moving: "движение",
  loading: "загрузка",
  unloading: "разгрузка",
  charging: "зарядка",
  blocked: "заблокирован",
};

interface RobotFrames {
  robotId: string;
  name: string;
  frames: TimelineFrame[]; // отсортированы по t
  fallback: Point; // start_position — пока нет ни одного кадра для этого робота
}

/** Позиция линейно интерполируется между соседними кадрами; состояние — ступенькой
 * (держится от кадра a до кадра b, не смешивается). До первого кадра и после
 * последнего — крайнее известное положение (робот ещё/уже не в таймлайне). */
function interpolate(rf: RobotFrames, t: number): { x: number; y: number; state: RobotState } {
  const fs = rf.frames;
  if (fs.length === 0) return { x: rf.fallback.x, y: rf.fallback.y, state: "idle" };
  if (t <= fs[0].t) return { x: fs[0].x, y: fs[0].y, state: fs[0].state };
  const last = fs[fs.length - 1];
  if (t >= last.t) return { x: last.x, y: last.y, state: last.state };
  let i = 0;
  while (i + 1 < fs.length && fs[i + 1].t <= t) i++;
  const a = fs[i];
  const b = fs[i + 1] ?? a;
  const span = b.t - a.t;
  const ratio = span > 0 ? (t - a.t) / span : 0;
  return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio, state: a.state };
}

interface Props {
  scene: Scene;
}

export function PlaybackView({ scene }: Props) {
  const [timeline, setTimeline] = useState<SimulationTimeline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const rafRef = useRef<number | null>(null);
  const lastWallClock = useRef<number | null>(null);
  const [canvasRef, { width, height }] = useSize<HTMLDivElement>();

  const { width: siteW, height: siteH } = scene.site;
  const k = width > 0 ? Math.min((width - 2 * FIT_PAD) / siteW, (height - 2 * FIT_PAD) / siteH) || 1 : 1;
  const offsetX = (width - siteW * k) / 2;
  const offsetY = (height - siteH * k) / 2;
  const px = (v: number) => v / k;

  const robotFrames: RobotFrames[] = useMemo(() => {
    const byId = new Map<string, TimelineFrame[]>();
    for (const f of timeline?.frames ?? []) {
      const arr = byId.get(f.robot_id);
      if (arr) arr.push(f);
      else byId.set(f.robot_id, [f]);
    }
    return scene.robots.map((r) => ({
      robotId: r.id,
      name: r.name,
      frames: (byId.get(r.id) ?? []).slice().sort((a, b) => a.t - b.t),
      fallback: r.start_position,
    }));
  }, [timeline, scene.robots]);

  // воспроизведение: requestAnimationFrame, шаг — реальное прошедшее время * множитель скорости
  useEffect(() => {
    if (!playing) {
      lastWallClock.current = null;
      return;
    }
    const step = (now: number) => {
      if (lastWallClock.current !== null) {
        const deltaWall = (now - lastWallClock.current) / 1000;
        setT((prev) => {
          const duration = timeline?.duration_s ?? 0;
          const next = prev + deltaWall * speed;
          if (next >= duration) {
            setPlaying(false);
            return duration;
          }
          return next;
        });
      }
      lastWallClock.current = now;
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, speed, timeline?.duration_s]);

  const openTimeline = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isSimulationTimeline(parsed)) throw new Error("файл не похож на SimulationTimeline (контракт 7)");
      setTimeline(parsed);
      setT(0);
      setPlaying(false);
      setError(null);
    } catch (e) {
      setError(`Не удалось открыть ${file.name}: ${(e as Error).message}`);
    }
  };

  return (
    <div className="playback">
      <div className="playback-toolbar">
        <label className="button">
          Открыть таймлайн симуляции
          <input
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) openTimeline(file);
              e.target.value = "";
            }}
          />
        </label>
        {timeline && (
          <>
            <button onClick={() => setPlaying((p) => !p)}>{playing ? "⏸ Пауза" : "▶ Запуск"}</button>
            <button
              onClick={() => {
                setPlaying(false);
                setT(0);
              }}
            >
              ⏮ Сброс
            </button>
            <label className="small">
              Скорость{" "}
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    ×{s}
                  </option>
                ))}
              </select>
            </label>
            <input
              type="range"
              min={0}
              max={timeline.duration_s}
              step={0.1}
              value={t}
              onChange={(e) => {
                setPlaying(false);
                setT(Number(e.target.value));
              }}
              className="scrub"
            />
            <span className="muted small">
              {t.toFixed(0)} / {timeline.duration_s.toFixed(0)} с
            </span>
          </>
        )}
      </div>
      {error && <div className="error">{error}</div>}
      {!timeline && <div className="hint-static">Загрузите файл SimulationTimeline (JSON) — результат `run_simulation` из backend/simulation/service.py — чтобы увидеть проигрывание на текущем плане.</div>}

      <div className="playback-canvas" ref={canvasRef}>
        {width > 0 && (
        <Stage width={width} height={height} x={offsetX} y={offsetY} scaleX={k} scaleY={k} listening={false}>
          <Layer listening={false}>
            <Line points={flat(scene.site.boundary)} closed fill="#ffffff" stroke="#5F5E5A" strokeWidth={px(2)} />
            {scene.zones.map((z) => {
              const c = ZONE_COLORS[z.zone_type] ?? ZONE_COLORS.transit;
              return <Line key={z.id} points={flat(z.polygon)} closed fill={c.fill} stroke={c.stroke} strokeWidth={px(1.5)} />;
            })}
            {scene.walls.map((w) => (
              <Line key={w.id} points={flat(w.points)} stroke={WALL_COLOR} strokeWidth={Math.max(w.thickness, px(2))} lineCap="butt" lineJoin="miter" />
            ))}
            {scene.routes.map((r) =>
              r.bidirectional ? (
                <Line key={r.id} points={flat(r.points)} stroke={ROUTE_COLOR} strokeWidth={px(3)} lineJoin="round" lineCap="round" />
              ) : (
                <Arrow
                  key={r.id}
                  points={flat(r.points)}
                  stroke={ROUTE_COLOR}
                  fill={ROUTE_COLOR}
                  strokeWidth={px(3)}
                  pointerLength={px(10)}
                  pointerWidth={px(10)}
                  lineJoin="round"
                  lineCap="round"
                />
              ),
            )}
            {scene.operation_points.map((p) => (
              <Group key={p.id} x={p.position.x} y={p.position.y}>
                <Circle radius={px(8)} fill={OP_COLOR} stroke="#ffffff" strokeWidth={px(2)} />
                <Text x={px(12)} y={px(-20)} text={p.name} fontSize={px(12)} fill="#712B13" />
              </Group>
            ))}
            {scene.charging_points.map((p) => (
              <Group key={p.id} x={p.position.x} y={p.position.y}>
                <Rect x={px(-11)} y={px(-11)} width={px(22)} height={px(22)} cornerRadius={px(4)} fill={CHARGE_COLOR} stroke="#ffffff" strokeWidth={px(2)} />
                <Text x={px(14)} y={px(-20)} text={`${p.name} ×${p.slots}`} fontSize={px(12)} fill="#27500A" />
              </Group>
            ))}
          </Layer>
          <Layer listening={false}>
            {robotFrames.map((rf) => {
              const { x, y, state } = interpolate(rf, t);
              const color = ROBOT_STATE_COLORS[state];
              return (
                <Group key={rf.robotId} x={x} y={y}>
                  <Circle radius={px(10)} fill={color} stroke="#ffffff" strokeWidth={px(2)} />
                  <Text x={px(-35)} y={px(14)} width={px(70)} align="center" text={rf.name} fontSize={px(11)} fill="#0C0C0A" />
                  <Text x={px(-35)} y={px(27)} width={px(70)} align="center" text={ROBOT_STATE_LABELS[state]} fontSize={px(10)} fill={color} />
                </Group>
              );
            })}
          </Layer>
        </Stage>
        )}
      </div>

      {timeline && (
        <div className="playback-kpi">
          <span>
            <strong>Загрузка:</strong> {timeline.kpi.utilization_pct}%
          </span>
          <span>
            <strong>Простой:</strong> {timeline.kpi.idle_time_pct}%
          </span>
          <span>
            <strong>Производительность:</strong> {timeline.kpi.throughput_per_hour} опер./ч
          </span>
          {timeline.kpi.bottlenecks.length > 0 && (
            <div className="issues bottlenecks">
              {timeline.kpi.bottlenecks.map((b, i) => (
                <div key={i} className={`issue ${b.severity === "high" ? "error" : "warning"}`}>
                  <strong>{b.location}</strong>: {b.description}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
