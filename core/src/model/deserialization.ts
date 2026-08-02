import { type Either, left, right } from "../data/collections.ts";
import { format } from "../data/strings.ts";
import {
  EmptyNode,
  MappingParent,
  TypeException,
  UnsupportedMappingKeyException,
  YamlException,
  type YamlNode,
} from "../yaml/index.ts";
import type { Warning } from "./warning.ts";

export const WARNING_NODE_TYPE_INVALID = "%1$s - 要素の型が不正です。";
export const WARNING_KEY_REQUIRED = "%1$s が必要です。";
export const WARNING_UNSUPPORTED_MAPPING_KEY = "対応していない形式のキーを持つマッピングがあります。";

/**
 * デシリアライズで発生する、特定の要素（グローバル，リポジトリ，コンポーネント）に関連づけられるべき例外です。
 */
export class DeserializationException extends Error {
  /** この例外の原因となったノード（任意） */
  readonly focus: YamlNode | undefined;

  constructor(message: string, focus?: YamlNode) {
    super(message);
    this.focus = focus;
  }
}

export type ExceptionContext =
  | { readonly type: "global" }
  | { readonly type: "repository"; readonly id: string }
  | { readonly type: "component"; readonly id: string };

export const GlobalContext: ExceptionContext = { type: "global" };

export function withWarning<T>(context: ExceptionContext, supplier: () => T): Either<Warning, T> {
  try {
    return right(supplier());
  } catch (e) {
    if (e instanceof YamlException) {
      return left(messageFromYaml(e, context));
    }
    if (e instanceof DeserializationException) {
      return left(messageFromDeserialization(e, context));
    }
    throw e;
  }
}

export function withWarnings<T>(
  context: ExceptionContext,
  supplier: () => [Warning[], T],
): [Warning[], T | undefined] {
  try {
    const [warnings, value] = supplier();
    return [warnings, value];
  } catch (e) {
    if (e instanceof YamlException) {
      return [[messageFromYaml(e, context)], undefined];
    }
    if (e instanceof DeserializationException) {
      return [[messageFromDeserialization(e, context)], undefined];
    }
    throw e;
  }
}

function messageFromYaml(exception: YamlException, context: ExceptionContext): Warning {
  const nonMapping = (node: YamlNode) =>
    `${node.location}: ${format(WARNING_NODE_TYPE_INVALID, node.simpleName)}`;

  let message: string;
  if (exception instanceof TypeException) {
    const node = exception.node;
    if (node instanceof EmptyNode && node.parent instanceof MappingParent) {
      message = `${node.parent.node.location}: ${format(WARNING_KEY_REQUIRED, node.parent.key)}`;
    } else {
      message = nonMapping(node);
    }
  } else if (exception instanceof UnsupportedMappingKeyException) {
    message = WARNING_UNSUPPORTED_MAPPING_KEY;
  } else {
    message = exception.message;
  }
  return toWarning(context, message);
}

function messageFromDeserialization(e: DeserializationException, context: ExceptionContext): Warning {
  const location = e.focus !== undefined ? `${e.focus.location}: ` : "";
  return toWarning(context, location + e.message);
}

function toWarning(context: ExceptionContext, message: string): Warning {
  const id = crypto.randomUUID();
  switch (context.type) {
    case "global":
      return { type: "global", id, message, caused: undefined };
    case "repository":
      return { type: "repository", id, message, caused: undefined, repositoryId: context.id };
    case "component":
      return { type: "component", id, message, caused: undefined, componentId: context.id };
  }
}
