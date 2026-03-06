# WebXR Device API と主要ライブラリ

## WebXR Device API

### 概要
WebXR Device APIは、VR/ARデバイスにアクセスするためのW3C標準APIです。WebGLコンテキストと連携し、没入型体験を実現します。

### ブラウザサポート（2024-2025年時点）

| ブラウザ | サポート状況 | 備考 |
|----------|--------------|------|
| Chrome (Android) | 部分的サポート（AR利用可能） | Androidの多くでデフォルト |
| Samsung Internet (Android) | 部分的サポート | Samsung端末のデフォルト |
| Chrome (Desktop) | 部分的サポート | - |
| Edge | 部分的サポート | - |
| Opera | 部分的サポート | - |
| **Safari (iOS)** | **非対応**（WebXR未実装） | **iOSのデフォルトブラウザ** |
| Firefox | デフォルト無効 | - |

#### Safari WebXR対応状況の検証記録

| 項目 | 内容 |
|------|------|
| **検証日時** | 2025年3月2日 |
| **iOS Safari（iPhone/iPad）** | **非対応**（現時点で変更なし） |
| **visionOS Safari（Apple Vision Pro）** | 対応（`immersive-vr` のみ、`immersive-ar` は非対応） |

**検証ソース**:
- [Can I use - WebXR Device API](https://caniuse.com/webxr): Safari on iOS 26.4 時点で Not supported
- [WebKit Features in Safari 18.2](https://webkit.org/blog/16301/webkit-features-in-safari-18-2/): WebXRの記載は visionOS 2.2 のみ。iOS/iPadOS 向けの WebXR 実装は言及なし
- [WebKit Bug 208988 - Implement WebXR device API](https://bugs.webkit.org/show_bug.cgi?id=208988): iOS 向け WebXR 実装の要望チケットが存在（未解決）

**結論**: iOS の iPhone/iPad における Safari は、2025年3月時点でも WebXR をサポートしていない。Apple Vision Pro（visionOS）の Safari のみ WebXR に対応しており、かつ VR セッション（`immersive-vr`）のみで、AR セッション（`immersive-ar`）は未対応。

---

**重要**: iOSのSafariはWebXRをサポートしていません。iOSのデフォルトブラウザでARを実現するには、WebXRに依存しない以下のいずれかが必要です：

- **8th Wall**: 独自ARエンジン（Safari内で直接動作）
- **model-viewer**: Quick Look連携（SafariからネイティブARビューアへ遷移）
- **AR.js**: マーカーベース（WebXR不要、Safari内で動作）

### 主要なWebXRベースライブラリ

#### 1. @pmndrs/xr / @react-three/xr
- **提供元**: Poimandres（React Three Fiberの開発チーム）
- **特徴**: Three.js/React Three FiberアプリをAR/VR対応に変換
- **週間ダウンロード**: 約19,000（@pmndrs/xr）
- **GitHub Stars**: 約2,570（pmndrs/xr）
- **ライセンス**: MIT

```bash
# React Three Fiber用
pnpm add three @react-three/fiber @react-three/xr

# Vanilla Three.js用
pnpm add three @pmndrs/xr
```

#### 2. Three.js + WebXR
- GoogleのARCoreドキュメントで推奨される基本的なアプローチ
- `WebGLRenderer`の`xr`プロパティを使用
- 低レベルだが柔軟性が高い

#### 3. XR Blocks（Google）
- WebXR + WebAIの軽量ライブラリ
- プロトタイピング向け
- AI連携機能あり

#### 4. model-viewer（Google）
- Webコンポーネント形式
- glTF/glbモデルの表示とAR
- **ARモード**: WebXR（Android）、Quick Look（iOS）、Scene Viewer（Android）
- 3Dモデル表示に特化したシンプルなソリューション

```html
<model-viewer src="model.glb" ar auto-rotate camera-controls></model-viewer>
```

## マーカーベースAR

### AR.js
- **オープンソース**のマーカーベースARライブラリ
- A-Frame、Three.jsと連携
- パターンマーカー、バーコードマーカー、Hiroマーカーをサポート
- WebXR不要（独自の画像認識）
- **iOS Safariでも動作可能**

### 用途
- 印刷物（ポスター、パッケージ）をトリガーにしたAR
- マーカー画像のスキャンで3Dコンテンツ表示
