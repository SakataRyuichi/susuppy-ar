import { describe, expect, it } from "vitest";
import { createARConfig, createMarkerConfig } from "../../ar/config";

describe("createARConfig", () => {
  it("returns source config with webcam type", () => {
    const config = createARConfig();
    expect(config.source).toEqual({
      sourceType: "webcam",
    });
  });

  it("returns context config with camera parameters URL and detection mode", () => {
    const config = createARConfig();
    expect(config.context.cameraParametersUrl).toContain("camera_para.dat");
    expect(config.context.detectionMode).toBe("mono");
  });

  it("accepts optional baseUrl for camera parameters", () => {
    const config = createARConfig("https://example.com/");
    expect(config.context.cameraParametersUrl).toContain("https://example.com/");
  });
});

describe("createMarkerConfig", () => {
  it("returns marker config with pattern type", () => {
    const config = createMarkerConfig("/data/patt.hiro");
    expect(config.type).toBe("pattern");
    expect(config.patternUrl).toBe("/data/patt.hiro");
    expect(config.changeMatrixMode).toBe("cameraTransformMatrix");
  });

  it("accepts custom changeMatrixMode", () => {
    const config = createMarkerConfig("/data/custom.patt", "modelViewMatrix");
    expect(config.changeMatrixMode).toBe("modelViewMatrix");
  });

  it("uses cameraTransformMatrix as default", () => {
    const config = createMarkerConfig("/data/patt.hiro");
    expect(config.changeMatrixMode).toBe("cameraTransformMatrix");
  });
});
