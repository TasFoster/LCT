import { useMemo, useState } from "react";
import exampleScene from "../../scene.example.json";
import { canonicalizeScene } from "./catalog/canonicalize";
import { loadCategories } from "./catalog/categories";
import { Properties } from "./editor/Properties";
import { ServerPanel } from "./editor/ServerPanel";
import { Toolbar } from "./editor/Toolbar";
import { loadSaved, useAutosave } from "./editor/persistence";
import { useImage } from "./editor/useImage";
import { useSize } from "./editor/useSize";
import { hintFor } from "./editor/tools";
import { useEditor } from "./editor/useEditor";
import { emptyScene, normalize, sceneFileName, withDefaults } from "./scene/ops";
import { validateScene } from "./scene/validate";
import { SceneView } from "./editor/SceneView";
import { PlaybackView } from "./playback/PlaybackView";
import type { Scene } from "./scene/types";

/** ?embed=1 — редактор открыт внутри визарда: на сервер ходит визард, а не он. */
const embedded = new URLSearchParams(window.location.search).has("embed");

export function App() {
  const dict = useMemo(loadCategories, []);
  // стартовая сцена: сохранённая в браузере, иначе пример
  const [start] = useState(() => {
    const saved = loadSaved();
    const example = normalize(withDefaults(exampleScene));
    if (saved instanceof Error) return { scene: example, clean: example as Scene | null, error: saved.message };
    if (saved) return { scene: saved.scene, clean: saved.dirty ? null : saved.scene, error: null };
    return { scene: example, clean: example as Scene | null, error: null };
  });
  const ed = useEditor(start.scene, dict);
  const [error, setError] = useState<string | null>(start.error);
  // сцена на момент последнего скачивания или открытия файла: отличается — значит, есть несохранённые изменения
  const [clean, setClean] = useState<Scene | null>(start.clean);
  const dirty = ed.scene !== clean;
  const saveError = useAutosave(ed.scene, dirty);
  const [canvasRef, size] = useSize<HTMLDivElement>();
  const [mode, setMode] = useState<"edit" | "playback">("edit");
  const { scene } = ed;
  const background = useImage(scene.site.background?.image_url);
  const issues = useMemo(() => validateScene(scene, (id) => dict.get(id)?.kind), [scene, dict]);
  const errorCount = issues.filter((i) => i.level === "error").length;
  const [confirmDownload, setConfirmDownload] = useState(false);
  // замена изменённой сцены (открыть файл, новая сцена) ждёт подтверждения: что открываем и как
  const [pendingReplace, setPendingReplace] = useState<{ what: string; run: () => void } | null>(null);

  /** Заменить текущую сцену; если она изменена и не скачана — сначала спросить. */
  const replaceScene = (what: string, run: () => void) => {
    if (dirty) {
      setPendingReplace({ what, run });
      return;
    }
    run();
  };

  const newScene = () => {
    const s = emptyScene();
    ed.loadScene(s);
    setClean(s); // терять в пустой сцене нечего
    setError(null);
  };

  const openFile = async (file: File) => {
    try {
      // сцена могла прийти из визарда — приводим названия категорий к справочнику Артёма
      const loaded = canonicalizeScene(normalize(withDefaults(JSON.parse(await file.text()))), dict);
      ed.loadScene(loaded);
      setClean(loaded);
      setError(null);
    } catch (e) {
      setError(`Не удалось открыть ${file.name}: ${(e as Error).message}`);
    }
  };

  /** Сцена пришла с сервера — заменяем текущую с тем же вопросом, что и при открытии файла. */
  const sceneFromServer = (fromServer: Scene) =>
    replaceScene("сцену с сервера", () => {
      const loaded = canonicalizeScene(fromServer, dict);
      ed.loadScene(loaded);
      setClean(loaded);
      setError(null);
    });

  const downloadScene = (force = false) => {
    // сцена с ошибками нарушает контракт — сначала спросить
    if (errorCount > 0 && !force) {
      setConfirmDownload(true);
      return;
    }
    setConfirmDownload(false);
    const out: Scene = { ...scene, updated_at: new Date().toISOString().replace(/\.\d+Z$/, "Z") };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = sceneFileName(scene);
    a.click();
    URL.revokeObjectURL(a.href);
    setClean(scene);
  };

  return (
    <div className="app">
      <header>
        <div>
          <strong>{scene.name}</strong>
          <span className="muted">
            {" "}
            {scene.site.width}×{scene.site.height} м · схема v{scene.schema_version}
          </span>
          {dirty && (
            <span className="unsaved" title="Есть изменения после последнего скачивания или открытия файла">
              {" "}
              · не скачано
            </span>
          )}
        </div>
        <div className="actions">
          <button
            className={`badge ${errorCount ? "error" : issues.length ? "warning" : "ok"}`}
            onClick={() => ed.selectById(null)}
            title="Показать список проблем"
          >
            {issues.length === 0 ? "✓ Проверка пройдена" : `✖ ${errorCount} · ⚠ ${issues.length - errorCount}`}
          </button>
          <button onClick={ed.undo} disabled={!ed.canUndo} title="Отменить (Ctrl+Z)">
            ↶ Отменить
          </button>
          <button onClick={ed.redo} disabled={!ed.canRedo} title="Повторить (Ctrl+Y)">
            ↷ Повторить
          </button>
          <button onClick={() => replaceScene("новую пустую сцену", newScene)}>Новая сцена</button>
          <label className="button">
            Открыть JSON
            <input
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) replaceScene(`«${file.name}»`, () => openFile(file));
                e.target.value = "";
              }}
            />
          </label>
          <button onClick={() => downloadScene()}>Скачать JSON</button>
          <button
            className={mode === "playback" ? "active" : undefined}
            onClick={() => setMode((m) => (m === "edit" ? "playback" : "edit"))}
            title="Проиграть таймлайн симуляции (контракт 7) на этом плане"
          >
            {mode === "edit" ? "▶ Симуляция" : "✏ Редактор"}
          </button>
        </div>
      </header>
      {error && <div className="error">{error}</div>}
      {saveError && <div className="error">{saveError}</div>}
      {pendingReplace && (
        <div className="error confirm">
          <span>
            Текущая сцена изменена и не скачана. Открыть {pendingReplace.what} вместо неё? Изменения пропадут — чтобы
            их сохранить, сначала нажмите «Скачать JSON».
          </span>
          <button
            onClick={() => {
              pendingReplace.run();
              setPendingReplace(null);
            }}
          >
            Открыть всё равно
          </button>
          <button onClick={() => setPendingReplace(null)}>Отмена</button>
        </div>
      )}
      {confirmDownload && errorCount > 0 && (
        <div className="error confirm">
          <span>
            В сцене ошибок: {errorCount}. Такой файл нарушит контракт, и другие части системы могут его не принять.
          </span>
          <button
            onClick={() => {
              setConfirmDownload(false);
              ed.selectById(null);
            }}
          >
            Показать
          </button>
          <button onClick={() => downloadScene(true)}>Всё равно скачать</button>
        </div>
      )}
      <main>
        {mode === "playback" ? (
          <PlaybackView scene={scene} />
        ) : (
          <>
        <Toolbar dict={dict} tool={ed.tool} onToolChange={ed.setTool} />
        <div className="canvas" ref={canvasRef}>
          {size.width > 0 && (
            <SceneView
              scene={scene}
              background={background}
              width={size.width}
              height={size.height}
              tool={ed.tool}
              selectedId={ed.selected?.data.id ?? null}
              draft={ed.draft}
              hover={ed.hover}
              onSelect={ed.select}
              onClick={ed.handleClick}
              onDoubleClick={ed.handleDoubleClick}
              onHover={ed.handleHover}
              onDrag={ed.handleDrag}
              onVertexMove={ed.moveVertex}
              onZoneMove={ed.moveZone}
              onVertexInsert={ed.insertVertex}
              onVertexDelete={ed.deleteVertex}
            />
          )}
          {ed.draft.length > 0 && (
            <div className="draw-bar">
              <span>
                {ed.tool.type === "zone" ? "Зона" : ed.tool.type === "wall" ? "Стена" : "Маршрут"}: {ed.draft.length} верш.
                {ed.draft.length < ed.minVertices
                  ? ` — нужно ещё ${ed.minVertices - ed.draft.length}`
                  : ed.tool.type === "zone"
                    ? " — кликните по первой вершине, чтобы замкнуть"
                    : ""}
              </span>
              <button className="primary" disabled={ed.draft.length < ed.minVertices} onClick={ed.finishDraft}>
                Готово <kbd>Enter</kbd>
              </button>
              <button onClick={ed.cancelDraft}>
                Отмена <kbd>Esc</kbd>
              </button>
            </div>
          )}
          <div className="hint">{hintFor(ed.tool, ed.selected?.kind ?? null)} · колесо — зум, перетаскивание фона — сдвиг</div>
        </div>
        <Properties
          dict={dict}
          scene={scene}
          background={background}
          selected={ed.selected}
          issues={issues}
          onSelectId={ed.selectById}
          onChange={ed.updateSelected}
          onSceneInfo={ed.updateSceneInfo}
          onResize={ed.resizePlan}
          onBackground={ed.setBackground}
          onDelete={ed.deleteSelected}
          server={
            embedded ? null : <ServerPanel scene={scene} errorCount={errorCount} onLoaded={sceneFromServer} />
          }
        />
          </>
        )}
      </main>
    </div>
  );
}
