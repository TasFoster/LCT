/**
 * Интерфейс встраивания редактора плана в визард (шаг 7), версия 3.
 *
 * Редактор Алексея (`Project/frontend/editor2d/`) работает с данными контракта
 * 6 — `Scene` из `Project/scene.md`. Визард отдаёт ему план, область экрана и
 * контекст из формы, получает изменённый план и сам сохраняет его через
 * `PUT /api/projects/{id}/scene`: редактор на сервер не ходит (решение от
 * 2026-09-25, `Документация/Фронтенд и визард/editor-and-api.md`).
 *
 * Шапку, степпер, кнопки «Сохранить»/«Далее», статус сохранения и загрузку
 * подложки делает визард; редактор рисует инструменты, холст и панель свойств
 * в токенах общей дизайн-системы. Пока редактор не встроен, его место
 * занимает `PlanEditorStub` с теми же пропсами.
 */

import type { Categories } from '../../shared/dictionaries';
import type { SceneWarning } from '../../shared/api/projectState';
import type { ObjectType, Scene } from '../../shared/types/contracts';

/** Что редактор знает из формы параметров и подбора — только для чтения. */
export interface PlanEditorContext {
  objectType: ObjectType;
  /** Площадь из формы, м². У аэропорта её нет — будет null */
  areaSqm: number | null;
  /** Протяжённость маршрутов, м — запасной источник размера, когда площади нет */
  routeLengthM: number | null;
  /** Рабочие зоны из формы: id из categories.json → working_zones */
  workingZoneIds: string[];
  /** Роботы из состава оборудования (шаг 4): сколько каких нужно расставить */
  robots: { catalog_item_id: string; name: string; category_id: string; quantity: number }[];
  /** Минимальная ширина прохода среди выбранной техники, м */
  minAisleWidthM: number | null;
}

export interface PlanEditorProps {
  /** Текущий план; null — плана ещё нет (черновик проекта без сцены) */
  value: Scene | null;
  /** Любое изменение плана. Сохраняет визард, редактор на сервер не ходит */
  onChange: (plan: Scene) => void;
  context: PlanEditorContext;
  /** Единый справочник — categories.json + form_options.json; своих списков у редактора нет */
  categories: Categories;
  /**
   * Предупреждения по последнему сохранённому плану — считает сервер
   * (маршрут через стену, робот в запретной зоне, узкий проход).
   * Редактор подсвечивает элементы по target_id.
   */
  warnings: SceneWarning[];
  /**
   * Загрузить подложку-чертёж. Визард отправляет файл отдельной ручкой
   * (`POST /api/projects/{id}/scene/background`) и кладёт в план ссылку —
   * сам файл и `data:`-URL в плане не хранятся.
   */
  onUploadBackground: (file: File) => Promise<void>;
  /** Область, которую выделил визард, px */
  width: number;
  height: number;
  readOnly?: boolean;
}

export function emptyPlan(projectId: string): Scene {
  return {
    schema_version: '1.0',
    id: '',
    project_id: projectId,
    name: '',
    updated_at: new Date().toISOString(),
    units: 'm',
    coordinate_system: 'y_down',
    site: { width: 0, height: 0, boundary: [], background: null },
    walls: [],
    zones: [],
    operation_points: [],
    charging_points: [],
    routes: [],
    robots: [],
  };
}
