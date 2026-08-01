import type { FileEntry, Thumbnail } from "@material-explorer/core";

export interface MediaConverter {
  shouldDispatch(file: FileEntry): boolean;
  convert(original: FileEntry, data: Uint8Array): Promise<[Thumbnail, Uint8Array]>;
}

export interface Resize {
  resize(original: FileEntry, data: Uint8Array, width: number, height: number): Promise<Uint8Array>;
}

export class ImageConverter implements MediaConverter {
  private readonly resize: Resize;

  constructor(resize: Resize) {
    this.resize = resize;
  }

  shouldDispatch(file: FileEntry): boolean {
    return [".ai", ".jpg", ".jpeg", ".pdf", ".png", ".psd"].some((extension) =>
      file.name.toLowerCase().endsWith(extension),
    );
  }

  async convert(original: FileEntry, data: Uint8Array): Promise<[Thumbnail, Uint8Array]> {
    const converted = await this.resize.resize(original, data, 290, 290);
    const { width, height } = pngSize(converted);
    return [{ id: original.blobId, width, height }, converted];
  }
}

export class RestResize implements Resize {
  private readonly host: string;

  constructor(host: string) {
    this.host = host;
  }

  async ping(): Promise<string> {
    const response = await fetch(`${this.host}/ping`);
    return response.text();
  }

  async resize(original: FileEntry, data: Uint8Array, width: number, height: number): Promise<Uint8Array> {
    const entity = new FormData();
    entity.append("width", String(width));
    entity.append("height", String(height));
    entity.append("data", new Blob([data as Uint8Array<ArrayBuffer>]), original.name);
    const response = await fetch(`${this.host}/resize`, { method: "POST", body: entity });
    if (!response.ok) {
      throw new Error(`${response.status} ${this.host}/resize (${original.path})`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }
}

/**
 * PNG の IHDR チャンクから画像の寸法を読み取ります。
 */
export function pngSize(data: Uint8Array): { width: number; height: number } {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
