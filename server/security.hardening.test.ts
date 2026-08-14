import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const serverEntry = readFileSync(new URL("./_core/index.ts", import.meta.url), "utf8");
const documentsRouter = readFileSync(new URL("./routers/documents.ts", import.meta.url), "utf8");
const signaturesRouter = readFileSync(new URL("./routers/signatures.ts", import.meta.url), "utf8");
const database = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const errorBoundary = readFileSync(
  new URL("../client/src/components/ErrorBoundary.tsx", import.meta.url),
  "utf8"
);

describe("security hardening regression guards", () => {
  it("keeps global request payload limits below the previous 50 MB setting", () => {
    expect(serverEntry).not.toContain('express.json({ limit: "50mb" })');
    expect(serverEntry).not.toContain('express.urlencoded({ limit: "50mb"');
    expect(serverEntry).toContain('express.json({ limit: "16mb" })');
    expect(serverEntry).toContain('express.urlencoded({ limit: "1mb", extended: true })');
  });

  it("does not render production error stacks", () => {
    expect(errorBoundary).toContain("import.meta.env.DEV ?");
    expect(errorBoundary).toContain("Please try again. If the problem continues");
  });

  it("limits uploaded data URLs and MIME types", () => {
    expect(documentsRouter).toContain("const MAX_DATA_URL_LENGTH = 16 * 1024 * 1024;");
    expect(documentsRouter).toContain(".max(MAX_DATA_URL_LENGTH)");
    expect(documentsRouter).toContain('"application/pdf"');
    expect(documentsRouter).toContain('"video/mp4"');
    expect(documentsRouter).toContain("ALLOWED_MIME_TYPES.has(mimeType)");
  });

  it("limits signatures to bounded PNG payloads", () => {
    expect(signaturesRouter).toContain("const MAX_SIGNATURE_SIZE = 2 * 1024 * 1024;");
    expect(signaturesRouter).toContain(".max(MAX_SIGNATURE_DATA_URL_LENGTH)");
    expect(signaturesRouter).toContain('mimeType !== "image/png"');
  });

  it("honors client list search and pagination in both rows and totals", () => {
    expect(database).toContain(".limit(filters?.limit ?? 50)");
    expect(database).toContain(".offset(filters?.offset ?? 0)");
    expect(database).toContain("export async function countClients(filters?: ClientListFilters)");
    expect(database).toContain("like(clients.firstName, pattern)");
  });
});
