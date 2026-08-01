import { describe, expect, it } from "vitest";
import { format } from "../src/data/strings.ts";
import {
  repositoryConfigFromYaml,
  WARNING_DUPLICATED_ID,
  WARNING_INVALID_ID,
  WARNING_NO_SUCH_PROTOCOL,
  type RepositoryConfig,
} from "../src/model/repository-config.ts";
import { loadFixture } from "./helpers.ts";

describe("repositoryConfigFromYaml", () => {
  it("妥当なリポジトリ設定", () => {
    const actual = repositoryConfigFromYaml(loadFixture("model/repository-config/valid.yaml"));
    const expected: [unknown[], RepositoryConfig] = [
      [],
      {
        repositories: [
          {
            protocol: "gitlab",
            id: "kosys-ep01",
            title: "こうしす! #1",
            host: "https://gitlab.com",
            namespace: "kosys",
            name: "kosys-ep01",
          },
        ],
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("IDが不正であるとき、その項目は無視される", () => {
    const actual = repositoryConfigFromYaml(loadFixture("model/repository-config/invalid-id.yaml"));

    expect(actual[0][0].message).toBe(`/repositories[0]: ${format(WARNING_INVALID_ID, "kosys\nkosys-ep01")}`);
    expect(actual[1]).toEqual({ repositories: [] });
  });

  it("同じIDがあるとき、それらの項目は消去される", () => {
    const actual = repositoryConfigFromYaml(loadFixture("model/repository-config/invalid-duplicated-id.yaml"));
    const expectedConfig: RepositoryConfig = {
      repositories: [
        {
          protocol: "gitlab",
          id: "kosys-ep01",
          title: "こうしす! #1",
          host: "https://gitlab.com",
          namespace: "kosys",
          name: "kosys-ep01",
        },
      ],
    };

    expect(actual[0][0].message).toBe(format(WARNING_DUPLICATED_ID, "kosys-ep03"));
    expect(actual[0][1].message).toBe(format(WARNING_DUPLICATED_ID, "kosys-ep02"));
    expect(actual[1]).toEqual(expectedConfig);
  });

  it("不正なプロトコルが指定されたとき、その項目は無視される", () => {
    const actual = repositoryConfigFromYaml(loadFixture("model/repository-config/invalid-protocol.yaml"));

    expect(actual[0][0].message).toBe(`/repositories[0]: ${format(WARNING_NO_SUCH_PROTOCOL, "foo")}`);
    expect(actual[1]).toEqual({ repositories: [] });
  });
});
