import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const landingSource = readFileSync(new URL("../client/src/pages/Landing.tsx", import.meta.url), "utf8");

describe("homepage selectable services section", () => {
  it("defines all six service choices and defaults to Locks", () => {
    expect(landingSource).toContain('service: "locks"');
    expect(landingSource).toContain('service: "cctv"');
    expect(landingSource).toContain('service: "safes"');
    expect(landingSource).toContain('service: "intercoms"');
    expect(landingSource).toContain('service: "electric-fencing"');
    expect(landingSource).toContain('service: "keys"');
    expect(landingSource).toContain('formData.service) ?? services[0]');
  });

  it("uses an accessible tablist and a single dynamic panel", () => {
    expect(landingSource).toContain('role="tablist"');
    expect(landingSource).toContain('role="tab"');
    expect(landingSource).toContain('aria-selected={isActive}');
    expect(landingSource).toContain('role="tabpanel"');
    expect(landingSource).toContain('id="service-detail-panel"');
    expect(landingSource).toContain('onClick={() => setFormData((previous) => ({ ...previous, service: service.service }))}');
  });

  it("keeps the panel imagery and service icon tied to the active service", () => {
    expect(landingSource).toContain("activeService.image");
    expect(landingSource).toContain("const ActiveIcon = activeService.Icon");
    expect(landingSource).toContain("<ActiveIcon");
    expect(landingSource).not.toContain("min-h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900 text-left");
  });
});
