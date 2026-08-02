export interface Progress {
  readonly current: number;
  readonly max: number;
  readonly processing: string;
  readonly name: string;
}
