import { useEffect, useRef, useState } from 'react';

/**
 * Имитация долгого расчёта (до 60 с по ТЗ) — пока API нет.
 * Возвращает прогресс 0..100 и запуск; по завершении вызывает onDone.
 */
export function useMockCalc(durationMs = 2400) {
  const [progress, setProgress] = useState<number | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  const start = (onDone?: () => void) => {
    if (timer.current) window.clearInterval(timer.current);
    const started = Date.now();
    setProgress(0);
    timer.current = window.setInterval(() => {
      const p = Math.min(100, ((Date.now() - started) / durationMs) * 100);
      setProgress(p);
      if (p >= 100) {
        if (timer.current) window.clearInterval(timer.current);
        timer.current = null;
        setProgress(null);
        onDone?.();
      }
    }, 120);
  };

  return { running: progress !== null, progress: progress ?? 0, start };
}
