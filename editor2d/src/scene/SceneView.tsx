import { useEffect, useRef, useState } from "react";
import { Arrow, Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import type Konva from "konva";
import type { Point, Scene, SceneObject, ZoneType } from "./types";

const ZONE_COLORS: Record<ZoneType, { fill: string; stroke: string }> = {
  storage: { fill: "rgba(29,158,117,0.18)", stroke: "#1D9E75" },
  operation: { fill: "rgba(127,119,221,0.18)", stroke: "#7F77DD" },
  charging: { fill: "rgba(99,153,34,0.20)", stroke: "#639922" },
  restricted: { fill: "rgba(226,75,74,0.18)", stroke: "#E24B4A" },
  transit: { fill: "rgba(136,135,128,0.15)", stroke: "#888780" },
};
const ROUTE_COLOR = "#378ADD";
const OP_COLOR = "#D85A30";
const CHARGE_COLOR = "#639922";
const ROBOT_COLOR = "#185FA5";
const SELECT_COLOR = "#EF9F27";

const flat = (pts: Point[]) => pts.flatMap((p) => [p.x, p.y]);

interface Props {
  scene: Scene;
  width: number;
  height: number;
  selectedId: string | null;
  onSelect: (obj: SceneObject | null) => void;
}

// Всё внутри Stage рисуется прямо в метрах сцены: масштаб метры→пиксели задаёт сама Stage.
// Размеры, которые должны оставаться постоянными на экране (толщина линий, шрифт, значки),
// делим на текущий масштаб k.
export function SceneView({ scene, width, height, selectedId, onSelect }: Props) {
  const stageRef = useRef<Konva.Stage>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });

  // вписать план в окно при загрузке сцены и изменении размеров
  useEffect(() => {
    const pad = 32;
    const k = Math.min((width - 2 * pad) / scene.site.width, (height - 2 * pad) / scene.site.height);
    setView({
      k,
      x: (width - scene.site.width * k) / 2,
      y: (height - scene.site.height * k) / 2,
    });
  }, [scene, width, height]);

  const { k } = view;
  const px = (v: number) => v / k;

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;
    const factor = e.evt.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newK = Math.min(Math.max(view.k * factor, 2), 400);
    const mx = (pointer.x - view.x) / view.k;
    const my = (pointer.y - view.y) / view.k;
    setView({ k: newK, x: pointer.x - mx * newK, y: pointer.y - my * newK });
  };

  const sel = (id: string) => id === selectedId;

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      x={view.x}
      y={view.y}
      scaleX={k}
      scaleY={k}
      draggable
      onDragEnd={(e) => {
        if (e.target === stageRef.current) setView((v) => ({ ...v, x: e.target.x(), y: e.target.y() }));
      }}
      onWheel={handleWheel}
      onClick={(e) => {
        if (e.target === stageRef.current) onSelect(null);
      }}
    >
      <Layer>
        {/* границы объекта */}
        <Line
          points={flat(scene.site.boundary)}
          closed
          fill="#ffffff"
          stroke="#5F5E5A"
          strokeWidth={px(2)}
          onClick={() => onSelect(null)}
        />
        {/* сетка 1 м, каждые 5 м — темнее */}
        {Array.from({ length: Math.floor(scene.site.width) + 1 }, (_, i) => (
          <Line
            key={`gx${i}`}
            points={[i, 0, i, scene.site.height]}
            stroke={i % 5 === 0 ? "#D3D1C7" : "#F1EFE8"}
            strokeWidth={px(1)}
            listening={false}
          />
        ))}
        {Array.from({ length: Math.floor(scene.site.height) + 1 }, (_, i) => (
          <Line
            key={`gy${i}`}
            points={[0, i, scene.site.width, i]}
            stroke={i % 5 === 0 ? "#D3D1C7" : "#F1EFE8"}
            strokeWidth={px(1)}
            listening={false}
          />
        ))}

        {scene.zones.map((z) => {
          const c = ZONE_COLORS[z.zone_type] ?? ZONE_COLORS.transit;
          const minX = Math.min(...z.polygon.map((p) => p.x));
          const minY = Math.min(...z.polygon.map((p) => p.y));
          return (
            <Group key={z.id} onClick={() => onSelect({ kind: "zone", data: z })}>
              <Line
                points={flat(z.polygon)}
                closed
                fill={c.fill}
                stroke={sel(z.id) ? SELECT_COLOR : c.stroke}
                strokeWidth={px(sel(z.id) ? 3 : 1.5)}
              />
              <Text
                x={minX + px(6)}
                y={minY + px(6)}
                text={z.name}
                fontSize={px(13)}
                fill={c.stroke}
                listening={false}
              />
            </Group>
          );
        })}

        {scene.routes.map((r) => {
          const common = {
            points: flat(r.points),
            stroke: sel(r.id) ? SELECT_COLOR : ROUTE_COLOR,
            strokeWidth: px(sel(r.id) ? 5 : 3),
            hitStrokeWidth: px(14),
            lineJoin: "round" as const,
            lineCap: "round" as const,
            onClick: () => onSelect({ kind: "route", data: r }),
          };
          return r.bidirectional ? (
            <Line key={r.id} {...common} />
          ) : (
            <Arrow key={r.id} {...common} fill={common.stroke} pointerLength={px(10)} pointerWidth={px(10)} />
          );
        })}

        {scene.operation_points.map((p) => (
          <Group key={p.id} x={p.position.x} y={p.position.y} onClick={() => onSelect({ kind: "operation_point", data: p })}>
            <Circle
              radius={px(8)}
              fill={OP_COLOR}
              stroke={sel(p.id) ? SELECT_COLOR : "#ffffff"}
              strokeWidth={px(sel(p.id) ? 3 : 2)}
            />
            <Text x={px(12)} y={px(-20)} text={p.name} fontSize={px(12)} fill="#712B13" listening={false} />
          </Group>
        ))}

        {scene.charging_points.map((p) => (
          <Group key={p.id} x={p.position.x} y={p.position.y} onClick={() => onSelect({ kind: "charging_point", data: p })}>
            <Rect
              x={px(-11)}
              y={px(-11)}
              width={px(22)}
              height={px(22)}
              cornerRadius={px(4)}
              fill={CHARGE_COLOR}
              stroke={sel(p.id) ? SELECT_COLOR : "#ffffff"}
              strokeWidth={px(sel(p.id) ? 3 : 2)}
            />
            <Text
              x={px(-11)}
              y={px(-7)}
              width={px(22)}
              align="center"
              text="⚡"
              fontSize={px(13)}
              fill="#ffffff"
              listening={false}
            />
            <Text x={px(14)} y={px(-24)} text={`${p.name} ×${p.slots}`} fontSize={px(12)} fill="#27500A" listening={false} />
          </Group>
        ))}

        {scene.robots.map((r) => (
          <Group
            key={r.id}
            x={r.start_position.x}
            y={r.start_position.y}
            onClick={() => onSelect({ kind: "robot", data: r })}
          >
            <Group rotation={r.start_heading_deg}>
              <Rect
                x={px(-8)}
                y={px(-8)}
                width={px(16)}
                height={px(16)}
                cornerRadius={px(3)}
                fill={ROBOT_COLOR}
                stroke={sel(r.id) ? SELECT_COLOR : "#ffffff"}
                strokeWidth={px(sel(r.id) ? 3 : 1.5)}
              />
              <Arrow
                points={[px(8), 0, px(22), 0]}
                stroke={ROBOT_COLOR}
                fill={ROBOT_COLOR}
                strokeWidth={px(2)}
                pointerLength={px(6)}
                pointerWidth={px(6)}
              />
            </Group>
            <Text x={px(-20)} y={px(12)} text={r.name} fontSize={px(12)} fill="#0C447C" listening={false} />
          </Group>
        ))}
      </Layer>
    </Stage>
  );
}
