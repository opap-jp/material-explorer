import { groupByOrdered, lefts, rights, type Either } from "../data/collections.ts";
import { format } from "../data/strings.ts";
import { ListNode, StringNode, TypeException, UndefinedNode, type YamlNode } from "../yaml/index.ts";
import {
  DeserializationException,
  GlobalContext,
  withWarning,
  withWarnings,
} from "./deserialization.ts";
import { createTag, type Tag, type TagName } from "./tag.ts";
import { globalWarning, type Warning } from "./warning.ts";

/**
 * メタデータで使用される識別子の宣言の集合です。
 */
export interface Manifest {
  readonly tagGroups: TagGroup[];
  readonly selectors: Selector[];
}

export interface TagGroup {
  readonly kind: Kind;
  readonly name: string;
  readonly tags: Tag[];
}

/**
 * タグの種別を表現します。
 *
 * identifier - この種別の識別子。タグ定義ファイルで使用されることがあります。
 * defaultName - 既定の名称。undefined の場合、この種別が設定されたグループには名前が必要です。
 * unique - true の場合、この種別のグループはタグ定義に1つしか存在できません。
 */
export interface Kind {
  readonly identifier: string;
  readonly defaultName: string | undefined;
  readonly unique: boolean;
}

export const Kind = {
  Common: { identifier: "common", defaultName: undefined, unique: false } as Kind,
  Author: { identifier: "author", defaultName: "作成者", unique: true } as Kind,
  Undeclared: { identifier: "undeclared", defaultName: "未宣言", unique: true } as Kind,

  parse(value: string): Kind | undefined {
    switch (value) {
      case "common":
        return Kind.Common;
      case "author":
        return Kind.Author;
      default:
        return undefined;
    }
  },
};

export type SelectorMode = "inclusive" | "exclusive";

/**
 * ファイルが検索対象であるかを判定する型です。
 *
 * mode - セレクタのモード。述語が選択したものを対象とするかしないかを表します。
 * predicate - 述語。ファイルを特定のロジックで選択します。
 */
export interface Selector {
  readonly mode: SelectorMode;
  readonly predicate: FilePredicate;
}

export type FilePredicate = ExtensionSetPredicate;

/**
 * 拡張子の集合で構成された述語です。
 *
 * extensions - 判定に用いる、拡張子の集合
 */
export interface ExtensionSetPredicate {
  readonly type: "extension-set";
  readonly extensions: string[];
}

export const WARNING_FAILED_TO_LOAD = "タグ定義ファイルの取得に失敗しました。";
export const WARNING_NO_SUCH_KIND_EXISTS = "%1$s - そのような種別はありません。";
export const WARNING_GROUP_NAME_REQUIRED = "グループ %1$s には name が必要です。";
export const WARNING_DUPLICATED_NAME = "%1$s - この名称は重複しています。";
export const WARNING_SELECTOR_MODE_REQUIRED = "include または exclude が必要です。";
export const WARNING_NAME_REQUIRED = "names または generic_replacement に一つ以上の名称が必要です。";

