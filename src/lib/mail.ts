import nodemailer from "nodemailer";
import type { Attachment } from "nodemailer/lib/mailer";

export type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type SendMailOptions = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  attachments?: MailAttachment[];
};

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secureEnv = (process.env.SMTP_SECURE || "tls").toLowerCase();
  const from = process.env.SMTP_FROM?.trim() || user;

  if (!host || !user || !pass || !from) {
    return null;
  }

  const secure = secureEnv === "ssl" || port === 465;
  const requireTLS = secureEnv === "tls" && !secure;

  return { host, port, user, pass, secure, requireTLS, from };
}

export function isMailConfigured(): boolean {
  return smtpConfig() != null;
}

export async function sendMail(opts: SendMailOptions): Promise<void> {
  const cfg = smtpConfig();
  if (!cfg) {
    throw new Error("SMTP no configurado");
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    requireTLS: cfg.requireTLS,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  const attachments: Attachment[] | undefined = opts.attachments?.map((a) => ({
    filename: a.filename,
    content: a.content,
    contentType: a.contentType,
  }));

  await transporter.sendMail({
    from: cfg.from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    replyTo: opts.replyTo,
    attachments,
  });
}
