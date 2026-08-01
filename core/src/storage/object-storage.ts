export interface ObjectStorage {
  get(key: string): Promise<Uint8Array | undefined>;
  put(key: string, data: Uint8Array): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export function cacheKey(blobId: string): string {
  return `cache/${blobId}`;
}

export function thumbnailKey(blobId: string): string {
  return `thumbnails/${blobId}`;
}

export async function loadIfAbsent(
  storage: ObjectStorage,
  key: string,
  supplier: (key: string) => Promise<Uint8Array>,
): Promise<Uint8Array> {
  const found = await storage.get(key);
  if (found !== undefined) {
    return found;
  }
  const data = await supplier(key);
  await storage.put(key, data);
  return data;
}
