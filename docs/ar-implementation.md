# WebAR 実装ガイド

susuppy-ar プロジェクトにおける WebAR 実装の完全なナレッジまとめ。

---

## 技術スタック

| ライブラリ | バージョン | 役割 |
|---|---|---|
| Astro | ^5.0.0 | フレームワーク |
| A-Frame | **1.5.0** | 3D/AR シーン管理（バージョン固定必須） |
| MindAR | **1.2.5** | イメージトラッキング（AR） |
| aframe-extras | 7.5.0 | `animation-mixer`（GLBアニメーション再生） |
| @astrojs/vercel | ^8.0.0 | Vercel デプロイアダプター |

---

## バージョン互換性（重要）

### A-Frame × MindAR の組み合わせ

| A-Frame | MindAR | 結果 |
|---|---|---|
| **1.5.0** | **1.2.5** | ✅ 動作する（唯一の推奨構成） |
| 1.6.0 | 1.2.5 | ❌ `RangeError: Extra 4316 of 4317 byte(s) found at buffer[1]` |
| 1.6.0 | 1.1.5 | ❌ `TypeError: Cannot read properties of undefined (reading 'IMAGE')` |

### `.mind` ファイルと MindAR ランタイムのバージョン

- MindAR ドキュメントのオンラインコンパイラは **mind-ar@1.1.5** を使用している
- しかし生成される `.mind` ファイルは内部フォーマット v2 で **mind-ar@1.2.5 でも読み込み可能**
- どちらのバージョンで生成したファイルでも 1.2.5 ランタイムで動作する

---

## プロジェクト構成

```
susuppy-ar/
├── src/
│   └── pages/
│       ├── index.astro          # トップページ
│       ├── ar.astro             # AR体験ページ（本体）
│       └── model-test.astro     # 3Dモデル単体確認ページ（開発用）
├── public/
│   └── ar-content/
│       ├── targets.mind         # MindAR イメージターゲット
│       ├── Meshy_AI_model_Animation_Walking_withSkin.glb  # キャラクターモデル
│       └── marker-preview.png   # ターゲット画像プレビュー（.mindから復元）
├── astro.config.mjs
├── vercel.json                  # ヘッダー設定（COOP/COEPは絶対に入れない）
└── docs/
    └── ar-implementation.md     # このファイル
```

---

## AR ページの実装

### スクリプト読み込み順序（順番厳守）

```html
<!-- 1. A-Frame（必ず最初） -->
<script is:inline src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
<!-- 2. aframe-extras（animation-mixer 用、A-Frame の後） -->
<script is:inline src="https://cdn.jsdelivr.net/gh/c-frame/aframe-extras@7.5.0/dist/aframe-extras.min.js"></script>
<!-- 3. MindAR（必ず A-Frame の後） -->
<script is:inline src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js"></script>
<!-- 4. カスタム A-Frame コンポーネント（MindAR の後） -->
<script is:inline>
  AFRAME.registerComponent('smooth-track', { ... })
</script>
```

> **Astro での注意：** `<script>` タグには必ず **`is:inline`** ディレクティブを付ける。  
> 付けないと Vite がバンドル処理しようとしてエラーになる。

### A-Frame シーン構成（全パラメータ説明付き）

```html
<a-scene
  mindar-image="
    imageTargetSrc: /ar-content/targets.mind;
    autoStart: true;
    uiLoading: yes; uiScanning: yes; uiError: yes;
    filterMinCF: 0.001;
    filterBeta: 0.01;
    missTolerance: 10;
    warmupTolerance: 3"
  color-space="sRGB"
  renderer="colorManagement: true, physicallyCorrectLights"
  vr-mode-ui="enabled: false"
  device-orientation-permission-ui="enabled: false"
>
  <a-assets>
    <a-asset-item id="my-model" src="/ar-content/model.glb"></a-asset-item>
  </a-assets>

  <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

  <!-- smooth-track を付けて位置ブレを追加平滑化 -->
  <a-entity mindar-image-target="targetIndex: 0" smooth-track="factor: 0.15">
    <a-gltf-model
      id="ar-model"
      src="#my-model"
      position="0 0 0"
      scale="999 999 999"
      animation-mixer="clip: *; loop: repeat"
    ></a-gltf-model>
  </a-entity>
</a-scene>
```

---

## トラッキング安定化パラメータ

### MindAR の 1 Euro フィルター

