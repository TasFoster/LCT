import { dictionaryFrom } from './catalog/categories';
import type { ZoneType } from './scene/types';
import type { Categories } from '../../shared/dictionaries';

/** Цвета типов зон для внешних потребителей справочника (playback) — тот же
 * путь, что и у самого редактора (`PlanEditor.tsx`), без своего парсинга. */
export function zoneColorsFrom(categories: Categories): Record<ZoneType, string> {
  return dictionaryFrom(categories).dict.zoneColors;
}
