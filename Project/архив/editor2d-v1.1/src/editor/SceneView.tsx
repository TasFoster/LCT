import { useEffect, useRef, useState } from "react";
import { Arrow, Circle, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from "react-konva";
import Konva from "konva";
import { CHARGE_COLOR, DRAFT_COLOR, OP_COLOR, ROBOT_COLOR, ROUTE_COLOR, SELECT_COLOR, ZONE_COLORS } from "../scene/colors";
import { bbox, dist } from "../scene/geometry";
import type { ObjectKind } from "../scene/ops";
import type { Point, Scene, SceneObject } from "../scene/types";
import { gridLines } from "./grid";
import type { Snap, Tool } from "./tools";
import type { ImageState } from "./useImage";

const flat = (pts: Point[]) => pts.flatMap((p) => [p.x, p.y]);
const K_MAX = 400; // пикселей на метр — предел приближения (колесо и щипок)
const FIT_PAD = 32; // отступ вокруг плана при вписывании, px

interface Props {
  scene: Scene;
  /** загруженная картинка подложки (site.background) */
  background: ImageState;
  width: number;
  height: number;
  tool: Tool;
  selectedId: string | null;
  draft: Point[];
  hover: Snap | null;
  onSelect: (obj: SceneObject | null) => void;
  onClick: (world: Point, k: number) => void;
  onDoubleClick: (world: Point, k: number) => void;
  onHover: (world: Point | null, k: number) => void;
  onDrag: (kind: ObjectKind, id: string, world: Point, k: number) => void;
  onVertexMove: (kind: "zone" | "route", id: string, index: number, world: Point, k: number) => void;
  onVertexInsert: (kind: "zone" | "route", id: string, afterIndex: number, world: Point, k: number) => void;
  onVertexDelete: (kind: "zone" | "route", id: string, index: number) => void;
  onZoneMove: (id: string, delta: Point) => void;
}

/**
 * Вершина, которую сейчас тянут за ручку: пока идёт перетаскивание, фигура рисуется по ней.
 * insert — тянут ручку-середину, то есть новую вершину после index.
 */
interface VertexDrag {
  id: string;
  index: number;
  p: Point;
  insert?: boolean;
}

const withVertex = (pts: Point[], d: VertexDrag | null, id: string) => {
  if (!d || d.id !== id) return pts;
  if (d.insert) return [...pts.slice(0, d.index + 1), d.p, ...pts.slice(d.index + 1)];
  return pts.map((v, i) => (i === d.index ? d.p : v));
};

// Всё внутри Stage рисуется прямо в метрах сцены: масштаб метры→пиксели задаёт сама Stage.
// Размеры, которые должны оставаться постоянными на экране (толщина линий, шрифт, значки),
// делим на текущий масштаб k.
export function SceneView(props: Props) {
  const { scene, width, height, tool, selectedId, draft, hover, onSelect } = props;
  const stageRef = useRef<Konva.Stage>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const [vertexDrag, setVertexDrag] = useState<VertexDrag | null>(null);
  const [movingZoneId, setMovingZoneId] = useState<string | null>(null);
  // отложенный выбор точки по клику на ручку привязанной вершины (см. onPointerClick ручки)
  const pendingSelect = useRef<number | undefined>(undefined);
  // щипок двумя пальцами: расстояние и центр между пальцами на прошлом шаге (в пикселях холста)
  const pinch = useRef<{ dist: number; center: Point } | null>(null);
  // пока на холсте два пальца, сдвиг фона выключен: во время перетаскивания Stage не передаёт
  // события движения, и щипок терял все шаги после первого
  const [pinching, setPinching] = useState(false);

  const { width: siteW, height: siteH } = scene.site;
  // масштаб, при котором план целиком помещается в окно
  const fitK = Math.min((width - 2 * FIT_PAD) / siteW, (height - 2 * FIT_PAD) / siteH);
  // Предел отдаления — от вписанного плана, а не постоянный: у плана 2000×1500 м вписанный масштаб
  // около 0.4 px/м, и постоянный предел 2 px/м превращал «отдалить» в приближение в 5 раз.
  const clampK = (k: number) => Math.min(Math.max(k, fitK / 4), Math.max(K_MAX, fitK));
  const fitView = () => {
    setView({ k: fitK, x: (width - siteW * fitK) / 2, y: (height - siteH * fitK) / 2 });
  };

  // План вписывается в окно только при открытии сцены (или смене её габаритов).
  // При изменении размера окна зум сохраняется, а точка плана в центре экрана остаётся в центре.
  const fitKey = `${scene.id}:${siteW}:${siteH}`;
  const fittedFor = useRef<string | null>(null);
  const prevSize = useRef<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const prev = prevSize.current;
    prevSize.current = { width, height };
    if (fittedFor.current !== fitKey) {
      fittedFor.current = fitKey;
      fitView();
    } else if (prev && (prev.width !== width || prev.height !== height)) {
      setView((v) => ({ ...v, x: v.x + (width - prev.width) / 2, y: v.y + (height - prev.height) / 2 }));
    }
    // fitView меняется на каждом рендере, но вызывать его нужно только по условиям выше
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, width, height]);

  const { k } = view;
  const px = (v: number) => v / k;
  const selecting = tool.type === "select";
  const sel = (id: string) => id === selectedId;

  const worldPointer = (): Point | null => stageRef.current?.getRelativePointerPosition() ?? null;

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;
    const factor = e.evt.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newK = clampK(view.k * factor);
    const mx = (pointer.x - view.x) / view.k;
    const my = (pointer.y - view.y) / view.k;
    setView({ k: newK, x: pointer.x - mx * newK, y: pointer.y - my * newK });
  };

  // Щипок: масштаб по изменению расстояния между пальцами; точка плана под центром пальцев
  // остаётся под ними, поэтому движение двух пальцев заодно сдвигает план.
  const handleTouchMove = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const t = e.evt.touches;
    const stage = stageRef.current;
    if (t.length !== 2 || !stage) return;
    e.evt.preventDefault();
    const rect = stage.container().getBoundingClientRect();
    const a = { x: t[0].clientX - rect.left, y: t[0].clientY - rect.top };
    const b = { x: t[1].clientX - rect.left, y: t[1].clientY - rect.top };
    const now = { dist: dist(a, b), center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    const prev = pinch.current;
    pinch.current = now;
    if (!prev || prev.dist === 0) return;
    setView((v) => {
      const newK = clampK((v.k * now.dist) / prev.dist);
      const wx = (prev.center.x - v.x) / v.k; // точка плана под пальцами на прошлом шаге
      const wy = (prev.center.y - v.y) / v.k;
      return { k: newK, x: now.center.x - wx * newK, y: now.center.y - wy * newK };
    });
  };

  // offset — сдвиг значка относительно настоящей позиции (робот, стоящий на точке, рисуется сбоку)
  const dragHandlers = (kind: ObjectKind, id: string, at: Point, offset: Point = { x: 0, y: 0 }) => ({
    draggable: selecting,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      const world = { x: e.target.x() - offset.x, y: e.target.y() - offset.y };
      // вернуть узел на позицию из данных: если после прилипания к сетке координаты не изменятся,
      // React не обновит x/y, и узел остался бы не там, где записан в сцене
      e.target.position({ x: at.x + offset.x, y: at.y + offset.y });
      props.onDrag(kind, id, world, k);
    },
  });

  return (
    <>
    <button className="fit-btn" onClick={fitView} title="Вписать весь план в окно">
      ⤢ Вписать план
    </button>
    {/* обработчики — события указателя (onPointer*): одинаково работают для мыши, пальца и пера */}
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      x={view.x}
      y={view.y}
      scaleX={k}
      scaleY={k}
      draggable={!pinching}
      // сдвиг фона начинается только после 8 px: при обычных 3 px дрожание руки при клике
      // превращало клик в сдвиг, и вершина не ставилась (у точек и ручек порог остаётся 3 px)
      dragDistance={8}
      style={{ cursor: selecting ? "default" : "crosshair" }}
      onDragEnd={(e) => {
        if (e.target === stageRef.current) setView((v) => ({ ...v, x: e.target.x(), y: e.target.y() }));
      }}
      onWheel={handleWheel}
      onTouchStart={(e) => {
        if (e.evt.touches.length < 2) return;
        stageRef.current?.stopDrag(); // первый палец мог начать сдвиг фона — второй его отменяет
        pinch.current = null;
        setPinching(true);
      }}
      onTouchMove={handleTouchMove}
      onTouchEnd={(e) => {
        if (e.evt.touches.length >= 2) return;
        pinch.current = null;
        setPinching(false);
      }}
      // снять фокус с полей ввода, иначе Enter/Esc уйдут в поле, а не в редактор
      onPointerDown={() => (document.activeElement as HTMLElement | null)?.blur?.()}
      onPointerClick={(e) => {
        if (e.evt.button !== 0) return;
        const p = worldPointer();
        if (!selecting && p) props.onClick(p, k);
        else if (selecting && e.target === stageRef.current) onSelect(null);
      }}
      onPointerDblClick={() => {
        const p = worldPointer();
        if (!selecting && p) props.onDoubleClick(p, k);
      }}
      onPointerMove={() => !selecting && props.onHover(worldPointer(), k)}
      onPointerLeave={() => props.onHover(null, k)}
    >
      {/* подложка не ловит клики: клик по пустому месту плана должен попадать в сам холст
          (снять выделение, поставить вершину) */}
      <Layer listening={false}>
        {/* граница плана и сетка */}
        <Line points={flat(scene.site.boundary)} closed fill="#ffffff" stroke="#5F5E5A" strokeWidth={px(2)} />
        {/* подложка — скан плана: поверх белого фона, под сеткой */}
        {props.background.status === "ready" && scene.site.background && (
          <KonvaImage
            image={props.background.image}
            x={scene.site.background.x}
            y={scene.site.background.y}
            width={scene.site.background.width}
            height={scene.site.background.height}
            opacity={scene.site.background.opacity}
          />
        )}
        {/* только видимая часть плана (с запасом в экран: при перетаскивании фона вид обновляется
            только в конце, и открывающиеся края не должны быть пустыми) */}
        {gridLines(Math.max(0, (-view.x - width) / k), Math.min(siteW, (2 * width - view.x) / k), k).map(({ v, major }) => (
          <Line key={`gx${v}`} points={[v, 0, v, siteH]} stroke={major ? "#D3D1C7" : "#F1EFE8"} strokeWidth={px(1)} />
        ))}
        {gridLines(Math.max(0, (-view.y - height) / k), Math.min(siteH, (2 * height - view.y) / k), k).map(({ v, major }) => (
          <Line key={`gy${v}`} points={[0, v, siteW, v]} stroke={major ? "#D3D1C7" : "#F1EFE8"} strokeWidth={px(1)} />
        ))}
      </Layer>

      {/* объекты сцены; в режимах рисования клики по ним не перехватываются */}
      <Layer listening={selecting}>
        {scene.zones.map((z) => {
          const c = ZONE_COLORS[z.zone_type] ?? ZONE_COLORS.transit;
          const { minX, minY } = bbox(z.polygon);
          return (
            <Group
              key={z.id}
              onPointerClick={() => onSelect({ kind: "zone", data: z })}
              // тянуть можно только выбранную зону — иначе попытка сдвинуть план двигала бы зоны
              draggable={selecting && sel(z.id)}
              onDragStart={() => setMovingZoneId(z.id)}
              onDragEnd={(e) => {
                e.cancelBubble = true;
                const delta = e.target.position();
                e.target.position({ x: 0, y: 0 }); // сдвиг перенесён в данные — группу возвращаем
                setMovingZoneId(null);
                props.onZoneMove(z.id, delta);
              }}
            >
              <Line
                points={flat(withVertex(z.polygon, vertexDrag, z.id))}
                closed
                fill={c.fill}
                stroke={sel(z.id) ? SELECT_COLOR : c.stroke}
                strokeWidth={px(sel(z.id) ? 3 : 1.5)}
              />
              <Text x={minX + px(6)} y={minY + px(6)} text={z.name} fontSize={px(13)} fill={c.stroke} listening={false} />
            </Group>
          );
        })}

        {scene.routes.map((r) => {
          const common = {
            points: flat(withVertex(r.points, vertexDrag, r.id)),
            stroke: sel(r.id) ? SELECT_COLOR : ROUTE_COLOR,
            strokeWidth: px(sel(r.id) ? 5 : 3),
            hitStrokeWidth: px(14),
            lineJoin: "round" as const,
            lineCap: "round" as const,
            onPointerClick: () => onSelect({ kind: "route", data: r }),
          };
          return r.bidirectional ? (
            <Line key={r.id} {...common} />
          ) : (
            <Arrow key={r.id} {...common} fill={common.stroke} pointerLength={px(10)} pointerWidth={px(10)} />
          );
        })}

        {scene.operation_points.map((p) => (
          <Group
            key={p.id}
            x={p.position.x}
            y={p.position.y}
            onPointerClick={() => onSelect({ kind: "operation_point", data: p })}
            {...dragHandlers("operation_point", p.id, p.position)}
          >
            <Circle radius={px(8)} fill={OP_COLOR} stroke={sel(p.id) ? SELECT_COLOR : "#ffffff"} strokeWidth={px(sel(p.id) ? 3 : 2)} />
            <Text x={px(12)} y={px(-20)} text={p.name} fontSize={px(12)} fill="#712B13" listening={false} />
          </Group>
        ))}

        {scene.charging_points.map((p) => (
          <Group
            key={p.id}
            x={p.position.x}
            y={p.position.y}
            onPointerClick={() => onSelect({ kind: "charging_point", data: p })}
            {...dragHandlers("charging_point", p.id, p.position)}
          >
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
            <Text x={px(-11)} y={px(-7)} width={px(22)} align="center" text="⚡" fontSize={px(13)} fill="#ffffff" listening={false} />
            <Text x={px(14)} y={px(-24)} text={`${p.name} ×${p.slots}`} fontSize={px(12)} fill="#27500A" listening={false} />
          </Group>
        ))}

        {scene.robots.map((r) => {
          // робот на ключевой точке рисуется со сдвигом и выноской, иначе он закрывает точку
          const off = r.start_point_id ? { x: px(18), y: px(18) } : { x: 0, y: 0 };
          return (
          <Group
            key={r.id}
            x={r.start_position.x + off.x}
            y={r.start_position.y + off.y}
            onPointerClick={() => onSelect({ kind: "robot", data: r })}
            {...dragHandlers("robot", r.id, r.start_position, off)}
          >
            {r.start_point_id && (
              <Line points={[-off.x, -off.y, 0, 0]} stroke={ROBOT_COLOR} strokeWidth={px(1.5)} dash={[px(3), px(3)]} listening={false} />
            )}
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
              <Arrow points={[px(8), 0, px(22), 0]} stroke={ROBOT_COLOR} fill={ROBOT_COLOR} strokeWidth={px(2)} pointerLength={px(6)} pointerWidth={px(6)} />
            </Group>
            <Text x={px(-20)} y={px(12)} text={r.name} fontSize={px(12)} fill="#0C447C" listening={false} />
          </Group>
          );
        })}
      </Layer>

      {/* ручки вершин выбранной зоны или маршрута */}
      <Layer listening={selecting}>
        {selecting &&
          [
            ...scene.zones.filter((z) => sel(z.id) && z.id !== movingZoneId).map((z) => ({ kind: "zone" as const, id: z.id, pts: z.polygon })),
            ...scene.routes.filter((r) => sel(r.id)).map((r) => ({ kind: "route" as const, id: r.id, pts: r.points })),
          ].flatMap(({ kind, id, pts }) => [
            // ручки-середины: потянуть — новая вершина там, где отпустили; клик — в середине отрезка
            ...pts.slice(0, kind === "zone" ? pts.length : pts.length - 1).map((a, i) => {
              const b = pts[(i + 1) % pts.length];
              const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
              return (
                <Circle
                  key={`${id}-m${i}`}
                  x={mid.x}
                  y={mid.y}
                  radius={px(4)}
                  fill={SELECT_COLOR}
                  opacity={0.45}
                  hitStrokeWidth={px(8)}
                  draggable
                  onPointerClick={(e) => {
                    e.cancelBubble = true;
                    props.onVertexInsert(kind, id, i, mid, k);
                  }}
                  onDragMove={(e) => setVertexDrag({ id, index: i, p: e.target.position(), insert: true })}
                  onDragEnd={(e) => {
                    e.cancelBubble = true;
                    const world = e.target.position();
                    e.target.position(mid);
                    setVertexDrag(null);
                    props.onVertexInsert(kind, id, i, world, k);
                  }}
                />
              );
            }),
            ...pts.map((v, i) => (
              <Circle
                key={`${id}-v${i}`}
                x={v.x}
                y={v.y}
                radius={px(6)}
                // вершина, привязанная к точке, закрашена
                fill={"ref" in v && v.ref ? SELECT_COLOR : "#ffffff"}
                stroke={SELECT_COLOR}
                strokeWidth={px(2)}
                hitStrokeWidth={px(8)}
                draggable
                onPointerDblClick={(e) => {
                  e.cancelBubble = true;
                  window.clearTimeout(pendingSelect.current);
                  props.onVertexDelete(kind, id, i);
                }}
                // ручка привязанной вершины лежит поверх точки — клик по ней выбирает саму точку.
                // Выбор откладываем на окно двойного клика: иначе ручки исчезли бы до второго клика
                // и привязанную вершину нельзя было бы удалить двойным кликом.
                onPointerClick={(e) => {
                  e.cancelBubble = true;
                  const ref = "ref" in v ? v.ref : null;
                  const op = ref ? scene.operation_points.find((p) => p.id === ref) : undefined;
                  const cp = ref ? scene.charging_points.find((p) => p.id === ref) : undefined;
                  window.clearTimeout(pendingSelect.current);
                  pendingSelect.current = window.setTimeout(() => {
                    if (op) onSelect({ kind: "operation_point", data: op });
                    if (cp) onSelect({ kind: "charging_point", data: cp });
                  }, Konva.dblClickWindow);
                }}
                onDragMove={(e) => setVertexDrag({ id, index: i, p: e.target.position() })}
                onDragEnd={(e) => {
                  e.cancelBubble = true;
                  const world = e.target.position();
                  e.target.position(v); // позицию задаст React из данных (см. dragHandlers)
                  setVertexDrag(null);
                  props.onVertexMove(kind, id, i, world, k);
                }}
              />
            )),
          ])}
      </Layer>

      {/* черновик фигуры и подсказка под курсором */}
      <Layer listening={false}>
        {draft.length > 0 && (
          <>
            {tool.type === "zone" && draft.length >= 2 && (
              <Line points={flat(hover ? [...draft, hover.p] : draft)} closed fill="rgba(239,159,39,0.12)" />
            )}
            <Line
              points={flat(hover ? [...draft, hover.p] : draft)}
              stroke={DRAFT_COLOR}
              strokeWidth={px(2)}
              dash={[px(6), px(4)]}
            />
            {draft.map((p, i) => (
              <Circle
                key={i}
                x={p.x}
                y={p.y}
                radius={px(i === 0 && tool.type === "zone" ? 6 : 4)}
                fill={i === 0 && tool.type === "zone" ? DRAFT_COLOR : "#ffffff"}
                stroke={DRAFT_COLOR}
                strokeWidth={px(2)}
              />
            ))}
          </>
        )}
        {hover && !selecting && (
          <>
            <Circle x={hover.p.x} y={hover.p.y} radius={px(4)} fill={DRAFT_COLOR} opacity={0.8} />
            {(hover.ref || hover.closes) && (
              <Circle x={hover.p.x} y={hover.p.y} radius={px(hover.closes ? 10 : 15)} stroke={DRAFT_COLOR} strokeWidth={px(2)} />
            )}
          </>
        )}
      </Layer>
    </Stage>
    </>
  );
}
