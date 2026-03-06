import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAnimationFrame } from "../../hooks/useAnimationFrame";

describe("useAnimationFrame", () => {
  const animationFrameState: {
    callback: ((time: number) => void) | null;
    id: number;
  } = { callback: null, id: 0 };

  beforeEach(() => {
    animationFrameState.callback = null;
    animationFrameState.id = 0;
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((cb: (time: number) => void) => {
        animationFrameState.callback = cb;
        animationFrameState.id += 1;
        return animationFrameState.id;
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls callback on each animation frame", () => {
    const callback = vi.fn();
    renderHook(() => useAnimationFrame(callback));

    expect(animationFrameState.callback).not.toBeNull();

    act(() => {
      animationFrameState.callback?.(1000);
    });

    expect(callback).toHaveBeenCalled();
  });

  it("stops calling callback after unmount", () => {
    const cancelSpy = vi.spyOn(globalThis, "cancelAnimationFrame");
    const { unmount } = renderHook(() => useAnimationFrame(vi.fn()));

    unmount();

    expect(cancelSpy).toHaveBeenCalled();
    cancelSpy.mockRestore();
  });

  it("passes delta time to callback", () => {
    const callback = vi.fn();
    renderHook(() => useAnimationFrame(callback));

    act(() => {
      animationFrameState.callback?.(1000);
    });

    act(() => {
      animationFrameState.callback?.(1016);
    });

    expect(callback).toHaveBeenCalled();
    expect(typeof callback.mock.calls[0][0]).toBe("number");
  });
});
