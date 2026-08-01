import { describe, expect, it } from "vitest";
import {
  BigIntegerNode,
  BooleanNode,
  DateNode,
  DoubleNode,
  IntNode,
  ListNode,
  ListParent,
  MappingNode,
  MappingParent,
  NullNode,
  StringNode,
  TypeException,
  UndefinedNode,
  UnsupportedMappingKeyException,
  type YamlNode,
} from "../src/yaml/index.ts";
import { loadFixture } from "./helpers.ts";

const types = loadFixture("data/yaml/types.yaml").apply("types");

function getNode(key: string): YamlNode {
  return types.apply(key);
}

describe("parseYaml", () => {
  it("should return a node which corresponds to each object type.", () => {
    expect(getNode("null")).toBeInstanceOf(NullNode);
    expect(getNode("string")).toBeInstanceOf(StringNode);
    expect(getNode("boolean")).toBeInstanceOf(BooleanNode);
    expect(getNode("int")).toBeInstanceOf(IntNode);
    // Scala 版の LongNode に相当する値は、TypeScript 版では IntNode（安全整数）に統合されています。
    expect(getNode("long")).toBeInstanceOf(IntNode);
    expect(getNode("big_integer")).toBeInstanceOf(BigIntegerNode);
    expect(getNode("double")).toBeInstanceOf(DoubleNode);
    expect(getNode("date")).toBeInstanceOf(DateNode);
  });

  it("should throw UnsupportedMappingKeyException when document contains a mapping which has non-string key.", () => {
    expect(() => loadFixture("data/yaml/non-string-key-mapping.yaml")).toThrow(
      UnsupportedMappingKeyException,
    );
  });
});

describe("apply(String)", () => {
  it("throws TypeException when the node is not MappingNode", () => {
    expect(() => getNode("string").apply("foo")).toThrow(TypeException);
  });
});

describe("mapping", () => {
  it("should return MappingNode when the node is MappingNode.", () => {
    expect(getNode("mapping").mapping).toBeInstanceOf(MappingNode);
  });

  it("should throw TypeException when the node is undefined.", () => {
    expect(() => getNode("blahblah").mapping).toThrow(TypeException);
  });

  it("should throw TypeException when the node is null.", () => {
    expect(() => getNode("null").mapping).toThrow(TypeException);
  });
});

describe("list", () => {
  it("should return ListNode when the node is ListNode.", () => {
    expect(getNode("list").list).toBeInstanceOf(ListNode);
  });

  it("should throw TypeException when the node is undefined.", () => {
    expect(() => getNode("blahblah").list).toThrow(TypeException);
  });

  it("should throw TypeException when the node is null.", () => {
    expect(() => getNode("null").list).toThrow(TypeException);
  });
});

describe("mappingOption", () => {
  it("should return MappingNode when the node is MappingNode.", () => {
    expect(getNode("mapping").mappingOption).toBeInstanceOf(MappingNode);
  });

  it("should return undefined when the node is undefined.", () => {
    expect(getNode("blahblah").mappingOption).toBeUndefined();
  });

  it("should return undefined when the node is null.", () => {
    expect(getNode("null").mappingOption).toBeUndefined();
  });

  it("should throw TypeException when the node is ValueLeaf.", () => {
    expect(() => getNode("string").mappingOption).toThrow(TypeException);
  });
});

describe("listOption", () => {
  it("should return ListNode when the node is ListNode.", () => {
    expect(getNode("list").listOption).toBeInstanceOf(ListNode);
  });

  it("should return undefined when the node is undefined.", () => {
    expect(getNode("blahblah").listOption).toBeUndefined();
  });

  it("should return undefined when the node is null.", () => {
    expect(getNode("null").listOption).toBeUndefined();
  });

  it("should throw TypeException when the node is ValueLeaf.", () => {
    expect(() => getNode("string").listOption).toThrow(TypeException);
  });
});

describe("string", () => {
  it("should return StringNode when the node contains string.", () => {
    expect(getNode("string").string).toBeInstanceOf(StringNode);
  });

  it("should return UndefinedNode when the node is undefined.", () => {
    expect(getNode("blahblah").string).toBeInstanceOf(UndefinedNode);
  });

  it("should return NullNode when the node is null.", () => {
    expect(getNode("null").string).toBeInstanceOf(NullNode);
  });

  it("should throw TypeException when the node is ValueLeaf and its type is not appropriate.", () => {
    expect(() => getNode("boolean").string).toThrow(TypeException);
  });
});

describe("boolean", () => {
  it("should return BooleanNode when the node contains boolean.", () => {
    expect(getNode("boolean").boolean).toBeInstanceOf(BooleanNode);
  });

  it("should throw TypeException when the node is ValueLeaf and its type is not appropriate.", () => {
    expect(() => getNode("int").boolean).toThrow(TypeException);
  });
});

describe("int", () => {
  it("should return IntNode when the node contains int.", () => {
    expect(getNode("int").int).toBeInstanceOf(IntNode);
  });

  it("should throw TypeException when the node is ValueLeaf and its type is not appropriate.", () => {
    expect(() => getNode("string").int).toThrow(TypeException);
  });
});

