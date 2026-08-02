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
  cacheKey,
  thumbnailKey,
  type FileEntry,
  type GitlabRepositoryInfo,
  type IntermediateFile,
  type Manifest,
  type Repository,
  type RepositoryConfig,
  type RepositoryInfo,
  type Warning,
} from "@material-explorer/core";
import { describe, expect, it } from "vitest";
import { ImageConverter, pngSize, type Resize } from "../src/convert.ts";
import type { ChangedResult, RepositoryLoader, RepositoryLoaderFactory } from "../src/loader.ts";
import { ProgressReporter } from "../src/progress.ts";
import { RepositoryCollectionFacade, intermediateTree, merge, toList } from "../src/update.ts";

function intermediateFile(id: string, path: string, blobId: string): IntermediateFile {
  const portions = path.split("/");
  return { kind: "file", id, name: portions[portions.length - 1], path, blobId };
}

function fakePng(width: number, height: number): Uint8Array {
  const data = new Uint8Array(24);
  data.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(data.buffer);
  view.setUint32(8, 13);
  data.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return data;
}

describe("merge", () => {
  it("パスが一致するファイルは古い ID で書き換えられる", () => {
    const stored = [intermediateFile("00000000-0000-0000-0000-000000000001", "images/kosys.png", "aaaa")];
    const recent = [
      intermediateFile("00000000-0000-0000-0000-000000000002", "images/kosys.png", "eeee"),
      intermediateFile("00000000-0000-0000-0000-000000000003", "images/new.png", "ffff"),
    ];

    expect(merge(stored, recent)).toEqual([
      intermediateFile("00000000-0000-0000-0000-000000000001", "images/kosys.png", "eeee"),
      intermediateFile("00000000-0000-0000-0000-000000000003", "images/new.png", "ffff"),
    ]);
  });
});

describe("intermediateTree と toList", () => {
  const info: RepositoryInfo = {
    protocol: "gitlab",
    id: "kosys-ep01",
    title: "こうしす! #1",
    host: "https://gitlab.com",
    namespace: "kosys",
    name: "kosys-ep01",
  };

  it("ファイルのリストからツリーを作り、親への参照を持つリストに変換する", () => {
    const files = [
      intermediateFile("00000000-0000-0000-0000-000000000001", "images/kosys.png", "aaaa"),
      intermediateFile("00000000-0000-0000-0000-000000000002", "images/logos/logo.png", "bbbb"),
      intermediateFile("00000000-0000-0000-0000-000000000003", "readme.txt", "cccc"),
    ];

    const components = toList(info, intermediateTree(files));

    const directories = components.filter((c) => c.kind === "directory");
    const fileEntries = components.filter((c) => c.kind === "file");
    expect(directories.map((d) => d.path).toSorted()).toEqual(["images", "images/logos"]);
    expect(fileEntries.map((f) => f.path).toSorted()).toEqual([
      "images/kosys.png",
      "images/logos/logo.png",
      "readme.txt",
    ]);

    const images = directories.find((d) => d.path === "images");
    const logos = directories.find((d) => d.path === "images/logos");
    const kosys = fileEntries.find((f) => f.path === "images/kosys.png");
    const logo = fileEntries.find((f) => f.path === "images/logos/logo.png");
    const readme = fileEntries.find((f) => f.path === "readme.txt");

    // ルート直下の parentId は null です。
    expect(images?.parentId).toBeNull();
    expect(readme?.parentId).toBeNull();
    expect(logos?.parentId).toBe(images?.id);
    expect(kosys?.parentId).toBe(images?.id);
    expect(logo?.parentId).toBe(logos?.id);

    for (const component of components) {
      expect(component.repositoryId).toBe("kosys-ep01");
    }
  });
});

describe("ImageConverter", () => {
  const resize: Resize = {
    resize: () => Promise.resolve(fakePng(290, 200)),
  };
  const converter = new ImageConverter(resize);

  function file(name: string): FileEntry {
    return {
      kind: "file",
      id: "00000000-0000-0000-0000-000000000001",
      repositoryId: "kosys-ep01",
      parentId: null,
      name,
      path: name,
      blobId: "aaaa",
    };
  }

  it("shouldDispatch は対象の拡張子だけを選択する", () => {
    for (const name of ["a.ai", "a.jpg", "a.JPG", "a.jpeg", "a.pdf", "a.png", "a.psd"]) {
      expect(converter.shouldDispatch(file(name))).toBe(true);
    }
    for (const name of ["a.txt", "a.wav", "a.blender", "a.md", "png"]) {
      expect(converter.shouldDispatch(file(name))).toBe(false);
    }
  });

  it("convert は変換後の PNG の寸法を返す", async () => {
    const [thumbnail, converted] = await converter.convert(file("a.png"), new Uint8Array([1]));
    expect(thumbnail).toEqual({ id: "aaaa", width: 290, height: 200 });
    expect(pngSize(converted)).toEqual({ width: 290, height: 200 });
  });
});