MindAR は内部で [1 Euro Filter](https://inria.hal.science/hal-00670496) を使ってトラッキング位置を平滑化している。

| パラメータ | 推奨値 | デフォルト | 説明 |
|---|---|---|---|
| `filterMinCF` | `0.001` | 未設定 | 最小カットオフ周波数。**小さい**ほど滑らか（遅延増）、大きいほど俊敏（ブレ増） |
| `filterBeta` | `0.01` | 未設定 | 速度ベース補正。**大きい**ほど速い動きに追従（ブレ増）、小さいほど常に滑らか |
| `missTolerance` | `10` | `5` | 認識を失ってから Lost 扱いにするまでのフレーム数。大きいほど一時的な見失いを無視 |
| `warmupTolerance` | `3` | `5` | 初回認識確定に必要なフレーム数。小さいほど素早く検出 |

### LERP スムージングコンポーネント（`smooth-track`）

MindAR のフィルターの上に追加でフレーム間補間を行うカスタムコンポーネント。  
**`mindar-image-target` エンティティ自体**に付けることがポイント（モデルの子要素ではない）。

```javascript
AFRAME.registerComponent('smooth-track', {
  schema: { factor: { type: 'number', default: 0.15 } },
  init() {
    this.smoothPos = new THREE.Vector3()
    this.smoothQuat = new THREE.Quaternion()
    this.ready = false
  },
  tick() {
    const obj = this.el.object3D
    if (!obj.visible) { this.ready = false; return }
    if (!this.ready) {
      this.smoothPos.copy(obj.position)
      this.smoothQuat.copy(obj.quaternion)
      this.ready = true
      return
    }
    // MindAR が毎フレームセットした位置を LERP で追従
    this.smoothPos.lerp(obj.position, this.data.factor)
    this.smoothQuat.slerp(obj.quaternion, this.data.factor)
    obj.position.copy(this.smoothPos)
    obj.quaternion.copy(this.smoothQuat)
  }
})
```

**factor の調整目安：**

| factor | 挙動 |
|---|---|
| `0.3` | 速い追従、少しブレが残る |
| `0.15` | バランス（推奨） |
| `0.05` | 非常に滑らか、動きへの追従が遅れる |

> **仕組み：** A-Frame ではシステムの `tick` がコンポーネントの `tick` より先に実行される。MindAR はシステムとして登録されているため、`smooth-track` の tick が走る時点では MindAR による位置更新が完了している。これを LERP することで追加の平滑化が実現できる。

---

## マーカー消失時の保持機能

マーカーを見失っても `HOLD_MS` ミリ秒間はモデルを維持する実装。

```javascript
const HOLD_MS = 2000  // 2秒間保持
let hideTimer = null
const targetEl = document.querySelector('[mindar-image-target]')
const modelEl = document.getElementById('ar-model')

targetEl?.addEventListener('targetFound', () => {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
  modelEl?.setAttribute('visible', 'true')
})

targetEl?.addEventListener('targetLost', () => {
  hideTimer = setTimeout(() => {
    modelEl?.setAttribute('visible', 'false')
    hideTimer = null
  }, HOLD_MS)
})
```

---

## GLB モデルの注意事項

### Meshy AI 生成モデルのスケール問題

Meshy AI 出力の GLB は頂点座標が **ミリメートル単位**（約 0.001〜0.003）で格納されている。  
Three.js のデフォルト単位は **1 unit = 1 メートル** のため、そのまま表示すると 2〜3mm になり不可視。

```
GLB 内の POSITION accessor の max 例:
[0.0011, 0.0032, 0.0019]  ← 全て約 0.001〜0.003 単位（≒ミリメートル）
```

**スケール計算：**  
`1m ÷ 0.003unit ≈ 333`

| scale | 表示サイズ |
|---|---|
| `333 333 333` | 約 1m（等身大の目安） |
| `666 666 666` | 約 2m |
| `999 999 999` | 約 3m（現在の設定） |

### SkinnedMesh のフラスタムカリング問題

アニメーション付きキャラクター（SkinnedMesh）は Three.js がバウンディングボックスを正しく計算できず、視野内にいても描画されないことがある（フラスタムカリングの誤判定）。

```javascript
// model-loaded イベントで全メッシュに適用
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

| ファイル名パターン | 内容 | 使用可否 |
|---|---|---|
| `*_output.glb` | スケルトン（骨組み）のみ。`computeBoundingBox` → `(0,0,0)` | ❌ 表示されない |
| `*_withSkin.glb` | スケルトン + メッシュ + アニメーション | ✅ こちらを使う |

### アニメーション再生

SkinnedMesh はアニメーションを再生しないと正しく描画されない場合がある。`aframe-extras` の `animation-mixer` が必要。

```html
<script src="https://cdn.jsdelivr.net/gh/c-frame/aframe-extras@7.5.0/dist/aframe-extras.min.js"></script>
```

```html
<a-gltf-model animation-mixer="clip: *; loop: repeat"></a-gltf-model>
```

---

## イメージターゲット（`.mind` ファイル）の作成

1. MindAR ドキュメントのコンパイラを開く  
   → https://hiukim.github.io/mind-ar-js-doc/tools/compile/
2. マーカーにしたい画像をアップロード（特徴点が多いほど精度が上がる）
3. コンパイル完了後、`.mind` ファイルをダウンロード
4. `public/ar-content/targets.mind` に配置

### ターゲット画像の確認・復元方法

`.mind` ファイルからマーカー画像（グレースケール）を復元できる：

```bash
# 1. グレースケールデータを抽出
node --input-type=module << 'EOF'
import { decode } from './node_modules/.pnpm/@msgpack+msgpack@2.8.0/node_modules/@msgpack/msgpack/dist/index.js';
import { readFileSync, writeFileSync } from 'fs';
const result = decode(readFileSync('./public/ar-content/targets.mind'));
const td = result.dataList[0].trackingData[0];
writeFileSync('./public/ar-content/marker-preview.bin', td.data);
console.log(`${td.width}x${td.height}`);
EOF

# 2. PNG に変換（Pillow 必要）
python3 -c "
from PIL import Image
data = open('public/ar-content/marker-preview.bin','rb').read()
Image.frombytes('L',(256,256),data).save('public/ar-content/marker-preview.png')
print('saved')
"
```

---

## 開発環境

### 起動

```bash
pnpm dev --host
# → http://192.168.x.x:4321 でローカルネットワークに公開
```

### HTTPS テスト（カメラ使用に必須）

カメラ API（`getUserMedia`）は **HTTPS または localhost** でしか動作しない。  
ローカル IP（`http://192.168.x.x`）経由ではカメラが起動せず `VIDEO_FAIL` エラーになる。

```bash
# ngrok で HTTPS トンネリング
ngrok http 4321
# → https://xxxx.ngrok-free.app が発行される
```

### Vite 6.4.x の allowedHosts 設定

Vite 6.4.1 はセキュリティ修正（CVE-2025-30208）で外部ホストをデフォルトブロックする。  
ngrok URL でアクセスする場合は `astro.config.mjs` に追加が必要：

```javascript
export default defineConfig({
  vite: {
    server: {
      allowedHosts: ['.ngrok-free.app', '.ngrok.io', 'localhost'],
    },
  },
})
```

### デバッグオーバーレイ（dev 環境のみ表示）

Astro のフロントマターで `import.meta.env.DEV` を取得し、`define:vars` でスクリプトに渡す：

```astro
---
const isDev = import.meta.env.DEV
---
<script is:inline define:vars={{ isDev }}>
  function log(msg) {
    console.log('[AR]', msg)
    if (!isDev) return  // 本番では画面表示なし
    // ... オーバーレイに表示
  }
</script>
```

---

## Vercel デプロイ

### 初回デプロイ

```bash
# アカウントを指定（個人アカウント vs チームアカウントに注意）
vercel --prod --yes --scope sakata-ryuichi
```

### 2回目以降

```bash
pnpm build && vercel --prod --yes
```

### vercel.json の注意点（重要）

**`Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` ヘッダーを絶対に入れないこと。**

```json
// ❌ これを入れると CDN 読み込みがブロックされカメラが起動しない
{
  "headers": [{
    "source": "/(.*)",
    "headers": [
      { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
      { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
    ]
  }]
}
```

COOP/COEP は 8th Wall の WASM Worker が必要とするヘッダー。MindAR では不要で、むしろ CDN 読み込みを破壊する。

```json
// ✅ MindAR では空にしておく
{}
```

### Vercel スコープの切り替え

```bash
# 現在のリンクを解除
rm -rf .vercel

# 個人アカウントに再リンク
vercel --prod --yes --scope sakata-ryuichi
```

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| `Failed to launch / device not compatible` | HTTP でアクセス（HTTPS 必須） | ngrok か Vercel の HTTPS URL を使う |
| `VIDEO_FAIL` エラー | HTTP or カメラ拒否 | HTTPS URL で開き直す。カメラ許可を確認 |
| `Blocked request` | Vite の allowedHosts 制限 | `astro.config.mjs` に ngrok ドメインを追加 |
| `RangeError: Extra 4316 of 4317 byte(s)` | A-Frame 1.6.0 と MindAR 非互換 | A-Frame を **1.5.0** にダウングレード |
| `TypeError: Cannot read properties of undefined (reading 'IMAGE')` | A-Frame 1.6.0 と mind-ar@1.1.5 非互換 | A-Frame 1.5.0 + MindAR 1.2.5 の組み合わせにする |
| マーカー認識するがモデルが見えない（バウンディングボックスが 0） | スケールが極小（Meshy AI モデルはミリ単位） | `scale="999 999 999"` 等に変更 |
| モデルが存在するはずなのに描画されない | SkinnedMesh のフラスタムカリング誤判定 | `model-loaded` で `frustumCulled = false` を設定 |
| モデルがガクガクする | 1 Euro フィルターの設定が不適切 | `filterMinCF: 0.001; filterBeta: 0.01` + `smooth-track` コンポーネントを使用 |
| Vercel デプロイ後カメラが動かない | `vercel.json` に COOP/COEP ヘッダーが残っている | `vercel.json` を `{}` に戻して再デプロイ |
| `*_output.glb` を使っているがモデルが表示されない | スケルトンのみのファイル（メッシュなし） | `*_withSkin.glb` を使う |
