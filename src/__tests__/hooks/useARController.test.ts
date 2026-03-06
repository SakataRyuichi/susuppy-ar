import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createARConfig } from "../../ar/config";
import { createMarkerConfig } from "../../ar/config";
import { useARController } from "../../hooks/useARController";

vi.mock("@ar-js-org/ar.js-threejs", () => {
  const ArToolkitContextImpl = function (this: object) {
    Object.assign(this, {
      init: vi.fn((cb: () => void) => cb()),
      getProjectionMatrix: vi.fn(() => ({ copy: vi.fn() })),
      update: vi.fn(),
      arController: { orientatio: "", options: { orientation: "" } },
    });
  };
  Object.defineProperty(ArToolkitContextImpl, "baseURL", {
    value: "",
    writable: true,
  });

  const domElement = document.createElement("video");
  Object.defineProperty(domElement, "videoWidth", { value: 640 });
  Object.defineProperty(domElement, "videoHeight", { value: 480 });

  const ArToolkitSourceImpl = function (this: object) {
    Object.assign(this, {
      domElement,
      init: vi.fn((onReady: () => void) => onReady()),
      ready: true,
      update: vi.fn(),
      onResizeElement: vi.fn(),
      copyElementSizeTo: vi.fn(),
    });
  };

  return {
    THREEx: {
      ArToolkitContext: ArToolkitContextImpl as typeof ArToolkitContextImpl & {
        baseURL: string;
      },
      ArToolkitSource: ArToolkitSourceImpl,
      ArMarkerControls: vi.fn(),
    },
  };
});

vi.mock("three", () => ({
  default: {
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      domElement: document.createElement("canvas"),
      setClearColor: vi.fn(),
      setSize: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
    })),
    Scene: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      visible: false,
    })),
    PerspectiveCamera: vi.fn().mockImplementation(() => ({
      projectionMatrix: { copy: vi.fn() },
      visible: false,
    })),
    Color: vi.fn(),
    Group: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      position: { set: vi.fn() },
      rotation: { set: vi.fn(), y: 0 },
    })),
    PlaneGeometry: vi.fn().mockImplementation(() => ({})),
    BoxGeometry: vi.fn().mockImplementation(() => ({})),
    MeshBasicMaterial: vi.fn().mockImplementation(() => ({})),
    MeshNormalMaterial: vi.fn().mockImplementation(() => ({})),
    VideoTexture: vi.fn().mockImplementation(() => ({})),
    Mesh: vi.fn().mockImplementation(() => ({
      position: { set: vi.fn(), y: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { set: vi.fn() },
      add: vi.fn(),
    })),
    TextureLoader: vi.fn().mockImplementation(() => ({
      load: vi.fn(() => ({})),
    })),
    DoubleSide: 2,
  },
}));

function makeConfig() {
  const arConfig = createARConfig();
  const markerConfig = createMarkerConfig("/data/patt.hiro");
  return {
    source: arConfig.source,
    context: arConfig.context,
    marker: markerConfig,
    contentDisplayType: "video" as const,
    contentAlignment: "horizontal" as const,
    cubeTextureUrl: "/images/image.png",
  };
}

describe("useARController", () => {
  it("returns error and isReady in result", () => {
    const config = makeConfig();
    const wrapper = document.createElement("div");
    const wrapperRef = { current: wrapper };

    const { result } = renderHook(() => useARController(config, wrapperRef));

    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("isReady");
    expect(result.current.error).toBeNull();
    expect(typeof result.current.isReady).toBe("boolean");
  });

  it("does not throw on initialization", () => {
    const config = makeConfig();
    const wrapper = document.createElement("div");
    const wrapperRef = { current: wrapper };

    expect(() => {
      renderHook(() => useARController(config, wrapperRef));
    }).not.toThrow();
  });

  it("returns null wrapperRef without crashing", () => {
    const config = makeConfig();
    const wrapperRef = { current: null as HTMLDivElement | null };

    expect(() => {
      renderHook(() => useARController(config, wrapperRef));
    }).not.toThrow();
  });
});
