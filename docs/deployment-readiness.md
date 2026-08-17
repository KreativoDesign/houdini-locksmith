# Houdini Locksmith Deployment Readiness

## Current Release Checkpoint

The current audited project checkpoint is `d7f35616`. The project has a running development server, clean TypeScript compilation, a successful production build, and 170 passing automated tests.

## Publish Workflow

Before publishing, review the latest checkpoint in the project management interface and confirm the homepage preview. Use the **Publish** action from the management header to release the checkpoint. The current managed domain is `houdinilock-rhvefken.manus.space`.

The public homepage contains the uploaded Houdini logo, the Lockbro mascot hero asset, the official service cards, and the supplied contact information:

| Contact item | Production value |
|---|---|
| Telephone | 041 365 7565 |
| Email | sales@houdini.co.za |
| Physical address | 313 Cape Road, Newton Park, 6070 |

## Homepage Services

The homepage service section reflects the six categories published on the official Houdini services page: Locks, CCTV, Safes, Intercoms, Electric Fencing, and Keys. Each card preserves the existing neon glow, hover transition, responsive grid, and contact-form selection behavior.

## Required Production Configuration

Secret values must be entered through the managed project secrets interface and must not be committed to source control.

| Configuration | Status | Required action |
|---|---|---|
| Database, authentication, OAuth, and Manus Forge variables | Configured | No action unless the deployment environment changes. |
| Resend API key | Present and live-validated | Verify the `houdini.co.za` sender domain before relying on customer email delivery. |
| `EMAIL_FROM` | Configured | Use a sender address on the verified domain. |
| PayFast merchant credentials | Missing | Add `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, and the related passphrase/configuration before enabling live payment flows. |
| PayFast mode | Not live-validated | Use sandbox credentials for acceptance testing, then switch to production credentials only after callback verification. |
| `VITE_FRONTEND_URL` | Optional fallback currently exists | Set it explicitly to the final public domain for stable generated links. |

## Verification Checklist

Run the following commands from the project directory before a significant release:

```bash
pnpm test
pnpm check
pnpm build
```

The expected baseline is 170 passing tests, zero TypeScript errors, and a successful client/server production build. The build currently emits a Vite warning for a client chunk larger than 500 kB; route-level code splitting is a future performance improvement rather than a current build failure.

## External-Service Acceptance Tests

After the required credentials and domain verification are available, perform a controlled acceptance test for customer email delivery and PayFast sandbox callbacks. Confirm that an email link opens the public portal, that payment success and failure callbacks are idempotent, and that invoice status transitions are recorded only after a verified provider response.

## Security Notes

Production error boundaries suppress internal stack traces. Request-body limits and document/signature upload validation are hardened. Do not paste API keys into source files, issue comments, screenshots, or support tickets. Rotate credentials if they are ever exposed.


## Customer Portal Administration

Managers and administrators can generate a portal link from a job card. The generated token is 64 hexadecimal characters and the public route is `/portal/<token>`. When the frontend supplies its origin, the returned URL is a complete link such as `https://your-public-domain.example/portal/<64-character-token>`.

The `generateLink` procedure accepts an optional expiry of 7, 14, or 30 days. Omitting the expiry leaves the link without an expiry date. A regenerated link reuses the stored token for that job card while updating the expiry setting. If the linked client has an email address, the application attempts to send the portal URL automatically.

The public portal is read-only for job progress, technician assignment, schedule information, signatures, photos, visible job items, and pricing totals. It does not require customer authentication. Invalid or expired tokens return a generic invalid-or-expired-link response and do not expose internal job notes.

Before launch, verify the public route with a non-production test job and confirm that the email sender domain is verified. Do not include portal tokens in screenshots, support tickets, or public documentation because possession of a valid token grants access to the associated read-only portal view.
