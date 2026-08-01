export type Either<L, R> =
  | { readonly tag: "left"; readonly value: L }
  | { readonly tag: "right"; readonly value: R };

export function left<L, R>(value: L): Either<L, R> {
  return { tag: "left", value };
}

export function right<L, R>(value: R): Either<L, R> {
  return { tag: "right", value };
}

export function lefts<L, R>(items: readonly Either<L, R>[]): L[] {
  return items.flatMap((item) => (item.tag === "left" ? [item.value] : []));
}

export function rights<L, R>(items: readonly Either<L, R>[]): R[] {
  return items.flatMap((item) => (item.tag === "right" ? [item.value] : []));
}

export function groupByOrdered<T, P>(items: readonly T[], f: (item: T) => P): [P, T[]][] {
  const groups = new Map<P, T[]>();
  for (const item of items) {
    const key = f(item);
    const group = groups.get(key);
    if (group !== undefined) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return [...groups];
}
