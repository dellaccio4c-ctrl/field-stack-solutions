import { Resend } from "resend";
import { COMPANY } from "@/lib/company";

// Emails send once RESEND_API_KEY is set (resend.com — free tier available).
// EMAIL_FROM must be a sender verified in Resend, e.g. "Field Stack Solutions <billing@fieldstacksolutions.com>".

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendWelcomeEmail(opts: {
  to: string;
  name: string;
  link: string;
  isCustomer?: boolean;
}) {
  if (!emailConfigured()) {
    return { error: "Email not configured" };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: opts.to,
    subject: `Welcome to ${COMPANY.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#0e1f38;padding:20px 24px;border-radius:12px 12px 0 0">
          <span style="color:#fff;font-size:18px;font-weight:800">${COMPANY.name}</span>
        </div>
        <div style="border:1px solid #e4e9f1;border-top:0;padding:24px;border-radius:0 0 12px 12px">
          <p>Hi ${opts.name || "there"},</p>
          <p><b>Welcome to ${COMPANY.name} — we're glad to have you ${
            opts.isCustomer ? "on board" : "joining us"
          }!</b></p>
          <p>Please use the link below to set up your profile and choose your password:</p>
          <p style="margin:24px 0">
            <a href="${opts.link}" style="background:#ff8a1e;color:#fff;font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none">Set up my profile →</a>
          </p>
          <p style="font-size:13px;color:#5a6b85">This link is unique to you — don't forward it. If you weren't expecting this email, you can ignore it.</p>
          <p style="margin-top:24px">— The ${COMPANY.name} team<br/>
          <a href="https://${COMPANY.website}" style="color:#b9700f">${COMPANY.website}</a></p>
        </div>
      </div>`,
  });
  return { error: error ? error.message : null };
}

export async function sendEstimateFollowUp(opts: {
  to: string;
  customerName: string;
  number: string;
  title: string;
  total: string;
  followUpNumber: number;
}) {
  if (!emailConfigured()) return { error: "Email not configured" };

  const closing =
    opts.followUpNumber >= 3
      ? "If now isn't the right time, just let us know — we're happy to revisit whenever works for you."
      : "If you have any questions or would like to adjust anything, just reply to this email.";

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: opts.to,
    subject: `Following up on estimate ${opts.number} — ${COMPANY.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#0e1f38;padding:20px 24px;border-radius:12px 12px 0 0">
          <span style="color:#fff;font-size:18px;font-weight:800">${COMPANY.name}</span>
        </div>
        <div style="border:1px solid #e4e9f1;border-top:0;padding:24px;border-radius:0 0 12px 12px">
          <p>Hi ${opts.customerName},</p>
          <p>Just checking in on estimate <b>${opts.number}</b> (${opts.title}) for <b>${opts.total}</b> — it's ready whenever you are.</p>
          <p>You can review and approve it from your portal at
          <a href="https://${COMPANY.website}/login" style="color:#b9700f">${COMPANY.website}</a>.</p>
          <p>${closing}</p>
          <p style="margin-top:24px">Thank you,<br/><b>${COMPANY.name}</b></p>
        </div>
      </div>`,
  });
  return { error: error ? error.message : null };
}

export async function sendDocumentEmail(opts: {
  to: string;
  kind: "Estimate" | "Invoice";
  number: string;
  customerName: string;
  total: string;
  pdf: Buffer;
}) {
  if (!emailConfigured()) {
    return {
      error:
        "Email is not configured yet. Add RESEND_API_KEY and EMAIL_FROM to the environment.",
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: opts.to,
    subject: `${opts.kind} ${opts.number} from ${COMPANY.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#0e1f38;padding:20px 24px;border-radius:12px 12px 0 0">
          <span style="color:#fff;font-size:18px;font-weight:800">${COMPANY.name}</span>
        </div>
        <div style="border:1px solid #e4e9f1;border-top:0;padding:24px;border-radius:0 0 12px 12px">
          <p>Hi ${opts.customerName},</p>
          <p>Please find attached ${opts.kind.toLowerCase()} <b>${opts.number}</b> for <b>${opts.total}</b>.</p>
          <p>If you have any questions, just reply to this email.</p>
          <p style="margin-top:24px">Thank you,<br/><b>${COMPANY.name}</b><br/>
          <a href="https://${COMPANY.website}" style="color:#b9700f">${COMPANY.website}</a></p>
        </div>
      </div>`,
    attachments: [
      { filename: `${opts.number}.pdf`, content: opts.pdf },
    ],
  });

  return { error: error ? error.message : null };
}

// Generic in-app event alert, gated by each recipient's notify_prefs.
export async function sendAlertEmail(opts: {
  to: string[];
  subject: string;
  bodyHtml: string;
  link?: string;
}) {
  if (!emailConfigured() || !opts.to.length) return { error: "skipped" };
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: opts.to,
    subject: opts.subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#0e1f38;padding:20px 24px;border-radius:12px 12px 0 0">
          <span style="color:#fff;font-size:18px;font-weight:800">${COMPANY.name}</span>
        </div>
        <div style="border:1px solid #e4e9f1;border-top:0;padding:24px;border-radius:0 0 12px 12px">
          ${opts.bodyHtml}
          ${opts.link ? `<p style="margin:20px 0"><a href="${opts.link}" style="background:#ff8a1e;color:#fff;font-weight:700;padding:10px 20px;border-radius:10px;text-decoration:none">Open in FieldStack →</a></p>` : ""}
          <p style="font-size:12px;color:#5a6b85;margin-top:20px">You're receiving this because of your notification settings in FieldStack — adjust them under Account → Notifications.</p>
        </div>
      </div>`,
  });
  return { error: error ? error.message : null };
}
