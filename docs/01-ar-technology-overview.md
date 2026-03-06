# Web AR 技術調査 - 概要

## 調査日
2025年3月2日

## 目的
React + Web環境で拡張現実（AR）アプリケーションを構築するための技術選定のための調査

## Web ARの基本

Web ARとは、アプリのインストールなしでブラウザ上で動作する拡張現実体験のことです。主に以下の2つのアプローチがあります。

### 1. WebXR Device API（標準規格）
- W3CのImmersive Web Community Groupが策定
- ブラウザネイティブのAR/VR API
- デバイス非依存の標準的なアプローチ

### 2. プロプライエタリSDK
- 8th Wall（Niantic）など
- 独自のSLAM実装により、WebXR非対応デバイスでも動作
- より広いデバイスサポート

## 本プロジェクトの制約

- **対象デバイス**: iOS / Android
- **動作保証**: 各プラットフォームの**デフォルトブラウザ**で動作すること
  - iOS: Safari（WebXR非対応）
  - Android: Chrome または Samsung Internet（WebXR対応）

この制約により、**WebXRのみに依存するライブラリ（@react-three/xr等）は採用不可**。iOS Safari対応のため、WebXR非依存のソリューション（model-viewer、8th Wall、AR.js）が必須となります。

> **Safari WebXR 検証**: 2025年3月2日時点で iOS Safari は WebXR 非対応のまま。詳細は [02-webxr-and-libraries.md](./02-webxr-and-libraries.md#safari-webxr対応状況の検証記録) を参照。

## 技術選定の観点

| 観点 | 説明 |
|------|------|
| デフォルトブラウザ対応 | iOS Safari + Androidデフォルトブラウザで動作するか |
| React統合 | Reactコンポーネントとして扱えるか |
| 学習コスト | ドキュメント・コミュニティの充実度 |
| ライセンス・コスト | 商用利用の可否と料金 |
| 機能 | マーカーAR、ワールドトラッキング、フェイストラッキング等 |

## AR機能要件（本プロジェクト）

- 特定のマーカーを参照し、マーカーを検出したら**画像**または**動画**を表示する
- 詳細は [05-ar-requirements.md](./05-ar-requirements.md) を参照

## 関連ドキュメント

- [02-webxr-and-libraries.md](./02-webxr-and-libraries.md) - WebXRと主要ライブラリの詳細
- [03-react-ar-solutions.md](./03-react-ar-solutions.md) - React向けARソリューション
- [04-comparison-and-recommendation.md](./04-comparison-and-recommendation.md) - 比較と推奨
- [05-ar-requirements.md](./05-ar-requirements.md) - AR要件定義と推奨ソリューション
- [06-aframe-vs-threejs.md](./06-aframe-vs-threejs.md) - A-Frame と Three.js の比較（パフォーマンス・実装観点）
- [07-rendering-decision.md](./07-rendering-decision.md) - レンダリング方式の選定結果（Three.js 採用）
