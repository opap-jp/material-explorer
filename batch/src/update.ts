import { availableParallelism } from "node:os";
import {
  cacheKey,
  loadIfAbsent,
  thumbnailKey,
  toIntermediate,
  type ComponentEntry,
  type ComponentStore,
  type DirectoryEntry,
  type FileEntry,
  type IntermediateComponent,
  type IntermediateDirectory,
  type IntermediateFile,
  type Manifest,
  type ObjectStorage,
  type RepositoryConfig,
  type RepositoryInfo,
  type RepositoryStore,
  type ThumbnailStore,
  type Warning,
} from "@material-explorer/core";
import pLimit from "p-limit";
import type { MediaConverter } from "./convert.ts";
import type { RepositoryLoader, RepositoryLoaderFactory } from "./loader.ts";
import type { ProgressReporter } from "./progress.ts";

export interface Context {
  readonly manifest: [Warning[], Manifest];
  readonly repositoryConfig: [Warning[], RepositoryConfig];
}

export interface Services {
  readonly repositoryStore: RepositoryStore;
  readonly componentStore: ComponentStore;
  readonly thumbnailStore: ThumbnailStore;
  readonly storage: ObjectStorage;
}

export class RepositoryCollectionFacade {
  private readonly context: Context;
  private readonly services: Services;
  private readonly converters: MediaConverter[];
  private readonly loaderFactories: RepositoryLoaderFactory[];
  private readonly progress: ProgressReporter;

  constructor(
    context: Context,
    services: Services,
    converters: MediaConverter[],
    loaderFactories: RepositoryLoaderFactory[],
    progress: ProgressReporter,
  ) {
    this.context = context;
    this.services = services;
    this.converters = converters;
    this.loaderFactories = loaderFactories;
    this.progress = progress;
  }

  async updateRepositories(): Promise<void> {
    console.log("リポジトリ データの更新を開始しました。");
    this.progress.begin();

    const manifest = this.context.manifest;
    const config = this.context.repositoryConfig;

    const repositories = config[1].repositories.flatMap((info) => {
      const loader = this.loaderFactories
        .map((factory) => factory.attemptCreate(info))
        .find((loader) => loader !== undefined);
      return loader !== undefined ? [loader] : [];
    });

    // TODO: 警告の登録
    for (const w of [...manifest[0], ...config[0]]) {
      console.log(w.message);
      if (w.caused !== undefined) {
        console.log(w.caused);
      }
    }

    console.log("リポジトリ ローダーを生成しました。");
    for (const loader of repositories) {
      await this.updateRepository(loader);
    }
    this.progress.finish();
    console.log("リポジトリ データの更新が終了しました。");
    // TODO: 取得リポジトリ設定ファイルで除外されたリポジトリを削除する
  }

  async updateRepository(loader: RepositoryLoader): Promise<void> {
    console.log(`リポジトリ ${loader.info.id}（${loader.info.title}）の更新を開始しました。`);

    const info = loader.info;
    const savedRepository = this.services.repositoryStore.findById(info.id);

    // データベースに保存されている、ファイルのリストを取得します。
    const storedFiles = this.services.componentStore.findFiles(info.id).map(toIntermediate);

    // リモートリポジトリから、変更されたファイルのリストを取得します。
    const changedResult = await loader.loadChangedFiles(savedRepository);

    // 最新のファイルのリストについて、保存されているファイルのリストとパスが一致するものがあれば、古い ID で書き換えます
    const files = merge(storedFiles, changedResult.files);

    // ファイルのリストからファイルツリーを作ります。
    const fileTree = intermediateTree(files.toSorted((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)));

    // TODO: すべてのファイルやディレクトリについて、対応するメタデータ（*.yaml, *.md）があればそれを関連づけます。
    // このとき、マスタデータで宣言されていないタグについては警告データを登録します。

    // TODO: マージやスコープなどを考慮して、メタデータとファイルの関連づけを行ないます。

    // ファイルやディレクトリの古い情報をデータベースから削除します。
    this.services.componentStore.deleteByRepositoryId(info.id);

    // リポジトリの情報をデータベースに書き込みます。
    this.services.repositoryStore.update(changedResult.repository);

    // ファイルやディレクトリの情報をデータベースに書き込みます。
    console.log(`リポジトリ ${loader.info.id}（${loader.info.title}）のサムネイル生成を開始します。`);
    const components = toList(info, fileTree);
    this.progress.beginRepository(info.title, components.length);
    const limit = pLimit(availableParallelism());
    await Promise.all(
      components.map((component) =>
        limit(async () => {
          this.services.componentStore.insert(component);

          if (component.kind === "file") {
            await this.updateThumbnailIfChanged(component, loader);
          }
          this.progress.advance(component.path);
        }),
      ),
    );
    console.log(`リポジトリ ${loader.info.id}（${loader.info.title}）のサムネイル生成が終了しました。`);
    console.log(`リポジトリ ${loader.info.id}（${loader.info.title}）の更新が終了しました。`);
  }

