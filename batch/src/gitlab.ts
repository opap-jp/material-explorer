import type {
  FileEntry,
  GitlabRepositoryInfo,
  IntermediateFile,
  Repository,
  RepositoryInfo,
} from "@material-explorer/core";
import type { ChangedResult, RepositoryLoader, RepositoryLoaderFactory } from "./loader.ts";

export class GitLabRepositoryLoaderFactory implements RepositoryLoaderFactory {
  private readonly personalAccessToken: string;

  constructor(personalAccessToken: string) {
    this.personalAccessToken = personalAccessToken;
  }

  attemptCreate(info: RepositoryInfo): RepositoryLoader | undefined {
    return info.protocol === "gitlab" ? new GitLabRepositoryLoader(info, this.personalAccessToken) : undefined;
  }
}

class GitLabRepositoryLoader implements RepositoryLoader {
  readonly info: GitlabRepositoryInfo;
  private readonly personalAccessToken: string;
  private projectId = 0;

  constructor(info: GitlabRepositoryInfo, personalAccessToken: string) {
    this.info = info;
    this.personalAccessToken = personalAccessToken;
  }

  async loadChangedFiles(repository: Repository | undefined): Promise<ChangedResult> {
    const project = (await this.request(
      `/api/v4/projects/${encodeURIComponent(`${this.info.namespace}/${this.info.name}`)}`,
    ).then((r) => r.json())) as { id: number; default_branch: string };
    this.projectId = project.id;

    const head = (await this.request(
      `/api/v4/projects/${project.id}/repository/commits/${encodeURIComponent(project.default_branch)}`,
    ).then((r) => r.json())) as { id: string };

    const firstPage = await this.request(this.treePath(project.id, 1));
    const totalPages = Number(firstPage.headers.get("x-total-pages") ?? "1");
    const followingPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        this.request(this.treePath(project.id, i + 2)).then((r) => r.json() as Promise<TreeItem[]>),
      ),
    );
    const tree = [...((await firstPage.json()) as TreeItem[]), ...followingPages.flat()].filter(
      (item) => item.type === "blob",
    );

    const files: IntermediateFile[] = tree.map((item) => ({
      kind: "file",
      id: crypto.randomUUID(),
      name: item.name,
      path: item.path,
      blobId: item.id,
    }));
    const result: Repository =
      repository !== undefined
        ? { ...repository, headHash: head.id }
        : { id: this.info.id, name: this.info.id, title: this.info.title, headHash: head.id };
    return { repository: result, files };
  }

  async loadFile(file: FileEntry): Promise<Uint8Array> {
    const response = await this.request(
      `/api/v4/projects/${this.projectId}/repository/blobs/${file.blobId}/raw`,
    );
    return new Uint8Array(await response.arrayBuffer());
  }

  private treePath(projectId: number, page: number): string {
    return `/api/v4/projects/${projectId}/repository/tree?recursive=true&per_page=100&page=${page}`;
  }

  private async request(path: string): Promise<Response> {
    const response = await fetch(`${this.info.host}${path}`, {
      headers: this.personalAccessToken !== "" ? { "PRIVATE-TOKEN": this.personalAccessToken } : {},
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${this.info.host}${path}`);
    }
    return response;
  }
}

interface TreeItem {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly path: string;
}
