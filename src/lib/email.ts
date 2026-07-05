import { Resend } from "resend";
import { COMPANY } from "@/lib/company";

// Emails send once RESEND_API_KEY is set (resend.com — free tier available).
// EMAIL_FROM must be a sender verified in Resend, e.g. "Field Stack Solutions <billing@fieldstacksolutions.com>".

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
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
