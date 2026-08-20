import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const portalSource = readFileSync(new URL("./ClientPortal.tsx", import.meta.url), "utf8");

describe("Client portal dashboard visual regression guards", () => {
  it("provides a secure welcome-loading experience", () => {
    expect(portalSource).toContain("Preparing your secure portal");
    expect(portalSource).toContain("Loading your job and invoice updates");
  });

  it("renders personalized recent-job and outstanding-invoice summaries", () => {
    expect(portalSource).toContain("Welcome back, {clientName}.");
    expect(portalSource).toContain("Recent Job Cards");
    expect(portalSource).toContain("Outstanding Invoices");
    expect(portalSource).toContain("data.dashboardSummary?.recentJobs");
  });

  it("shows pricing approval and published invoice payment workflow copy", () => {
    expect(portalSource).toContain("Awaiting Pricing Approval");
    expect(portalSource).toContain("Your Invoice Is Ready");
    expect(portalSource).toContain("Pay Invoice Online");
    expect(portalSource).toContain("Online payment is being enabled");
  });
});
