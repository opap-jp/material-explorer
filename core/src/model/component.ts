export type ComponentEntry = DirectoryEntry | FileEntry;

export interface DirectoryEntry {
  readonly kind: "directory";
  readonly id: string;
  readonly repositoryId: string;
  readonly parentId: string | null;
  readonly name: string;
  readonly path: string;
}

export interface FileEntry {
  readonly kind: "file";
  readonly id: string;
  readonly repositoryId: string;
  readonly parentId: string | null;
  readonly name: string;
  readonly path: string;
  readonly blobId: string;
}

export function toIntermediate(file: FileEntry): IntermediateFile {
  return { kind: "file", id: file.id, name: file.name, path: file.path, blobId: file.blobId };
}

export type IntermediateComponent = IntermediateDirectory | IntermediateFile;

/**
 * ディレクトリの中間表現です。
 *
 * id - ID
 * name - ディレクトリ名
 * path - パス。null のとき、ルート要素です。
 * children - このディレクトリに属するファイルやディレクトリ
 */
export interface IntermediateDirectory {
  readonly kind: "directory";
  readonly id: string;
  readonly name: string;
  readonly path: string | null;
  readonly children: Map<string, IntermediateComponent>;
}

/**
 * ファイルの中間表現です。
 *
 * id - ID
 * name - ファイル名
 * path - パス
 */
export interface IntermediateFile {
  readonly kind: "file";
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly blobId: string;
}
