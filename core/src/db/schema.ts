import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const repositories = sqliteTable("repositories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  headHash: text("head_hash").notNull(),
});

export const components = sqliteTable(
  "components",
  {
    id: text("id").primaryKey(),
    repositoryId: text("repository_id")
      .notNull()
      .references(() => repositories.id),
    parentId: text("parent_id"),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    path: text("path").notNull(),
    blobId: text("blob_id"),
  },
  (table) => [
    index("ix_components_repository").on(table.repositoryId),
    index("ix_components_blob").on(table.blobId),
    check("ck_components_kind", sql`${table.kind} IN ('directory', 'file')`),
    check("ck_components_blob_id", sql`(${table.kind} = 'file') = (${table.blobId} IS NOT NULL)`),
  ],
);

export const thumbnails = sqliteTable("thumbnails", {
  blobId: text("blob_id").primaryKey(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
});

export const progress = sqliteTable("progress", {
  id: text("id").primaryKey(),
  running: integer("running").notNull(),
  current: integer("current").notNull(),
  max: integer("max").notNull(),
  processing: text("processing").notNull(),
  name: text("name").notNull(),
  updatedAt: text("updated_at").notNull(),
});
