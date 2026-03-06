import { parseAsStringLiteral, useQueryStates } from "nuqs";
import type {
  ARContentAlignment,
  ARContentDisplayType,
} from "./useARController.types";

/**
 * 選択可能な動画ソース識別子。
 *
 * @public
 */
export type ARVideoSource = "panda" | "classic";

/**
 * 各動画ソースの表示名と URL。
 *
 * ファイル名にスペースが含まれる場合は URL エンコードしておく。
 *
 * @public
 */
export const VIDEO_SOURCE_CONFIG: Record<
  ARVideoSource,
  { label: string; url: string }
> = {
  panda: {
    label: "パンダ",
    url: "/video/panda-waiting.mp4",
  },
  classic: {
    label: "Classic",
    url: "/video/Classic%20Stylers%20BTF%202010.mp4",
  },
};

/** クエリパラメータキーの定義。URL 仕様を一箇所に集約する。 */
const CONTENT_ALIGNMENTS = ["horizontal", "vertical"] as const;
const CONTENT_DISPLAY_TYPES = ["video", "cube"] as const;
const VIDEO_SOURCES = ["panda", "classic"] as const;

/**
 * nuqs パーサー定義。
 * URL クエリ文字列 ↔ 型安全な値の変換ルールをまとめる。
 */
const arDisplayParsers = {
  /** 表示姿勢: `?alignment=horizontal` | `?alignment=vertical` */
  alignment: parseAsStringLiteral(CONTENT_ALIGNMENTS).withDefault("horizontal"),
  /** 表示物体: `?display=video` | `?display=cube` */
  display: parseAsStringLiteral(CONTENT_DISPLAY_TYPES).withDefault("video"),
  /** 動画素材: `?video=panda` | `?video=classic` */
  video: parseAsStringLiteral(VIDEO_SOURCES).withDefault("panda"),
} as const;

/**
 * AR表示トグル状態。
 *
 * @public
 */
export type ARDisplayToggleState = {
  contentAlignment: ARContentAlignment;
  contentDisplayType: ARContentDisplayType;
  videoSource: ARVideoSource;
  videoUrl: string;
  setHorizontalAlignment: () => void;
  setVerticalAlignment: () => void;
  setVideoDisplayType: () => void;
  setCubeDisplayType: () => void;
  setVideoSource: (source: ARVideoSource) => void;
};

/**
 * AR表示に関する切り替え状態を URL クエリストリングで管理する。
 *
 * nuqs の {@link useQueryStates} により各値が URL に同期されるため、
 * `?alignment=vertical&display=cube&video=classic` のような URL を共有・ブックマークできる。
 *
 * @returns AR表示切り替え状態と更新関数。
 * @public
 */
export function useARDisplayToggles(): ARDisplayToggleState {
  const [{ alignment, display, video }, setParams] =
    useQueryStates(arDisplayParsers);

  const videoUrl = VIDEO_SOURCE_CONFIG[video].url;

  const setHorizontalAlignment = () => {
    void setParams({ alignment: "horizontal" });
  };
  const setVerticalAlignment = () => {
    void setParams({ alignment: "vertical" });
  };
  const setVideoDisplayType = () => {
    void setParams({ display: "video" });
  };
  const setCubeDisplayType = () => {
    void setParams({ display: "cube" });
  };
  const setVideoSource = (source: ARVideoSource) => {
    void setParams({ video: source });
  };

  return {
    contentAlignment: alignment,
    contentDisplayType: display,
    videoSource: video,
    videoUrl,
    setHorizontalAlignment,
    setVerticalAlignment,
    setVideoDisplayType,
    setCubeDisplayType,
    setVideoSource,
  };
}
