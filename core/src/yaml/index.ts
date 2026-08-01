import { parse } from "yaml";

export class YamlException extends Error {}

export class TypeException extends YamlException {
  readonly node: YamlNode;

  constructor(node: YamlNode) {
    super(node.toString());
    this.node = node;
  }
}

export class UnsupportedMappingKeyException extends YamlException {
  readonly key: unknown;
  readonly value: unknown;

  constructor(key: unknown, value: unknown) {
    super(String(key));
    this.key = key;
    this.value = value;
  }
}

export class EmptyParent {
  readonly kind = "empty";
}

export class MappingParent {
  readonly kind = "mapping";
  readonly node: MappingNode;
  readonly key: string;

  constructor(node: MappingNode, key: string) {
    this.node = node;
    this.key = key;
  }
}

export class ListParent {
  readonly kind = "list";
  readonly node: ListNode;
  readonly index: number;

  constructor(node: ListNode, index: number) {
    this.node = node;
    this.index = index;
  }
}

export type Parent = EmptyParent | MappingParent | ListParent;
export type ConcreteParent = MappingParent | ListParent;

export abstract class YamlNode {
  readonly parent: Parent;

  constructor(parent: Parent) {
    this.parent = parent;
  }

  abstract withParent(parent: Parent): YamlNode;

  apply(_key: string): YamlNode {
    throw new TypeException(this);
  }

  get mapping(): MappingNode {
    throw new TypeException(this);
  }

  get list(): ListNode {
    throw new TypeException(this);
  }

  get mappingOption(): MappingNode | undefined {
    throw new TypeException(this);
  }

  get listOption(): ListNode | undefined {
    throw new TypeException(this);
  }

  get string(): Leaf<string> {
    throw new TypeException(this);
  }

  get boolean(): Leaf<boolean> {
    throw new TypeException(this);
  }

  get int(): Leaf<number> {
    throw new TypeException(this);
  }

  get bigInteger(): Leaf<bigint> {
    throw new TypeException(this);
  }

  get double(): Leaf<number> {
    throw new TypeException(this);
  }

  get date(): Leaf<Date> {
    throw new TypeException(this);
  }

  get ancestors(): ConcreteParent[] {
    const accumulator: ConcreteParent[] = [];
    let parent: Parent = this.parent;
    while (!(parent instanceof EmptyParent)) {
      accumulator.unshift(parent);
      parent = parent.node.parent;
    }
    return accumulator;
  }

  get location(): string {
    let parent: Parent = this.parent;
    let previous: Parent | undefined;
    let portions = "";
    for (;;) {
      if (parent instanceof MappingParent) {
        portions = `/${parent.key}${portions}`;
        previous = parent;
        parent = parent.node.parent;
      } else if (parent instanceof ListParent) {
        portions = `[${parent.index}]${portions}`;
        previous = parent;
        parent = parent.node.parent;
      } else {
        return previous instanceof ListParent ? `/${portions}` : portions;
      }
    }
  }

  get simpleName(): string {
    return this.constructor.name;
  }

  toString(): string {
    return `${this.location}: ${this.simpleName}`;
  }
}

export abstract class Leaf<T> extends YamlNode {
  get get(): T {
    throw new TypeException(this);
  }

  get option(): T | undefined {
    throw new TypeException(this);
  }
}

export abstract class EmptyNode<T> extends Leaf<T> {
  override get option(): T | undefined {
    return undefined;
  }

  override get string(): Leaf<string> {
    return this as unknown as Leaf<string>;
  }

  override get boolean(): Leaf<boolean> {
    return this as unknown as Leaf<boolean>;
  }

  override get int(): Leaf<number> {
    return this as unknown as Leaf<number>;
  }

  override get bigInteger(): Leaf<bigint> {
    return this as unknown as Leaf<bigint>;
  }

  override get double(): Leaf<number> {
    return this as unknown as Leaf<number>;
  }

  override get date(): Leaf<Date> {
    return this as unknown as Leaf<Date>;
  }

  override get mappingOption(): MappingNode | undefined {
    return undefined;
  }

  override get listOption(): ListNode | undefined {
    return undefined;
  }
}

export class UndefinedNode<T> extends EmptyNode<T> {
  override withParent(parent: Parent): YamlNode {
    return new UndefinedNode<T>(parent);
  }
}

export class NullNode<T> extends EmptyNode<T> {
  override withParent(parent: Parent): YamlNode {
    return new NullNode<T>(parent);
  }
}

export abstract class ValueLeaf<T> extends Leaf<T> {
  readonly content: T;

