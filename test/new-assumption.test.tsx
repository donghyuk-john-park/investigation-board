import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NewAssumption from "@/app/assumptions/new/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("NewAssumption form", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows sign-in link when AI creation returns 401", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    } as Response);

    render(<NewAssumption />);

    const textarea = screen.getByPlaceholderText(/paste anything/i);
    fireEvent.change(textarea, { target: { value: "Test thesis" } });

    const createButton = screen.getByRole("button", { name: /create with ai/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getAllByText(/sign in/i).length).toBeGreaterThan(0);
    });
  });

  it("shows generic error for non-401 AI creation failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal server error" }),
    } as Response);

    render(<NewAssumption />);

    const textarea = screen.getByPlaceholderText(/paste anything/i);
    fireEvent.change(textarea, { target: { value: "Test thesis" } });

    const createButton = screen.getByRole("button", { name: /create with ai/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getAllByText(/internal server error/i).length).toBeGreaterThan(0);
    });
  });

  it("renders invalidation condition inputs with aria-labels", () => {
    render(<NewAssumption />);

    const conditionInput = screen.getByLabelText(/invalidation condition 1/i);
    expect(conditionInput).toBeTruthy();
  });

  it("adds more condition inputs when clicking Add condition", () => {
    render(<NewAssumption />);

    const addButton = screen.getByRole("button", { name: /add condition/i });
    fireEvent.click(addButton);

    expect(screen.getByLabelText(/invalidation condition 1/i)).toBeTruthy();
    expect(screen.getByLabelText(/invalidation condition 2/i)).toBeTruthy();
  });
});
