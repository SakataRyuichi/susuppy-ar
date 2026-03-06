# AR カメラ表示の実装方針

## 背景と解決した課題

AR.js を React + Vite で使用する際、**スマートフォンのカメラ映像が全画面に表示されない**問題が繰り返し発生した。  
解決に至るまでに多くの試行錯誤を経たため、正しいアプローチと根拠をここに記録する。

---

## 根本原因：`body { overflow: hidden }` はモバイル Safari で機能しない

AR.js は初期化時にカメラ映像用の `<video>` を `document.body` に追加する。  
デスクトップでは `body { overflow: hidden }` で映像がはみ出ないよう制御できるが、  
**iOS Safari では `body` への `overflow: hidden` が効かない**ため、横にスクロールして全画面外の映像が見えてしまう。

> 参照: https://blog.kimizuka.org/entry/2023/02/22/145050

---

## 解決策：wrapper div への video 移動

```
document.body (AR.js が video を追加する場所)
    └── ↓ wrapper.appendChild(video) で移動
wrapper div [position:relative; overflow:hidden; width:100%; height:100%]
    ├── <video>   [position:absolute; z-index:-2]  ← AR.js が設定するスタイルをそのまま使う
    └── <canvas>  [position:absolute; z-index:1; alpha:true]  ← Three.js renderer
```

AR.js が `document.body` に追加した `<video>` を `wrapper.appendChild()` で  
`overflow: hidden` を持つ wrapper div に移動する。  
これにより wrapper の外にはみ出た映像部分がクリップされる。

---

## Z-index の構造

| 要素 | position | z-index | 役割 |
|------|----------|---------|------|
| `<video>` | absolute | -2 (AR.js デフォルト、上書き禁止) | カメラ映像 |
| `<canvas>` | absolute | 1 | Three.js AR オーバーレイ（alpha:true で透明） |
| メニュー div | absolute | 20 | UI |

**z-index:-2 を 0 以上に上書きすると canvas が video の背後に隠れる**ため厳禁。

---

## カメラ映像のサイズ制御：`object-fit: cover` を直接設定

AR.js の `onResizeElement()` は `videoWidth / videoHeight` を使ってカバーフィット計算を行うが、  
以下の理由で信頼できなかった：

- `webcam` の場合、`getUserMedia` が解決した直後（フレームデータなし）に `onReady` が呼ばれる
- iOS Safari では `videoWidth` が取得できるタイミングが遅く、`0` のまま計算すると NaN になる
- 計算結果の絶対値 CSS（`width: 1125px; marginLeft: -367px` など）が後続処理で上書きされる場合がある

**代わりに CSS を直接設定する：**

```javascript
sourceVideoElement.style.width = "100%";
sourceVideoElement.style.height = "100%";
sourceVideoElement.style.objectFit = "cover";
sourceVideoElement.style.margin = "0";
```

`object-fit: cover` はブラウザネイティブの機能で、  
`videoWidth` や `videoHeight` の値・タイミングに依存せず確実に動作する。

---

## renderer のサイズ制御

```javascript
// 初期化時
renderer.setSize(window.innerWidth, window.innerHeight);

// リサイズ時（ResizeObserver から実際の寸法を受け取る）
renderer.setSize(width, height);
```

`renderer.setSize()` は canvas の内部解像度と CSS サイズを同時に更新する。

---

## リサイズ検出：`ResizeObserver` を使う理由

`window.addEventListener("resize", ...)` は端末回転時に  
`window.innerWidth / innerHeight` が更新される**前**に発火する場合がある（iOS で発生）。

`ResizeObserver` は wrapper div の**実際のレイアウト後の寸法**を提供するため、  
端末回転直後でも正確なサイズが得られる。

```typescript
const resizeObserver = new ResizeObserver((entries) => {
  const entry = entries[0];
  if (!entry) return;
  const { width, height } = entry.contentRect;
  synchronizeARLayout(runtime, width, height);
});
resizeObserver.observe(wrapper);
```

---

## `sourceWidth / sourceHeight` の設定

AR.js デフォルト（640×480）を使用する。  
iOS カメラは端末の向きに関わらず**横向きストリーム**を返すため、  
向きに応じて切り替える必要はない。

`onResizeElement` が 640×480 の映像を現在の viewport にカバーフィットする計算を行う。  
（ただし現実装ではこの計算は使用せず、`object-fit: cover` で代替している）

---

## ファイル構成と責務

| ファイル | 責務 |
|---------|------|
| `ARViewer.tsx` | wrapper div をレンダリングし `wrapperRef` を `useARController` に渡す |
| `useARController.ts` | `ResizeObserver` を wrapper に設定し、寸法変化を `synchronizeARLayout` に伝達 |
| `useARController.initializer.ts` | video を wrapper に移動し、CSS を初期設定する |
| `useARController.runtime.ts` | `synchronizeARLayout` で renderer と arController.canvas のサイズを更新する |
| `index.css` | `html, body { margin:0; background:#000; }` のみ。overflow は wrapper が担う |

---

## やってはいけないこと

| NG | 理由 |
|----|------|
| `body { overflow: hidden }` | モバイル Safari で効かない |
| `video.style.zIndex = "0"` | canvas の背後に隠れる可能性がある |
| `onResizeElement()` で video のサイズを管理 | タイミング依存で NaN になる場合がある |
| `window.addEventListener("resize")` でリサイズ検出 | 端末回転時に古い寸法が使われる場合がある |
| `<StrictMode>` で囲む | AR.js の初期化が二重実行されカメラが2つ表示される |
