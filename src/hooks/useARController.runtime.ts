import type {
  ARControllerRuntime,
  RenderCallbackReference,
} from "./useARController.types";

/**
 * AR実行時状態を初期化して返す。
 *
 * @returns 初期化済みの実行時状態。
 * @public
 */
export function createARControllerRuntime(): ARControllerRuntime {
  return {
    cancelled: false,
    renderer: null,
    arToolkitSource: null,
    arToolkitContext: null,
    sourceVideoElement: null,
    scene: null,
    camera: null,
    contentVideoElement: null,
    contentMesh: null,
    contentAnimationTarget: null,
  };
}

/**
 * レイアウトを同期する。
 * video は CSS の object-fit:cover で wrapper を埋めるため onResizeElement は使わない。
 * renderer と arController.canvas のサイズのみ指定した寸法で更新する。
 *
 * ResizeObserver から実際の wrapper 寸法を受け取ることで、
 * 端末回転後に window.innerWidth/Height が更新される前に呼ばれる競合状態を回避する。
 *
 * @param runtime - AR実行時状態。
 * @param width - 描画領域の幅（省略時は window.innerWidth）。
 * @param height - 描画領域の高さ（省略時は window.innerHeight）。
 */
export function synchronizeARLayout(
  runtime: ARControllerRuntime,
  width = window.innerWidth,
  height = window.innerHeight,
): void {
  if (!runtime.renderer) {
    return;
  }

  // Retina/高 DPI 端末向けのピクセル比を再設定してからサイズを更新する
  // （端末回転後に devicePixelRatio が変わる場合があるため毎回設定する）
  runtime.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // renderer を描画領域サイズに合わせる（canvas CSS と内部解像度の両方）
  runtime.renderer.setSize(width, height);

  // video は object-fit:cover で wrapper を埋めるよう CSS で制御する
  // onResizeElement は呼ばない（onResizeElement が絶対値 CSS で上書きするとレイアウトが崩れる）
  if (runtime.sourceVideoElement) {
    runtime.sourceVideoElement.style.width = "100%";
    runtime.sourceVideoElement.style.height = "100%";
    runtime.sourceVideoElement.style.objectFit = "cover";
    runtime.sourceVideoElement.style.margin = "0";
  }

  // arController.canvas を描画領域サイズにしてマーカー検出精度を維持する
  const arController = (
    runtime.arToolkitContext as {
      arController?: { canvas?: HTMLElement };
    } | null
  )?.arController;
  if (arController?.canvas) {
    arController.canvas.style.width = `${width}px`;
    arController.canvas.style.height = `${height}px`;
  }
}

/**
 * ARランタイムを破棄し、DOM要素と再生状態を安全に解放する。
 *
 * @param runtime - AR実行時状態。
 * @param renderCallbackReference - レンダーコールバック参照。
 */
export function disposeARControllerRuntime(
  runtime: ARControllerRuntime,
  renderCallbackReference: RenderCallbackReference,
): void {
  runtime.cancelled = true;
  renderCallbackReference.current = null;
  runtime.contentVideoElement?.pause();
  runtime.contentVideoElement = null;
  runtime.contentMesh = null;
  runtime.contentAnimationTarget = null;

  if (runtime.sourceVideoElement?.parentNode) {
    runtime.sourceVideoElement.parentNode.removeChild(
      runtime.sourceVideoElement,
    );
  }
  runtime.sourceVideoElement = null;

  if (runtime.renderer?.domElement?.parentNode) {
    runtime.renderer.domElement.parentNode.removeChild(
      runtime.renderer.domElement,
    );
  }
  runtime.renderer?.dispose();
}
