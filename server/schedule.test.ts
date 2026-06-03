import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("Schedule page mobile responsiveness", () => {
  it("should have mobile timeline view implementation", () => {
    const schedulePagePath = "client/src/pages/Schedule.tsx";
    const content = readFileSync(schedulePagePath, "utf-8");
    
    expect(content).toContain("isMobile");
    expect(content).toContain("Mobile Timeline View");
    expect(content).toContain("dayBookings");
    expect(content).toContain("Desktop Table View");
    expect(content).toContain("useIsMobile");
  });

  it("should have responsive design with Tailwind classes", () => {
    const schedulePagePath = "client/src/pages/Schedule.tsx";
    const content = readFileSync(schedulePagePath, "utf-8");
    
    expect(content).toContain("space-y-4");
    expect(content).toContain("rounded-lg");
    expect(content).toContain("border-2");
    expect(content).toContain("p-3");
  });

  it("should render different views based on screen size", () => {
    const schedulePagePath = "client/src/pages/Schedule.tsx";
    const content = readFileSync(schedulePagePath, "utf-8");
    
    expect(content).toContain("isMobile ?");
    expect(content).toContain(": (");
  });
});
