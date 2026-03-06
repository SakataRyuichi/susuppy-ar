/**
 * ビューポートの幅と高さ。
 * レイアウト計算を純粋関数に閉じ込めるための入力型として利用する。
 *
 * @public
 */
export type ViewportSize = {
  width: number;
  height: number;
};

/**
 * cover配置で使う絶対座標矩形。
 * 画角を維持しつつ余白を出さないために、座標とサイズをまとめて扱う。
 *
 * @public
 */
export type CoverRect = {
  width: number;
  height: number;
  left: number;
  top: number;
};

/**
 * コンテナから現在の描画領域サイズを取得する。
 *
 * @param container - 対象のビューポートコンテナ。
 * @returns ピクセル単位の幅・高さ。
 * @public
 */
export function getViewportSize(container: HTMLDivElement): ViewportSize {
  return {
    width: container.clientWidth,
    height: container.clientHeight,
  };
}

/**
 * ビューポートサイズから向きを判定する。
 *
 * @param size - 現在のビューポート寸法。
 * @returns 高さが幅以上なら `"portrait"`、それ以外は `"landscape"`。
 * @public
 */
export function getOrientation(size: ViewportSize): "portrait" | "landscape" {
  if (size.height >= size.width) {
    return "portrait";
  }
  return "landscape";
}

/**
 * 入力ソースのアスペクト比を計算する。
 * メタデータ未取得時は設定値へフォールバックして初期描画のズレを防ぐ。
 *
 * @param sourceElement - AR入力として使う動画要素。
 * @param fallbackWidth - メタデータ未取得時に使う幅。
 * @param fallbackHeight - メタデータ未取得時に使う高さ。
 * @returns `width / height` で計算したアスペクト比。
 * @public
 */
export function getSourceAspect(
  sourceElement: HTMLVideoElement,
  fallbackWidth: number,
  fallbackHeight: number,
): number {
  const width = sourceElement.videoWidth || fallbackWidth;
  const height = sourceElement.videoHeight || fallbackHeight;
  return width / Math.max(height, 1);
}

/**
 * 画像比率を保ったまま、ビューポートを埋める cover 矩形を計算する。
 *
 * @param viewport - 対象ビューポート。
 * @param sourceAspect - 入力ソースのアスペクト比。
 * @returns 絶対配置要素へ適用する矩形。
 * @public
 */
export function calculateCoverRect(
  viewport: ViewportSize,
  sourceAspect: number,
): CoverRect {
  const viewportAspect = viewport.width / Math.max(viewport.height, 1);
  if (viewportAspect > sourceAspect) {
    const height = viewport.width / sourceAspect;
    return {
      width: viewport.width,
      height,
      left: 0,
      top: (viewport.height - height) / 2,
    };
  }
  const width = viewport.height * sourceAspect;
  return {
    width,
    height: viewport.height,
    left: (viewport.width - width) / 2,
    top: 0,
  };
}

/**
 * 絶対配置用の矩形を要素へ適用する。
 *
 * @param element - 対象要素。
 * @param rect - 適用する矩形。
 * @public
 */
export function applyCoverRect(element: HTMLElement, rect: CoverRect): void {
  element.style.position = "absolute";
  element.style.width = `${rect.width}px`;
  element.style.height = `${rect.height}px`;
  element.style.left = `${rect.left}px`;
  element.style.top = `${rect.top}px`;
}