  constructor(content: T, parent: Parent) {
    super(parent);
    this.content = content;
  }

  override get get(): T {
    return this.content;
  }

  override get option(): T | undefined {
    return this.content;
  }

  override toString(): string {
    return `${this.location}: ${this.simpleName}(${String(this.content)})`;
  }
}

export class StringNode extends ValueLeaf<string> {
  override get string(): Leaf<string> {
    return this;
  }

  override withParent(parent: Parent): YamlNode {
    return new StringNode(this.content, parent);
  }

  override toString(): string {
    return `${this.location}: ${this.simpleName}("${this.content}")`;
  }
}

export class BooleanNode extends ValueLeaf<boolean> {
  override get boolean(): Leaf<boolean> {
    return this;
  }

  override withParent(parent: Parent): YamlNode {
    return new BooleanNode(this.content, parent);
  }
}

export class IntNode extends ValueLeaf<number> {
  override get int(): Leaf<number> {
    return this;
  }

  override withParent(parent: Parent): YamlNode {
    return new IntNode(this.content, parent);
  }
}

export class BigIntegerNode extends ValueLeaf<bigint> {
  override get bigInteger(): Leaf<bigint> {
    return this;
  }

  override withParent(parent: Parent): YamlNode {
    return new BigIntegerNode(this.content, parent);
  }
}

export class DoubleNode extends ValueLeaf<number> {
  override get double(): Leaf<number> {
    return this;
  }

  override withParent(parent: Parent): YamlNode {
    return new DoubleNode(this.content, parent);
  }
}

export class DateNode extends ValueLeaf<Date> {
  override get date(): Leaf<Date> {
    return this;
  }

  override withParent(parent: Parent): YamlNode {
    return new DateNode(this.content, parent);
  }
}

export class MappingNode extends YamlNode {
  private readonly children: Map<string, YamlNode>;

  constructor(children: Map<string, YamlNode>, parent: Parent) {
    super(parent);
    this.children = children;
  }

  override apply(key: string): YamlNode {
    const parent = new MappingParent(this, key);
    const child = this.children.get(key);
    return child !== undefined ? child.withParent(parent) : new UndefinedNode(parent);
  }

  toMap(): Map<string, YamlNode> {
    return new Map(
      [...this.children].map(([key, node]) => [key, node.withParent(new MappingParent(this, key))]),
    );
  }

  override get mapping(): MappingNode {
    return this;
  }

  override get mappingOption(): MappingNode | undefined {
    return this;
  }

  override withParent(parent: Parent): YamlNode {
    return new MappingNode(this.children, parent);
  }
}

export class ListNode extends YamlNode {
  private readonly items: YamlNode[];

  constructor(items: YamlNode[], parent: Parent) {
    super(parent);
    this.items = items;
  }

  toList(): YamlNode[] {
    return this.items.map((item, index) => item.withParent(new ListParent(this, index)));
  }

  override get list(): ListNode {
    return this;
  }

  override get listOption(): ListNode | undefined {
    return this;
  }

  override withParent(parent: Parent): YamlNode {
    return new ListNode(this.items, parent);
  }
}

export function parseYaml(text: string): YamlNode {
  const root: unknown = parse(text, { schema: "yaml-1.1", intAsBigInt: true, mapAsMap: true });
  return constructNode(root);
}

function constructNode(data: unknown): YamlNode {
  const parent = new EmptyParent();
  if (data === null || data === undefined) {
    return new NullNode(parent);
  }
  if (typeof data === "string") {
    return new StringNode(data, parent);
  }
  if (typeof data === "boolean") {
    return new BooleanNode(data, parent);
  }
  if (typeof data === "bigint") {
    if (data >= BigInt(Number.MIN_SAFE_INTEGER) && data <= BigInt(Number.MAX_SAFE_INTEGER)) {
      return new IntNode(Number(data), parent);
    }
    return new BigIntegerNode(data, parent);
  }
  if (typeof data === "number") {
    return new DoubleNode(data, parent);
  }
  if (data instanceof Date) {
    return new DateNode(data, parent);
  }
  if (Array.isArray(data)) {
    return new ListNode(data.map(constructNode), parent);
  }
  if (data instanceof Map) {
    const body = new Map<string, YamlNode>();
    for (const [key, value] of data) {
      if (typeof key !== "string") {
        throw new UnsupportedMappingKeyException(key, value);
      }
      body.set(key, constructNode(value));
    }
    return new MappingNode(body, parent);
  }
  throw new TypeError(String(data));
}
