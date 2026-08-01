import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ObjectStorage } from "./object-storage.ts";

export class FsObjectStorage implements ObjectStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  async get(key: string): Promise<Uint8Array | undefined> {
    try {
      return await readFile(join(this.root, key));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        return undefined;
      }
      throw e;
    }
  }

  async put(key: string, data: Uint8Array): Promise<void> {
    const path = join(this.root, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(join(this.root, key));
      return true;
    } catch {
      return false;
    }
  }
}
