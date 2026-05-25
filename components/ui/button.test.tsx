import { describe, expect, it } from "vitest";

import { buttonVariants } from "@/components/ui/button";

describe("buttonVariants", () => {
  it("uses compact text for small buttons", () => {
    const className = buttonVariants({ size: "sm" });

    expect(className).toContain("text-xs");
    expect(className).not.toContain("text-sm");
  });
});
