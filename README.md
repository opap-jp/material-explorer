# Material Explorer

[![Build Status](https://travis-ci.org/opap-jp/material-explorer.svg)](https://travis-ci.org/opap-jp/material-explorer)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/opap-jp/material-explorer/blob/master/LICENSE)
[![Rocket.Chat](https://open.rocket.chat/images/join-chat.svg)](https://chat.opap.jp/channel/material-explorer)

マイクロサービスアーキテクチャによる素材検索ウェブシステム

<table>
  <thead>
    <tr>
      <th style="text-align: center">リポジトリ</th>
      <th style="text-align: center">ビルド</th>
      <th style="text-align: center">カバレッジ</th>
      <th style="text-align: center">説明</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="https://github.com/opap-jp/material-explorer">opap-jp/material-explorer</a></td>
      <td><a href="https://travis-ci.org/opap-jp/material-explorer"><img src="https://travis-ci.org/opap-jp/material-explorer.svg"></a></td>
      <td><img src="https://img.shields.io/badge/coverage-N%2FA-lightgrey.svg"></td>
      <td>素材検索システムの Docker 構成とドキュメントを管理するリポジトリです。</td>
    </tr>
    <tr>
      <td><a href="https://github.com/opap-jp/material-explorer-rest">opap-jp/material-explorer-rest</a></td>
      <td><a href="https://travis-ci.org/opap-jp/material-explorer-rest"><img src="https://travis-ci.org/opap-jp/material-explorer-rest.svg"></a></td>
      <td><a href="https://codecov.io/gh/opap-jp/material-explorer-rest"><img src="https://codecov.io/gh/opap-jp/material-explorer-rest/branch/develop/graph/badge.svg"></a></td>
      <td>素材検索システムの REST サービスです。</td>
    </tr>
    <tr>
      <td><a href="https://github.com/opap-jp/material-explorer-web">opap-jp/material-explorer-web</a></td>
      <td><a href="https://travis-ci.org/opap-jp/material-explorer-web"><img src="https://travis-ci.org/opap-jp/material-explorer-web.svg"></a></td>
      <td><img src="https://img.shields.io/badge/coverage-0%25-lightgrey.svg"></td>
      <td>クライアントに対して静的なファイルを公開するサービスです。</td>
    </tr>
    <tr>
      <td><a href="https://github.com/opap-jp/material-explorer-im">opap-jp/material-explorer-im</a></td>
      <td><a href="https://travis-ci.org/opap-jp/material-explorer-im"><img src="https://travis-ci.org/opap-jp/material-explorer-im.svg"></a></td>
      <td><img src="https://img.shields.io/badge/coverage-0%25-lightgrey.svg"></td>
      <td>さまざまな形式の画像のリサイズを行なう REST サービスです。</td>
    </tr>
  </tbody>
</table>

## ドキュメント

- [ドキュメント](doc)

## アーキテクチャ決定記録

- [アーキテクチャ決定記録](doc/adr)

このプロジェクトでは、**軽量なアーキテクチャ決定記録**を導入しています。
これを読むことで、このプロジェクトがどのような決定を経て、どのように変化して来たかがわかるでしょう。
