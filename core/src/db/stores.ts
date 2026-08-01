import { and, eq } from "drizzle-orm";
import type { ComponentEntry, FileEntry } from "../model/component.ts";
import type { Progress } from "../model/progress.ts";
import type { Repository } from "../model/repository.ts";
import type { Thumbnail } from "../model/thumbnail.ts";
import type { Database } from "./connect.ts";
import { components, progress, repositories, thumbnails } from "./schema.ts";

export class RepositoryStore {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  find(): Repository[] {
    return this.db.select().from(repositories).all();
  }

  findById(id: string): Repository | undefined {
    return this.db.select().from(repositories).where(eq(repositories.id, id)).get();
  }

  update(repository: Repository): void {
    this.db
      .insert(repositories)
      .values(repository)
      .onConflictDoUpdate({
        target: repositories.id,
        set: { name: repository.name, title: repository.title, headHash: repository.headHash },
      })
      .run();
  }
}

export class ComponentStore {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  insert(item: ComponentEntry): void {
    this.db
      .insert(components)
      .values({
        id: item.id,
        repositoryId: item.repositoryId,
        parentId: item.parentId,
        kind: item.kind,
        name: item.name,
        path: item.path,
        blobId: item.kind === "file" ? item.blobId : null,
      })
      .run();
  }

  findFileById(id: string): FileEntry | undefined {
    const row = this.db.select().from(components).where(eq(components.id, id)).get();
    if (row === undefined || row.kind !== "file") {
      return undefined;
    }
    return toFileEntry(row);
  }

  findFiles(repositoryId: string): FileEntry[] {
    return this.db
      .select()
      .from(components)
      .where(and(eq(components.repositoryId, repositoryId), eq(components.kind, "file")))
      .all()
      .map(toFileEntry);
  }

  findImages(): { file: FileEntry; thumbnail: Thumbnail }[] {
    return this.db
      .select()
      .from(components)
      .innerJoin(thumbnails, eq(components.blobId, thumbnails.blobId))
      .all()
      .map((row) => ({
        file: toFileEntry(row.components),
        thumbnail: {
          id: row.thumbnails.blobId,
          width: row.thumbnails.width,
          height: row.thumbnails.height,
        },
      }));
  }

  deleteByRepositoryId(repositoryId: string): void {
    this.db.delete(components).where(eq(components.repositoryId, repositoryId)).run();
  }
}

function toFileEntry(row: typeof components.$inferSelect): FileEntry {
  return {
    kind: "file",
    id: row.id,
    repositoryId: row.repositoryId,
    parentId: row.parentId,
    name: row.name,
    path: row.path,
    blobId: row.blobId as string,
  };
}

export class ThumbnailStore {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  insert(thumbnail: Thumbnail): void {
    this.db
      .insert(thumbnails)
      .values({ blobId: thumbnail.id, width: thumbnail.width, height: thumbnail.height })
      .run();
  }

  find(id: string): Thumbnail | undefined {
    const row = this.db.select().from(thumbnails).where(eq(thumbnails.blobId, id)).get();
    if (row === undefined) {
      return undefined;
    }
    return { id: row.blobId, width: row.width, height: row.height };
  }
}

export interface ProgressRow extends Progress {
  readonly id: string;
  readonly running: boolean;
  readonly updatedAt: string;
}

export class ProgressStore {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  begin(id: string): void {
    this.db.delete(progress).run();
    this.db
      .insert(progress)
      .values({
        id,
        running: 1,
        current: 0,
        max: 0,
        processing: "",
        name: "",
        updatedAt: new Date().toISOString(),
      })
      .run();
  }

  update(id: string, value: Progress): void {
    this.db
      .update(progress)
      .set({
        current: value.current,
        max: value.max,
        processing: value.processing,
        name: value.name,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(progress.id, id))
      .run();
  }

  finish(id: string): void {
    this.db
      .update(progress)
      .set({ running: 0, updatedAt: new Date().toISOString() })
      .where(eq(progress.id, id))
      .run();
  }

  find(): ProgressRow | undefined {
    const row = this.db.select().from(progress).get();
    if (row === undefined) {
      return undefined;
    }
    return {
      id: row.id,
      running: row.running !== 0,
      current: row.current,
      max: row.max,
      processing: row.processing,
      name: row.name,
      updatedAt: row.updatedAt,
    };
  }
}
