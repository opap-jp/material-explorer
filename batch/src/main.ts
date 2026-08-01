import { readFileSync } from "node:fs";
import {
  ComponentStore,
  createDatabase,
  FsObjectStorage,
  manifestFromYaml,
  ProgressStore,
  repositoryConfigFromYaml,
  RepositoryStore,
  ThumbnailStore,
  yaml,
} from "@material-explorer/core";
import { ImageConverter, RestResize } from "./convert.ts";
import { GitLabRepositoryLoaderFactory } from "./gitlab.ts";
import { ProgressReporter } from "./progress.ts";
import { RepositoryCollectionFacade } from "./update.ts";

function requireValue(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Environment variable ${name} is not set.`);
  }
  return value;
}

const db = createDatabase(requireValue("DATABASE_PATH"));

const manifest = manifestFromYaml(
  yaml.parseYaml(readFileSync(requireValue("MANIFEST"), "utf8")),
  () => crypto.randomUUID(),
);
const repositories = repositoryConfigFromYaml(
  yaml.parseYaml(readFileSync(requireValue("REPOSITORIES"), "utf8")),
);

const facade = new RepositoryCollectionFacade(
  { manifest, repositoryConfig: repositories },
  {
    repositoryStore: new RepositoryStore(db),
    componentStore: new ComponentStore(db),
    thumbnailStore: new ThumbnailStore(db),
    storage: new FsObjectStorage(requireValue("STORAGE_PATH")),
  },
  [new ImageConverter(new RestResize(requireValue("IMAGEMAGICK_HOST")))],
  [new GitLabRepositoryLoaderFactory(requireValue("GITLAB_PERSONAL_ACCESS_TOKEN"))],
  new ProgressReporter(new ProgressStore(db)),
);

await facade.updateRepositories();
