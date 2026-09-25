// Контракт 6 — сцена. Поля описаны в Project/scene.md, TS-зеркало — shared/types/contracts.ts:
// редактор работает с ним же, своих типов сцены у модуля нет.
import type { Scene as ContractScene } from '../../../shared/types/contracts';

export type {
  ChargingPoint,
  OperationPoint,
  Point,
  RobotPlacement,
  Route,
  RoutePoint,
  Site,
  Wall,
  Zone,
  ZoneType,
  SceneBackground as Background,
} from '../../../shared/types/contracts';

export type Scene = ContractScene;

/** Версия контракта, которую пишет редактор. Старые сцены при открытии приводятся к ней. */
export const SCHEMA_VERSION = '1.2';

type Of<K extends keyof Scene> = Scene[K] extends (infer T)[] ? T : never;

/** Выбранный на плане объект: вид + данные. */
export type SceneObject =
  | { kind: 'zone'; data: Of<'zones'> }
  | { kind: 'wall'; data: Of<'walls'> }
  | { kind: 'operation_point'; data: Of<'operation_points'> }
  | { kind: 'charging_point'; data: Of<'charging_points'> }
  | { kind: 'route'; data: Of<'routes'> }
  | { kind: 'robot'; data: Of<'robots'> };
