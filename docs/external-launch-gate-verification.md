# Houdini Locksmith: External Launch-Gate Verification

**Verification date:** 25 August 2026  
**Published domain:** `https://houdinilock-rhvefken.manus.space`

## Deployment Decision

The current release is **published and technically healthy for the core administration, job-card, pricing, PDF, and read-only client-portal experience**. The production HTTPS response now includes the intended security protections, the application builds successfully, and the production dependency audit reports no known vulnerabilities.

The release is **not yet ready to advertise automated customer email or online PayFast payments**. Those two commercial functions depend on external provider activation and acceptance testing. This distinction is important: the invoice PDF can already be published to a client portal, but it cannot yet be relied upon to reach a client by email, and the PayFast button must remain unavailable until configuration is complete.

| Gate | Current status | Verification evidence | Deployment decision |
|---|---|---|---|
| Published HTTPS deployment | **Passed** | The public domain responds over HTTPS and now serves HSTS, anti-framing, anti-sniffing, referrer, permissions, and cross-origin security headers. | Cleared. |
| Application workflows and authorization | **Passed in automated coverage** | 182 tests pass across authentication/RBAC, job workflow, direct assignment, pricing, invoices, client portal, quote, schedule, and PDF suites. | Cleared for controlled rollout. |
| Build and dependency health | **Passed** | TypeScript compilation and production build pass; `pnpm audit --prod` reports no known vulnerabilities. | Cleared. |
| Resend sender domain | **Blocked** | The configured Resend account lists `houdini.co.za` with status `not_started`. | Do not depend on automatic customer emails yet. |
| Resend live delivery | **Blocked** | It cannot be safely sent until the sender domain is verified. | Complete after domain verification. |
| PayFast configuration | **Blocked** | Merchant ID, key, passphrase, mode, return/cancel, and ITN/callback URLs are all absent from the managed environment. | Do not enable online payment yet. |
| PayFast callback acceptance | **Blocked** | No sandbox or production credentials are available for signed callback testing. | Complete after configuration. |
| Final multi-role business acceptance | **Requires operator confirmation** | Automated role-boundary tests pass, but a real administrator, manager, technician, and client walkthrough has not yet been recorded against the live business process. | Complete before broader customer rollout. |

## Gate 1: Published Security-Hardened Deployment — Passed

The published site is serving the latest security-hardening response headers:

| Header or control | Verified result |
|---|---|
| HTTPS transport policy | `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` |
| MIME-sniffing protection | `X-Content-Type-Options: nosniff` |
| Clickjacking protection | `X-Frame-Options: DENY` |
| Referrer handling | `Referrer-Policy: strict-origin-when-cross-origin` |
| Browser permissions | Camera, microphone, and geolocation disabled by default |
| Cross-origin protections | Opener and resource policies set to `same-origin` |

No action is needed for this gate. It should be rechecked after any future infrastructure or domain change.

## Gate 2: Resend Email Delivery — Blocked Pending Domain Verification

The Resend API key is present and the account can be queried, but the `houdini.co.za` domain has not started its verification process. This is an external DNS/provider action rather than a code defect.

### Required action in Resend

1. Sign in to the Resend account that owns the configured API key.
2. Open **Domains** and select `houdini.co.za`.
3. Copy the exact DNS records shown by Resend into the domain’s DNS provider. These commonly include one or more SPF/DKIM records, but use the current Resend-provided values rather than guessing them.
4. Wait for DNS propagation, then use Resend’s **Verify** action until the domain shows as verified.
5. Confirm that `EMAIL_FROM` uses an address on the verified domain, for example `sales@houdini.co.za`.

### Acceptance test after verification

Create a controlled test client using a mailbox you can access. Publish an approved invoice, issue the client portal link, and send the invoice notification. Confirm the following in the recipient mailbox:

| Check | Expected result |
|---|---|
| Sender identity | The message is sent from the verified Houdini address. |
| Delivery | The email arrives without a provider rejection or spam warning. |
| Portal link | The link opens the canonical `/client-portal/<token>` route in a clean browser session. |
| Invoice access | The branded PDF downloads and the item-backed ZAR total matches the approved pricing total. |
| Failure message | An invalid test recipient produces a safe operational error, not an internal stack trace. |

## Gate 3: PayFast Online Payment — Blocked Pending Merchant Setup

The managed environment does not currently contain the required PayFast merchant values. The application correctly remains in a non-payment-ready state until these are supplied.

### Information required from the PayFast merchant account

| Required value | Purpose |
|---|---|
| Merchant ID | Identifies the Houdini merchant account. |
| Merchant key | Signs payment requests. |
| Passphrase, if enabled | Included in request/callback signature validation. |
| Sandbox and production mode details | Keeps acceptance testing separate from real customer charges. |
| Return and cancel URLs | Return customers safely to the portal after payment or cancellation. |
| Notify/ITN URL | Allows PayFast to send the server-to-server payment result. |

When these values are available, provide them through the secure project configuration flow rather than chat or source code. The payment integration can then be configured and tested without exposing credentials.

### Minimum PayFast sandbox acceptance test

Before changing to production mode, test all outcomes with a test invoice and a new client portal token.

1. Complete a successful payment and confirm the invoice becomes paid exactly once.
2. Cancel a payment and confirm the invoice remains unpaid.
3. Submit a simulated failed payment and confirm the invoice remains unpaid with an actionable message.
4. Deliver the same valid ITN/callback twice and confirm the second request does not create a duplicate payment or duplicate state transition.
5. Submit an invalid signature and confirm it is rejected without changing invoice status.
6. Switch to live mode only after these checks pass and perform one controlled low-value production payment.

## Gate 4: Final Multi-Role Business Acceptance — Requires Your Confirmation

Automated regression tests verify role boundaries and workflow contracts. A brief live walkthrough remains necessary because it validates real user access, operational wording, and business configuration rather than code alone.

| Role | Required walkthrough |
|---|---|
| Administrator | Create a client, enquiry, and job card; directly assign a technician; generate a portal link. |
| Technician | Confirm the new job appears without a department assignment; start, complete, add a job item, and capture a signature if required. |
| Manager | Confirm the item-backed pricing summary is correct; download the pricing PDF; approve pricing; generate the branded client invoice. |
| Client | Open the portal in a clean browser, confirm timeline/privacy, and download the invoice PDF. After PayFast is configured, complete the sandbox payment checks. |

## Launch Order

> **Safe order of operations:** Keep the current core release published; verify the Resend domain; configure and test PayFast in sandbox; complete one multi-role walkthrough; then enable and advertise email and online payment capabilities.

Until the two provider gates are complete, the platform remains appropriate for internal job management, branded document generation, direct client-portal sharing, and manual customer follow-up. It is not yet appropriate to promise automated invoice emails or online payment collection.
