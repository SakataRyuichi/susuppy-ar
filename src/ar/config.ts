import type { ARContextConfig, ARMarkerConfig, ARSourceConfig } from "./types";

const DEFAULT_CAMERA_PARAMETERS_URL = "/data/camera_para.dat";

/**
 * AR入力とコンテキスト設定を生成する。
 * sourceWidth/sourceHeight は AR.js デフォルト（640×480）に任せることで
 * モバイルの向きに関わらず onResizeElement が正しく動作する。
 *
 * @param baseUrl - カメラパラメータファイルに付与するベースURL。
 * @returns AR入力設定とコンテキスト設定。
 * @public
 */
export function createARConfig(baseUrl = ""): {
  source: ARSourceConfig;
  context: ARContextConfig;
} {
  const cameraParametersUrl = `${baseUrl}${DEFAULT_CAMERA_PARAMETERS_URL}`;
  return {
    source: {
      sourceType: "webcam",
    },
    context: {
      cameraParametersUrl,
      detectionMode: "mono",
    },
  };
}

/**
 * マーカー検出設定を生成する。
 * 生成ロジックを関数化して呼び出し側の設定記述を簡潔に保つ。
 *
 * @param patternUrl - パターンファイルURL。
 * @param changeMatrixMode - AR.js の行列モード。
 * @returns マーカー設定。
 * @public
 */
export function createMarkerConfig(
  patternUrl: string,
  changeMatrixMode:
    | "cameraTransformMatrix"
    | "modelViewMatrix" = "cameraTransformMatrix",
): ARMarkerConfig {
  return {
    type: "pattern",
    patternUrl,
    changeMatrixMode,
  };
}
