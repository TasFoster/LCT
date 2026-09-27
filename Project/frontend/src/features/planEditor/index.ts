// Редактор плана объекта (шаг 7 визарда). Снаружи модуля нужен только компонент
// и его пропсы; всё остальное — внутреннее устройство редактора.
export { PlanEditor } from './PlanEditor';
export type { PlanEditorContext, PlanEditorProps } from './types';
// Проигрывание SimulationTimeline (контракт 7) поверх того же плана — вкладка
// «Симуляция» шага 7, вне редактора, поэтому отдельный вход.
export { PlaybackView } from './playback/PlaybackView';
export { zoneColorsFrom } from './zoneColors';