describe("RepositoryCollectionFacade", () => {
  const info: GitlabRepositoryInfo = {
    protocol: "gitlab",
    id: "kosys-ep01",
    title: "こうしす! #1",
    host: "https://gitlab.com",
    namespace: "kosys",
    name: "kosys-ep01",
  };

  function createFacade(loadChangedFiles: () => ChangedResult) {
    const root = mkdtempSync(join(tmpdir(), "material-explorer-"));
    const db = createDatabase(join(root, "test.db"));
    const services = {
      repositoryStore: new RepositoryStore(db),
      componentStore: new ComponentStore(db),
      thumbnailStore: new ThumbnailStore(db),
      storage: new FsObjectStorage(join(root, "storage")),
    };
    const progressStore = new ProgressStore(db);

    const loader: RepositoryLoader = {
      info,
      loadChangedFiles: () => Promise.resolve(loadChangedFiles()),
      loadFile: () => Promise.resolve(new Uint8Array([1, 2, 3])),
    };
    const factory: RepositoryLoaderFactory = {
      attemptCreate: () => loader,
    };
    const resize: Resize = {
      resize: () => Promise.resolve(fakePng(290, 200)),
    };
    const context = {
      manifest: [[], { tagGroups: [], selectors: [] }] as [Warning[], Manifest],
      repositoryConfig: [[], { repositories: [info] }] as [Warning[], RepositoryConfig],
    };
    const facade = new RepositoryCollectionFacade(
      context,
      services,
      [new ImageConverter(resize)],
      [factory],
      new ProgressReporter(progressStore),
    );
    return { facade, services, progressStore };
  }

  it("リポジトリを更新し、サムネイルを生成する", async () => {
    const repository: Repository = { id: "kosys-ep01", name: "kosys-ep01", title: "こうしす! #1", headHash: "1111" };
    const { facade, services, progressStore } = createFacade(() => ({
      repository,
      files: [
        intermediateFile(crypto.randomUUID(), "images/kosys.png", "aaaa"),
        intermediateFile(crypto.randomUUID(), "readme.txt", "cccc"),
      ],
    }));

    await facade.updateRepositories();

    expect(services.repositoryStore.find()).toEqual([repository]);
    expect(services.componentStore.findFiles("kosys-ep01").map((f) => f.path).toSorted()).toEqual([
      "images/kosys.png",
      "readme.txt",
    ]);

    const images = services.componentStore.findImages();
    expect(images.length).toBe(1);
    expect(images[0].file.path).toBe("images/kosys.png");
    expect(images[0].thumbnail).toEqual({ id: "aaaa", width: 290, height: 200 });

    expect(await services.storage.exists(cacheKey("aaaa"))).toBe(true);
    expect(await services.storage.exists(thumbnailKey("aaaa"))).toBe(true);
    // 対象拡張子でないファイルのサムネイルは生成されません。
    expect(await services.storage.exists(cacheKey("cccc"))).toBe(false);

    const progress = progressStore.find();
    expect(progress?.running).toBe(false);
    // ディレクトリ images と 2 ファイルで 3 コンポーネントです。
    expect(progress?.current).toBe(3);
    expect(progress?.max).toBe(3);
  });

  it("再実行してもパスが一致するファイルの ID は引き継がれる", async () => {
    const repository: Repository = { id: "kosys-ep01", name: "kosys-ep01", title: "こうしす! #1", headHash: "1111" };
    const { facade, services } = createFacade(() => ({
      repository,
      files: [intermediateFile(crypto.randomUUID(), "images/kosys.png", "aaaa")],
    }));

    await facade.updateRepositories();
    const first = services.componentStore.findFiles("kosys-ep01")[0];

    await facade.updateRepositories();
    const second = services.componentStore.findFiles("kosys-ep01")[0];

    expect(second.id).toBe(first.id);
  });
});
