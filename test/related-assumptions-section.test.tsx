import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RelatedAssumptionsSection from "@/components/RelatedAssumptionsSection";
import type { Assumption } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function makeAssumption(
  id: string,
  overrides: Partial<Assumption> = {}
): Assumption {
  return {
    id,
    belief: `Belief ${id}`,
    causal_logic: "IF signal THEN thesis",
    invalidation_conditions: ["Signal breaks"],
    confidence: 7,
    status: "active",
    asset_tags: ["CL"],
    raw_input: `Raw ${id}`,
    ai_summary: null,
    ai_summary_updated_at: null,
    analysis_cache: null,
    analysis_cached_at: null,
    is_seed: false,
    created_at: "2026-04-23T00:00:00.000Z",
    ...overrides,
  };
}

describe("RelatedAssumptionsSection", () => {
  it("renders related cards with shared exposure details only for overlapping tags", () => {
    render(
      <RelatedAssumptionsSection
        currentAssetTags={["CL", "XLE"]}
        assumptions={[
          makeAssumption("risk-1", {
            belief: "Oil downside risk increases",
            confidence: 4,
            asset_tags: ["CL", "BNO"],
            analysis_cache: {
              health: {
                score: 2,
                label: "critical",
                reasoning: "At risk",
                condition_status: [],
              },
              counter: null,
              missing: null,
              stateShift: null,
            },
          }),
        ]}
      />
    );

    expect(screen.getByText("Related Assumptions")).toBeTruthy();
    expect(screen.getByText("Oil downside risk increases")).toBeTruthy();
    expect(screen.getByLabelText("Health score 2")).toBeTruthy();
    expect(screen.getByText("Confidence 4/10")).toBeTruthy();
    expect(screen.getByText("Shared tags: CL")).toBeTruthy();
    expect(
      screen.getByText("Related via shared exposure: CL")
    ).toBeTruthy();
    expect(screen.queryByText("BNO")).toBeNull();
  });

  it("shows an empty-state message when there are no usable related assumptions", () => {
    render(
      <RelatedAssumptionsSection
        currentAssetTags={["CL"]}
        assumptions={[
          makeAssumption("other-1", {
            asset_tags: ["XLE"],
          }),
        ]}
      />
    );

    expect(screen.getByText("Related Assumptions")).toBeTruthy();
    expect(
      screen.getByText(
        "No related assumptions yet. Add another thesis with a shared asset tag to connect this board."
      )
    ).toBeTruthy();
  });
});
