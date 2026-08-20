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

  it("supports the canonical and legacy public client portal routes", () => {
    expect(appSource).toContain('<Route path="/client-portal/:token" component={ClientPortal} />');
    expect(appSource).toContain('<Route path="/portal/:token" component={ClientPortal} />');
  });
});
