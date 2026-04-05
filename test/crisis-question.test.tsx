import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CrisisQuestion from "@/components/CrisisQuestion";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const defaultProps = {
  assumptionId: "test-123",
  invalidationConditions: ["OPEC increases production", "Demand falls sharply"],
};

describe("CrisisQuestion", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows error when review submission fails with non-ok response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Something went wrong" }),
    } as Response);

    render(<CrisisQuestion {...defaultProps} />);

    const intactButton = screen.getByRole("button", { name: /no.*thesis intact/i });
    fireEvent.click(intactButton);

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeTruthy();
    });
  });

  it("shows error when review submission throws network error", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"));

    render(<CrisisQuestion {...defaultProps} />);

    const intactButton = screen.getByRole("button", { name: /no.*thesis intact/i });
    fireEvent.click(intactButton);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeTruthy();
    });
  });

  it("shows success message when review succeeds with intact outcome", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(<CrisisQuestion {...defaultProps} />);

    const intactButton = screen.getByRole("button", { name: /no.*thesis intact/i });
    fireEvent.click(intactButton);

    await waitFor(() => {
      expect(screen.getByText(/thesis intact/i)).toBeTruthy();
    });
  });

  it("shows invalidation condition selection when user clicks Yes", () => {
    render(<CrisisQuestion {...defaultProps} />);

    const yesButton = screen.getByRole("button", { name: /yes.*invalidated/i });
    fireEvent.click(yesButton);

    expect(screen.getByText(/which invalidation condition/i)).toBeTruthy();
    expect(screen.getByText("OPEC increases production")).toBeTruthy();
    expect(screen.getByText("Demand falls sharply")).toBeTruthy();
  });
});
