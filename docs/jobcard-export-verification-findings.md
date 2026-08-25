# Job-Card PDF Export Verification Findings

**Date:** 25 August 2026  
**Scenario:** Long client, job, item, note, and signature fields with three item-backed ZAR line items.

## Result

The generated branded job-card PDF renders with clear Houdini lime and near-black branding, measured field wrapping, readable item rows, and no text overlap on either page. The client and job-detail panels remain readable with long values; long item names wrap within their table cells while price and quantity values remain aligned.

The long-field scenario uses two pages. The first page contains the header, client/job details, item table, total, and notes. The signature section correctly moves intact to the second page rather than being cut off or overlapping preceding content. The second page is intentionally sparse because the signature block is kept together; this is a presentation trade-off for unusually long records, not a blank-page defect.

| Check | Result |
|---|---|
| Branded header and job identifier | Passed |
| Client and job detail wrapping | Passed |
| Item table alignment and totals | Passed |
| Technician and manager notes | Passed |
| Signature section continuity | Passed |
| Text overlap or clipping | Not observed |
| Unexpected blank trailing page | Not observed |
