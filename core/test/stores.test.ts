import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createDatabase } from "../src/db/connect.ts";
import { ComponentStore, ProgressStore, RepositoryStore, ThumbnailStore } from "../src/db/stores.ts";
import type { DirectoryEntry, FileEntry } from "../src/model/component.ts";

function createTestDatabase() {
  return createDatabase(join(mkdtempSync(join(tmpdir(), "material-explorer-")), "test.db"));
}

const repository = { id: "kosys-ep01", name: "kosys-ep01", title: "こうしす! #1", headHash: "aaaa" };

const directory: DirectoryEntry = {
  kind: "directory",
  id: "0f000000-0000-0000-0000-000000000001",
  repositoryId: "kosys-ep01",
  parentId: null,
  name: "images",
  path: "images",
};

const file: FileEntry = {
  kind: "file",
  id: "0f000000-0000-0000-0000-000000000002",
  repositoryId: "kosys-ep01",
  parentId: directory.id,
  name: "kosys.png",
  path: "images/kosys.png",
  blobId: "bbbb",
};

describe("RepositoryStore", () => {
  it("update は upsert として動作する", () => {
    const db = createTestDatabase();
    const store = new RepositoryStore(db);

    store.update(repository);
    expect(store.find()).toEqual([repository]);
    expect(store.findById("kosys-ep01")).toEqual(repository);

    store.update({ ...repository, headHash: "cccc" });
    expect(store.find()).toEqual([{ ...repository, headHash: "cccc" }]);
  });

  it("findById は存在しないとき undefined を返す", () => {
    const db = createTestDatabase();
    expect(new RepositoryStore(db).findById("blahblah")).toBeUndefined();
  });
});

describe("ComponentStore", () => {
  it("ディレクトリとファイルを挿入し、ファイルだけを取得できる", () => {
    const db = createTestDatabase();
    new RepositoryStore(db).update(repository);
    const store = new ComponentStore(db);

    store.insert(directory);
    store.insert(file);

    expect(store.findFiles("kosys-ep01")).toEqual([file]);
    expect(store.findFileById(file.id)).toEqual(file);
    expect(store.findFileById(directory.id)).toBeUndefined();
  });

  it("findImages はサムネイルがあるファイルだけを返す", () => {
    const db = createTestDatabase();
    new RepositoryStore(db).update(repository);
    const components = new ComponentStore(db);
    const thumbnails = new ThumbnailStore(db);

    const another: FileEntry = { ...file, id: "0f000000-0000-0000-0000-000000000003", path: "images/another.png", blobId: "dddd" };
    components.insert(file);
    components.insert(another);
    thumbnails.insert({ id: "bbbb", width: 290, height: 200 });

    expect(components.findImages()).toEqual([{ file, thumbnail: { id: "bbbb", width: 290, height: 200 } }]);
  });

  it("deleteByRepositoryId はリポジトリのコンポーネントをすべて削除する", () => {
    const db = createTestDatabase();
    new RepositoryStore(db).update(repository);
    const store = new ComponentStore(db);

    store.insert(directory);
    store.insert(file);
    store.deleteByRepositoryId("kosys-ep01");

    expect(store.findFiles("kosys-ep01")).toEqual([]);
  });
});

describe("ProgressStore", () => {
  it("begin, update, finish で 1 行を管理する", () => {
    const db = createTestDatabase();
    const store = new ProgressStore(db);

    expect(store.find()).toBeUndefined();

    store.begin("0f000000-0000-0000-0000-000000000004");
    expect(store.find()?.running).toBe(true);

    store.update("0f000000-0000-0000-0000-000000000004", {
      current: 1,
      max: 10,
      processing: "images/kosys.png",
      name: "こうしす! #1",
    });
    const updated = store.find();
    expect(updated?.current).toBe(1);
    expect(updated?.max).toBe(10);
    expect(updated?.processing).toBe("images/kosys.png");
    expect(updated?.name).toBe("こうしす! #1");

    store.finish("0f000000-0000-0000-0000-000000000004");
    expect(store.find()?.running).toBe(false);

    store.begin("0f000000-0000-0000-0000-000000000005");
    expect(store.find()?.id).toBe("0f000000-0000-0000-0000-000000000005");
  });
});
