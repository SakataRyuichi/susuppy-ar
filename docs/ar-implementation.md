# WebAR 実装ガイド

susuppy-ar プロジェクトにおける WebAR 実装のナレッジまとめ。

---

## 技術スタック

| ライブラリ | バージョン | 役割 |
|---|---|---|
| Astro | ^5.0.0 | フレームワーク |
| A-Frame | 1.5.0 | 3D/AR シーン管理 |
| MindAR | 1.2.5 | イメージトラッキング（AR） |
| aframe-extras | 7.5.0 | `animation-mixer`（GLBアニメーション） |
| @astrojs/vercel | ^8.0.0 | Vercel デプロイ |

---

## バージョン互換性（重要）

### A-Frame × MindAR の組み合わせ

| A-Frame | MindAR | 結果 |
|---|---|---|
| **1.5.0** | **1.2.5** | ✅ 動作する（推奨） |
| 1.6.0 | 1.2.5 | ❌ `RangeError: Extra 4316 of 4317 byte(s)` |
| 1.6.0 | 1.1.5 | ❌ `TypeError: Cannot read properties of undefined (reading 'IMAGE')` |

**必ず A-Frame 1.5.0 + MindAR 1.2.5 の組み合わせを使うこと。**

### `.mind` ファイルと MindAR バージョン

MindAR ドキュメントのオンラインコンパイラ（`hiukim.github.io/mind-ar-js-doc/tools/compile/`）は **mind-ar@1.1.5** を使用している。  
ただし、このコンパイラが生成した `.mind` ファイルは **mind-ar@1.2.5 でも読み込み可能**（どちらも内部フォーマット v2）。

---

## プロジェクト構成

```
susuppy-ar/
├── src/
│   └── pages/
│       ├── index.astro          # トップページ
│       ├── ar.astro             # AR体験ページ（本体）
│       └── model-test.astro     # 3Dモデル動作確認ページ
├── public/
│   └── ar-content/
│       ├── targets.mind         # MindAR イメージターゲット
│       ├── Meshy_AI_model_Animation_Walking_withSkin.glb  # 使用するGLBモデル
│       └── marker-preview.png   # ターゲット画像のプレビュー（確認用）
├── astro.config.mjs
└── docs/
    └── ar-implementation.md     # このファイル
```

---

## AR ページの実装

### スクリプト読み込み順序

```html
<!-- 1. A-Frame（必ず最初） -->
<script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
<!-- 2. aframe-extras（animation-mixer 用） -->
<script src="https://cdn.jsdelivr.net/gh/c-frame/aframe-extras@7.5.0/dist/aframe-extras.min.js"></script>
<!-- 3. MindAR（必ず A-Frame の後） -->
<script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js"></script>
```

Astro では `<script>` タグに **`is:inline`** ディレクティブが必要。  
（Vite によるバンドル処理を回避するため）

### A-Frame シーン構成

```html
<a-scene
  mindar-image="imageTargetSrc: /ar-content/targets.mind; autoStart: true; uiLoading: yes; uiScanning: yes; uiError: yes"
  color-space="sRGB"
  renderer="colorManagement: true, physicallyCorrectLights"
  vr-mode-ui="enabled: false"
  device-orientation-permission-ui="enabled: false"
>
  <a-assets>
    <a-asset-item id="my-model" src="/ar-content/model.glb"></a-asset-item>
  </a-assets>

  <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

  <a-entity mindar-image-target="targetIndex: 0">
    <a-gltf-model
      id="ar-model"
      src="#my-model"
      position="0 0 0"
      scale="333 333 333"
      animation-mixer="clip: *; loop: repeat"
    ></a-gltf-model>
  </a-entity>
</a-scene>
```

---

## GLBモデルの注意事項

### Meshy AI 生成モデルのスケール問題

Meshy AI が出力する GLB モデルは頂点座標が **ミリメートル単位**（約 0.001〜0.003 の範囲）で格納されている。  
A-Frame / Three.js のデフォルト単位は **1 unit = 1 メートル** のため、そのまま表示すると 2〜3mm のサイズになり視認不可能。

```
POSITION accessor の max 値例:
[0.0011, 0.0032, 0.0019]  ← 全て約 0.001〜0.003 単位
```

**対処：`scale="333 333 333"` を指定する（1/0.003 ≈ 333）**

これにより約 1m 相当のキャラクターサイズになる。

### SkinnedMesh のフラスタムカリング問題

