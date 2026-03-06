import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ARViewer } from "../../components/ARViewer";
import { useARController } from "../../hooks/useARController";

vi.mock("../../hooks/useARController");

describe("ARViewer", () => {
  beforeEach(() => {
    vi.mocked(useARController).mockReturnValue({
      error: null,
      isReady: true,
    });
  });

  it("renders without throwing when ready", () => {
    expect(() => render(<ARViewer />)).not.toThrow();
  });

  it("shows error message when error is set", () => {
    vi.mocked(useARController).mockReturnValue({
      error: new Error("Camera failed"),
      isReady: false,
    });

    render(<ARViewer />);
    expect(screen.getByText(/camera failed/i)).toBeInTheDocument();
  });

  it("renders without throwing when not ready", () => {
    vi.mocked(useARController).mockReturnValue({
      error: null,
      isReady: false,
    });

    expect(() => render(<ARViewer />)).not.toThrow();
  });
});
