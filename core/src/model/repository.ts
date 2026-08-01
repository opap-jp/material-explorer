/**
 * 取得されたリポジトリを表現する型です。
 *
 * headHash - このリポジトリの HEAD のコミットハッシュ
 */
// TODO: name は必要か？（GitLab でしか使わない）
export interface Repository {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly headHash: string;
}
