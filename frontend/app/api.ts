export interface Repository {
  id: string;
  name: string;
  title: string;
  headHash: string;
}

export interface ThumbnailFile {
  file: {
    id: string;
    repositoryId: string;
    parentId: string | null;
    name: string;
    path: string;
    blobId: string;
  };
  thumbnail: {
    id: string;
    width: number;
    height: number;
  };
}

const ok = (r: Response): Promise<Response> => (r.ok ? Promise.resolve(r) : Promise.reject(r));

export function repositories(host: string): Promise<{ items: Repository[] }> {
  return fetch(`${host}/repositories`).then(ok).then((r) => r.json());
}

export function images(host: string): Promise<{ items: ThumbnailFile[] }> {
  return fetch(`${host}/images`).then(ok).then((r) => r.json());
}

export function thumbnail(host: string, fileId: string): string {
  return `${host}/thumbnail/${fileId}`;
}
