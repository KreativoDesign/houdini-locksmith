import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const landingSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/Landing.tsx"),
  "utf8",
);
const stylesheet = readFileSync(
  resolve(process.cwd(), "client/src/index.css"),
  "utf8",
);

describe("Landing hero visual treatment", () => {
  it("keeps security graphics behind the content and the mascot wrapper transparent", () => {
    expect(landingSource).toContain("Local security specialists");
    expect(landingSource).toContain("<svg className=\"absolute inset-0 h-full w-full opacity-40\"");
    expect(landingSource).toContain("<LockKeyhole className=\"absolute bottom-[11%]");
    expect(landingSource).toContain(
      'className="relative z-10 min-h-[26rem] sm:min-h-[32rem] md:min-h-[38rem] lg:min-h-[42rem] flex items-center justify-center px-2 sm:px-4"',
    );
    expect(landingSource).not.toContain("rounded-3xl bg-gradient-to-br from-lime-500/10");
  });

  it("uses restrained hero motion and respects reduced-motion preferences", () => {
    expect(landingSource).toContain("hero-mascot-float");
    expect(landingSource).toContain("hero-mascot-aura");
    expect(landingSource).toContain("hero-circuit-flow");
    expect(stylesheet).toContain("@keyframes hero-mascot-float");
    expect(stylesheet).toContain("@keyframes hero-circuit-flow");
    expect(stylesheet).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("prioritizes a reduced-motion-aware 24/7 support badge instead of hero statistic cards", () => {
    expect(landingSource).toContain("24/7 Support");
    expect(landingSource).toContain("Emergency security assistance, whenever you need it.");
    expect(landingSource).toContain("hero-support-badge");
    expect(landingSource).toContain("hero-support-ping");
    expect(landingSource).not.toContain('>500+</div>');
    expect(landingSource).not.toContain('>15 min</div>');
    expect(stylesheet).toContain("@keyframes hero-support-badge");
    expect(stylesheet).toContain("@keyframes hero-support-ping");
  });

  it("uses bold display typography with layered hero entrance transitions", () => {
    expect(landingSource).toContain("font-black leading-[0.86] tracking-[-0.065em]");
    expect(landingSource).toContain("hero-headline-reveal");
    expect(landingSource).toContain("hero-headline-gradient");
    expect(landingSource).toContain("hero-background-drift");
    expect(landingSource).toContain("hero-mascot-reveal");
    expect(stylesheet).toContain("@keyframes hero-headline-reveal");
    expect(stylesheet).toContain("@keyframes hero-headline-gradient");
    expect(stylesheet).toContain(".hero-support-reveal");
  });

  it("keeps the bold hero readable and animated safely on mobile", () => {
    expect(landingSource).toContain("text-[clamp(2.75rem,12vw,7.25rem)]");
    expect(landingSource).toContain("sm:text-[clamp(4.2rem,8vw,7.25rem)]");
    expect(landingSource).toContain("min-h-[21rem]");
    expect(landingSource).toContain("text-center hero-content-entrance lg:text-left");
    expect(stylesheet).toContain("@media (max-width: 639px)");
    expect(stylesheet).toContain("@keyframes hero-mascot-float-mobile");
  });

  it("includes the official About Us positioning and homepage navigation", () => {
    expect(landingSource).toContain('id="about"');
    expect(landingSource).toContain("Your Security");
    expect(landingSource).toContain("Superheroes");
    expect(landingSource).toContain("Established 1975");
    expect(landingSource).toContain("Locksmiths Association of South Africa");
    expect(landingSource).toContain("Security Industries Regulatory Authority");
    expect(landingSource).toContain('document.getElementById("about")?.scrollIntoView');
  });

  it("renders the supplied company statistics in the About panel", () => {
    expect(landingSource).toContain('["50+", "Years of experience"]');
    expect(landingSource).toContain('["2,300+", "Projects completed"]');
    expect(landingSource).toContain('["1,560+", "Satisfied customers"]');
    expect(landingSource).toContain('["120", "Professionals"]');
  });

  it("provides a clear, premium consultation form experience", () => {
    expect(landingSource).toContain("Let’s secure your");
    expect(landingSource).toContain("Tell us what you need");
    expect(landingSource).toContain('htmlFor="consultation-name"');
    expect(landingSource).toContain('htmlFor="consultation-service"');
    expect(landingSource).toContain("Typical response: within 1 hour");
    expect(landingSource).toContain("Your enquiry is sent directly to the Houdini team");
    expect(landingSource).toContain("Request my consultation");
  });

  it("includes the interactive Newton Park map and all service quick links in the footer", () => {
    expect(landingSource).toContain('import { MapView } from "@/components/Map"');
    expect(landingSource).toContain("handleLocationMapReady");
    expect(landingSource).toContain("313 Cape Road, Newton Park, Gqeberha, 6070");
    expect(landingSource).toContain("Open directions");
    expect(landingSource).toContain("Locks\", \"locks");
    expect(landingSource).toContain("Electric Fencing\", \"electric-fencing");
    expect(landingSource).toContain("Keys\", \"keys");
    expect(landingSource).toContain('className="h-[230px] sm:h-[270px]"');
    expect(landingSource).toContain("shadow-[inset_0_1px_1px");
    expect(landingSource).toContain("Icon: LockKeyhole");
    expect(landingSource).toContain("Icon: KeyRound");
  });
});
