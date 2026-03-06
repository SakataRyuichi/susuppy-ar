import { useEffect, useRef } from "react";

/**
 * 各アニメーションフレームでコールバックを実行する。
 * フレーム落ち時の急激な値を抑えるため、delta秒は上限をかけて渡す。
 *
 * @param callback - 前フレームとの差分秒を受け取るコールバック。
 * @public
 */
export function useAnimationFrame(callback: (delta: number) => void): void {
  const callbackFunctionReference = useRef(callback);
  const animationFrameIdReference = useRef<number>(0);
  const previousFrameTimeReference = useRef<number | null>(null);

  callbackFunctionReference.current = callback;

  useEffect(() => {
    const loop = (time: number): void => {
      animationFrameIdReference.current = requestAnimationFrame(loop);
      const delta = calculateFrameDelta(
        previousFrameTimeReference.current,
        time,
      );
      previousFrameTimeReference.current = time;
      callbackFunctionReference.current(Math.min(delta, 0.2));
    };

    animationFrameIdReference.current = requestAnimationFrame(loop);

    return () => {
      previousFrameTimeReference.current = null;
      cancelAnimationFrame(animationFrameIdReference.current);
    };
  }, []);
}

/**
 * 前フレーム時刻と現在時刻から差分秒を計算する。
 *
 * @param previousTime - 前フレーム時刻。
 * @param currentTime - 現在フレーム時刻。
 * @returns フレーム差分秒。
 */
function calculateFrameDelta(
  previousTime: number | null,
  currentTime: number,
): number {
  if (previousTime === null) {
    return 0;
  }
  return (currentTime - previousTime) / 1000;
}
