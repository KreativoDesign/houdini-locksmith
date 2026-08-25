# Houdini Locksmith & Security: Go-Live Readiness Assessment

**Assessment date:** 25 August 2026  
**Scope:** Application security, release configuration, automated workflow coverage, dependency health, runtime signals, and external-service launch gates.

## Release Position

The application is a **technically validated release candidate** for its core operational workflows. Automated tests, TypeScript compilation, the production build, and the production dependency audit all pass. The platform should not, however, be described as “100% proven” until the remaining live third-party acceptance checks are performed. In particular, the customer email domain and PayFast payment credentials must be activated and tested before relying on those functions in production.

| Area | Assessment | Evidence from this review |
|---|---|---|
| Core job, client, technician, pricing, portal, invoice, and PDF workflows | **Validated by automated regression coverage** | 182 tests across 16 test files, including direct technician assignment, pricing synchronization, client portal, invoice PDF, job-card PDF, schedules, and workflow transitions. |
| Authentication and role boundaries | **Validated** | 33 RBAC tests cover unauthenticated, technician, manager, and administrator boundaries. Session cookies are `httpOnly`; secure transport is enabled for HTTPS/proxy HTTPS requests. |
| Upload and input safeguards | **Validated** | Global body limits are bounded, document MIME types and data URL sizes are checked, and signatures are restricted to bounded PNG data. |
| Production dependency health | **Validated** | `pnpm audit --prod` reports no known vulnerabilities after upgrading Express, Streamdown, Resend, and aligning the tRPC packages. |
| Browser and transport safeguards | **Validated in the release candidate** | The server removes `X-Powered-By` and supplies anti-sniffing, anti-framing, referrer, browser capability, cross-origin isolation, and HTTPS transport-security headers. |
| Published production deployment | **Requires republish** | The currently published domain still serves the earlier deployment, which does not yet include the new response-header hardening. Publish the saved security checkpoint before the final live verification. |

## Security Controls Confirmed

The review confirmed role-gated server procedures for administrator and manager actions, token-based public client portal access, bounded request payloads, scoped document and signature upload validation, and production error boundaries that do not display internal error stacks. Public portal job-status access requires a 64-character token, while anonymous quote actions validate their token and reject repeated acceptance or rejection states.

The release candidate now adds the following HTTP protections without introducing a restrictive content policy that could interfere with the Google Maps and storage-backed media used by the application.

| Protection | Release-candidate behaviour |
|---|---|
| Framework disclosure | Disables the Express `X-Powered-By` header. |
| Content-type handling | Sends `X-Content-Type-Options: nosniff`. |
| Clickjacking mitigation | Sends `X-Frame-Options: DENY`. |
| Referrer privacy | Sends `Referrer-Policy: strict-origin-when-cross-origin`. |
| Browser capabilities | Sends a restrictive permissions policy for camera, microphone, and geolocation. |
| Cross-origin isolation | Sends opener and resource policies set to `same-origin`. |
| HTTPS persistence | Sends HSTS for HTTPS/proxy-HTTPS requests. |
| Query parsing | Uses Express’s simple query parser, avoiding unnecessary nested query parsing on the tRPC endpoint. |

## Workflow Coverage Confirmed

The automated suite covers the principal workflow contracts rather than only page rendering. It includes authentication and logout behaviour, role access, client and enquiry handling, direct technician assignment, job status/timeline transitions, scheduling, job items and pricing synchronization, approval controls, invoice generation, client-portal status and document access, quote actions, upload safeguards, and branded PDF generation. A representative long-field job-card PDF was also visually checked to confirm it does not produce overlapping field content or a trailing blank page.

The runtime review found no new browser-console errors dated 25 August 2026. Production logs show periodic unauthenticated session checks, which are expected for public/health-style visits; no application exception was recorded in the reviewed production log window.

## Required Launch Gates

The following items are **external or operational gates**, not unresolved source-code defects. They must be completed before advertising the affected functions as live.

| Priority | Gate | Why it matters | Required completion evidence |
|---|---|---|---|
| Blocker for email delivery | Verify the `houdini.co.za` sender domain in Resend and confirm `EMAIL_FROM` uses that verified domain. | Resend blocks sender delivery until domain verification is complete. Portal invoice publication still works, but email notifications cannot be relied upon. | Send a controlled invoice and portal-link email to a real test mailbox and confirm receipt, link access, and attachment/portal behaviour. |
| Blocker for online payment | Add PayFast merchant ID, key, passphrase, mode, return/cancel URLs, and ITN/callback configuration. | The application intentionally keeps payment unavailable until valid credentials exist. | Run PayFast sandbox success, cancel, invalid-signature, duplicate-callback, and failure scenarios; then repeat an approved production test. |
| Blocker for this security release | Publish the latest saved checkpoint. | The public domain presently responds from an older deployment and therefore does not yet include the new header and dependency hardening. | Publish the checkpoint, then recheck HTTPS response headers and complete a short smoke test on the public domain. |
| Required operational acceptance | Perform a controlled user acceptance pass with an administrator, manager, technician, and client portal link. | Automated tests prove application contracts; a live role-based walk-through confirms configuration, browser behaviour, and business process readiness. | Record successful completion of the checklist below. |

## Final Production Smoke Test

Use a non-production test client and job card, then perform the following after publishing the checkpoint and enabling the required third-party credentials.

1. Sign in as an administrator and create a client, enquiry, and job card with a directly assigned technician.
2. Sign in as the technician, start the job, add an item/photo/signature where applicable, and move the job to completion.
3. Sign in as a manager, confirm item-backed pricing totals, download the pricing PDF, submit/approve pricing, and generate the branded invoice.
4. Open the copied `/client-portal/<token>` link in a clean browser session. Confirm job progress, pricing/invoice visibility, PDF download, and absence of internal notes.
5. Verify the email notification arrives from the verified sender domain and opens the correct canonical portal URL.
6. In PayFast sandbox, complete success, cancel, failure, and duplicate callback cases; confirm invoice status changes only after a verified provider result.
7. Re-run `pnpm test`, `pnpm check`, `pnpm build`, and `pnpm audit --prod` against the release candidate if any configuration-dependent code changes are made.

## Non-Blocking Follow-Up Items

The production build continues to report one large client bundle warning. This is not a build failure and does not block the current release, but further chunk splitting remains advisable as the application grows. The build tooling also reports a peer-range warning for a development-only Vite plugin; it does not affect the tested application build, but should be revisited when the build toolchain is next upgraded.

## Recommendation

> **Recommendation:** Treat the present codebase as ready for controlled production release of the core operational system once the newest checkpoint is published. Treat automated emails and online payments as **not ready to advertise** until Resend domain verification and the PayFast acceptance tests are complete. After those external gates and the final smoke test pass, the application can be treated as ready for broader customer use.
