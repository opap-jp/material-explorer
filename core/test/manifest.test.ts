import { describe, expect, it } from "vitest";
import {
  Kind,
  manifestFromYaml,
  normalize,
  WARNING_DUPLICATED_NAME,
  WARNING_GROUP_NAME_REQUIRED,
  WARNING_NAME_REQUIRED,
  WARNING_NO_SUCH_KIND_EXISTS,
  WARNING_SELECTOR_MODE_REQUIRED,
  type Manifest,
} from "../src/model/manifest.ts";
import { WARNING_KEY_REQUIRED } from "../src/model/deserialization.ts";
import { createTag } from "../src/model/tag.ts";
import { format } from "../src/data/strings.ts";
import { loadFixture } from "./helpers.ts";

const id = crypto.randomUUID();
const idGenerator = () => id;

describe("manifestFromYaml", () => {
  it("妥当なタグ宣言", () => {
    const actual = manifestFromYaml(loadFixture("model/manifest/valid.yaml"), idGenerator);
    const expected: [unknown[], Manifest] = [
      [],
      {
        tagGroups: [
          {
            kind: Kind.Author,
            name: Kind.Author.defaultName as string,
            tags: [
              createTag(["Butameron", "豚メロン", "井二かける", "Kakeru IBUTA", "IBUTA Kakeru"], undefined, idGenerator),
              createTag(["水雪"], "藻", idGenerator),
            ],
          },
          {
            kind: Kind.Common,
            name: "キャラクター",
            tags: [
              createTag(["祝園アカネ", "アカネ"], undefined, idGenerator),
              createTag([], "少佐", idGenerator),
              createTag(["山家宏佳", "宏佳"], undefined, idGenerator),
              createTag(["垂水結菜", "結菜"], undefined, idGenerator),
            ],
          },
        ],
        selectors: [
          {
            mode: "inclusive",
            predicate: {
              type: "extension-set",
              extensions: "psd,ai,png,jpg,jpeg,pdf,wav,flac,mp3,blender".split(","),
            },
          },
        ],
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("同じタグ名があるとき、そのタグ名はタグ宣言全体から消去される", () => {
    const actual = manifestFromYaml(loadFixture("model/manifest/invalid-duplicated.yaml"), idGenerator);
    const expectedManifest: Manifest = {
      tagGroups: [
        {
          kind: Kind.Author,
          name: Kind.Author.defaultName as string,
          tags: [
            createTag(["豚メロン", "Kakeru IBUTA", "IBUTA Kakeru"], undefined, idGenerator),
            createTag(["水雪"], undefined, idGenerator),
          ],
        },
        {
          kind: Kind.Common,
          name: "キャラクター",
          tags: [createTag(["アカネ"], undefined, idGenerator)],
        },
      ],
      selectors: [],
    };

    expect(actual[0][0].message).toBe(format(WARNING_DUPLICATED_NAME, "Butameron"));
    expect(actual[0][1].message).toBe(format(WARNING_DUPLICATED_NAME, "井二かける"));
    expect(actual[0][2].message).toBe(format(WARNING_DUPLICATED_NAME, "藻"));
    expect(actual[0][3].message).toBe(format(WARNING_DUPLICATED_NAME, "祝園アカネ"));

    expect(actual[1]).toEqual(expectedManifest);
  });

  it("不正な種別のタググループは、タグ宣言から消去される", () => {
    const actual = manifestFromYaml(loadFixture("model/manifest/invalid-kind.yaml"), idGenerator);

    expect(actual[0][0].message).toBe(`/tag_groups[0]: ${format(WARNING_GROUP_NAME_REQUIRED, "common")}`);
    expect(actual[0][1].message).toBe(`/tag_groups[1]: ${format(WARNING_NO_SUCH_KIND_EXISTS, "foo")}`);
    expect(actual[1]).toEqual({ tagGroups: [], selectors: [] });
  });

  it("タグ名のリストが空のとき、その項目は無視され、警告が出力される", () => {
    const actual = manifestFromYaml(loadFixture("model/manifest/invalid-empty.yaml"), idGenerator);

    const expectedManifest: Manifest = {
      tagGroups: [{ kind: Kind.Common, name: "キャラクター", tags: [] }],
      selectors: [],
    };

    expect(actual[0][0].message).toBe(`/tag_groups[0]/tags[0]: ${WARNING_NAME_REQUIRED}`);
    expect(actual[1]).toEqual(expectedManifest);
  });

  it("tag_groups がないとき、警告が出力される", () => {
    const actual = manifestFromYaml(loadFixture("model/manifest/invalid-missing-tag-groups.yaml"), idGenerator);

    expect(actual[0][0].message).toBe(`: ${format(WARNING_KEY_REQUIRED, "tag_groups")}`);
    expect(actual[1]).toEqual({ tagGroups: [], selectors: [] });
  });

  it("selectors がないとき、警告が出力される", () => {
    const actual = manifestFromYaml(loadFixture("model/manifest/invalid-missing-selectors.yaml"), idGenerator);

    expect(actual[0][0].message).toBe(`: ${format(WARNING_KEY_REQUIRED, "selectors")}`);
    expect(actual[1]).toEqual({ tagGroups: [], selectors: [] });
  });

  it("ファイルセレクタに include も exclude もないとき、警告が出力される", () => {
    const actual = manifestFromYaml(loadFixture("model/manifest/invalid-selector.yaml"), idGenerator);

    expect(actual[0][0].message).toBe(`/selectors[0]: ${WARNING_SELECTOR_MODE_REQUIRED}`);
    expect(actual[1]).toEqual({ tagGroups: [], selectors: [] });
  });
});

describe("normalize", () => {
  it("全角英数は半角英数に変換される", () => {
    expect(normalize("ｆｏｏbar４２10")).toBe("foobar4210");
  });

  it("大文字は小文字に変換され、半角スペースは削除される", () => {
    expect(normalize("IBUTA Kakeru")).toBe("ibutakakeru");
  });

  it("カタカナはひらがなに変換され、全角スペースは削除される", () => {
    expect(normalize("祝園　アカネ")).toBe("祝園あかね");
  });
});