アニメーション付きキャラクター（SkinnedMesh）は Three.js が正しいバウンディングボックスを計算できず、カメラの視野外と誤判定されて描画がスキップされる場合がある。

**対処：`model-loaded` イベントで `frustumCulled = false` を設定する**

```javascript
modelEl.addEventListener('model-loaded', (e) => {
  e.detail.model.traverse(child => {
    if (child.isSkinnedMesh || child.isMesh) {
      child.frustumCulled = false
    }
  })
})
```

### 正しいファイルの選択

Meshy AI は通常 2 つの GLB を出力する：

| ファイル名パターン | 内容 |
|---|---|
| `*_output.glb` | スケルトン（骨組み）のみ。メッシュなし → 表示されない |
| `*_withSkin.glb` | スケルトン + メッシュ + アニメーション → **こちらを使う** |

---

## イメージターゲット（`.mind` ファイル）の作成

1. MindAR ドキュメントのコンパイラを開く  
   → https://hiukim.github.io/mind-ar-js-doc/tools/compile/
2. マーカーにしたい画像をアップロード
3. 「Start」を押してコンパイル完了後、`.mind` ファイルをダウンロード
4. `public/ar-content/targets.mind` に配置

### マーカー画像の選び方

- **特徴点が多い画像**ほど認識精度が高い（ロゴ、イラスト、写真など）
- 無地・グラデーションのみの画像は認識されにくい
- コンパイル時に "image score" が表示される（高いほど良い）

### ターゲット画像の確認方法

`.mind` ファイルからマーカー画像を復元して確認できる：

```bash
node --input-type=module << 'EOF'
import { decode } from './node_modules/.pnpm/@msgpack+msgpack@2.8.0/node_modules/@msgpack/msgpack/dist/index.js';
import { readFileSync } from 'fs';
const result = decode(readFileSync('./public/ar-content/targets.mind'));
const td = result.dataList[0].trackingData[0];
console.log(`${td.width}x${td.height}`);
EOF

python3 -c "
from PIL import Image
data = open('public/ar-content/marker-preview.bin','rb').read()
Image.frombytes('L',(256,256),data).save('public/ar-content/marker-preview.png')
"
```

---

## 開発環境のセットアップ

### ローカル起動

```bash
pnpm dev --host
```

`--host` を付けることでローカルネットワーク上の端末からもアクセス可能になる。

### HTTPS でのスマートフォンテスト（必須）

カメラ API（`getUserMedia`）は **HTTPS** または `localhost` でのみ動作する。  
ローカルIPアドレス（`http://192.168.x.x`）ではカメラが起動しない。

**ngrok を使った HTTPS トンネル：**

```bash
ngrok http 4321
# → https://xxxx.ngrok-free.app が発行される
```

### Vite 6.4.x の allowedHosts 設定

Vite 6.4.1 以降はセキュリティ修正（CVE-2025-30208）により、外部ホストからのアクセスをデフォルトでブロックする。ngrok 等でアクセスする場合は `astro.config.mjs` に追加が必要：

```javascript
// astro.config.mjs
export default defineConfig({
  vite: {
    server: {
      allowedHosts: ['.ngrok-free.app', '.ngrok.io', 'localhost'],
    },
  },
})
```

---

## トラブルシューティング

### `Failed to launch / device not compatible`

**原因：** HTTP でアクセスしている  
**対処：** ngrok や Vercel などで HTTPS URL を取得してアクセスする

### `Blocked request`

**原因：** Vite の `allowedHosts` にアクセス元ホストが含まれていない  
**対処：** `astro.config.mjs` の `vite.server.allowedHosts` に追加する

### マーカーを認識するがモデルが表示されない

1. **GLBサイズの確認：** `scale="1 1 1"` のまま頂点が 0.001 前後なら scale を 300〜500 に増やす
2. **SkinnedMesh のカリング：** `frustumCulled = false` を設定する
3. **ファイル選択：** `*_withSkin.glb` を使っているか確認
4. **アニメーション：** `animation-mixer` コンポーネントを追加する

### `RangeError: Extra 4316 of 4317 byte(s)`

**原因：** A-Frame 1.6.0 は MindAR 1.2.5 と非互換  
**対処：** A-Frame を **1.5.0** にダウングレードする

---

## Vercel デプロイ

```bash
# @astrojs/vercel アダプターは既に設定済み
pnpm build
vercel --prod
```

デプロイ後は固定の HTTPS URL が得られるため、ngrok 不要でスマートフォンテストが可能。
