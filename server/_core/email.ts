import { Resend } from "resend";
import { ENV } from "./env";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(ENV.resendApiKey);
  }
  return _resend;
}

export type SignatureConfirmationEmailParams = {
  /** Recipient email address */
  to: string;
  /** Client full name */
  clientName: string;
  /** Job card number, e.g. JC-2026-0001 */
  jobNumber: string;
  /** Short job title / description */
  jobTitle: string;
  /** Name of the person who signed */
  signerName: string;
  /** Optional role / title of the signer */
  signerRole?: string | null;
  /** ISO date string or Date of when the signature was captured */
  signedAt: Date | string;
  /** Public S3 URL of the signature image */
  signatureUrl: string;
  /** Name of the technician who captured the signature */
  technicianName: string;
};

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-ZA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Johannesburg",
  });
}

function buildHtml(p: SignatureConfirmationEmailParams): string {
  const dateStr = formatDate(p.signedAt);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Work Completion Confirmation — ${p.jobNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#18181b;padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
                      🔐 Houdini Locksmith &amp; Security
                    </p>
                    <p style="margin:4px 0 0;font-size:13px;color:#a1a1aa;">Work Completion Confirmation</p>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;background:#22c55e;color:#fff;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;">
                      ✓ Signed
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">

              <p style="margin:0 0 8px;font-size:15px;color:#52525b;">Dear ${p.clientName},</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">
                This email confirms that the work described below has been completed and a digital signature has been captured as acknowledgement.
              </p>

              <!-- Job summary card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 16px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#71717a;">Job Details</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:5px 0;font-size:13px;color:#71717a;width:140px;">Job Reference</td>
                        <td style="padding:5px 0;font-size:13px;font-weight:600;color:#18181b;">${p.jobNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding:5px 0;font-size:13px;color:#71717a;">Description</td>
                        <td style="padding:5px 0;font-size:13px;color:#3f3f46;">${p.jobTitle}</td>
                      </tr>
                      <tr>
                        <td style="padding:5px 0;font-size:13px;color:#71717a;">Technician</td>
                        <td style="padding:5px 0;font-size:13px;color:#3f3f46;">${p.technicianName}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Signature section -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 16px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#16a34a;">Signature Record</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:5px 0;font-size:13px;color:#15803d;width:140px;">Signed by</td>
                        <td style="padding:5px 0;font-size:13px;font-weight:600;color:#14532d;">${p.signerName}</td>
                      </tr>
                      ${p.signerRole ? `
                      <tr>
                        <td style="padding:5px 0;font-size:13px;color:#15803d;">Role</td>
                        <td style="padding:5px 0;font-size:13px;color:#14532d;">${p.signerRole}</td>
                      </tr>` : ""}
                      <tr>
                        <td style="padding:5px 0;font-size:13px;color:#15803d;">Date &amp; Time</td>
                        <td style="padding:5px 0;font-size:13px;color:#14532d;">${dateStr}</td>
                      </tr>
                    </table>

                    <!-- Signature image -->
                    <div style="margin-top:16px;background:#ffffff;border:1px solid #bbf7d0;border-radius:6px;padding:12px;text-align:center;">
                      <img src="${p.signatureUrl}" alt="Client signature" width="320" style="max-width:100%;height:auto;display:block;margin:0 auto;" />
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#71717a;line-height:1.6;">
                If you have any questions or concerns about the work completed, please contact us directly and reference job number <strong>${p.jobNumber}</strong>.
              </p>
              <p style="margin:0;font-size:13px;color:#71717a;">
                Thank you for choosing Houdini Locksmith &amp; Security.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f4f4f5;padding:20px 32px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">
                This is an automated confirmation email from Houdini Locksmith &amp; Security.<br />
                Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type InviteEmailParams = {
  /** Recipient email address */
  to: string;
  /** Role being invited to */
  role: "admin" | "manager" | "technician";
  /** Full invite URL including token */
  inviteUrl: string;
  /** Name of the admin who sent the invite */
  invitedByName: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Manager",
  technician: "Technician",
};

function buildInviteHtml(p: InviteEmailParams): string {
  const roleLabel = ROLE_LABELS[p.role] ?? p.role;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You've been invited to Houdini Locksmith &amp; Security</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#18181b;padding:28px 32px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">🔐 Houdini Locksmith &amp; Security</p>
              <p style="margin:4px 0 0;font-size:13px;color:#a1a1aa;">Team Invitation</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">
                <strong>${p.invitedByName}</strong> has invited you to join the Houdini Locksmith &amp; Security team as a <strong>${roleLabel}</strong>.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">
                Click the button below to create your account. This invite link expires in <strong>48 hours</strong> and can only be used once.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${p.inviteUrl}" style="display:inline-block;background:#18181b;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:-0.2px;">Accept Invitation</a>
              </div>
              <p style="margin:0 0 8px;font-size:13px;color:#71717a;">Or copy and paste this link into your browser:</p>
              <p style="margin:0 0 24px;font-size:12px;color:#a1a1aa;word-break:break-all;font-family:monospace;background:#f4f4f5;padding:10px 12px;border-radius:6px;">${p.inviteUrl}</p>
              <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">
                If you did not expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f4f4f5;padding:20px 32px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">
                This is an automated invitation from Houdini Locksmith &amp; Security.<br />
                Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send a team invitation email to a new user via Resend.
 * Returns `true` if accepted, `false` on any error (non-fatal).
 */
export async function sendInviteEmail(params: InviteEmailParams): Promise<boolean> {
  if (!ENV.resendApiKey) {
    console.warn("[Email] RESEND_API_KEY is not configured — skipping invite email.");
    return false;
  }
  if (!params.to || !params.to.includes("@")) {
    console.warn("[Email] Invalid recipient email — skipping invite email.");
    return false;
  }
  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: ENV.emailFrom,
      to: params.to,
      subject: `You've been invited to join Houdini Locksmith & Security`,
      html: buildInviteHtml(params),
    });
    if (error) {
      console.warn("[Email] Resend returned an error sending invite:", error);
      return false;
    }
    console.log(`[Email] Invite email sent to ${params.to} (role: ${params.role})`);
    return true;
  } catch (err) {
    console.warn("[Email] Failed to send invite email:", err);
    return false;
  }
}

/**
 * Send a work-completion confirmation email to the client after a digital
 * signature has been successfully captured and uploaded to S3.
 *
 * Returns `true` if the email was accepted by Resend, `false` on any error
 * (so callers can log a warning without failing the overall capture flow).
 */
export async function sendSignatureConfirmationEmail(
  params: SignatureConfirmationEmailParams
): Promise<boolean> {
  if (!ENV.resendApiKey) {
    console.warn("[Email] RESEND_API_KEY is not configured — skipping confirmation email.");
    return false;
  }
  if (!params.to || !params.to.includes("@")) {
    console.warn("[Email] Client has no valid email address — skipping confirmation email.");
    return false;
  }

  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: ENV.emailFrom,
      to: params.to,
      subject: `Work Completion Confirmation — ${params.jobNumber}`,
      html: buildHtml(params),
    });

    if (error) {
      console.warn("[Email] Resend returned an error:", error);
      return false;
    }

    console.log(`[Email] Signature confirmation sent to ${params.to} for job ${params.jobNumber}`);
    return true;
  } catch (err) {
    console.warn("[Email] Failed to send signature confirmation email:", err);
    return false;
  }
}

