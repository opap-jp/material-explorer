import {
  ComponentStore,
  createDatabase,
  FsObjectStorage,
  ProgressStore,
  RepositoryStore,
} from "@material-explorer/core";
import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";

function requireValue(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Environment variable ${name} is not set.`);
  }
  return value;
}

const db = createDatabase(requireValue("DATABASE_PATH"));
const app = createApp({
  repositoryStore: new RepositoryStore(db),
  componentStore: new ComponentStore(db),
  progressStore: new ProgressStore(db),
  storage: new FsObjectStorage(requireValue("STORAGE_PATH")),
});

serve({ fetch: app.fetch, port: 8080 });
console.log("Started.");
