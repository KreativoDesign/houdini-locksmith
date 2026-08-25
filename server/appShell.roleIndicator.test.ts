import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("AppShell top-navigation role indicator", () => {
  const source = readFileSync(resolve(process.cwd(), "client/src/components/AppShell.tsx"), "utf8");

  it("shows the authenticated role in both mobile and desktop navigation bars", () => {
    const indicators = source.match(/data-testid="top-nav-role-indicator"/g) ?? [];

    expect(indicators).toHaveLength(2);
    expect(source).toContain("Logged in: {topNavigationRoleBadge.label}");
    expect(source).toContain("Logged in as ${topNavigationRoleBadge.label}");
  });
});
