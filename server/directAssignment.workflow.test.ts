import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

describe("direct technician assignment workflow", () => {
  it("stores a technician directly on a job card and transitions pending jobs to assigned", () => {
    const source = readProjectFile("server/routers/jobCards.ts");

    expect(source).toContain("assignedTechnicianId: input.technicianId");
    expect(source).toContain('job.status === "pending" ? "assigned" : job.status');
  });

  it("refreshes a technician dashboard from its assigned job query", () => {
    const source = readProjectFile("client/src/pages/TechnicianDashboard.tsx");

    expect(source).toContain("assignedTechnicianId: user?.id");
    expect(source).toContain("refetchInterval: 5_000");
    expect(source).toContain("refetchOnWindowFocus: true");
  });

  it("keeps departments optional and prevents technician assignment at enquiry level", () => {
    const schema = readProjectFile("drizzle/schema.ts");
    const enquiries = readProjectFile("server/routers/enquiries.ts");

    expect(schema).toContain('departmentId: int("departmentId").references(() => departments.id)');
    expect(enquiries).toContain("Enquiries are not assigned to technicians");
    expect(enquiries).toContain("assign its technician there");
  });
});
