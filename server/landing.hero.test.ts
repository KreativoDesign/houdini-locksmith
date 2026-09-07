import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const landingSource = readFileSync(new URL("../client/src/pages/Landing.tsx", import.meta.url), "utf8");

describe("homepage hero background graphics", () => {
  it("keeps the requested shield and camera overlays while omitting the lock overlay", () => {
    expect(landingSource).toContain("<ShieldCheck className=\"absolute right-[11%] top-[14%]");
    expect(landingSource).toContain("<Camera className=\"absolute right-[4%] top-[54%]");
    expect(landingSource).not.toContain("bottom-[11%] right-[40%] h-16 w-16 text-lime-300/[0.06]");
  });

  it("keeps the Lockbro mascot in the hero", () => {
    expect(landingSource).toContain('alt="Lockbro, the Houdini security mascot"');
  });
});
