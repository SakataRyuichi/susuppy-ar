import { Menu } from "lucide-react";
import { useState } from "react";
import { ARViewer } from "./components/ARViewer";
import { Button } from "./components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import {
  VIDEO_SOURCE_CONFIG,
  useARDisplayToggles,
} from "./hooks/useARDisplayToggles";
import type { ARVideoSource } from "./hooks/useARDisplayToggles";

const HIRO_MARKER_IMAGE = "/data/hiro.png";

/**
 * アプリのルート画面。
 * AR表示と操作メニューを同一画面で提供し、利用導線を単純化する。
 *
 * @returns メニュー付き AR ルート画面。
 */
function App(): React.ReactElement {
  const [showMarker, setShowMarker] = useState(false);
  const markerToggleLabel = getMarkerToggleLabel(showMarker);
  const arDisplayToggleState = useARDisplayToggles();

  return (
    <div className="fixed inset-0">
      <ARViewer
        contentAlignment={arDisplayToggleState.contentAlignment}
        contentDisplayType={arDisplayToggleState.contentDisplayType}
        videoUrl={arDisplayToggleState.videoUrl}
      />
      <div className="absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="rounded-full bg-white/90 shadow-md backdrop-blur"
              aria-label="メニューを開く"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Meiji AR</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-default focus:bg-transparent">
              Hiroマーカーをカメラでスキャンしてください
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                setShowMarker(
                  (previousMarkerVisibility) => !previousMarkerVisibility,
                );
              }}
            >
              {markerToggleLabel}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 pb-2 pt-1">
              <p className="mb-2 text-xs font-medium text-gray-500">表示姿勢</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={getToggleButtonVariant(
                    arDisplayToggleState.contentAlignment === "horizontal",
                  )}
                  onClick={arDisplayToggleState.setHorizontalAlignment}
                >
                  水平
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={getToggleButtonVariant(
                    arDisplayToggleState.contentAlignment === "vertical",
                  )}
                  onClick={arDisplayToggleState.setVerticalAlignment}
                >
                  垂直
                </Button>
              </div>
            </div>
            <div className="px-2 pb-2">
              <p className="mb-2 text-xs font-medium text-gray-500">表示物体</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={getToggleButtonVariant(
                    arDisplayToggleState.contentDisplayType === "video",
                  )}
                  onClick={arDisplayToggleState.setVideoDisplayType}
                >
                  動画
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={getToggleButtonVariant(
                    arDisplayToggleState.contentDisplayType === "cube",
                  )}
                  onClick={arDisplayToggleState.setCubeDisplayType}
                >
                  3D
                </Button>
              </div>
            </div>
            <div className="px-2 pb-2">
              <p className="mb-2 text-xs font-medium text-gray-500">動画素材</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(VIDEO_SOURCE_CONFIG) as ARVideoSource[]).map(
                  (source) => (
                    <Button
                      key={source}
                      type="button"
                      size="sm"
                      variant={getToggleButtonVariant(
                        arDisplayToggleState.videoSource === source,
                      )}
                      onClick={() =>
                        arDisplayToggleState.setVideoSource(source)
                      }
                    >
                      {VIDEO_SOURCE_CONFIG[source].label}
                    </Button>
                  ),
                )}
              </div>
            </div>
            {showMarker && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 pb-2">
                  <p className="mb-2 text-xs text-gray-500">
                    この画像を印刷するか、別デバイスで表示してカメラにかざしてください
                  </p>
                  <img
                    src={HIRO_MARKER_IMAGE}
                    alt="Hiroマーカー"
                    className="w-full rounded border border-gray-200"
                  />
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default App;

/**
 * マーカー表示状態に応じたトグルラベルを返す。
 *
 * @param showMarker - 現在のマーカー表示状態。
 * @returns トグルボタンに表示する文言。
 */
function getMarkerToggleLabel(showMarker: boolean): string {
  if (showMarker) {
    return "マーカーを隠す";
  }
  return "マーカーを表示";
}

/**
 * トグルの選択状態からボタンバリアントを返す。
 *
 * @param isSelected - 選択中かどうか。
 * @returns ボタンバリアント。
 */
function getToggleButtonVariant(isSelected: boolean): "default" | "secondary" {
  if (isSelected) {
    return "default";
  }
  return "secondary";
}
