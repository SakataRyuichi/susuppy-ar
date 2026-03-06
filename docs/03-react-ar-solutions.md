# React向けARソリューション

## 1. @react-three/xr（推奨）

### 概要
React Three Fiber（R3F）アプリにAR/VR機能を追加する公式的なソリューション。Poimandresエコシステムの一部。

### 特徴
- **React Three Fiberとの完全統合**: JSXで3Dシーンを記述
- **createXRStore()**: セッション管理を簡素化
- **インタラクション**: タッチ、ポインティング、クリック対応
- **チュートリアル充実**: インタラクション、オブジェクト検出、ヒットテスト、アンカー等

### 基本的な使い方

```tsx
import { Canvas } from '@react-three/fiber'
import { XR, createXRStore } from '@react-three/xr'
import { useState } from 'react'

const store = createXRStore()

export function App() {
  const [red, setRed] = useState(false)
  return (
    <>
      <button onClick={() => store.enterAR()}>Enter AR</button>
      <Canvas>
        <XR>
          <mesh
            onClick={() => setRed(!red)}
            position={[0, 1, -1]}
          >
            <boxGeometry />
            <meshBasicMaterial color={red ? 'red' : 'blue'} />
          </mesh>
        </XR>
      </Canvas>
    </>
  )
}
```

### サポート機能
- ヒットテスト（平面検出）
- アンカー
- DOMオーバーレイ
- ゲームパッド
- カスタムコントローラー/ハンドトラッキング

### 制限
- **WebXRに依存**: iOS Safariでは動作しない
- Android Chrome、Meta Quest等で利用可能

---

## 2. model-viewer + React

### 概要
Googleの`<model-viewer>`をReactでラップして使用。3Dモデル表示とARに特化。

### 特徴
- **クロスプラットフォームAR**: WebXR（Android）、Quick Look（iOS）
- **シンプル**: 複雑な3Dシーン不要なら最適
- **軽量**: コンポーネント単体で完結

### Reactでの使用例

```tsx
import '@google/model-viewer'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string
          ar?: boolean
          'ar-modes'?: string
          'camera-controls'?: boolean
          'auto-rotate'?: boolean
        },
        HTMLElement
      >
    }
  }
}

export function ModelViewerAR({ src }: { src: string }) {
  return (
    <model-viewer
      src={src}
      ar
      ar-modes="webxr scene-viewer quick-look"
      camera-controls
      auto-rotate
    />
  )
}
```

### 適したユースケース
- 商品の3DモデルをARで表示
- 教育コンテンツ（解剖モデル等）
- シンプルなAR体験

---

## 3. 8th Wall（Niantic）

### 概要
商用WebARプラットフォーム。WebXR非対応のiOS Safariでも動作する独自エンジンを提供。

### 特徴
- **広いデバイスサポート**: 50億台以上のスマートフォン、Quest、Vision Pro等
- **ワールドトラッキング**: SLAMベースの平面検出
- **イメージターゲット**: 画像認識によるAR
- **フェイスエフェクト**: 顔メッシュ、メガネ・アクセサリーのアンカー
- **スカイエフェクト**: 空のセグメンテーション

### 料金（2024年）
- **無料ティア**: 非商用、8th Wallスプラッシュ画面表示必須
- **Pro**: $99/月（商用、スプラッシュ削除）
- **Enterprise**: $700/月〜

### Reactとの統合
- 8th Wallは主にVanilla JS/Three.js向け
- Reactプロジェクトに組み込む場合は、`useEffect`で8th Wallスクリプトを読み込み、Three.jsシーンを連携する形が一般的

### 適したユースケース
- **iOS対応が必須**の商用プロジェクト
- フェイスフィルター、ワールドトラッキングAR
- 大規模ブランドキャンペーン

---

## 4. AR.js（本プロジェクト推奨）

### 概要
オープンソースのマーカー/イメージトラッキングAR。Reactとの直接統合は少ないが、A-FrameやThree.js経由で利用可能。

### 特徴
- **完全無料・オープンソース**
- **iOS Safari対応**: WebXR不要
- **マーカー検出で表示可能なコンテンツ**: 2D画像、GIF、2D動画、3Dモデル

### マーカー方式
- **マーカートラッキング**: Hiro、バーコード、カスタムパターン（.pattファイル）
- **イメージトラッキング（NFT）**: 任意の画像をマーカーとして使用可能

### Reactでの利用
- `react-aframe`や、`useRef`でDOMにA-Frame/Three.jsシーンをマウントする形で組み込み可能
- やや手間がかかる

### 適したユースケース
- **特定マーカーを検出し、画像・動画を表示するAR**（本プロジェクトの要件に合致）
- 教育、展示会、印刷物連動AR
- 予算制約が厳しいプロジェクト
