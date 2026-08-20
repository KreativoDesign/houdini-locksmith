import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const landingSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/Landing.tsx"),
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
});
