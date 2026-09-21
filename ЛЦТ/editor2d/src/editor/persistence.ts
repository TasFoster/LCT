// Автосохранение сцены в браузере, чтобы перезагрузка страницы не стирала работу.
// Хранилище может быть недоступно (приватный режим, запрет сайта) — тогда редактор работает без него.
import { useEffect, useState } from "react";
import { normalize, withDefaults } from "../scene/ops";
import type { Scene } from "../scene/types";

const KEY = "editor2d:scene";
const BROKEN_KEY = "editor2d:scene:broken";
const SAVE_DELAY_MS = 300;

export interface Saved {
  scene: Scene;
  /** Есть изменения после последнего скачивания или открытия файла. */
  dirty: boolean;
}

/** Сохранённая сцена; null — сохранения нет или хранилище недоступно; Error — данные повреждены. */
export function loadSaved(): Saved | null | Error {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    const data = JSON.parse(raw);
    return { scene: normalize(withDefaults(data.scene)), dirty: Boolean(data.dirty) };
  } catch (e) {
    // автосохранение сейчас перезапишет эти данные примером — копия остаётся для ручного восстановления
    try {
      localStorage.setItem(BROKEN_KEY, raw);
    } catch {
      /* не удалось сохранить копию — сообщение всё равно покажем */
    }
    return new Error(
      `сохранённая сцена повреждена (${(e as Error).message}) — открыт пример; копия данных в localStorage «${BROKEN_KEY}»`,
    );
  }
}

/**
 * Сохраняет сцену с небольшой задержкой после каждого изменения.
 * Возвращает текст ошибки последней записи (null — сохранено): молча терять автосохранение нельзя,
 * иначе пользователь уверен, что работа сохранится, и потеряет её при перезагрузке.
 */
export function useAutosave(scene: Scene, dirty: boolean): string | null {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => {
      const data = JSON.stringify({ scene, dirty });
      try {
        localStorage.setItem(KEY, data);
        setError(null);
      } catch (e) {
        const kb = data.length / 1024;
        const size = kb < 1024 ? `${Math.ceil(kb)} КБ` : `${(kb / 1024).toFixed(1)} МБ`;
        const reason =
          e instanceof DOMException && e.name === "QuotaExceededError" ? `не хватает места (сцена ${size})` : "хранилище браузера недоступно";
        setError(`Автосохранение не работает: ${reason}. Скачайте сцену, чтобы не потерять работу.`);
      }
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [scene, dirty]);
  return error;
}