// ─── Client Portal Link Email ─────────────────────────────────────────────────

export interface ClientPortalEmailParams {
  to: string;
  clientFirstName: string;
  jobNumber: string;
  jobTitle: string;
  portalUrl: string;
  expiresLabel?: string;
}

function buildClientPortalHtml(p: ClientPortalEmailParams): string {
  const expiryNote = p.expiresLabel
    ? `<p style="margin:0 0 16px;font-size:13px;color:#71717a;">This link is valid until <strong>${p.expiresLabel}</strong>.</p>`
    : `<p style="margin:0 0 16px;font-size:13px;color:#71717a;">This link does not expire.</p>`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#0a0f0a;padding:28px 32px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#84cc16;">🔐 Houdini Locksmith &amp; Security</p>
          <p style="margin:4px 0 0;font-size:13px;color:#a1a1aa;">Job Status Update</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">Hi <strong>${p.clientFirstName}</strong>,</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">
            Your job <strong>${p.jobNumber}</strong> — <em>${p.jobTitle}</em> — is now being tracked. View the live status, scheduled appointment, photos, and your signed job card at any time using the link below.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${p.portalUrl}" style="display:inline-block;background:#84cc16;color:#0a0f0a;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">View Job Status</a>
          </div>
          ${expiryNote}
          <p style="margin:0 0 8px;font-size:13px;color:#71717a;">Or copy and paste this link:</p>
          <p style="margin:0 0 24px;font-size:12px;color:#a1a1aa;word-break:break-all;font-family:monospace;background:#f4f4f5;padding:10px 12px;border-radius:6px;">${p.portalUrl}</p>
          <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">If you have questions, contact us and reference job number <strong>${p.jobNumber}</strong>.</p>
        </td></tr>
        <tr><td style="background:#f4f4f5;padding:20px 32px;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">Houdini Locksmith &amp; Security · Automated notification<br/>Please do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendClientPortalEmail(params: ClientPortalEmailParams): Promise<boolean> {
  if (!ENV.resendApiKey) { console.warn("[Email] RESEND_API_KEY not configured — skipping portal email."); return false; }
  if (!params.to || !params.to.includes("@")) { console.warn("[Email] Invalid recipient — skipping portal email."); return false; }
  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: ENV.emailFrom,
      to: params.to,
      subject: `Your job status link — ${params.jobNumber}`,
      html: buildClientPortalHtml(params),
    });
    if (error) { console.warn("[Email] Resend error sending portal email:", error); return false; }
    console.log(`[Email] Portal link email sent to ${params.to} for job ${params.jobNumber}`);
    return true;
  } catch (err) {
    console.warn("[Email] Failed to send portal email:", err);
    return false;
  }
}


