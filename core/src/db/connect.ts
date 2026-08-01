import { fileURLToPath } from "node:url";
import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema.ts";

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(path: string) {
  const client = new BetterSqlite3(path);
  client.pragma("journal_mode = WAL");
  const db = drizzle({ client, schema });
  migrate(db, { migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)) });
  return db;
}
