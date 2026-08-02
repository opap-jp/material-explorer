import type { FileEntry, IntermediateFile, Repository, RepositoryInfo } from "@material-explorer/core";

export interface RepositoryLoader {
  readonly info: RepositoryInfo;

  loadChangedFiles(repository: Repository | undefined): Promise<ChangedResult>;
  loadFile(file: FileEntry): Promise<Uint8Array>;
}

export interface RepositoryLoaderFactory {
  attemptCreate(info: RepositoryInfo): RepositoryLoader | undefined;
}

export interface ChangedResult {
  readonly repository: Repository;
  readonly files: IntermediateFile[];
}
