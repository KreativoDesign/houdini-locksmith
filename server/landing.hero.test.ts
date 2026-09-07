import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const landingSource = readFileSync(new URL("../client/src/pages/Landing.tsx", import.meta.url), "utf8");

describe("homepage hero background graphics", () => {
  it("keeps the shield overlay, replaces Camera with Key, and omits the old lock overlay", () => {
    expect(landingSource).toContain("<ShieldCheck className=\"absolute right-[11%] top-[14%]");
    expect(landingSource).toContain("<KeyRound className=\"absolute right-[4%] top-[54%]");
    expect(landingSource).not.toContain("<Camera className=\"absolute right-[4%] top-[54%]");
    expect(landingSource).not.toContain("bottom-[11%] right-[40%] h-16 w-16 text-lime-300/[0.06]");
  });

  it("keeps the Lockbro mascot in the hero", () => {
    expect(landingSource).toContain('alt="Lockbro, the Houdini security mascot"');
  });
});
