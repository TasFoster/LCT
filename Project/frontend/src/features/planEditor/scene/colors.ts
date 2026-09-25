// Цвета холста. Konva рисует на canvas и CSS-переменные сам не понимает, поэтому
// значения берутся из токенов дизайн-системы (shared/styles/tokens.css) и
// перечитываются при смене темы (editor/usePalette.ts). Цвета типов зон — из
// справочника (form_options.json → zone_types), не отсюда.

/** Какие токены нужны холсту. */
export const PALETTE_TOKENS = {
  canvas: '--surface-2',
  site: '--surface',
  siteLine: '--line-strong',
  grid: '--line',
  ink: '--ink',
  muted: '--muted',
  handle: '--surface',
  wall: '--ink',
  route: '--info',
  point: '--warn',
  charging: '--ok',
  robot: '--ink',
  select: '--accent',
  draft: '--accent',
  error: '--danger',
  warning: '--warn',
  info: '--info',
  font: '--font-body',
} as const;

export type Palette = Record<keyof typeof PALETTE_TOKENS, string>;

/** Светлая тема из tokens.css — на случай, если токены прочитать не удалось (тесты, SSR). */
export const FALLBACK_PALETTE: Palette = {
  canvas: '#f6f7f9',
  site: '#ffffff',
  siteLine: '#b4bcc5',
  grid: '#d6dbe1',
  ink: '#15181c',
  muted: '#5c6673',
  handle: '#ffffff',
  wall: '#15181c',
  route: '#1f5fd0',
  point: '#b45309',
  charging: '#15803d',
  robot: '#15181c',
  select: '#c2410c',
  draft: '#c2410c',
  error: '#b91c1c',
  warning: '#b45309',
  info: '#1f5fd0',
  font: "'IBM Plex Sans', 'Segoe UI', Roboto, system-ui, sans-serif",
};

/** Цвет с прозрачностью: заливка зоны — это цвет типа зоны, но полупрозрачный. */
export function withAlpha(color: string, alpha: number): string {
  const hex = color.trim().replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return color;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