describe("bigInteger", () => {
  it("should return BigIntegerNode when the node contains bigInteger.", () => {
    expect(getNode("big_integer").bigInteger).toBeInstanceOf(BigIntegerNode);
  });

  it("should throw TypeException when the node is ValueLeaf and its type is not appropriate.", () => {
    expect(() => getNode("string").bigInteger).toThrow(TypeException);
  });
});

describe("double", () => {
  it("should return DoubleNode when the node contains double.", () => {
    expect(getNode("double").double).toBeInstanceOf(DoubleNode);
  });

  it("should throw TypeException when the node is ValueLeaf and its type is not appropriate.", () => {
    expect(() => getNode("string").double).toThrow(TypeException);
  });
});

describe("date", () => {
  it("should return DateNode when the node contains date.", () => {
    expect(getNode("date").date).toBeInstanceOf(DateNode);
  });

  it("should throw TypeException when the node is ValueLeaf and its type is not appropriate.", () => {
    expect(() => getNode("string").date).toThrow(TypeException);
  });
});

describe("ancestors", () => {
  it("should return ancestors.", () => {
    const sut = getNode("list").list.toList()[0].ancestors;
    expect(sut.length).toBe(3);

    expect((sut[0] as MappingParent).key).toBe("types");
    expect((sut[1] as MappingParent).key).toBe("list");
    expect((sut[2] as ListParent).index).toBe(0);
  });
});

describe("location", () => {
  it("should return location.", () => {
    expect(getNode("list").list.toList()[0].location).toBe("/types/list[0]");
  });
});

describe("toString", () => {
  it("should return the location, name and its value when the node is ValueNode.", () => {
    expect(getNode("int").int.toString()).toBe("/types/int: IntNode(42)");
  });

  it("should return the location, name and its value with quatation when the node is StringNode.", () => {
    expect(getNode("list").list.toList()[0].string.toString()).toBe('/types/list[0]: StringNode("foo")');
  });

  it("should return the location and the name when the node is InternalNode.", () => {
    expect(getNode("list").list.toString()).toBe("/types/list: ListNode");
    expect(getNode("mapping").mapping.toString()).toBe("/types/mapping: MappingNode");
  });
});

describe("get", () => {
  it("should return an appropriate value if the node is ValueNode.", () => {
    expect(getNode("string").string.get).toBe("foo");
    expect(getNode("boolean").boolean.get).toBe(true);
    expect(getNode("int").int.get).toBe(42);
    expect(getNode("long").int.get).toBe(12345678900);
    expect(getNode("big_integer").bigInteger.get).toBe(12345678901234567890n);
    expect(getNode("double").double.get).toBe(3.14);
    expect(getNode("date").date.get).toEqual(new Date("2018-01-01T12:34:56Z"));
  });

  it("should throw TypeException if the node is UndefinedNode.", () => {
    expect(() => getNode("blahblah").string.get).toThrow(TypeException);
    expect(() => getNode("blahblah").boolean.get).toThrow(TypeException);
    expect(() => getNode("blahblah").int.get).toThrow(TypeException);
    expect(() => getNode("blahblah").bigInteger.get).toThrow(TypeException);
    expect(() => getNode("blahblah").double.get).toThrow(TypeException);
    expect(() => getNode("blahblah").date.get).toThrow(TypeException);
  });

  it("should throw TypeException if the node is NullNode.", () => {
    expect(() => getNode("null").string.get).toThrow(TypeException);
    expect(() => getNode("null").boolean.get).toThrow(TypeException);
    expect(() => getNode("null").int.get).toThrow(TypeException);
    expect(() => getNode("null").bigInteger.get).toThrow(TypeException);
    expect(() => getNode("null").double.get).toThrow(TypeException);
    expect(() => getNode("null").date.get).toThrow(TypeException);
  });
});

describe("option", () => {
  it("should return an appropriate value if the node is ValueNode.", () => {
    expect(getNode("string").string.option).toBe("foo");
    expect(getNode("boolean").boolean.option).toBe(true);
    expect(getNode("int").int.option).toBe(42);
    expect(getNode("big_integer").bigInteger.option).toBe(12345678901234567890n);
    expect(getNode("double").double.option).toBe(3.14);
    expect(getNode("date").date.option).toEqual(new Date("2018-01-01T12:34:56Z"));
  });

  it("should return undefined if the node is UndefinedNode.", () => {
    expect(getNode("blahblah").string.option).toBeUndefined();
    expect(getNode("blahblah").boolean.option).toBeUndefined();
    expect(getNode("blahblah").int.option).toBeUndefined();
    expect(getNode("blahblah").bigInteger.option).toBeUndefined();
    expect(getNode("blahblah").double.option).toBeUndefined();
    expect(getNode("blahblah").date.option).toBeUndefined();
  });

  it("should return undefined if the node is NullNode.", () => {
    expect(getNode("null").string.option).toBeUndefined();
    expect(getNode("null").boolean.option).toBeUndefined();
    expect(getNode("null").int.option).toBeUndefined();
    expect(getNode("null").bigInteger.option).toBeUndefined();
    expect(getNode("null").double.option).toBeUndefined();
    expect(getNode("null").date.option).toBeUndefined();
  });
});
