/**
 * AR入力ソース設定。
 * `webcam` のみを許可して、入力経路を単純化するために利用する。
 * sourceWidth/sourceHeight は AR.js のデフォルト（640×480）を使用するため含めない。
 *
 * @public
 */
export type ARSourceConfig = {
  sourceType: "webcam";
};

/**
 * ARコンテキスト設定。
 * マーカー検出の安定性を優先して `mono` を既定利用する前提の型。
 *
 * @public
 */
export type ARContextConfig = {
  cameraParametersUrl: string;
  detectionMode: "mono" | "color" | "color_and_matrix" | "mono_and_matrix";
  canvasWidth?: number;
  canvasHeight?: number;
};

/**
 * マーカー検出設定。
 * パターンマーカー方式に限定し、初期実装の複雑化を防ぐ。
 *
 * @public
 */
export type ARMarkerConfig = {
  type: "pattern";
  patternUrl: string;
  changeMatrixMode: "cameraTransformMatrix" | "modelViewMatrix";
};
