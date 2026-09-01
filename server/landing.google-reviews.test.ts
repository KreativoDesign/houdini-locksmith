import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const landingSource = readFileSync(new URL("../client/src/pages/Landing.tsx", import.meta.url), "utf8");

describe("homepage Google Reviews panel", () => {
  it("shows the supplied rating and review count", () => {
    expect(landingSource).toContain("Google Reviews");
    expect(landingSource).toContain(">4.5</span>");
    expect(landingSource).toContain("115 Google reviews");
    expect(landingSource).toContain("Rated 4.5 out of 5 stars");
  });

  it("provides an accessible external review link", () => {
    expect(landingSource).toContain("https://www.google.com/maps/search/?api=1&query=Houdini+Locksmith+Port+Elizabeth");
    expect(landingSource).toContain('target="_blank"');
    expect(landingSource).toContain('rel="noreferrer"');
    expect(landingSource).toContain("View Reviews");
  });

  it("removes the previous About statistic labels", () => {
    expect(landingSource).not.toContain("Years of experience");
    expect(landingSource).not.toContain("Projects completed");
    expect(landingSource).not.toContain("Satisfied customers");
    expect(landingSource).not.toContain("Professionals");
  });
});
