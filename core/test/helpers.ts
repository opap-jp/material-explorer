import { readFileSync } from "node:fs";
import { parseYaml, type YamlNode } from "../src/yaml/index.ts";

export function loadFixture(path: string): YamlNode {
  return parseYaml(readFileSync(new URL(`fixtures/${path}`, import.meta.url), "utf8"));
}
