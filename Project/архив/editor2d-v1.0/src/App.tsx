import { useEffect, useRef, useState } from "react";
import exampleScene from "../../scene.example.json";
import { SceneView } from "./scene/SceneView";
import type { Scene, SceneObject } from "./scene/types";

const KIND_LABELS: Record<SceneObject["kind"], string> = {
  zone: "Зона",
  operation_point: "Точка операции",
  charging_point: "Точка зарядки",
  route: "Маршрут",
  robot: "Робот",
};

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

export function App() {
  const [scene, setScene] = useState<Scene>(exampleScene as Scene);
  const [selected, setSelected] = useState<SceneObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canvasRef, size] = useSize<HTMLDivElement>();

  const openFile = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Scene;
      if (!data.site || !Array.isArray(data.zones)) throw new Error("это не похоже на сцену (нет site или zones)");
      setScene(data);
      setSelected(null);
      setError(null);
    } catch (e) {
      setError(`Не удалось открыть ${file.name}: ${(e as Error).message}`);
    }
  };

  const downloadScene = () => {
    const blob = new Blob([JSON.stringify(scene, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${scene.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
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
        </div>
        <div className="actions">
          <label className="button">
            Открыть JSON
            <input
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => e.target.files?.[0] && openFile(e.target.files[0])}
            />
          </label>
          <button onClick={downloadScene}>Скачать JSON</button>
        </div>
      </header>
      {error && <div className="error">{error}</div>}
      <main>
        <div className="canvas" ref={canvasRef}>
          {size.width > 0 && (
            <SceneView
              scene={scene}
              width={size.width}
              height={size.height}
              selectedId={selected?.data.id ?? null}
              onSelect={setSelected}
            />
          )}
          <div className="hint">Колесо — зум, перетаскивание — сдвиг, клик — свойства</div>
        </div>
        <aside>
          <h3>Состав сцены</h3>
          <ul className="counts">
            <li>Зоны: {scene.zones.length}</li>
            <li>Маршруты: {scene.routes.length}</li>
            <li>Точки операций: {scene.operation_points.length}</li>
            <li>Точки зарядки: {scene.charging_points.length}</li>
            <li>Роботы: {scene.robots.length}</li>
          </ul>
          <h3>{selected ? KIND_LABELS[selected.kind] : "Ничего не выбрано"}</h3>
          {selected ? (
            <pre>{JSON.stringify(selected.data, null, 2)}</pre>
          ) : (
            <p className="muted">Кликните по объекту на плане, чтобы увидеть его данные в формате контракта.</p>
          )}
        </aside>
      </main>
    </div>
  );
}
