import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyScene } from "../scene/ops";
import { getScene, putScene, sceneUrl } from "./scene-api";

const scene = { ...emptyScene(), project_id: "proj-012", name: "Склад" };

/** Подменяет fetch: возвращает заданный ответ и запоминает, с чем его позвали. */
function stubFetch(status: number, body: unknown, contentType = "application/json") {
  const calls: { url: string; init: RequestInit }[] = [];
  const text = typeof body === "string" ? body : JSON.stringify(body);
  vi.stubGlobal("fetch", (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(
      new Response(status === 204 ? null : text, { status, headers: { "Content-Type": contentType } }),
    );
  });
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe("sceneUrl", () => {
  it("адрес сервера с лишним слэшем", () => expect(sceneUrl("http://localhost:8000/", "p1")).toBe("http://localhost:8000/api/projects/p1/scene"));
  it("пустой адрес — тот же сервер", () => expect(sceneUrl("", "p1")).toBe("/api/projects/p1/scene"));
  it("без идентификатора проекта — понятная ошибка", () => expect(() => sceneUrl("", " ")).toThrow(/идентификатор проекта/i));
  it("подозрительный идентификатор не пускаем в путь", () => expect(() => sceneUrl("", "../admin")).toThrow(/можно только латиницу/));
  it("адрес без http — ошибка", () => expect(() => sceneUrl("localhost:8000", "p1")).toThrow(/http/));
});

describe("putScene", () => {
  it("шлёт PUT со сценой и свежим временем", async () => {
    const calls = stubFetch(200, { ok: true });
    const at = await putScene("http://srv", scene);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("http://srv/api/projects/proj-012/scene");
    expect(calls[0].init.method).toBe("PUT");
    const sent = JSON.parse(calls[0].init.body as string);
    expect(sent.project_id).toBe("proj-012");
    expect(sent.updated_at).toBe(at);
    expect(at).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
  });

  it("204 без тела — тоже успех", async () => {
    stubFetch(204, null);
    await expect(putScene("http://srv", scene)).resolves.toMatch(/^\d{4}-/);
  });

  it("404 — говорит про чужой или несуществующий проект", async () => {
    stubFetch(404, { detail: "Not found" });
    await expect(putScene("http://srv", scene)).rejects.toThrow(/проекта с таким идентификатором на сервере нет/);
  });

  it("422 — показывает сообщение сервера", async () => {
    stubFetch(422, { message: "Зона «Приёмка»: контур самопересекается" });
    await expect(putScene("http://srv", scene)).rejects.toThrow(/контур самопересекается/);
  });

  it("сервер недоступен — понятная ошибка, а не «Failed to fetch»", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("Failed to fetch")));
    await expect(putScene("http://srv", scene)).rejects.toThrow(/Сервер недоступен/);
  });
});

describe("getScene", () => {
  it("старая сцена без стен открывается (withDefaults)", async () => {
    const old = { ...scene, schema_version: "1.1", walls: undefined };
    stubFetch(200, old);
    const loaded = await getScene("http://srv", "proj-012");
    expect(loaded?.walls).toEqual([]);
    expect(loaded?.schema_version).toBe("1.2");
  });

  it("404 — сцены ещё нет, это не ошибка", async () => {
    stubFetch(404, { detail: "no scene" });
    await expect(getScene("http://srv", "proj-012")).resolves.toBeNull();
  });

  it("не JSON — понятная ошибка", async () => {
    stubFetch(200, "<html>ошибка</html>", "text/html");
    await expect(getScene("http://srv", "proj-012")).rejects.toThrow(/не JSON/);
  });

  it("мусор вместо сцены — ошибка разбора, а не падение", async () => {
    stubFetch(200, { site: "не объект" });
    await expect(getScene("http://srv", "proj-012")).rejects.toThrow(/Сцена не загружена/);
  });
});
