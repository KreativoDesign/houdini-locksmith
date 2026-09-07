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

  it("keeps the Locks copy concise and displays supplier artwork before the CTA", () => {
    expect(landingSource).toContain("Houdini supplies, installs, opens, and repairs dependable mechanical locking solutions");
    expect(landingSource).toContain("Master-key and restricted-keyway systems");
    expect(landingSource).toContain("Panic exit devices, door closers, hinges, and ironmongery");
    expect(landingSource).toContain("https://files.manuscdn.com/user_upload_by_module/session_file/310519663346956907/NGWsHRvauXOHqtDm.png");
    expect(landingSource).toContain("Trusted supplier range");
    expect(landingSource).toContain("Supplier logos: Yale, Viro, Master Lock, Kwikset, Mul-T-Lock, ABUS, CISA, ASSA ABLOY, BBQ, Jaguar, and Trellidor");
  });

  it("keeps the CCTV copy concise and protects its brochure-derived capabilities", () => {
    expect(landingSource).toContain("CCTV turns uncertainty into real-time visibility");
    expect(landingSource).toContain("Digital and network video recorders");
    expect(landingSource).toContain("HD bullet, dome, and turret cameras");
    expect(landingSource).toContain("Intrusion and line-crossing detection");
    expect(landingSource).toContain("Mobile, remote, and off-site monitoring");
    expect(landingSource).toContain("License plate recognition integration");
  });

  it("keeps the Safes copy concise and protects its brochure-derived capabilities", () => {
    expect(landingSource).toContain("From compact domestic safes to strongroom and vault protection");
    expect(landingSource).toContain("Domestic digital, firearm, and valuables safes");
    expect(landingSource).toContain("Categorized and insurance-rated safes");
    expect(landingSource).toContain("Vehicle, handgun, and rifle safes");
    expect(landingSource).toContain("Strongroom and vault doors");
    expect(landingSource).toContain("Anti-bandit doors and bullet-resistant pay windows");
  });

  it("keeps the Intercoms copy concise and protects its brochure-derived options", () => {
    expect(landingSource).toContain("Intercoms provide a safe, cost-effective way to verify who is at the door");
    expect(landingSource).toContain("Audio intercoms for clear two-way communication");
    expect(landingSource).toContain("Video intercoms for visual visitor verification");
    expect(landingSource).toContain("GSM multi-tenant devices for shared entrances");
    expect(landingSource).toContain("Video and CCTV-integrated app systems");
  });

  it("keeps the Electric Fencing copy concise and protects its brochure-derived capabilities", () => {
    expect(landingSource).toContain("Effective perimeter security starts outside the property");
    expect(landingSource).toContain("Electric fencing for overt perimeter deterrence");
    expect(landingSource).toContain("Point-to-point outdoor detection");
    expect(landingSource).toContain("Environmental outdoor detection");
    expect(landingSource).toContain("Close-perimeter detection and target hardening");
  });

  it("keeps the Keys copy concise and protects its brochure-derived capabilities", () => {
    expect(landingSource).toContain("modern diagnostic equipment to support transponder technology");
    expect(landingSource).toContain("Transponder key diagnostics and programming");
    expect(landingSource).toContain("Remote key programming and cloning");
    expect(landingSource).toContain("Lost-key origination and replacement");
    expect(landingSource).toContain("Vehicle lock repair, servicing, and replacement");
    expect(landingSource).toContain("Replacement door, boot, ignition locks, locksets, housings, and electric switches");
  });

  it("uses full-width descriptions and inline capability pills across the shared panel", () => {
    expect(landingSource).toContain('w-full max-w-none text-base leading-7 text-slate-200 sm:text-lg sm:leading-8');
    expect(landingSource).toContain('flex w-full flex-wrap items-center gap-2.5');
    expect(landingSource).toContain('aria-label={`${activeService.title} key capabilities`}');
    expect(landingSource).toContain('inline-flex max-w-full items-center rounded-full');
    expect(landingSource).not.toContain('lg:max-w-2xl');
  });

  it("keeps the panel imagery and service icon tied to the active service", () => {
    expect(landingSource).toContain("activeService.image");
    expect(landingSource).toContain("const ActiveIcon = activeService.Icon");
    expect(landingSource).toContain("<ActiveIcon");
    expect(landingSource).not.toContain("min-h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900 text-left");
  });
});
