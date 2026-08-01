# 4. サービスごとのリポジトリを単一のリポジトリに戻す

日付: 2021-04-23

## 状態

Accepted

## 前提

[2. プロジェクトをサービスごとのリポジトリに分割する](0002-split-project-into-repositories-each-service.md)では、Travis CI がリポジトリで単一のプログラミング言語が使われることを前提としているため、プロジェクトをサービスごとのリポジトリ（[opap-jp/material-explorer-rest](https://github.com/opap-jp/material-explorer-rest)，[opap-jp/material-explorer-web](https://github.com/opap-jp/material-explorer-web)，[opap-jp/material-explorer-im](https://github.com/opap-jp/material-explorer-im)）に分割することを決定しました。

その後、 GitHub Actions が登場し、単一のプログラミング言語を扱うリポジトリしか CI に適さないという前提は成立しなくなりました。

## 決定

opap-jp/material-explorer-rest，opap-jp/material-explorer-web，opap-jp/material-explorer-im の内容を opap-jp/material-explorer に再統合し、単一のリポジトリ（モノリポジトリ）で管理します。

## 影響

- `rest/`, `web/`, `im/` の各サービスのソースは、opap-jp/material-explorer で一元管理されます。
- Docker Compose の設定ファイルは、各サービスの GitHub リポジトリではなく、リポジトリ内の各サービスのディレクトリを参照します。
- 複数のサービスにまたがる変更を、単一のコミットやプルリクエストで行なえます。（ADR 0002 の「影響」で予見されていた、リモートリポジトリを更新することなく複数のサービスを同時に編集するような開発の困難が解消されます。）
- 分割先の各リポジトリは更新されなくなります。
