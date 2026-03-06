import { useMemo, useRef } from "react";
import { createARConfig } from "../ar/config";
import { createMarkerConfig } from "../ar/config";
import { useARController } from "../hooks/useARController";
import type {
  ARContentAlignment,
  ARContentDisplayType,
} from "../hooks/useARController.types";

const MARKER_PATTERN_URL = "/data/patt.hiro";
const DEFAULT_VIDEO_URL = "/video/panda-waiting.mp4";
const DEFAULT_CUBE_TEXTURE_URL = "/images/image.png";

/**
 * ARビュー表示設定。
 *
 * @public
 */
export type ARViewerDisplaySetting = {
  contentDisplayType: ARContentDisplayType;
  contentAlignment: ARContentAlignment;
  /** 表示する動画の URL。省略時はデフォルトのパンダ動画を使用する。 */
  videoUrl: string;
};

/**
 * AR ビューを初期化するコンポーネント。
 * wrapperRef の div にカメラ映像（video）と Three.js キャンバスを配置する。
 * スマートフォンの Safari では body への overflow:hidden が効かないため
 * wrapper 要素自身で overflow:hidden を行うブログ知見に従った実装。
 *
 * @see https://blog.kimizuka.org/entry/2023/02/22/145050
 * @returns AR ラッパー div。
 * @public
 */
export function ARViewer({
  contentDisplayType = "video",
  contentAlignment = "horizontal",
  videoUrl = DEFAULT_VIDEO_URL,
}: Partial<ARViewerDisplaySetting> = {}): React.ReactElement {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const config = useMemo(() => {
    const arConfig = createARConfig();
    const markerConfig = createMarkerConfig(MARKER_PATTERN_URL);
    return {
      source: arConfig.source,
      context: arConfig.context,
      marker: markerConfig,
      videoUrl,
      cubeTextureUrl: DEFAULT_CUBE_TEXTURE_URL,
      contentDisplayType,
      contentAlignment,
    };
  }, [contentAlignment, contentDisplayType, videoUrl]);

  const { error } = useARController(config, wrapperRef);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 p-4">
        <p className="text-center text-red-600" role="alert">
          {error.message}
        </p>
      </div>
    );
  }

  // AR.js が wrapper 内に video と canvas を配置するため div のみ返す
  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%" }}
    />
  );
}