  async updateThumbnailIfChanged(file: FileEntry, loader: RepositoryLoader): Promise<void> {
    // ID でサムネイルの存在を確認します。
    // あったら、なにもしません。なければ、ダウンロードし、サムネイル生成、書き込み。
    const converter = this.converters.find((converter) => converter.shouldDispatch(file));
    if (converter === undefined) {
      return;
    }
    if (this.services.thumbnailStore.find(file.blobId) === undefined) {
      try {
        console.debug(`${loader.info.id} - ${file.path} のサムネイルを生成します。`);
        const data = await loadIfAbsent(this.services.storage, cacheKey(file.blobId), () =>
          loader.loadFile(file),
        );
        const [thumb, converted] = await converter.convert(file, data);
        this.services.thumbnailStore.insert(thumb);
        await this.services.storage.put(thumbnailKey(file.blobId), converted);
        console.debug(`${loader.info.id} - ${file.path} のサムネイルを生成しました。`);
      } catch (e) {
        // TODO: 警告の登録（現在はログ出力）
        console.log(`${loader.info.id} - ${file.path} のサムネイルの生成に失敗しました。`);
        console.error(e);
      }
    } else {
      console.debug(`${loader.info.id} - ${file.path} のサムネイルの存在を確認しました。`);
    }
  }
}

export function merge(stored: IntermediateFile[], recent: IntermediateFile[]): IntermediateFile[] {
  const dictionary = new Map(stored.map((file) => [file.path, file]));
  return recent.map((file) => {
    const old = dictionary.get(file.path);
    return old !== undefined ? { ...file, id: old.id } : file;
  });
}

export function intermediateTree(files: IntermediateFile[]): IntermediateComponent {
  function updateDirectory(
    file: IntermediateFile,
    parent: IntermediateDirectory,
    portions: string[],
  ): IntermediateDirectory {
    if (portions.length === 1) {
      return { ...parent, children: new Map(parent.children).set(file.name, file) };
    }
    if (portions.length > 1) {
      const [head, ...followings] = portions;
      const found = parent.children.get(head);
      let dir: IntermediateDirectory;
      if (found !== undefined) {
        if (found.kind !== "directory") {
          throw new Error(file.path);
        }
        dir = found;
      } else {
        dir = {
          kind: "directory",
          id: crypto.randomUUID(),
          name: head,
          path: parent.path !== null ? `${parent.path}/${head}` : head,
          children: new Map(),
        };
      }

      const updated = updateDirectory(file, dir, followings);
      return { ...parent, children: new Map(parent.children).set(updated.name, updated) };
    }
    throw new Error(file.path);
  }

  function accumulate(acc: IntermediateDirectory, file: IntermediateFile): IntermediateDirectory {
    const portions = file.path.split("/");
    return updateDirectory(file, acc, portions);
  }

  const root: IntermediateDirectory = {
    kind: "directory",
    id: crypto.randomUUID(),
    name: "",
    path: null,
    children: new Map(),
  };
  return files.reduce(accumulate, root);
}

/**
 * コンポーネントの木を、親への参照を保持したコンポーネントのリストに変換します。
 *
 * @param info リポジトリ情報
 * @param tree コンポーネントの木。変換の対象です。
 * @returns 親への参照を保持したコンポーネントのリスト。これらのコンポーネントは子への参照を持ちません。
 */
export function toList(info: RepositoryInfo, tree: IntermediateComponent): ComponentEntry[] {
  /**
   * コンポーネントの木をリストに変換する関数です。
   * 再帰的に呼びだされます。再帰の最初の呼び出しは、木のルート（ルートディレクトリ）に対してのみ行なわれます。
   * <ol>
   *   <li>再帰の最初として、木のルートに対して呼びだされたときのみマッチします。
   *   自身のすべての子に対して再帰的な変換を行ない、それぞれの結果（リスト）を連結したリストを返します。</li>
   *   <li>ディレクトリに対して呼び出されたとき、
   *   自身のすべての子に対して再帰的な変換を行ない、自身と、それぞれの結果を連結したリストを連結したリストを返します。</li>
   *   <li>ファイルに対して呼びだされたとき、再帰の底につき、このファイルからなる、要素が1個のリストを返します。</li>
   * </ol>
   *
   * @param tree コンポーネントの木。変換の対象です。
   * @param parentId 変換の対象のコンポーネントの親コンポーネントの ID。木のルートに関する呼び出しのときのみ null です。
   * @returns コンポーネントのリスト。ファイルとディレクトリです。
   */
  function list(tree: IntermediateComponent, parentId: string | null): ComponentEntry[] {
    if (tree.kind === "directory" && tree.path === null) {
      // ルートディレクトリはコンポーネントとして保存されません。直下の子の parentId は null になります。
      return [...tree.children.values()].flatMap((child) => list(child, null));
    }
    if (tree.kind === "directory") {
      const dir: DirectoryEntry = {
        kind: "directory",
        id: tree.id,
        repositoryId: info.id,
        parentId,
        name: tree.name,
        path: tree.path as string,
      };
      return [dir, ...[...tree.children.values()].flatMap((child) => list(child, dir.id))];
    }
    // ファイルに対するリスト化は、要素が1個のリストを返します。
    return [
      {
        kind: "file",
        id: tree.id,
        repositoryId: info.id,
        parentId,
        name: tree.name,
        path: tree.path,
        blobId: tree.blobId,
      },
    ];
  }

  // 再帰の最初の呼び出し。
  // parentId として null が与えられる唯一の呼び出しです。
  return list(tree, null);
}