export function manifestFromYaml(
  document: YamlNode,
  idGenerator: () => string,
): [Warning[], Manifest] {
  function extractTagGroup(node: YamlNode): [Warning[], TagGroup | undefined] {
    function extractTag(node: YamlNode): Either<Warning, Tag> {
      return withWarning(GlobalContext, () => {
        const generic = node.apply("generic_replacement").string.option;
        const namesNode = node.apply("names");
        let names: string[];
        if (namesNode instanceof StringNode) {
          names = [namesNode.content];
        } else if (namesNode instanceof ListNode) {
          names = namesNode.toList().map((y) => y.string.get);
        } else if (namesNode instanceof UndefinedNode) {
          names = [];
        } else {
          throw new TypeException(namesNode);
        }

        const tag = createTag(names, generic, idGenerator);
        if (tag.names.length > 0 || tag.generic !== undefined) {
          return tag;
        }
        throw new DeserializationException(WARNING_NAME_REQUIRED, node);
      });
    }

    return withWarnings(GlobalContext, () => {
      const kindString = node.apply("kind").string.option;
      let kind: Kind;
      if (kindString !== undefined) {
        const parsed = Kind.parse(kindString);
        if (parsed === undefined) {
          throw new DeserializationException(format(WARNING_NO_SUCH_KIND_EXISTS, kindString), node);
        }
        kind = parsed;
      } else {
        kind = Kind.Common;
      }

      let name = node.apply("name").string.option;
      if (name === undefined) {
        if (kind.defaultName === undefined) {
          throw new DeserializationException(format(WARNING_GROUP_NAME_REQUIRED, kind.identifier), node);
        }
        name = kind.defaultName;
      }

      const tags = node.apply("tags").list.toList().map(extractTag);

      return [lefts(tags), { kind, name, tags: rights(tags) }];
    });
  }

  function extractSelector(node: YamlNode): Either<Warning, Selector> {
    function extractExtensions(node: YamlNode): FilePredicate {
      return {
        type: "extension-set",
        extensions: node.apply("extensions").list.toList().map((item) => item.string.get),
      };
    }

    return withWarning(GlobalContext, () => {
      const map = node.mapping.toMap();
      if (map.has("include")) {
        return { mode: "inclusive" as const, predicate: extractExtensions(node.apply("include")) };
      }
      if (map.has("exclude")) {
        return { mode: "exclusive" as const, predicate: extractExtensions(node.apply("exclusive")) };
      }
      throw new DeserializationException(WARNING_SELECTOR_MODE_REQUIRED, node);
    });
  }

  function validate(warnings: Warning[], manifest: Manifest): [Warning[], Manifest] {
    const allNames = manifest.tagGroups
      .flatMap((group) => group.tags)
      .flatMap((tag) => [...tag.names, ...(tag.generic !== undefined ? [tag.generic] : [])]);
    const duplications = groupByOrdered(allNames, (name) => name.normalized).filter(
      (entry) => entry[1].length > 1,
    );
    const duplicatedNames = new Set(duplications.map((entry) => entry[0]));
    const duplicationDictionary = new Map(duplications);

    const m: Manifest = {
      tagGroups: manifest.tagGroups.map((group) => {
        // 重複した名称が消去されたことでタグが空になっていることがあるので、そのようなタグを消去します。
        const filtered = group.tags
          .map((tag) => ({
            ...tag,
            names: tag.names.filter((n) => !duplicatedNames.has(n.normalized)),
            generic:
              tag.generic !== undefined && !duplicatedNames.has(tag.generic.normalized)
                ? tag.generic
                : undefined,
          }))
          .filter((tag) => tag.names.length > 0 || tag.generic !== undefined);
        return { ...group, tags: filtered };
      }),
      selectors: manifest.selectors,
    };

    const w = [...duplicatedNames].map((n) =>
      globalWarning(format(WARNING_DUPLICATED_NAME, (duplicationDictionary.get(n) as TagName[])[0].name)),
    );
    return [[...warnings, ...w], m];
  }

  const [warnings, manifest] = withWarnings(GlobalContext, (): [Warning[], Manifest] => {
    const tagGroups = document.apply("tag_groups").list.toList().map(extractTagGroup);
    const selectors = document.apply("selectors").list.toList().map(extractSelector);
    const warnings = [...tagGroups.flatMap((item) => item[0]), ...lefts(selectors)];

    return [
      warnings,
      {
        tagGroups: tagGroups.flatMap((item) => (item[1] !== undefined ? [item[1]] : [])),
        selectors: rights(selectors),
      },
    ];
  });

  return validate(warnings, manifest ?? { tagGroups: [], selectors: [] });
}

const SPACES = /[ 　]/g;

/**
 * 文字列を、タグの内部表現として正規化します。
 * <ul>
 * <li>半角スペースと全角スペースが削除されます。</li>
 * <li>全角英数は半角英数に変換されます。</li>
 * <li>カタカナはひらがなに変換されます。</li>
 * <li>大文字は小文字に変換されます。</li>
 * </ul>
 */
export function normalize(target: string): string {
  function singleByte(character: string): string {
    const c = character.charCodeAt(0);
    if ((c >= 0xff10 && c <= 0xff19) || (c >= 0xff21 && c <= 0xff3a) || (c >= 0xff41 && c <= 0xff5a)) {
      // 0xFEE0 は、半角と全角のオフセット
      return String.fromCharCode(c - 0xfee0);
    }
    return character;
  }

  function kana(character: string): string {
    const c = character.charCodeAt(0);
    if (c >= 0x30a1 && c <= 0x30f3) {
      return String.fromCharCode(c - 96);
    }
    return character;
  }

  return [...target.replace(SPACES, "")].map(singleByte).map(kana).join("").toLowerCase();
}
