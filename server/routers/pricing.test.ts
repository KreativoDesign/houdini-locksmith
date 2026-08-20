import { describe, expect, it } from "vitest";
import { computeTotals, getJobItemCosts } from "./pricing";

describe("job-item pricing synchronization", () => {
  it("separates labour from billable job-card materials and services", () => {
    const costs = getJobItemCosts([
      { type: "labour", lineTotal: "420.00" },
      { type: "part", lineTotal: "1810.00" },
      { type: "service", lineTotal: "350.00" },
    ] as never);

    expect(costs).toEqual({ labourCost: 420, partsCost: 2160, itemTotal: 2580 });
  });

  it("produces a VAT-inclusive invoice total from synchronized job-item values", () => {
    const totals = computeTotals(420, 1810, 0, 0, 15);

    expect(totals).toEqual({ subtotal: "2230.00", vatAmount: "334.50", total: "2564.50" });
  });
});
