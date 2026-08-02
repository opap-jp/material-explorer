import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ComponentStore,
  createDatabase,
  FsObjectStorage,
  ProgressStore,
  RepositoryStore,
  ThumbnailStore,
  thumbnailKey,
  type FileEntry,
} from "@material-explorer/core";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";

function createServices() {
  const root = mkdtempSync(join(tmpdir(), "material-explorer-"));
  const db = createDatabase(join(root, "test.db"));
  return {
    repositoryStore: new RepositoryStore(db),
    componentStore: new ComponentStore(db),
    progressStore: new ProgressStore(db),
    storage: new FsObjectStorage(join(root, "storage")),
    db,
  };
}

const repository = { id: "kosys-ep01", name: "kosys-ep01", title: "こうしす! #1", headHash: "aaaa" };

const file: FileEntry = {
  kind: "file",
  id: "0f000000-0000-0000-0000-000000000002",
  repositoryId: "kosys-ep01",
  parentId: "0f000000-0000-0000-0000-000000000001",
  name: "kosys.png",
  path: "images/kosys.png",
  blobId: "bbbb",
};

describe("GET /repositories", () => {
  it("リポジトリの一覧を現行互換の形で返す", async () => {
    const services = createServices();
    services.repositoryStore.update(repository);
    const app = createApp(services);

    const response = await app.request("/repositories");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [{ id: "kosys-ep01", name: "kosys-ep01", title: "こうしす! #1", headHash: "aaaa" }],
    });
  });
});

describe("GET /images", () => {
  it("サムネイルのあるファイルの一覧を現行互換の形で返す", async () => {
    const services = createServices();
    services.repositoryStore.update(repository);
    services.componentStore.insert(file);
    new ThumbnailStore(services.db).insert({ id: "bbbb", width: 290, height: 200 });
    const app = createApp(services);

    const response = await app.request("/images");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        {
          file: {
            id: "0f000000-0000-0000-0000-000000000002",
            repositoryId: "kosys-ep01",
            parentId: "0f000000-0000-0000-0000-000000000001",
            name: "kosys.png",
            path: "images/kosys.png",
            blobId: "bbbb",
          },
          thumbnail: { id: "bbbb", width: 290, height: 200 },
        },
      ],
    });
  });
});

describe("GET /thumbnail/{fileId}", () => {
  it("サムネイルの PNG データを返す", async () => {
    const services = createServices();
    services.repositoryStore.update(repository);
    services.componentStore.insert(file);
    const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    await services.storage.put(thumbnailKey("bbbb"), data);
    const app = createApp(services);

    const response = await app.request(`/thumbnail/${file.id}`);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(data);
  });

  it("存在しないとき 404 を返す", async () => {
    const services = createServices();
    const app = createApp(services);

    const response = await app.request("/thumbnail/0f000000-0000-0000-0000-00000000ffff");

    expect(response.status).toBe(404);
  });
});

describe("GET /progress", () => {
  it("実行中でないとき negative イベントを返す", async () => {
    const services = createServices();
    const app = createApp(services);

    const response = await app.request("/progress");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    expect(await response.text()).toBe("event: negative\ndata: negative\n\n");
  });

  it("実行中のとき進捗イベントを送出する", async () => {
    const services = createServices();
    services.progressStore.begin("0f000000-0000-0000-0000-000000000004");
    services.progressStore.update("0f000000-0000-0000-0000-000000000004", {
      current: 1,
      max: 10,
      processing: "images/kosys.png",
      name: "こうしす! #1",
    });
    const app = createApp(services);

    const response = await app.request("/progress");
    const reader = (response.body as ReadableStream<Uint8Array>).getReader();
    const { value } = await reader.read();
    await reader.cancel();

    const text = new TextDecoder().decode(value);
    expect(text).toBe(
      `data: ${JSON.stringify({ current: 1, max: 10, processing: "images/kosys.png", name: "こうしす! #1" })}\n\n`,
    );
  });
});
