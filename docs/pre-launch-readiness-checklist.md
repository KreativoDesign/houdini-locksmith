# Houdini Locksmith & Security: Pre-Launch Readiness Checklist

**Verification date:** 25 August 2026  
**Published site:** `https://houdinilock-rhvefken.manus.space`  
**Assessment scope:** Security, core workflows, job-card and invoice PDFs, portal checkout readiness, deployment health, and external launch dependencies.

## Executive Readiness Position

The published platform is **ready for controlled use of its core operations**: job and client management, direct technician assignment, item-backed pricing, branded job-card/invoice PDF downloads, and token-protected client portal access. The live site returns HTTP 200 and exposes the intended HTTPS security headers. The current codebase passed the automated regression suite, TypeScript validation, production build, and production dependency audit.

Two customer-facing commercial capabilities remain intentionally unavailable: **automated email delivery** and **online PayFast payment**. The Resend sender domain has not started verification, and PayFast credentials/callback configuration are absent. These are provider-account and merchant-configuration gates rather than source-code failures. The platform can be used before these gates close, provided staff share portal links directly and handle payments through existing offline business processes.

> **Deployment decision:** Keep the present core release published. Do not advertise automated invoice email or online payment until the provider gates and the final business-role smoke test are complete.

## Verified Technical Readiness

| Area | Status | Verification completed | Release implication |
|---|---|---|---|
| Published domain availability | **Passed** | HTTPS root request returned HTTP 200. | Public release is reachable. |
| Published security headers | **Passed** | HSTS, anti-sniffing, anti-framing, referrer, permissions, and cross-origin headers observed on the public domain. | Security-hardened deployment is active. |
| Dependency health | **Passed** | `pnpm audit --prod` reported no known vulnerabilities. | No known production package advisories at verification time. |
| Automated workflows | **Passed** | Full suite: 182 tests across 16 test files. | Core behavioral contracts remain covered. |
| Type safety | **Passed** | `pnpm check` completed with no errors. | No TypeScript compile blocker. |
| Production build | **Passed** | Client/server production bundle generated successfully. | Deployment artifact builds successfully. |
| Production runtime signals | **Passed with expected unauthenticated probes** | Recent runtime logs show startup and missing-session checks, with no reviewed application exception. | No immediate production runtime blocker identified. |
| Role access boundaries | **Passed in automated coverage** | RBAC test coverage spans administrator, manager, technician, protected, and unauthenticated paths. | Server authorization contracts are validated. |

## Job-Card, Pricing, and PDF Workflow

| Workflow step | Status | Evidence |
|---|---|---|
| Job-card item values feed pricing totals | **Passed** | Pricing synchronization regression tests passed. Job items populate labour/materials, subtotal, VAT, and total. |
| Zero-value safeguard | **Passed** | Approval/invoice publication rejects inconsistent zero-value pricing where billable items exist. |
| Pricing PDF export | **Passed** | Pricing workflow tests passed and the page supports corrected pricing-summary export. |
| Branded job-card PDF | **Passed** | A representative long-field PDF exported successfully with Houdini styling. Client/job data, long item names, quantities, ZAR values, notes, and signature details rendered without overlap. |
| PDF continuation behavior | **Passed** | In the long-field scenario, the signature block flowed intact to a second page; no clipping, overlap, or blank trailing page was observed. |
| Branded invoice PDF | **Passed** | Invoice PDF coverage passed for itemized job data, VAT, ZAR totals, and Houdini presentation. |
| Portal invoice access | **Passed** | Client portal regression coverage passed for workflow stages, published invoice PDF access, and privacy-safe job visibility. |

## Checkout Readiness

The portal has the correct protective behavior for the current state. Once an invoice is published, the client can download it from the secure portal. The **Pay Invoice Online** control remains disabled when the payment provider is not configured, and it displays an operational message instructing clients to contact Houdini for assistance. This is the expected safe state; no payment request is attempted without merchant configuration.

| Checkout gate | Status | Required next step |
|---|---|---|
| Merchant ID | **Missing** | Obtain from the Houdini PayFast merchant account. |
| Merchant key | **Missing** | Obtain from the Houdini PayFast merchant account. |
| Passphrase | **Missing** | Supply if enabled for the PayFast account. |
| Sandbox/production mode | **Missing** | Begin with sandbox mode. |
| Return and cancel URLs | **Missing** | Configure portal-safe URLs. |
| Notify/ITN callback URL | **Missing** | Configure the server callback endpoint and validate signatures. |
| Sandbox success, cancel, fail, invalid-signature, and duplicate-callback tests | **Not yet possible** | Run after all required merchant settings are supplied. |

## Email Readiness

The Resend account is reachable, but its `houdini.co.za` sender domain reports `not_started`. Consequently, automatic invoice and portal-link email must remain treated as unavailable. Portal links and branded PDF documents can still be shared directly by staff.

| Email gate | Status | Required action |
|---|---|---|
| Sender-domain verification | **Pending / deferred** | Add the exact Resend-provided DNS records for `houdini.co.za`, then verify the domain in Resend. |
| Sender identity | **Pending** | Confirm `EMAIL_FROM` uses an address on the verified domain. |
| Controlled delivery test | **Pending** | Send a test portal/invoice email to an accessible mailbox and validate sender, link, PDF, and failure handling. |

## Required Business Acceptance Before Broader Rollout

Automated checks prove the technical contracts. A short live walkthrough is still required to confirm real-world staff roles and operating procedures.

| Participant | Acceptance task | Completion state |
|---|---|---|
| Administrator | Create a client, enquiry, and job card; directly assign a technician; copy a client portal link. | Pending operator walkthrough. |
| Technician | Confirm the job appears; start and complete it; add billable items; capture a signature where required. | Pending operator walkthrough. |
| Manager | Confirm pricing totals; export pricing PDF; approve pricing; create the branded invoice. | Pending operator walkthrough. |
| Client test user | Open the portal in a clean browser; confirm privacy and status timeline; download job card/invoice PDFs. | Pending operator walkthrough. |
| PayFast sandbox test user | Test success, cancellation, failure, invalid signature, and duplicate ITN behavior. | Blocked until merchant configuration. |

## Non-Blocking Follow-Up

The production build emits a client-bundle size warning for an approximately 854 kB minified entry bundle. It does not block the build or current deployment, and route-level lazy loading is already present. Continue reducing bundle size opportunistically as future features are added.

## Final Checklist

- [x] Published security-hardened release available at the managed HTTPS domain.
- [x] Dependency audit is clean.
- [x] 182 automated tests pass.
- [x] TypeScript check passes.
- [x] Production build succeeds.
- [x] Item-backed pricing, job-card PDF export, invoice PDF, and portal invoice workflows are validated.
- [x] Checkout is safely disabled while PayFast is unconfigured.
- [ ] Verify the Resend custom sender domain when ready.
- [ ] Configure PayFast in sandbox and complete payment/ITN acceptance tests.
- [ ] Record the four-role live business walkthrough.

**Current recommendation:** Continue using the published release for core operational workflows. Close the three unchecked items before publicly promising customer email notifications or online card payment.
