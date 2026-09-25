import { useEffect, useRef, useState } from "react";

/** Измеряет элемент через ResizeObserver + resize окна (см. App.tsx для истории
 * находки: сигналы ResizeObserver привязаны к отрисовке и могут запаздывать). */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize((s) =>
        s.width === Math.floor(r.width) && s.height === Math.floor(r.height) ? s : { width: Math.floor(r.width), height: Math.floor(r.height) },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return [ref, size] as const;
}
