import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const landingSource = readFileSync(new URL("../client/src/pages/Landing.tsx", import.meta.url), "utf8");

describe("homepage selectable services section", () => {
  it("defines all eleven service choices and defaults to Locks", () => {
    expect(landingSource).toContain('service: "locks"');
    expect(landingSource).toContain('service: "cctv"');
    expect(landingSource).toContain('service: "safes"');
    expect(landingSource).toContain('service: "intercoms"');
    expect(landingSource).toContain('service: "electric-fencing"');
    expect(landingSource).toContain('service: "keys"');
    expect(landingSource).toContain('service: "security-self-defence"');
    expect(landingSource).toContain('service: "gate-garage-motors"');
    expect(landingSource).toContain('service: "access-control"');
    expect(landingSource).toContain('service: "alarm-systems"');
    expect(landingSource).toContain('service: "access-automation"');
    expect(landingSource).toContain('formData.service) ?? services[0]');
  });

  it("uses an accessible tablist and a single dynamic panel", () => {
    expect(landingSource).toContain('role="tablist"');
    expect(landingSource).toContain('role="tab"');
    expect(landingSource).toContain('aria-selected={isActive}');
    expect(landingSource).toContain('role="tabpanel"');
    expect(landingSource).toContain('id="service-detail-panel"');
    expect(landingSource).toContain('onClick={() => handleServiceChange(service.service)}');
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

  it("keeps the Security & Self Defence copy concise and protects its supplied capabilities", () => {
    expect(landingSource).toContain("wide range of practical equipment for the guarding industry and personal self-defence");
    expect(landingSource).toContain("Convex and vehicle search mirrors");
    expect(landingSource).toContain("Metal detectors");
    expect(landingSource).toContain("Batons and handcuffs");
    expect(landingSource).toContain("Pepper sprays");
    expect(landingSource).toContain("Telescopic batons");
    expect(landingSource).toContain("Stun guns");
    expect(landingSource).toContain("Alcohol test kits");
  });

  it("keeps the Gate & Garage Motors copy concise and protects its capabilities", () => {
    expect(landingSource).toContain("practical automation for gates and garage doors");
    expect(landingSource).toContain("Sliding and swing gate motor automation");
    expect(landingSource).toContain("Garage door motors and automation");
    expect(landingSource).toContain("Replacement remotes and receivers");
    expect(landingSource).toContain("Rolling-code and secure access controls");
    expect(landingSource).toContain("Installation, setup, and troubleshooting support");
  });

  it("keeps the Alarm Systems copy concise and protects its capabilities", () => {
    expect(landingSource).toContain("A well-planned alarm system creates an active response layer");
    expect(landingSource).toContain("Wired and wireless alarm system options");
    expect(landingSource).toContain("Magnetic contacts for doors, windows, and access points");
    expect(landingSource).toContain("Outdoor beams and perimeter detection");
    expect(landingSource).toContain("GSM, IP, and app-based remote notifications");
    expect(landingSource).toContain("System upgrades, testing, servicing, and fault finding");
  });

  it("uses dedicated Gate and Alarm icons and a Request a Quote panel CTA", () => {
    expect(landingSource).toContain("Icon: DoorOpen");
    expect(landingSource).toContain("Icon: BellRing");
    expect(landingSource).toContain("Request a Quote <ArrowRight");
  });

  it("keeps the Access Automation copy concise and protects its supplied capabilities", () => {
    expect(landingSource).toContain("Access Automation helps reduce risk at natural entry choke-points");
    expect(landingSource).toContain("commercial retail spaces, office parks, industrial zones");
    expect(landingSource).toContain("Gate automation");
    expect(landingSource).toContain("Garage automation");
    expect(landingSource).toContain("Access booms");
    expect(landingSource).toContain("Parking bollards");
    expect(landingSource).toContain("Automated road spikes");
    expect(landingSource).toContain("Turnstiles");
    expect(landingSource).toContain("Man trap doors");
  });

  it("keeps the Access Control copy concise and protects its supplied offerings", () => {
    expect(landingSource).toContain("Access control has evolved from standalone proximity readers to connected smart locks");
    expect(landingSource).toContain("Coin-operated locks");
    expect(landingSource).toContain("Indoor and outdoor keypads");
    expect(landingSource).toContain("Standalone proximity tag systems");
    expect(landingSource).toContain("Online networked proximity tag systems");
    expect(landingSource).toContain("Biometric fingerprint readers");
    expect(landingSource).toContain("Biometric facial readers");
    expect(landingSource).toContain("Bluetooth app-based smart locks");
  });

  it("adds technology-specific Access Control icon cards", () => {
    expect(landingSource).toContain("Access Control technology options");
    expect(landingSource).toContain("Coin locks");
    expect(landingSource).toContain("Indoor and outdoor PIN access");
    expect(landingSource).toContain("Standalone tag readers");
    expect(landingSource).toContain("Multi-door online control");
    expect(landingSource).toContain("Biometric identity access");
    expect(landingSource).toContain("Fast visual verification");
    expect(landingSource).toContain("Bluetooth app-based access");
  });

  it("uses a balanced two-row service selector with wrapped labels", () => {
    expect(landingSource).toContain('grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5');
    expect(landingSource).toContain('min-h-16');
    expect(landingSource).toContain('items-center justify-center');
    expect(landingSource).toContain('max-w-[13ch]');
  });

  it("adds subtle, reduced-motion-safe hover transitions to service buttons", () => {
    expect(landingSource).toContain('transform-gpu items-center justify-center');
    expect(landingSource).toContain('transition-[transform,background-color,border-color,box-shadow,color] duration-300 ease-out');
    expect(landingSource).toContain('hover:shadow-lg hover:shadow-lime-400/10');
    expect(landingSource).toContain('group-hover:-translate-y-0.5 group-hover:rotate-3 group-hover:scale-110');
    expect(landingSource).toContain('motion-reduce:transition-none');
  });

  it("uses a consistent responsive spacing rhythm across homepage sections", () => {
    expect(landingSource).toContain('scroll-mt-24');
    expect(landingSource).toContain('py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-28');
    expect(landingSource).toContain('py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28');
    expect(landingSource).toContain('bg-slate-950/45 px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28');
    expect(landingSource).toContain('bg-slate-950 px-4 py-14 sm:px-6 sm:py-20 lg:px-8');
    expect(landingSource).toContain('grid grid-cols-1 items-center gap-12 sm:gap-14 lg:grid-cols-2 lg:gap-20');
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

  it("routes quote requests to contact and pre-fills the subject from the selected service", () => {
    expect(landingSource).toContain('document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" })');
    expect(landingSource).toContain('subject: `Quote request — ${label}`');
    expect(landingSource).toContain('id="consultation-subject"');
    expect(landingSource).toContain('Subject: ${formData.subject}');
    expect(landingSource).toContain('onChange={(e) => handleServiceChange(e.target.value)}');
  });

  it("maps every service to its own quote subject through the shared panel CTA", () => {
    expect(landingSource).toContain('locks: "Locks"');
    expect(landingSource).toContain('cctv: "CCTV"');
    expect(landingSource).toContain('safes: "Safes"');
    expect(landingSource).toContain('intercoms: "Intercoms"');
    expect(landingSource).toContain('"electric-fencing": "Electric Fencing"');
    expect(landingSource).toContain('keys: "Keys"');
    expect(landingSource).toContain('"security-self-defence": "Security & Self Defence"');
    expect(landingSource).toContain('"gate-garage-motors": "Gate & Garage Motors"');
    expect(landingSource).toContain('"access-control": "Access Control"');
    expect(landingSource).toContain('"alarm-systems": "Alarm Systems"');
    expect(landingSource).toContain('"access-automation": "Access Automation"');
    expect(landingSource).toContain('onClick={() => handleServiceSelect(activeService.service)}');
  });

  it("opens an accessible 24/7 support modal with WhatsApp and call options", () => {
    expect(landingSource).toContain('supportModalOpen');
    expect(landingSource).toContain('aria-label="Open 24/7 support contact options"');
    expect(landingSource).toContain('role="dialog" aria-modal="true"');
    expect(landingSource).toContain('https://wa.me/27834591573');
    expect(landingSource).toContain('WhatsApp');
    expect(landingSource).toContain('href="tel:0413657565"');
    expect(landingSource).toContain('Call Houdini');
    expect(landingSource).toContain('event.key === "Escape"');
    expect(landingSource).toContain('aria-label="Close support contact options"');
  });
});