// ─────────────────────────────────────────────
// QUOTE EMAIL
// ─────────────────────────────────────────────

export type SendQuoteEmailParams = {
  /** Recipient email address */
  to: string;
  /** Client full name */
  clientName: string;
  /** Quote number, e.g. QT-2026-0001 */
  quoteNumber: string;
  /** Public URL to view the quote */
  quoteUrl: string;
  /** Quote items */
  items: Array<{ name: string; quantity: number; unitPrice: string; lineTotal: string }>;
  /** Total amount in ZAR */
  total: string;
  /** VAT amount in ZAR */
  vat: string;
  /** Grand total including VAT in ZAR */
  grandTotal: string;
  /** Optional expiry date */
  expiresAt?: Date | null;
};

function buildQuoteEmailHtml(p: SendQuoteEmailParams): string {
  const expiryText = p.expiresAt
    ? `<p style="margin:0 0 16px;font-size:13px;color:#dc2626;"><strong>⏰ This quote expires on ${formatDate(p.expiresAt)}</strong></p>`
    : "";

  const itemsHtml = p.items
    .map(
      (item) =>
        `<tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:12px 0;font-size:14px;color:#3f3f46;">${item.name}</td>
          <td style="padding:12px 0;text-align:center;font-size:14px;color:#3f3f46;">${item.quantity}</td>
          <td style="padding:12px 0;text-align:right;font-size:14px;color:#3f3f46;">R ${parseFloat(item.unitPrice).toFixed(2)}</td>
          <td style="padding:12px 0;text-align:right;font-size:14px;color:#3f3f46;font-weight:600;">R ${parseFloat(item.lineTotal).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Quote — ${p.quoteNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:#0a0f0a;padding:28px 32px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#84cc16;">🔐 Houdini Locksmith &amp; Security</p>
          <p style="margin:4px 0 0;font-size:13px;color:#a1a1aa;">Quote Request</p>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">Hi <strong>${p.clientName}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">
            We've prepared a quote for your service request. Please review the details below and let us know if you'd like to proceed.
          </p>
          ${expiryText}
          <!-- Quote Details -->
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:24px 0;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;">Quote Number</p>
            <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#18181b;">${p.quoteNumber}</p>
          </div>
          <!-- Items Table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border-collapse:collapse;">
            <tr style="border-bottom:2px solid #84cc16;">
              <th style="padding:12px 0;text-align:left;font-size:12px;font-weight:700;color:#0a0f0a;text-transform:uppercase;">Item</th>
              <th style="padding:12px 0;text-align:center;font-size:12px;font-weight:700;color:#0a0f0a;text-transform:uppercase;">Qty</th>
              <th style="padding:12px 0;text-align:right;font-size:12px;font-weight:700;color:#0a0f0a;text-transform:uppercase;">Unit Price</th>
              <th style="padding:12px 0;text-align:right;font-size:12px;font-weight:700;color:#0a0f0a;text-transform:uppercase;">Total</th>
            </tr>
            ${itemsHtml}
          </table>
          <!-- Totals -->
          <div style="margin:24px 0;border-top:1px solid #e5e7eb;padding-top:16px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;text-align:right;font-size:14px;color:#3f3f46;">Subtotal:</td>
                <td style="padding:8px 0 8px 16px;text-align:right;font-size:14px;color:#3f3f46;font-weight:600;">R ${parseFloat(p.total).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;text-align:right;font-size:14px;color:#3f3f46;">VAT (15%):</td>
                <td style="padding:8px 0 8px 16px;text-align:right;font-size:14px;color:#3f3f46;font-weight:600;">R ${parseFloat(p.vat).toFixed(2)}</td>
              </tr>
              <tr style="border-top:2px solid #84cc16;">
                <td style="padding:12px 0;text-align:right;font-size:15px;font-weight:700;color:#0a0f0a;">Grand Total:</td>
                <td style="padding:12px 0 12px 16px;text-align:right;font-size:15px;font-weight:700;color:#0a0f0a;">R ${parseFloat(p.grandTotal).toFixed(2)}</td>
              </tr>
            </table>
          </div>
          <!-- CTA -->
          <div style="text-align:center;margin:32px 0;">
            <a href="${p.quoteUrl}" style="display:inline-block;background:#84cc16;color:#0a0f0a;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">Review &amp; Accept Quote</a>
          </div>
          <p style="margin:0 0 8px;font-size:13px;color:#71717a;">Or copy and paste this link:</p>
          <p style="margin:0 0 24px;font-size:12px;color:#a1a1aa;word-break:break-all;font-family:monospace;background:#f4f4f5;padding:10px 12px;border-radius:6px;">${p.quoteUrl}</p>
          <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">If you have any questions, please contact us and reference quote number <strong>${p.quoteNumber}</strong>.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f4f4f5;padding:20px 32px;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">Houdini Locksmith &amp; Security · Automated notification<br/>Please do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendQuoteEmail(params: SendQuoteEmailParams): Promise<boolean> {
  if (!ENV.resendApiKey) {
    console.warn("[Email] RESEND_API_KEY not configured — skipping quote email.");
    return false;
  }
  if (!params.to || !params.to.includes("@")) {
    console.warn("[Email] Invalid recipient — skipping quote email.");
    return false;
  }
  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: ENV.emailFrom,
      to: params.to,
      subject: `Quote ${params.quoteNumber} from Houdini Locksmith & Security`,
      html: buildQuoteEmailHtml(params),
    });
    if (error) {
      console.warn("[Email] Resend error sending quote email:", error);
      return false;
    }
    console.log(`[Email] Quote email sent to ${params.to} for quote ${params.quoteNumber}`);
    return true;
  } catch (err) {
    console.warn("[Email] Failed to send quote email:", err);
    return false;
  }
}
