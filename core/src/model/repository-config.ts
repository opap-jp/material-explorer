import { groupByOrdered, lefts, rights, type Either } from "../data/collections.ts";
import { format } from "../data/strings.ts";
import type { YamlNode } from "../yaml/index.ts";
import { DeserializationException, GlobalContext, withWarning, withWarnings } from "./deserialization.ts";
import { globalWarning, type Warning } from "./warning.ts";

export interface RepositoryConfig {
  readonly repositories: RepositoryInfo[];
}

/**
 * 取得するリポジトリの情報を表現する型です。
 *
 * id - システム内での、このリポジトリの識別子です。
 *      システム内で一意かつ、ファイル名として正しい文字列でなければなりません。
 * title - このリポジトリの名称です。ウェブページ上で表示されます。
 */
export type RepositoryInfo = GitlabRepositoryInfo;

/**
 * GitLab で取得可能なリポジトリの情報を表現する型です。
 *
 * host - GitLab をホスティングしているサーバーの URL
 * namespace - GitLab リポジトリの namespace
 * name - GitLab リポジトリの name
 */
export interface GitlabRepositoryInfo {
  readonly protocol: "gitlab";
  readonly id: string;
  readonly title: string;
  readonly host: string;
  readonly namespace: string;
  readonly name: string;
}

export const PATTERN_ID = /^[a-z0-9_-]+$/;

export const WARNING_INVALID_ID = "%1$s - このIDは不正です。IDは、 /^[a-z0-9_-]+$/ でなければなりません。";
export const WARNING_NO_SUCH_PROTOCOL = "%1$s - そのような取得方式はありません。";
export const WARNING_DUPLICATED_ID = "%1$s - このIDは重複しています。";

export function repositoryConfigFromYaml(document: YamlNode): [Warning[], RepositoryConfig] {
  function extractItem(node: YamlNode): Either<Warning, RepositoryInfo> {
    return withWarning(GlobalContext, () => {
      const id = node.apply("id").string.get.toLowerCase();
      if (!PATTERN_ID.test(id)) {
        throw new DeserializationException(format(WARNING_INVALID_ID, id), node);
      }
      const protocol = node.apply("protocol").string.get;
      if (protocol === "gitlab") {
        return {
          protocol: "gitlab" as const,
          id,
          title: node.apply("title").string.get,
          host: node.apply("host").string.get,
          namespace: node.apply("namespace").string.get,
          name: node.apply("name").string.get,
        };
      }
      throw new DeserializationException(format(WARNING_NO_SUCH_PROTOCOL, protocol), node);
    });
  }

  function validate(warnings: Warning[], config: RepositoryConfig): [Warning[], RepositoryConfig] {
    const duplications = groupByOrdered(config.repositories, (info) => info.id).filter(
      (entry) => entry[1].length > 1,
    );
    const duplicationSet = new Set(duplications.map((entry) => entry[0]));

    const c: RepositoryConfig = {
      repositories: config.repositories.filter((r) => !duplicationSet.has(r.id)),
    };
    const w = duplications.map((entry) => globalWarning(format(WARNING_DUPLICATED_ID, entry[0])));
    return [[...warnings, ...w], c];
  }

  const [warnings, config] = withWarnings(GlobalContext, (): [Warning[], RepositoryConfig] => {
    const items = document.apply("repositories").list.toList().map(extractItem);
    return [lefts(items), { repositories: rights(items) }];
  });

  return validate(warnings, config ?? { repositories: [] });
}
