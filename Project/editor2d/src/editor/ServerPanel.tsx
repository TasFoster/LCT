// Отправка сцены на сервер платформы и загрузка её обратно
// (PUT/GET /api/projects/{id}/scene, api-routes.md раздел 6).
// В визарде редактор встраивается и на сервер не ходит — там этот блок не показывается.
import { useState } from "react";
import { getScene, loadSettings, putScene, saveSettings } from "../api/scene-api";
import type { Scene } from "../scene/types";

interface Props {
  scene: Scene;
  /** Сколько в сцене ошибок контракта: с ними отправляем только после подтверждения. */
  errorCount: number;
  /** Сцена, пришедшая с сервера; заменять текущую или нет — решает App. */
  onLoaded: (scene: Scene) => void;
}

type State = { kind: "idle" | "sending" | "loading" } | { kind: "ok" | "error"; message: string };

export function ServerPanel({ scene, errorCount, onLoaded }: Props) {
  const [baseUrl, setBaseUrl] = useState(() => loadSettings().baseUrl);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [confirmSend, setConfirmSend] = useState(false);
  const busy = state.kind === "sending" || state.kind === "loading";

  const remember = (url: string) => {
    setBaseUrl(url);
    saveSettings({ baseUrl: url });
  };

  const send = async (force = false) => {
    if (errorCount > 0 && !force) {
      setConfirmSend(true);
      return;
    }
    setConfirmSend(false);
    setState({ kind: "sending" });
    try {
      const at = await putScene(baseUrl, scene);
      setState({ kind: "ok", message: `Отправлено в ${at.slice(11, 19)} UTC` });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  };

  const load = async () => {
    setState({ kind: "loading" });
    try {
      const loaded = await getScene(baseUrl, scene.project_id);
      if (!loaded) {
        setState({ kind: "error", message: "На сервере для этого проекта сцены ещё нет" });
        return;
      }
      onLoaded(loaded);
      setState({ kind: "ok", message: "Сцена загружена с сервера" });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  };

  return (
    <>
      <h3>Сервер платформы</h3>
      <label className="field">
        Адрес сервера
        <input
          value={baseUrl}
          placeholder="http://localhost:8000 — пусто: тот же адрес"
          onChange={(e) => remember(e.target.value)}
        />
      </label>
      <div className="field-row">
        <button className="primary" disabled={busy} onClick={() => send()}>
          {state.kind === "sending" ? "Отправка…" : "Отправить на сервер"}
        </button>
        <button disabled={busy} onClick={load} title="Заменить текущую сцену той, что лежит на сервере">
          {state.kind === "loading" ? "Загрузка…" : "Загрузить"}
        </button>
      </div>
      {confirmSend && errorCount > 0 && (
        <div className="error confirm">
          <span>В сцене ошибок: {errorCount}. Сервер, скорее всего, такую сцену не примет.</span>
          <button onClick={() => send(true)}>Всё равно отправить</button>
          <button onClick={() => setConfirmSend(false)}>Отмена</button>
        </div>
      )}
      {state.kind === "ok" && <p className="server-status ok">✓ {state.message}</p>}
      {state.kind === "error" && <p className="server-status error">✖ {state.message}</p>}
      <p className="muted small">
        Проект «{scene.project_id || "не задан"}» · PUT /api/projects/{scene.project_id || "{id}"}/scene
      </p>
    </>
  );
}
