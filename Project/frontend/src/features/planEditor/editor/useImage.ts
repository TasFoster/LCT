import { useEffect, useState } from 'react';

export type ImageState =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'ready'; image: HTMLImageElement }
  | { status: 'error'; url: string };

/**
 * Загружает картинку подложки по ссылке (site.background.image_url). Пустой адрес —
 * картинки нет. Результат помнит, для какого адреса он получен: пока грузится новый
 * адрес, отдаём «loading», а не прошлую картинку.
 */
export function useImage(url: string | null | undefined): ImageState {
  const [loaded, setLoaded] = useState<{ url: string; state: ImageState } | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false; // адрес сменился, пока грузилась прежняя картинка
    const img = new window.Image();
    img.onload = () => !cancelled && setLoaded({ url, state: { status: 'ready', image: img } });
    img.onerror = () => !cancelled && setLoaded({ url, state: { status: 'error', url } });
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url) return { status: 'none' };
  if (!loaded || loaded.url !== url) return { status: 'loading' };
  return loaded.state;
}
