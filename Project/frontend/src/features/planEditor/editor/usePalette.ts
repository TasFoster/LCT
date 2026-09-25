import { useEffect, useState } from 'react';
import { FALLBACK_PALETTE, PALETTE_TOKENS, type Palette } from '../scene/colors';

function readPalette(el: Element): Palette {
  const css = getComputedStyle(el);
  const out = { ...FALLBACK_PALETTE };
  for (const [key, token] of Object.entries(PALETTE_TOKENS) as [keyof Palette, string][]) {
    const value = css.getPropertyValue(token).trim();
    if (value) out[key] = value;
  }
  return out;
}

/**
 * Цвета холста из токенов дизайн-системы. Тема меняется двумя путями — системной
 * настройкой (prefers-color-scheme) и переключателем в шапке (атрибут data-theme
 * на <html>), — следим за обоими.
 */
export function usePalette(): Palette {
  const [palette, setPalette] = useState<Palette>(() =>
    typeof document === 'undefined' ? FALLBACK_PALETTE : readPalette(document.documentElement),
  );

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setPalette(readPalette(root));
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', update);
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    update();
    return () => {
      media.removeEventListener('change', update);
      observer.disconnect();
    };
  }, []);

  return palette;
}
