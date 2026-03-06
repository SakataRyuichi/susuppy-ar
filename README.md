# Meiji AR

React + Web環境で動作する拡張現実（AR）アプリケーション

## 技術スタック

- **React** - UIフレームワーク
- **TypeScript** - 型安全な開発
- **Vite** - ビルドツール
- **pnpm** - パッケージマネージャー
- **Tailwind CSS** - ユーティリティファーストCSS
- **Biome** - リンター・フォーマッター

## セットアップ

```bash
pnpm install
```

## 開発

```bash
pnpm dev
```

**注意**: カメラアクセスのため、HTTPS または localhost で実行してください。

## AR の使い方

1. ブラウザでアプリを開く（localhost または HTTPS）
2. カメラの使用を許可する
3. [Hiro マーカー](https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/images/hiro.png) を画面に表示する（印刷または別デバイスで表示）
4. マーカーを検出すると画像が表示されます

## ビルド

```bash
pnpm build
```

## リント・フォーマット

```bash
pnpm lint    # リントチェック
pnpm format  # コードフォーマット
```

## 技術調査

AR関連の技術調査ドキュメントは [docs/](./docs/) ディレクトリにあります。

- [01-ar-technology-overview.md](./docs/01-ar-technology-overview.md) - 概要
- [02-webxr-and-libraries.md](./docs/02-webxr-and-libraries.md) - WebXRとライブラリ
- [03-react-ar-solutions.md](./docs/03-react-ar-solutions.md) - React向けARソリューション
- [04-comparison-and-recommendation.md](./docs/04-comparison-and-recommendation.md) - 比較と推奨
