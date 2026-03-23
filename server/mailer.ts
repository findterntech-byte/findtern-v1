import { createRequire } from "module";
import dotenv from "dotenv";
dotenv.config();
export type SmtpAttachment = {
  filename: string;
  content: string;
  contentType?: string;
};

export async function sendSmtpMail(opts: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: SmtpAttachment[];
}) {
  const from = String(process.env.SMTP_FROM ?? "").trim();
  const host = String(process.env.SMTP_HOST ?? "").trim();
  const user = String(process.env.SMTP_USER ?? "").trim();
  const pass = String(process.env.SMTP_PASS ?? "").trim();
  const portRaw = String(process.env.SMTP_PORT ?? "").trim();
  const secureRaw = String(process.env.SMTP_SECURE ?? "").trim().toLowerCase();

  if (!from || !host || !user || !pass) {
    console.warn("SMTP is not configured; email subject:", opts.subject);
    return;
  }

  const port = portRaw ? Number(portRaw) : 587;
  const secure = secureRaw === "true" || secureRaw === "1";

  let nodemailer: any;
  try {
    const require = createRequire(import.meta.url);
    nodemailer = require("nodemailer");
  } catch {
    console.warn("nodemailer is not available; email subject:", opts.subject);
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    attachments: opts.attachments,
  });
}

function toIcsDateUtc(value: Date) {
  const iso = value.toISOString();
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function buildIcsInvite(opts: {
  uid: string;
  summary: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
  organizerEmail?: string | null;
  organizerName?: string | null;
  meetingLink?: string | null;
}) {
  const dtstamp = toIcsDateUtc(new Date());
  const dtstart = toIcsDateUtc(opts.startTime);
  const dtend = toIcsDateUtc(opts.endTime);
  const summary = escapeIcsText(opts.summary);
  const description = escapeIcsText(opts.description ? String(opts.description) : "");
  const url = opts.meetingLink ? escapeIcsText(opts.meetingLink) : "";

  const organizerEmail = String(opts.organizerEmail ?? "").trim();
  const organizerName = escapeIcsText(String(opts.organizerName ?? "").trim());
  const organizerLine = organizerEmail
    ? `ORGANIZER;CN=${organizerName || organizerEmail}:MAILTO:${organizerEmail}`
    : "";

  const descriptionLine = description
    ? `DESCRIPTION:${description}${url ? `\\n\\n${url}` : ""}`
    : url
      ? `DESCRIPTION:${url}`
      : "";

  const lines = [
    "BEGIN:VCALENDAR",
    "PRODID:-//Findtern//EN",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(opts.uid)}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${summary}`,
    descriptionLine,
    url ? `URL:${url}` : "",
    organizerLine,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}
