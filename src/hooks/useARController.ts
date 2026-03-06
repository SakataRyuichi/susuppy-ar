import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { initializeARController } from "./useARController.initializer";
import {
  createARControllerRuntime,
  disposeARControllerRuntime,
  synchronizeARLayout,
} from "./useARController.runtime";
import type {
  ARControllerConfig,
  UseARControllerResult,
} from "./useARController.types";
import { useAnimationFrame } from "./useAnimationFrame";

export type { ARControllerConfig, UseARControllerResult };

/**
 * AR.js と Three.js のライフサイクルを統合して、ARビューを初期化・更新・破棄する。
 * wrapper div に video と canvas を配置し、overflow:hidden で映像をクリップする。
 *
 * @param config - AR入力・検出・表示の設定値。
 * @param wrapperRef - video と canvas を配置する親要素の ref。
 * @returns 初期化状態とエラー情報。
 * @public
 */
export function useARController(
  config: ARControllerConfig,
  wrapperRef: RefObject<HTMLDivElement | null>,
): UseARControllerResult {
  const [error, setError] = useState<Error | null>(null);
  const [isReady, setIsReady] = useState(false);
  const renderCallbackRef = useRef<((delta: number) => void) | null>(null);

  useAnimationFrame((delta) => {
    renderCallbackRef.current?.(delta);
  });

  useEffect(() => {
    if (!wrapperRef.current) return;
    const wrapper = wrapperRef.current;

    const runtime = createARControllerRuntime();

    // ResizeObserver は window.resize より確実にレイアウト更新後の寸法を提供する。
    // 端末回転時に window.innerWidth/Height が更新される前に window.resize が発火する
    // 競合状態を回避するため、wrapper の実際の contentRect を使う。
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      synchronizeARLayout(runtime, width, height);
    });
    resizeObserver.observe(wrapper);

    const synchronizeLayout = () => {
      const rect = wrapper.getBoundingClientRect();
      synchronizeARLayout(runtime, rect.width, rect.height);
    };

    void initializeARController({
      config,
      wrapper,
      runtime,
      renderCallbackReference: renderCallbackRef,
      synchronizeLayout,
      onReady: () => {
        setIsReady(true);
      },
      onError: (err) => {
        setError(err);
      },
    });

    return () => {
      resizeObserver.disconnect();
      disposeARControllerRuntime(runtime, renderCallbackRef);
    };
  }, [config, wrapperRef]);

  return { error, isReady };
}
