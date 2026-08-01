export function format(template: string, ...args: string[]): string {
  return template.replace(/%(\d+)\$s/g, (_, index: string) => args[Number(index) - 1] ?? "");
}
