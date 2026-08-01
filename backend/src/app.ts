import {
  thumbnailKey,
  type ComponentStore,
  type FileEntry,
  type ObjectStorage,
  type ProgressStore,
  type RepositoryStore,
} from "@material-explorer/core";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";

export interface AppServices {
  readonly repositoryStore: RepositoryStore;
  readonly componentStore: ComponentStore;
  readonly progressStore: ProgressStore;
  readonly storage: ObjectStorage;
}

// 現行 (rest) の circe による出力とワイヤ互換の形にします。
function fileToWire(file: FileEntry) {
  return {
    id: file.id,
    repositoryId: file.repositoryId,
    parentId: file.parentId,
    name: file.name,
    path: file.path,
    blobId: file.blobId,
  };
}

export function createApp(services: AppServices): Hono {
  const app = new Hono();

  app.use(cors());

  app.get("/repositories", (c) => {
    const items = services.repositoryStore.find();
    return c.json({ items });
  });

  app.get("/images", (c) => {
    const items = services.componentStore
      .findImages()
      .map((item) => ({ file: fileToWire(item.file), thumbnail: item.thumbnail }));
    return c.json({ items });
  });

  app.get("/thumbnail/:fileId", async (c) => {
    const file = services.componentStore.findFileById(c.req.param("fileId"));
    if (file === undefined) {
      return c.body(null, 404);
    }
    const thumbnail = await services.storage.get(thumbnailKey(file.blobId));
    if (thumbnail === undefined) {
      return c.body(null, 404);
    }
    return c.body(thumbnail as Uint8Array<ArrayBuffer>, 200, { "Content-Type": "image/png" });
  });

  app.get("/progress", (c) => {
    return streamSSE(c, async (stream) => {
      const found = services.progressStore.find();
      if (found === undefined || !found.running) {
        await stream.writeSSE({ event: "negative", data: "negative" });
        return;
      }

      let previous = "";
      for (;;) {
        const row = services.progressStore.find();
        if (row === undefined || !row.running) {
          await stream.writeSSE({ event: "close", data: "close" });
          return;
        }
        const payload = JSON.stringify({
          current: row.current,
          max: row.max,
          processing: row.processing,
          name: row.name,
        });
        if (payload !== previous) {
          await stream.writeSSE({ data: payload });
          previous = payload;
        }
        await stream.sleep(500);
      }
    });
  });

  return app;
}
