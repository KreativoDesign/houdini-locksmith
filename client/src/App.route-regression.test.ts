import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

describe("App route rendering regression guards", () => {
  it("mounts protected pages as React components rather than invoking them directly", () => {
    expect(appSource).toContain("return <Component />;");
    expect(appSource).not.toContain("return (Component as () => React.ReactNode)();");
  });

  it("uses dedicated React components for routes that call hooks", () => {
    expect(appSource).toContain("function RootRoute()");
    expect(appSource).toContain("<RootRoute />");
    expect(appSource).toContain("component={JobCardEditForm}");
    expect(appSource).not.toContain("component={() => <JobCardEditForm />}");
  });
});
