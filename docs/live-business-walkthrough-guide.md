# Live Business Walkthrough Guide

## Purpose and Scope

The walkthrough uses three isolated local user accounts and one dedicated client-portal identity. These records are labelled **Walkthrough** and must never be used for real customer activity, payroll, operational dispatch, or production billing.

Temporary passwords are provided directly to the project owner, not written into this guide or committed with the application. Once the walkthrough has finished, either deactivate/delete the accounts and their test job or reset all associated credentials.

## Account Roles

| Walkthrough participant | Identity type | Intended access |
|---|---|---|
| Administrator | Local user account | Create/manage client records and job cards, assign the technician, and generate the client portal link. |
| Manager | Local user account | Review job items, pricing and VAT, export the pricing PDF, approve pricing, and generate the client invoice. |
| Technician | Local user account | View the directly assigned walkthrough job, progress it, add items/notes, and capture the required signature. |
| Client | Token-protected public portal | Open the test client portal link, review progress and invoice availability, and download PDFs without an internal application login. |

## Recommended Walkthrough Sequence

1. Sign in as the **Administrator** and confirm the dedicated job appears as `assigned` to the walkthrough technician. Use the client portal link only for the walkthrough client.
2. Sign in as the **Technician** in an incognito/private browser or separate browser profile. Confirm the job appears in the technician view, start it, add one or more clearly labelled test job items, and complete it. Capture a test signature only.
3. Sign in as the **Manager** in a third browser context. Confirm the pricing summary reflects the job items, download the pricing PDF, approve pricing, and generate the branded invoice. Do not add real billing information.
4. Open the **client portal** link in an unauthenticated/private browser. Confirm the progress timeline, invoice summary, job-card PDF, and invoice PDF. The online payment action is expected to remain disabled until PayFast is configured.
5. Record any issue with the role, expected result, actual result, job number, and browser/time. Do not re-use the walkthrough job for a second test run; create another labelled walkthrough job instead.

## Cleanup Requirements

After acceptance testing, an administrator should deactivate or remove the three walkthrough user accounts, the dedicated walkthrough client, the associated job card, and its portal token. If the accounts are retained for future regression checks, immediately rotate their passwords and ensure their emails remain on the `.test` domain.

> **Important:** The dedicated client uses a secure portal token rather than an internal staff account. Treat its portal URL as a credential and do not share it beyond the walkthrough participants.
