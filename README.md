# Material Explorer

[![Build Status](https://travis-ci.org/opap-jp/material-explorer.svg)](https://travis-ci.org/opap-jp/material-explorer)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/opap-jp/material-explorer/blob/master/LICENSE)
[![Rocket.Chat](https://open.rocket.chat/images/join-chat.svg)](https://chat.opap.jp/channel/material-explorer)

マイクロサービスアーキテクチャによる素材検索ウェブシステム

1. [**opap-jp/material-explorer**](https://github.com/opap-jp/material-explorer):  
  [![Build](https://travis-ci.org/opap-jp/material-explorer.svg)](https://travis-ci.org/opap-jp/material-explorer)
  ![Coverage](https://img.shields.io/badge/coverage-N%2FA-lightgrey.svg)  
  素材検索システムの Docker 構成とドキュメントを管理するリポジトリです。
1. [**opap-jp/material-explorer-rest**](https://github.com/opap-jp/material-explorer-rest):  
  [![Build](https://travis-ci.org/opap-jp/material-explorer-rest.svg)](https://travis-ci.org/opap-jp/material-explorer-rest)
  [![Coverage](https://codecov.io/gh/opap-jp/material-explorer-rest/branch/develop/graph/badge.svg)](https://codecov.io/gh/opap-jp/material-explorer-rest)    
  素材検索システムの REST サービスです。
1. [**opap-jp/material-explorer-web**](https://github.com/opap-jp/material-explorer-web):  
  [![Build](https://travis-ci.org/opap-jp/material-explorer-web.svg)](https://travis-ci.org/opap-jp/material-explorer-web)
  ![Coverage](https://img.shields.io/badge/coverage-0%25-lightgrey.svg)  
  クライアントに対して静的なファイルを公開するサービスです。
1. [**opap-jp/material-explorer-im**](https://github.com/opap-jp/material-explorer-im):  
  [![Coverage](https://codecov.io/gh/opap-jp/material-explorer-im/branch/develop/graph/badge.svg)](https://codecov.io/gh/opap-jp/material-explorer-im)  
  さまざまな形式の画像のリサイズを行なう REST サービスです。

## ドキュメント

- [ドキュメント](doc)

## アーキテクチャ決定記録

- [アーキテクチャ決定記録](doc/adr)

このプロジェクトでは、**軽量なアーキテクチャ決定記録**を導入しています。
これを読むことで、このプロジェクトがどのような決定を経て、どのように変化して来たかがわかるでしょう。
