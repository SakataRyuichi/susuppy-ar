# A-Frame と Three.js の比較

AR.js は A-Frame 版と Three.js 版の両方を提供している。本ドキュメントでは、パフォーマンス・実装観点を含めた両者の違いを整理する。

---

## 概要

| 項目 | A-Frame | Three.js |
|------|---------|----------|
| **性質** | 3D/VR 用フレームワーク（宣言的） | 3D グラフィックスライブラリ（命令的） |
| **レイヤー** | Three.js の上に構築された高レベル抽象化 | 低レベル API、WebGL のラッパー |
| **関係** | A-Frame は内部で Three.js を使用 | 独立したライブラリ |

---

## アーキテクチャの違い

### A-Frame
- **Entity-Component システム**: エンティティ（`<a-entity>`）にコンポーネント（`geometry`, `material` 等）を組み合わせて定義
- **宣言的**: HTML タグでシーンを記述
- **内部構造**: `<a-scene>` → Scene、`<a-entity>` → Object3D（Group/Mesh 等）と 1:1 対応

```html
<a-scene>
  <a-marker preset="hiro">
    <a-plane src="image.png" width="1" height="1"></a-plane>
  </a-marker>
  <a-entity camera></a-entity>
</a-scene>
```

### Three.js
- **命令的**: JavaScript でシーン・オブジェクト・カメラを直接操作
- **直接制御**: レンダリングループ、メッシュ、マテリアル、シェーダーを細かく制御可能

```javascript
const scene = new THREE.Scene();
const markerRoot = new THREE.Group();
const plane = new THREE.Mesh(geometry, material);
markerRoot.add(plane);
scene.add(markerRoot);
```

---

## パフォーマンス

| 観点 | A-Frame | Three.js |
|------|---------|----------|
| **オーバーヘッド** | Entity-Component の抽象化によるオーバーヘッドあり | 低レベルでオーバーヘッドが少ない |
| **大規模シーン** | オブジェクト数が多いと描画が重くなる傾向 | 細かい最適化が可能で有利 |
| **最適化の柔軟性** | 制限あり | カスタムシェーダー、ポスト処理、メモリ管理が自由 |
| **推奨** | 大量オブジェクト時は `.setObject3D()` で直接 Three.js オブジェクトを登録 | 元から Three.js で制御可能 |

### 実測例（参考）
- 60,000 以上のオブジェクトを含むシーンでは、Three.js 直接利用が A-Frame より安定した描画になる傾向
- 描画コール: メッシュ数は少なく、1 メッシュあたりのポリゴン数を増やす方が効率的な場合が多い

---

## 実装観点

### 学習曲線

| 項目 | A-Frame | Three.js |
|------|---------|----------|
| **習得難易度** | 比較的容易（HTML ベース） | やや高い（3D と JavaScript の理解が必要） |
| **前提知識** | HTML/CSS がわかれば始めやすい | 3D 座標、行列、ベクトルなどの基礎 |
| **ドキュメント** | コンポーネント中心で直感的 | API リファレンスが中心 |

### 開発速度

| 項目 | A-Frame | Three.js |
|------|---------|----------|
| **プロトタイプ** | 高速（HTML を書くだけでシーン構築） | コード量が多くなりがち |
| **カスタマイズ** | コンポーネントの拡張が必要 | 直接 API を呼び出して実装可能 |
| **React との統合** | `react-aframe` や `useRef` で DOM にマウント | より自然に統合しやすい |

### コード量の目安

| タスク | A-Frame | Three.js |
|--------|---------|----------|
| シンプルなマーカー AR | 10〜20 行（HTML） | 50〜100 行（JS） |
| カスタムマーカー + 動画 | コンポーネント追加が必要 | 直接制御で実装可能 |

---

## AR.js との組み合わせ

### AR.js + A-Frame
- **ビルド**: `aframe-ar.js` または `aframe-ar-nft.js`（イメージトラッキング）
- **用途**: マーカー AR の素早いプロトタイプ、デモ
- **メリット**: 記述が簡単、AR.js のドキュメント・サンプルが多く A-Frame 向け

### AR.js + Three.js
- **ビルド**: `ar.js` または `ar-nft.js`
- **用途**: 細かい制御、既存の Three.js プロジェクトへの組み込み
- **メリット**: パフォーマンス・カスタマイズ性が高い

### ハイブリッド
A-Frame 内から `.object3D` や `.setObject3D()` で Three.js オブジェクトにアクセス・操作できる。A-Frame の簡易さと Three.js の制御力を併用可能。

---

## 選定の目安

| 条件 | 推奨 |
|------|------|
| 素早くプロトタイプを作りたい | **A-Frame** |
| マーカー AR のデモ・小規模アプリ | **A-Frame** |
| 既存の Three.js / React プロジェクトに AR を追加 | **Three.js** |
| 高度なパフォーマンス最適化が必要 | **Three.js** |
| カスタムシェーダー・ポスト処理を使う | **Three.js** |
| HTML ベースで開発したい | **A-Frame** |
| オブジェクト数が非常に多い | **Three.js** |

---

## 本プロジェクト（meiji-ar）への推奨

**要件**: マーカー検出で画像・動画を表示

| フェーズ | 推奨 | 理由 |
|----------|------|------|
| **プロトタイプ** | A-Frame | 実装が早く、AR.js のサンプルが豊富 |
| **本番・最適化** | Three.js または A-Frame + Three.js の併用 | 動画再生やパフォーマンス最適化が必要な場合 |

**→ 本プロジェクトの選定結果**: React アプリ統合・将来的な拡張・方針変更不可を考慮し、**Three.js を採用**。詳細は [07-rendering-decision.md](./07-rendering-decision.md) を参照。
