import { useEffect, useState } from "react";

export type ImageState =
  | { status: "none" }
  | { status: "loading" }
  | { status: "ready"; image: HTMLImageElement }
  | { status: "error"; url: string };

/** Загружает картинку по адресу (обычный URL или data:); пустой адрес — картинки нет. */
export function useImage(url: string | null | undefined): ImageState {
  const [state, setState] = useState<ImageState>({ status: "none" });
  useEffect(() => {
    if (!url) {
      setState({ status: "none" });
      return;
    }
    let cancelled = false; // адрес сменился, пока грузилась прежняя картинка
    setState({ status: "loading" });
    const img = new window.Image();
    img.onload = () => !cancelled && setState({ status: "ready", image: img });
    img.onerror = () => !cancelled && setState({ status: "error", url });
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);
  return state;
}
