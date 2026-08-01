import { normalize } from "./manifest.ts";

export interface Tag {
  readonly id: string;
  readonly names: TagName[];
  readonly generic: TagName | undefined;
}

export interface TagName {
  readonly id: string;
  readonly name: string;
  readonly normalized: string;
}

export function createTag(
  names: string[],
  generic: string | undefined,
  idGenerator: () => string,
): Tag {
  return {
    id: idGenerator(),
    names: names.map((name) => createTagName(idGenerator(), name)),
    generic: generic !== undefined ? createTagName(idGenerator(), generic) : undefined,
  };
}

export function createTagName(id: string, name: string): TagName {
  return { id, name, normalized: normalize(name) };
}
