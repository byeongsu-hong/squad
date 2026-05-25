import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageStage } from "@/components/page-stage";

describe("PageStage", () => {
  it("positions page content slightly above vertical center", () => {
    render(
      <PageStage data-testid="stage">
        <div>Page content</div>
      </PageStage>
    );

    const stage = screen.getByTestId("stage");

    expect(stage.className).toContain("mx-auto");
    expect(stage.className).toContain("flex");
    expect(stage.className).toContain("min-h-[calc(100svh-7.5rem)]");
    expect(stage.className).toContain("flex-col");
    expect(stage.className).toContain("justify-center");
    expect(stage.className).toContain("pb-[10svh]");
    expect(stage.className).toContain("max-w-3xl");
    expect(screen.getByText("Page content")).toBeTruthy();
  });

  it("uses a wider max width for split vault detail layouts", () => {
    render(
      <PageStage width="wide" data-testid="stage">
        <div>Wide content</div>
      </PageStage>
    );

    expect(screen.getByTestId("stage").className).toContain("max-w-[1280px]");
  });
});
