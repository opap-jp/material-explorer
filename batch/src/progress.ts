import type { ProgressStore } from "@material-explorer/core";

export class ProgressReporter {
  private readonly store: ProgressStore;
  private readonly id: string;
  private current = 0;
  private max = 0;
  private name = "";

  constructor(store: ProgressStore) {
    this.store = store;
    this.id = crypto.randomUUID();
  }

  begin(): void {
    this.store.begin(this.id);
  }

  beginRepository(name: string, max: number): void {
    this.current = 0;
    this.max = max;
    this.name = name;
    this.store.update(this.id, { current: 0, max, processing: "", name });
  }

  advance(processing: string): void {
    this.current += 1;
    this.store.update(this.id, { current: this.current, max: this.max, processing, name: this.name });
  }

  finish(): void {
    this.store.finish(this.id);
  }
}
