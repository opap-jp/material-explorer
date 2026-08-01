# 5. レガシーなテクノロジースタックを刷新する

日付: 2026-08-02

## 状態

Accepted

## 前提

このシステムの開発の開始（2017 年）から約 9 年が経過し、当時導入されたテクノロジーの多くがレガシーなものとなりました。

- REST サーバーの Scala 2.12 と Akka HTTP（Akka は 2022 年に BSL ライセンスへ変更）
- フロントエンドの Vue 2（2023 年末に EOL）、Vue CLI（保守モード）、node-sass（廃止）、Semantic UI（開発停止、CDN からの直接読み込み）
- サムネイル生成サーバーの Python 3.8（EOL）と Flask 0.10（2013 年リリース）
- MongoDB 3.4（EOL）
- CI の Travis CI（travis-ci.org はサービス終了）

また、将来のホスティング先として Cloudflare を想定することとなりました。

## 決定

現行のレガシーなテクノロジーを一括で置き換えます。

- **基本のコンセプト**: クラウドネイティブ、12 Factor App、ただし開発のためにほぼ完全にローカルで完結して実行できること。ベンダー固有のコードは局所化し、dependency injection（コンストラクタ注入。DI コンテナは採用しません）を活用します。
- **クラウドプラットフォーム**: ホスティングは Cloudflare をベースとします。ただし、今回の刷新では本番デプロイ対応は行なわず、Cloudflare API を呼ぶコードは含めません。
- **バックエンド**（`backend/`）: JVM を廃止し、TypeScript 7 + Hono を採用します。Cloudflare Workers での動作を前提としたコード制約（Web 標準 API のみ、環境依存はエントリポイントで注入）を課し、ローカルでは Node.js（@hono/node-server）で実行します。
- **データベース**: MongoDB を廃止し、SQLite（将来は Cloudflare D1）を用います。クエリービルダー・マイグレーション管理には Drizzle を用います。バイナリ（原本キャッシュ・サムネイル）はデータベースに置かず、オブジェクトストレージ（将来は Cloudflare R2、ローカルではファイルシステム実装）に置きます。
- **リポジトリ更新バッチ**（`batch/`）: Workers の実行時間制限と相性が悪いため、Workers 前提とせず、長時間実行可能な単発の Node.js プロセスとして分離します（将来はコンテナ実行）。進捗は progress テーブルを介して backend の SSE（`GET /progress`）へ伝達します。
- **フロントエンド**（`frontend/`）: Vue 2 を廃止し、React + React Router（Framework Mode）による SSR を採用します。Semantic UI と SCSS を廃止し、Tailwind CSS をベースとします。API ホストはビルド時埋め込みをやめ、実行時に環境変数から参照します。
- **im**: pdf / ai のサムネイル生成に ghostscript 相当が必要であり、Workers 内での完結が非現実的なため、廃止せず Python のまま刷新します（Python 3.13、Flask 3、gunicorn、ImageMagick 7）。
- **モノレポ構成**: TypeScript のパッケージ（core / backend / frontend / batch）は pnpm workspaces で管理し、共有コード（ドメインモデル、ストレージ抽象）は `core/` に置きます。
- **CI**: Travis CI を廃止し、GitHub Actions に置き換えます。
- **Docker 構成**: テスト用の Docker Compose 構成は廃止し、開発用（im のみをコンテナ起動）の 1 本とします。

機能・挙動は現状維持とし、データ移行は行ないません（データベースの内容は Git リポジトリから再構築可能なため）。

## 影響

- 旧実装（`rest/`, `web/`）は新実装の検証が完了するまで残置され、その後削除されます。Travis CI の設定、Makefile なども同じタイミングで削除されます。
- JVM（sbt）と yarn のビルド環境は不要になり、Node.js 26+ と pnpm、Docker があれば開発できます。
- 設定ファイル（manifest.yaml, repositories.yaml）の形式と警告収集の挙動、REST API のワイヤフォーマットは現行と互換です。
- `GET /progress` は、現行ではプロセス分断により実際には進捗を配信できていませんでしたが、progress テーブルを介することで実際に配信されるようになります。
- 将来のクラウドデプロイ対応では、D1 / R2 のアダプタ追加（batch からは S3 互換 API）と、Workers エントリポイントの追加が主な作業になります。
