/**
 * リポジトリデータの処理の過程で生じる警告を表現する型です。
 */
export type Warning = GlobalWarning | RepositoryWarning | ComponentWarning;

/**
 * グローバルレベルで生じる警告を表現する型です。
 */
export interface GlobalWarning {
  readonly type: "global";
  readonly id: string;
  readonly message: string;

  /**
   * この警告が、例外が発生したことによるものであるとき、その例外のメッセージ
   */
  readonly caused: string | undefined;
}

/**
 * リポジトリに関連して生じる警告を表現する型です。
 */
export interface RepositoryWarning {
  readonly type: "repository";
  readonly id: string;
  readonly message: string;
  readonly caused: string | undefined;

  /** リポジトリID */
  readonly repositoryId: string;
}

/**
 * コンポーネント（ファイルやディレクトリ）に関連して生じる警告を表現する型です。
 */
export interface ComponentWarning {
  readonly type: "component";
  readonly id: string;
  readonly message: string;
  readonly caused: string | undefined;

  /** コンポーネントID */
  readonly componentId: string;
}

export function globalWarning(message: string, caused?: string): GlobalWarning {
  return { type: "global", id: crypto.randomUUID(), message, caused };
}
