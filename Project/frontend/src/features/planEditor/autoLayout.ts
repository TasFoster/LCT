/**
 * Черновик плана по параметрам формы: габариты площадки, контур стен, зоны
 * полосами по рабочим зонам, точки операций, зарядка и роботы у неё.
 * Нужен, чтобы пользователь не начинал с пустого холста, и чтобы проверять
 * цепочку форма → план → сервер. Редактор Алексея может брать его как
 * стартовое состояние: на выходе — обычная `Scene` из контракта 6
 * (`Project/scene.md`), без собственных полей визарда.
 */

import { resolveId, workingZone } from '../../shared/dictionaries';
import type { ChargingPoint, OperationPoint, RoutePoint, Scene, Zone } from '../../shared/types/contracts';
import type { PlanEditorContext } from './types';

const rect = (x: number, y: number, w: number, h: number) => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];

/** Стандартный размер черновика, когда площади в форме нет (аэропорт), м */
const DEFAULT_SIZE = { width: 100, depth: 60 };

/** Роботов на одно место зарядки — столько успевает обслужить станция */
const ROBOTS_PER_CHARGING_SLOT = 4;

/** Зона, куда ставим зарядку и роботов, если своей стоянки в форме не выбрали */
const PARKING_ZONE_ID = 'zona_stoyanki';

/**
 * Размер объекта для черновика. У аэропорта площади в форме нет — её нет и в
 * ТЗ, — поэтому рисуем стандартный прямоугольник, а пользователь растянет
 * границы на плане под свой объект (решение от 2026-09-25).
 */
export function estimateSize(ctx: PlanEditorContext): { width: number; depth: number; source: 'area' | 'default' } {
  if (ctx.areaSqm && ctx.areaSqm > 0) {
    const width = Math.round(Math.sqrt((ctx.areaSqm * 5) / 3));
    return { width, depth: Math.round(ctx.areaSqm / width), source: 'area' };
  }
  return { ...DEFAULT_SIZE, source: 'default' };
}

export function autoLayout(projectId: string, ctx: PlanEditorContext): Scene {
  const { width, depth } = estimateSize(ctx);

  const zoneIds = ctx.workingZoneIds.length ? ctx.workingZoneIds : ['receiving', 'storage', 'picking'];
  const canonical = zoneIds.map((id) => resolveId('working_zones', id));
  const withParking = canonical.includes(PARKING_ZONE_ID) ? canonical : [...canonical, PARKING_ZONE_ID];
  const aisle = Math.max(3, Math.ceil((ctx.minAisleWidthM ?? 2) + 1));
  const usable = width - aisle * (withParking.length + 1);
  const weights = withParking.map((id) => (id === 'storage' ? 3 : id === PARKING_ZONE_ID ? 0.6 : 1));
  const total = weights.reduce((a, b) => a + b, 0);

  let x = aisle;
  const zones: Zone[] = withParking.map((id, i) => {
    const w = Math.max(4, Math.round((usable * weights[i]) / total));
    const wz = workingZone(id);
    const label = wz?.label ?? (id.startsWith('custom:') ? id.slice(7) : id);
    const zone: Zone = {
      id: `z-${i + 1}`,
      name: label,
      zone_type: wz?.zone_type ?? 'operation',
      polygon: rect(x, aisle, w, depth - aisle * 2),
      categories: wz ? [id] : [],
      tags: [],
    };
    x += w + aisle;
    return zone;
  });

  const parking = zones[zones.length - 1];
  const px = parking.polygon[0].x;
  const py = parking.polygon[0].y;
  const pw = parking.polygon[1].x - px;
  const pBottom = parking.polygon[2].y;

  const robotsFlat = ctx.robots.flatMap((r) => Array.from({ length: r.quantity }, () => r));
  const perRow = Math.max(1, Math.floor(pw / 2.5));

  const chargingPoint: ChargingPoint = {
    id: 'ch-1',
    name: 'Зарядная станция',
    // Зарядка — у нижнего края зоны: сверху подпись и стоянка роботов
    position: { x: px + pw / 2, y: pBottom - 3 },
    zone_id: parking.id,
    categories: ['charging'],
    tags: [],
    // Одно место зарядки на четырёх роботов
    slots: Math.max(1, Math.ceil(robotsFlat.length / ROBOTS_PER_CHARGING_SLOT)),
  };

  const operationPoints: OperationPoint[] = zones
    .filter((z) => z.zone_type === 'operation')
    .map((z, i) => ({
      id: `op-${i + 1}`,
      name: `Точка: ${z.name}`,
      position: { x: (z.polygon[0].x + z.polygon[1].x) / 2, y: depth / 2 },
      zone_id: z.id,
      categories: [],
      tags: [],
    }));

  const mainY = depth / 2;
  // Маршрут проходит ЧЕРЕЗ КАЖДУЮ точку операции (не только первую/последнюю
  // — иначе точки между ними не попадают ни на одну route и симуляция не
  // может построить до них путь, contracts/topology.md: ref у вершины делает
  // узел графа), затем отворотом доходит до зарядки, которая иначе тоже
  // остаётся не на графе — её сейчас просто ставили в зоне стоянки без пути.
  const routePoints: RoutePoint[] = operationPoints.map((p) => ({ x: p.position.x, y: mainY, ref: p.id }));
  if (routePoints.length === 0) routePoints.push({ x: aisle / 2, y: mainY, ref: null }, { x: width - aisle / 2, y: mainY, ref: null });
  routePoints.push({ x: chargingPoint.position.x, y: mainY, ref: null }, { x: chargingPoint.position.x, y: chargingPoint.position.y, ref: chargingPoint.id });

  return {
    schema_version: '1.0',
    id: '',
    project_id: projectId,
    name: 'Черновик из параметров',
    updated_at: new Date().toISOString(),
    units: 'm',
    coordinate_system: 'y_down',
    site: {
      width,
      height: depth,
      boundary: rect(0, 0, width, depth),
      background: null,
    },
    walls: [
      {
        id: 'w-outline',
        name: 'Контур здания',
        points: [...rect(0, 0, width, depth), { x: 0, y: 0 }],
        thickness: 0.4,
        tags: ['outline'],
      },
    ],
    zones,
    operation_points: operationPoints,
    charging_points: [chargingPoint],
    routes: [
      {
        id: 'r-main',
        name: 'Главный проезд',
        points: routePoints,
        bidirectional: true,
        tags: ['main'],
      },
    ],
    robots: robotsFlat.map((r, i) => ({
      id: `rb-${i + 1}`,
      name: `${r.name} №${i + 1}`,
      category: r.category_id ? resolveId('equipment_categories', r.category_id) : '',
      catalog_item_id: r.catalog_item_id || null,
      start_position: { x: px + 1.5 + (i % perRow) * 2.5, y: py + 5 + Math.floor(i / perRow) * 2.5 },
      start_heading_deg: 90,
      start_point_id: null,
      home_charging_point_id: chargingPoint.id,
    })),
  };
}
