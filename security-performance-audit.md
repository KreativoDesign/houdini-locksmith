# Houdini Locksmith Security and Performance Audit

## Audit status

This document records verified findings from the local codebase, package manager audit, build output, runtime health check, and the existing automated test suite. Secret values are intentionally excluded.

## Verified baseline

| Check | Result |
|---|---|
| Full Vitest suite after hardening | 12 test files, 170 tests passing |
| TypeScript check | Clean; no errors |
| Production build | Successful |
| Dev server | Running; dependencies and language service healthy |
| Resend API key | Live read-only domains call succeeded |

## Security findings and changes

| Finding | Severity | Status |
|---|---:|---|
| Production error boundary rendered `error.stack` to end users | High | Fixed; stack details are now development-only |
| Global Express JSON and URL-encoded body limits were 50 MB | High | Fixed; limits are now 16 MB JSON and 1 MB URL-encoded |
| Document uploads accepted arbitrary user-controlled MIME types | High | Fixed; data URL length, MIME allowlist, filename, and description limits added |
| Signature uploads had no encoded-size or MIME guard | High | Fixed; PNG-only, 2 MB decoded limit, and 3 MB encoded limit added |
| Client list route declared search/pagination but database helper ignored them | Medium | Fixed; active filtering, search, limit, offset, and matching totals now apply |
| Session cookie uses `SameSite=None` | Medium | Requires deployment-context decision; changing it may affect cross-site OAuth/embedding behavior |

## Dependency audit

`pnpm audit --prod` reported 1 critical, 14 high, 32 moderate, and 9 low advisories across 650 production dependencies. Key affected paths include `fast-xml-parser` through the AWS SDK, `axios`/`form-data`, `lodash-es` through `streamdown`/Mermaid, `nanoid`, `path-to-regexp` through Express 4, `DOMPurify`, `qs`, `uuid`, and `body-parser`. Dependency remediation was not applied in this audit because several fixes require transitive overrides or major-version upgrades and need isolated validation.

## Performance findings

The production client bundle is approximately 1.89 MB minified and 367 KB gzip, with CSS approximately 172 KB minified and 26 KB gzip. Vite warns that the main JavaScript chunk exceeds 500 KB. The application also has several unpaginated list helpers and limited secondary indexes in the schema; the client-list path was fixed, but broader query/index work remains a follow-up performance task. Base64 uploads add approximately 33% encoding overhead; direct-to-storage uploads would be the preferred longer-term optimization.

## Release considerations

Live penetration testing, load testing, WAF/DDoS validation, and dependency upgrade remediation require separate production infrastructure and change-management steps. PayFast and Resend domain verification remain external integration blockers documented in the environment audit.
