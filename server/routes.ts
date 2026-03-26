import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertEmployerSchema,
  insertInternDocumentsSchema,
} from "@shared/schema";
import { z } from "zod";
import { google } from "googleapis";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import multer from "multer";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { createRequire } from "module";
import { buildIcsInvite, sendSmtpMail } from "./mailer";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

function isStrongPassword(value: string) {
  const v = String(value ?? "");
  return /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v);
}

async function sendFullTimeHiringFeePaymentEmployerEmail(opts: {
  to: string;
  employerName: string;
  candidateName: string;
  roleName: string;
  annualCtcLabel: string;
  amountPaidLabel: string;
  ordersUrl: string;
  appBaseUrl: string;
}) {
  const brandName = "Findtern";
  const subject = `Payment Confirmation – Hiring Fee Received | ${brandName}`;

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const safeEmployerName = String(opts.employerName ?? "").trim() || "Employer";
  const safeCandidateName = String(opts.candidateName ?? "").trim() || "Candidate";
  const safeRoleName = String(opts.roleName ?? "").trim() || "the role";
  const annualCtcLabel = String(opts.annualCtcLabel ?? "").trim();
  const amountPaidLabel = String(opts.amountPaidLabel ?? "").trim();
  const appBaseUrl = String(opts.appBaseUrl ?? "").replace(/\/$/, "");
  const ordersUrl = String(opts.ordersUrl ?? "").trim();
  const contactUrl = appBaseUrl ? `${appBaseUrl}/contact` : "";

  const text =
    `Hi ${safeEmployerName},\n\n` +
    `We confirm that Findtern has successfully received the full-time hiring fee for ${safeCandidateName}.\n\n` +
    `Payment Summary:\n` +
    `Candidate Name: ${safeCandidateName}\n` +
    `Role: ${safeRoleName}\n` +
    `${annualCtcLabel ? `Annual CTC Offered: ${annualCtcLabel}\n` : ""}` +
    `${amountPaidLabel ? `Total Amount Paid to Findtern: ${amountPaidLabel}\n` : ""}` +
    `Payment Status: Successfully Received\n\n` +
    `Thank you for completing the payment and for choosing Findtern to support your hiring process.\n` +
    `If you require the invoice copy or any additional documentation, please log in to your Employer Dashboard or contact us directly.\n\n` +
    `${ordersUrl ? `Employer Dashboard / Orders:\n${ordersUrl}\n\n` : ""}` +
    `Best regards,\n` +
    `Team ${brandName}\n` +
    `Building trust in internship hiring\n` +
    `www.findtern.in`;

  const primary = "#0E6049";
  const subtle = "#6B7280";
  const bg = "#F3F4F6";
  const card = "#FFFFFF";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:${bg};font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg};padding:30px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 4px 14px 4px;">
                <div style="font-size:18px;line-height:24px;font-weight:900;color:#111827;">${brandName}</div>
              </td>
            </tr>
            <tr>
              <td style="background:${card};border-radius:16px;box-shadow:0 6px 24px rgba(17,24,39,0.08);padding:22px 20px;">
                <div style="font-size:16px;line-height:22px;font-weight:900;color:#111827;">Payment Successfully Received</div>
                <div style="margin-top:10px;font-size:14px;line-height:22px;color:${subtle};">Hi <strong style="color:#111827;">${escapeHtml(
                  safeEmployerName,
                )}</strong>,</div>
                <div style="margin-top:10px;font-size:14px;line-height:22px;color:${subtle};">
                  We confirm that Findtern has successfully received the full-time hiring fee for <strong style="color:#111827;">${escapeHtml(
                    safeCandidateName,
                  )}</strong>.
                </div>

                <div style="margin-top:14px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:14px;padding:14px 14px;">
                  <div style="font-size:12px;line-height:18px;color:${subtle};">Payment Summary</div>
                  <div style="margin-top:6px;font-size:13px;line-height:20px;color:#111827;">
                    <div><strong>Candidate Name:</strong> ${escapeHtml(safeCandidateName)}</div>
                    <div style="margin-top:4px;"><strong>Role:</strong> ${escapeHtml(safeRoleName)}</div>
                    ${annualCtcLabel ? `<div style="margin-top:4px;"><strong>Annual CTC Offered:</strong> ${escapeHtml(
                      annualCtcLabel,
                    )}</div>` : ""}
                    ${amountPaidLabel ? `<div style="margin-top:4px;"><strong>Total Amount Paid to Findtern:</strong> ${escapeHtml(
                      amountPaidLabel,
                    )}</div>` : ""}
                    <div style="margin-top:4px;"><strong>Payment Status:</strong> Successfully Received</div>
                  </div>
                </div>

                <div style="margin-top:12px;font-size:13px;line-height:20px;color:${subtle};">
                  Thank you for completing the payment and for choosing Findtern to support your hiring process.
                </div>

                ${ordersUrl ? `<div style="margin-top:18px;">
                  <a href="${escapeHtml(ordersUrl)}" target="_blank" rel="noreferrer"
                     style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:11px 14px;border-radius:12px;font-weight:800;font-size:13px;">
                    View in Employer Dashboard
                  </a>
                </div>` : ""}

                <div style="margin-top:16px;font-size:12px;line-height:18px;color:${subtle};">
                  If you require the invoice copy or any additional documentation, please log in to your Employer Dashboard or contact us directly.
                  ${contactUrl ? ` <a href="${escapeHtml(contactUrl)}" target="_blank" rel="noreferrer" style="color:${primary};text-decoration:underline;">${escapeHtml(
                    contactUrl,
                  )}</a>` : ""}
                </div>

                <div style="margin-top:18px;font-size:12px;line-height:18px;color:${subtle};">
                  Best regards,<br/>Team ${brandName}<br/>Building trust in internship hiring<br/>
                  <a href="https://findtern.in" target="_blank" rel="noreferrer" style="color:${primary};text-decoration:underline;">www.findtern.in</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 6px 0 6px;font-size:12px;line-height:18px;color:${subtle};text-align:center;">Sent by ${brandName}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await sendSmtpMail({
    to: opts.to,
    subject,
    text,
    html,
  });
}

async function sendInternshipProposalStatusUpdatedEmployerEmail(opts: {
  to: string;
  employerName: string;
  roleName: string;
  dashboardUrl: string;
  appBaseUrl: string;
}) {
  const brandName = "Findtern";
  const subject = `Update on Your Sent Proposal | ${brandName}`;

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const safeEmployerName = String(opts.employerName ?? "").trim() || "Employer";
  const safeRoleName = String(opts.roleName ?? "").trim() || "the role";
  const appBaseUrl = String(opts.appBaseUrl ?? "").replace(/\/$/, "");
  const dashboardUrl = String(opts.dashboardUrl ?? "").trim();
  const supportUrl = appBaseUrl ? `${appBaseUrl}/contact` : "https://findtern.in/contact";

  const text =
    `Hi ${safeEmployerName},\n` +
    `There’s an update on the internship proposal you sent for ${safeRoleName}.\n\n` +
    `To view the latest status and next steps, please log in to your Findtern dashboard.\n` +
    `All actions and details related to this proposal are available inside the portal.\n\n` +
    `${dashboardUrl ? `Dashboard:\n${dashboardUrl}\n\n` : ""}` +
    `If you need any assistance, feel free to reach out to us - support\n` +
    `${supportUrl}\n\n` +
    `Best regards,\n` +
    `Team ${brandName}\n` +
    `Smarter, faster internship hiring\n` +
    `www.findtern.in`;

  const primary = "#0E6049";
  const subtle = "#6B7280";
  const bg = "#F3F4F6";
  const card = "#FFFFFF";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:${bg};font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg};padding:30px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 4px 14px 4px;">
                <div style="font-size:18px;line-height:24px;font-weight:900;color:#111827;">${brandName}</div>
              </td>
            </tr>

            <tr>
              <td style="background:${card};border-radius:16px;box-shadow:0 6px 24px rgba(17,24,39,0.08);padding:22px 20px;">
                <div style="font-size:16px;line-height:22px;font-weight:900;color:#111827;">Update on Your Sent Proposal</div>
                <div style="margin-top:10px;font-size:14px;line-height:22px;color:${subtle};">Hi <strong style="color:#111827;">${escapeHtml(
                  safeEmployerName,
                )}</strong>,</div>
                <div style="margin-top:10px;font-size:14px;line-height:22px;color:${subtle};">
                  There’s an update on the internship proposal you sent for <strong style="color:#111827;">${escapeHtml(
                    safeRoleName,
                  )}</strong>.
                </div>

                <div style="margin-top:12px;font-size:14px;line-height:22px;color:${subtle};">
                  To view the latest status and next steps, please log in to your Findtern dashboard.
                </div>
                <div style="margin-top:8px;font-size:14px;line-height:22px;color:${subtle};">
                  All actions and details related to this proposal are available inside the portal.
                </div>

                ${dashboardUrl ? `<div style="margin-top:18px;">
                  <a href="${escapeHtml(dashboardUrl)}" target="_blank" rel="noreferrer"
                     style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:11px 14px;border-radius:12px;font-weight:800;font-size:13px;">
                    Open Dashboard
                  </a>
                </div>` : ""}

                <div style="margin-top:16px;font-size:12px;line-height:18px;color:${subtle};">
                  If you need any assistance, feel free to reach out to us - support:<br/>
                  <a href="${escapeHtml(supportUrl)}" target="_blank" rel="noreferrer" style="color:${primary};text-decoration:underline;">${escapeHtml(
                    supportUrl,
                  )}</a>
                </div>

                <div style="margin-top:18px;font-size:12px;line-height:18px;color:${subtle};">
                  Best regards,<br/>Team ${brandName}<br/>Smarter, faster internship hiring<br/>
                  <a href="https://findtern.in" target="_blank" rel="noreferrer" style="color:${primary};text-decoration:underline;">www.findtern.in</a>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 6px 0 6px;font-size:12px;line-height:18px;color:${subtle};text-align:center;">Sent by ${brandName}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await sendSmtpMail({
    to: opts.to,
    subject,
    text,
    html,
  });
}

const internTimesheetCreateSchema = z.object({
  proposalId: z.string().min(1),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
});

const internTimesheetUpdateSchema = z.object({
  entries: z.array(z.any()).optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  internNote: z.string().optional().nullable(),
});

const employerTimesheetDecisionSchema = z.object({
  managerNote: z.string().optional().nullable(),
});

const employerTimesheetUpdateSchema = z.object({
  entries: z.array(z.any()).optional(),
  managerNote: z.string().optional().nullable(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
});

async function fetchRazorpayOrder(orderId: string) {
  const oid = String(orderId ?? "").trim();
  if (!oid) throw new Error("orderId is required");

  const { keyId, keySecret } = getRazorpayKeys();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const res = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(oid)}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (json as any)?.error?.description ?? (json as any)?.message ?? res.statusText;
    throw new Error(msg || "Failed to fetch Razorpay order");
  }

  return json as any;
}

function normalizeName(value: string, fallback: string) {
  const v = String(value ?? "").trim();
  const fb = String(fallback ?? "").trim();
  const base = v || fb || "User";
  if (base.length >= 2) return base;
  return `${base}User`.slice(0, 2);
}

function getUploadsDir() {
  const runtimeDirname = (() => {
    const entrypoint = process.argv[1];
    if (typeof entrypoint === "string" && entrypoint.length > 0) {
      return path.dirname(path.resolve(entrypoint));
    }
    return process.cwd();
  })();

  const uploadsCandidates = [
    path.resolve(process.cwd(), "uploads"),
    path.resolve(runtimeDirname, "..", "uploads"),
  ];

  const uploadsDir = uploadsCandidates.find((p) => fs.existsSync(p)) ?? uploadsCandidates[0];
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch {
    // ignore
  }
  return uploadsDir;
}

function formatNotification(template: string, vars: Record<string, string | number | null | undefined>) {
  return template.replace(/\[([^\]]+)\]/g, (_m, key) => {
    const v = vars[String(key)];
    if (v === null || v === undefined) return "";
    return String(v);
  });
}

function maskCompanyName(raw: string) {
  const s = String(raw ?? "");
  if (!s.trim()) return "";

  const firstIdx = s.search(/\S/);
  const lastIdx = s.replace(/\s+$/g, "").length - 1;
  if (firstIdx < 0 || lastIdx <= firstIdx) return s.trim();

  const firstChar = s[firstIdx];
  const lastChar = s[lastIdx];

  const middle = s
    .slice(firstIdx + 1, lastIdx)
    .split("")
    .map((ch) => (ch === " " || ch === "\t" || ch === "\n" ? ch : "*"))
    .join("");

  return `${firstChar}${middle}${lastChar}`;
}

function isoDateOnlyUtc(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysIsoUtc(iso: string, days: number) {
  const v = String(iso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "";
  const [yy, mm, dd] = v.split("-").map((x) => Number(x));
  const base = new Date(Date.UTC(yy, mm - 1, dd, 0, 0, 0));
  if (Number.isNaN(base.getTime())) return "";
  const next = new Date(base.getTime() + Math.max(0, Math.floor(days)) * 24 * 60 * 60 * 1000);
  return isoDateOnlyUtc(next);
}

function buildIsoRangeInclusiveUtc(startIso: string, endIso: string) {
  const out: string[] = [];
  const start = String(startIso ?? "").slice(0, 10);
  const end = String(endIso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return out;
  let cur = start;
  let guard = 0;
  while (guard < 400) {
    out.push(cur);
    if (cur === end) break;
    const next = addDaysIsoUtc(cur, 1);
    if (!next) break;
    cur = next;
    guard += 1;
  }
  return out;
}

function hasFullTimeOffer(proposal: any) {
  try {
    const offer = (proposal as any)?.offerDetails ?? (proposal as any)?.offer_details ?? {};
    const ft = (offer as any)?.fullTimeOffer ?? null;
    if (ft === true) return true;
    return !!ft && typeof ft === "object";
  } catch {
    return false;
  }
}

function formatGoogleApiError(error: unknown) {
  const e: any = error as any;
  const status = e?.code ?? e?.response?.status ?? null;
  const message =
    e?.errors?.[0]?.message ??
    e?.response?.data?.error_description ??
    e?.response?.data?.error?.message ??
    e?.message ??
    String(error);
  const reason = e?.errors?.[0]?.reason ?? e?.response?.data?.error ?? null;

  return {
    status: typeof status === "number" ? status : null,
    reason: typeof reason === "string" ? reason : null,
    message: typeof message === "string" ? message : String(message),
  };
}

function getGoogleConnectUrl(employerId: string) {
  const id = String(employerId ?? "").trim();
  if (!id) return null;
  return `/api/google/oauth/start?employerId=${encodeURIComponent(id)}`;
}

function getFindternGoogleConnectUrl() {
  return "/google/auth";
}

function getFindternGoogleTokenOwnerId() {
  const configured = String(process.env.FINDTERN_GOOGLE_TOKEN_OWNER_ID ?? "").trim();
  return configured || "admin";
}

function getFindternGoogleOAuthClientConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri =
    process.env.FINDTERN_GOOGLE_OAUTH_REDIRECT_URI || "https://findtern.in/google/callback";

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Findtern Google OAuth env vars are not configured (GOOGLE_CLIENT_ID/GOOGLE_OAUTH_CLIENT_ID, GOOGLE_CLIENT_SECRET/GOOGLE_OAUTH_CLIENT_SECRET, FINDTERN_GOOGLE_OAUTH_REDIRECT_URI)",
    );
  }

  return { clientId, clientSecret, redirectUri };
}

function getFindternOAuth2Client() {
  const { clientId, clientSecret, redirectUri } = getFindternGoogleOAuthClientConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

async function isGoogleConnectedForEmployer(employerId: string) {
  const tokenRow = await storage.getEmployerGoogleToken(employerId);
  return Boolean(tokenRow?.refreshToken || tokenRow?.accessToken);
}

async function isGoogleConnectedForFindtern() {
  const tokenOwnerId = getFindternGoogleTokenOwnerId();
  const tokenRow = await storage.getEmployerGoogleToken(tokenOwnerId);
  return Boolean(tokenRow?.refreshToken || tokenRow?.accessToken);
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const createMeetSchema = z.object({
  summary: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  timezone: z.string().min(1),
});

const personalEmailDomains = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.in",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "zoho.com",
  "yandex.com",
  "gmx.com",
  "live.com",
  "rediffmail.com",
]);

const employerSetupSchema = z.object({
  companyName: z.string().min(2).optional(),
  logoUrl: z.string().optional(),
  websiteUrl: z.string().optional(),
  companyEmail: z.string().email().optional(),
  companySize: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  primaryContactName: z.string().optional(),
  primaryContactRole: z.string().optional(),
  primaryContactCountryCode: z.string().optional(),
  primaryContactPhone: z
    .string()
    .optional()
    .refine((val) => {
      if (val === undefined) return true;
      const digits = String(val ?? "").replace(/\D/g, "");
      if (!digits) return true;
      if (!/^\d+$/.test(digits)) return false;
      if (/^0+$/.test(digits)) return false;
      return true;
    }, {
      message: "Invalid primary contact phone number",
    }),
  secondaryContactName: z.string().optional(),
  secondaryContactEmail: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (email) => {
        const value = String(email ?? "").trim().toLowerCase();
        if (!value) return true;
        if (!z.string().email().safeParse(value).success) return false;
        const domain = value.split("@").pop() ?? "";
        return !!domain && !personalEmailDomains.has(domain);
      },
      {
        message: "Please use a company/work email address (not Gmail, Yahoo, Outlook, etc.)",
      },
    ),
  secondaryContactCountryCode: z.string().optional(),
  secondaryContactPhone: z
    .string()
    .optional()
    .refine((val) => {
      if (val === undefined) return true;
      const digits = String(val ?? "").replace(/\D/g, "");
      if (!digits) return true;
      if (!/^\d+$/.test(digits)) return false;
      if (/^0+$/.test(digits)) return false;
      return true;
    }, {
      message: "Invalid secondary contact phone number",
    }),
  secondaryContactRole: z.string().optional(),
});

const employerOnboardingSchema = z.object({
  projectName: z.string().min(2),
  skills: z.array(z.string()).min(1),
  scopeOfWork: z.string().optional().nullable(),
  fullTimeOffer: z.boolean().optional().default(false),
  locationType: z.string().optional().nullable(),
  preferredLocations: z.array(z.string()).optional().default([]),
  pincode: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
});

function getGoogleOAuthClientConfig() {
 
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const defaultRedirectUri =
    process.env.NODE_ENV === "development"
      ? "http://localhost:5000/auth/google/callback"
      : "https://findtern.in/auth/google/callback";
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || defaultRedirectUri;


  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google OAuth env vars are not configured (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI)",
    );
  }

  return { clientId, clientSecret, redirectUri };
}

function getOAuth2Client() {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthClientConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

type CalendarOAuthStatePayload = {
  employerId: string;
  nonce: string;
};

type AuthOAuthRole = "intern" | "employer";

type AuthOAuthStatePayload = {
  role: AuthOAuthRole;
  nonce: string;
  next?: string | null;
};

type OAuthStatePayload = CalendarOAuthStatePayload | AuthOAuthStatePayload;

function isCalendarOAuthStatePayload(payload: OAuthStatePayload): payload is CalendarOAuthStatePayload {
  return typeof (payload as any)?.employerId === "string";
}

function isAuthOAuthStatePayload(payload: OAuthStatePayload): payload is AuthOAuthStatePayload {
  return (payload as any)?.role === "intern" || (payload as any)?.role === "employer";
}

function signOAuthState(payload: OAuthStatePayload) {
  const secret = process.env.GOOGLE_OAUTH_STATE_SECRET;
  if (!secret) {
    throw new Error("GOOGLE_OAUTH_STATE_SECRET is not configured");
  }

  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

function verifyOAuthState(state: string): OAuthStatePayload {
  const secret = process.env.GOOGLE_OAUTH_STATE_SECRET;
  if (!secret) {
    throw new Error("GOOGLE_OAUTH_STATE_SECRET is not configured");
  }

  const [body, sig] = state.split(".");
  if (!body || !sig) {
    throw new Error("Invalid OAuth state");
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error("Invalid OAuth state signature");
  }

  const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));

  if (typeof parsed?.nonce !== "string" || parsed.nonce.trim() === "") {
    throw new Error("Invalid OAuth state payload");
  }

  if (typeof parsed?.employerId === "string" && parsed.employerId.trim() !== "") {
    return {
      employerId: parsed.employerId,
      nonce: parsed.nonce,
    };
  }

  if (parsed?.role === "intern" || parsed?.role === "employer") {
    return {
      role: parsed.role,
      nonce: parsed.nonce,
      next: typeof parsed?.next === "string" ? parsed.next : null,
    };
  }

  throw new Error("Invalid OAuth state payload");
}

async function getEmployerCalendarClient(employerId: string) {
  const tokenRow = await storage.getEmployerGoogleToken(employerId);
  if (!tokenRow?.refreshToken && !tokenRow?.accessToken) {
    throw new Error("Google Calendar is not connected for this employer");
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokenRow.accessToken ?? undefined,
    refresh_token: tokenRow.refreshToken ?? undefined,
    scope: tokenRow.scope ?? undefined,
    token_type: tokenRow.tokenType ?? undefined,
    expiry_date: tokenRow.expiryDate ? tokenRow.expiryDate.getTime() : undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    try {
      await storage.upsertEmployerGoogleToken(employerId, {
        accessToken: tokens.access_token ?? tokenRow.accessToken ?? null,
        refreshToken: tokens.refresh_token ?? tokenRow.refreshToken ?? null,
        scope: tokens.scope ?? tokenRow.scope ?? null,
        tokenType: tokens.token_type ?? tokenRow.tokenType ?? null,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : tokenRow.expiryDate ?? null,
      } as any);
    } catch (e) {
      console.error("Failed to persist refreshed Google tokens:", e);
    }
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  return calendar;
}

async function getFindternCalendarClient() {
  const tokenOwnerId = getFindternGoogleTokenOwnerId();
  const tokenRow = await storage.getEmployerGoogleToken(tokenOwnerId);
  if (!tokenRow?.refreshToken && !tokenRow?.accessToken) {
    throw new Error("Findtern Google Calendar is not connected");
  }

  const oauth2Client = getFindternOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokenRow.accessToken ?? undefined,
    refresh_token: tokenRow.refreshToken ?? undefined,
    scope: tokenRow.scope ?? undefined,
    token_type: tokenRow.tokenType ?? undefined,
    expiry_date: tokenRow.expiryDate ? tokenRow.expiryDate.getTime() : undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    try {
      await storage.upsertEmployerGoogleToken(tokenOwnerId, {
        accessToken: tokens.access_token ?? tokenRow.accessToken ?? null,
        refreshToken: tokens.refresh_token ?? tokenRow.refreshToken ?? null,
        scope: tokens.scope ?? tokenRow.scope ?? null,
        tokenType: tokens.token_type ?? tokenRow.tokenType ?? null,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : tokenRow.expiryDate ?? null,
      } as any);
    } catch (e) {
      console.error("Failed to persist refreshed Findtern Google tokens:", e);
    }
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  return calendar;
}

async function createGoogleMeetLinkForEmployer(opts: {
  employerId: string;
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  attendees?: { email: string }[];
}) {
  const calendar = await getEmployerCalendarClient(opts.employerId);
  const calendarId = process.env.MEET_CALENDAR_ID || "primary";

  const requestId = uuidv4();

  const eventResponse = await calendar.events.insert({
    calendarId,
    conferenceDataVersion: 1,
    requestBody: {
      summary: opts.summary,
      description: opts.description ?? "",
      start: {
        dateTime: opts.startTime.toISOString(),
        timeZone: opts.timezone,
      },
      end: {
        dateTime: opts.endTime.toISOString(),
        timeZone: opts.timezone,
      },
      attendees: opts.attendees && opts.attendees.length ? opts.attendees : undefined,
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  const event = eventResponse.data;

  const hangoutLink =
    event.hangoutLink ||
    event.conferenceData?.entryPoints?.find(
      (e) => e.entryPointType === "video",
    )?.uri;

  if (!hangoutLink) {
    throw new Error("Failed to create Google Meet link");
  }

  return {
    meetingLink: hangoutLink,
    eventId: event.id,
  };
}

async function createGoogleMeetLinkForFindtern(opts: {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  attendees?: { email: string }[];
}) {
  const calendar = await getFindternCalendarClient();
  const calendarId = process.env.MEET_CALENDAR_ID || "primary";

  const requestId = uuidv4();

  const eventResponse = await calendar.events.insert({
    calendarId,
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: opts.summary,
      description: opts.description ?? "",
      start: {
        dateTime: opts.startTime.toISOString(),
        timeZone: opts.timezone,
      },
      end: {
        dateTime: opts.endTime.toISOString(),
        timeZone: opts.timezone,
      },
      attendees: opts.attendees && opts.attendees.length ? opts.attendees : undefined,
      guestsCanSeeOtherGuests: false,
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  const event = eventResponse.data;

  const hangoutLink =
    event.hangoutLink ||
    event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri;

  if (!hangoutLink) {
    throw new Error("Failed to create Google Meet link");
  }

  return {
    meetingLink: hangoutLink,
    eventId: event.id,
  };
}

function serializeInterview(i: any) {
  if (!i) return i;
  const notes = String(i?.notes ?? "");
  const nowMs = Date.now();
  const getSlotValue = (slotNum: number) => {
    if (slotNum === 1) return i?.slot1;
    if (slotNum === 2) return i?.slot2;
    if (slotNum === 3) return i?.slot3;
    return null;
  };

  const selectedSlot = Number(i?.selectedSlot ?? i?.selected_slot ?? 0);
  const selectedSlotValue = selectedSlot ? getSlotValue(selectedSlot) : null;
  const slotCandidate = selectedSlotValue ?? i?.slot1 ?? i?.slot2 ?? i?.slot3 ?? null;
  const slotDate = slotCandidate ? new Date(slotCandidate) : null;
  const slotMs = slotDate && Number.isFinite(slotDate.getTime()) ? slotDate.getTime() : null;
  const meetingLinkExpired = slotMs !== null ? nowMs > slotMs + 60 * 60 * 1000 : false;
  const meetingLink = meetingLinkExpired ? null : (i?.meetingLink ?? null);
  const parseNoteLink = (prefix: string) => {
    const p = `${prefix}:`;
    const line = notes
      .split("\n")
      .map((s) => s.trim())
      .find((s) => s.toLowerCase().startsWith(p));
    if (!line) return null;
    const value = line.slice(p.length).trim();
    return value || null;
  };

  const parseNoteText = (prefix: string) => {
    const p = `${prefix}:`;
    const line = notes
      .split("\n")
      .map((s) => s.trim())
      .find((s) => s.toLowerCase().startsWith(p));
    if (!line) return null;
    const value = line.slice(p.length).trim();
    return value || null;
  };

  const feedbackLink = parseNoteLink("feedback");
  const recordingLink = parseNoteLink("recording");
  const feedbackText = parseNoteText("feedback_text");

  const rawStatusLower = String(i?.status ?? "").trim().toLowerCase();
  const selectedSlotIndex = Number(i?.selectedSlot ?? i?.selected_slot);
  const hasFeedback = Boolean(String(feedbackText ?? "").trim());

  const effectiveStatus = (() => {
    if (hasFeedback) return "completed";
    if (rawStatusLower !== "scheduled") return i?.status ?? null;

    if (!Number.isFinite(selectedSlotIndex) || (selectedSlotIndex !== 1 && selectedSlotIndex !== 2 && selectedSlotIndex !== 3)) {
      return i?.status ?? null;
    }

    const slotKey = selectedSlotIndex === 1 ? "slot1" : selectedSlotIndex === 2 ? "slot2" : "slot3";
    const slotValue = (i as any)?.[slotKey];
    const d = slotValue ? new Date(slotValue) : null;
    if (!d || Number.isNaN(d.getTime())) return i?.status ?? null;

    const completedAtMs = d.getTime() + 30 * 60 * 1000;
    return nowMs >= completedAtMs ? "completed" : i?.status ?? null;
  })();

  return {
    ...i,
    status: effectiveStatus ?? i?.status ?? null,
    project_id: i.projectId ?? null,
    meetingLink,
    meet_link: meetingLink,
    calendar_event_id: i.calendarEventId ?? null,
    feedbackLink,
    recordingLink,
    feedback_link: feedbackLink,
    recording_link: recordingLink,
    feedbackText,
    feedback_text: feedbackText,
  };
}

function getTimeZoneOffsetMs(timeZone: string, date: Date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }

  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const hour = Number(map.hour);
  const minute = Number(map.minute);
  const second = Number(map.second);
  if (
    [year, month, day, hour, minute, second].some(
      (n) => typeof n !== "number" || Number.isNaN(n),
    )
  ) {
    throw new Error("Could not compute timezone offset");
  }

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtc - date.getTime();
}

function parseInterviewSlotToUtcDate(raw: string, timeZone: string) {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  const hasZoneDesignator = /[zZ]$/.test(value) || /[+-]\d{2}:?\d{2}$/.test(value);
  if (hasZoneDesignator) {
    const direct = new Date(value);
    if (Number.isNaN(direct.getTime())) return null;
    return direct;
  }

  const m = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!m) {
    const fallback = new Date(value);
    if (Number.isNaN(fallback.getTime())) return null;
    return fallback;
  }

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = m[6] ? Number(m[6]) : 0;
  if (
    [year, month, day, hour, minute, second].some(
      (n) => typeof n !== "number" || Number.isNaN(n),
    )
  ) {
    return null;
  }

  try {
    const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    const offset = getTimeZoneOffsetMs(timeZone, utcGuess);
    const utcDate = new Date(utcGuess.getTime() - offset);
    if (Number.isNaN(utcDate.getTime())) return null;
    return utcDate;
  } catch {
    return null;
  }
}

async function ensureAiInterviewEmployer() {
  const existing = await storage.getEmployer("admin").catch(() => undefined);
  if (existing) return existing;

  const byEmail = await storage
    .getEmployerByEmail("ai-interview@findtern.ai")
    .catch(() => undefined);
  if (byEmail) return byEmail;

  const created = await storage.createEmployer({
    id: "admin",
    name: "AI Interview",
    companyName: "AI Interview",
    companyEmail: "ai-interview@findtern.ai",
    countryCode: "+91",
    phoneNumber: "0000000000",
    password: "admin",
    agreedToTerms: true,
  } as any);
  return created;
}

function getAppBaseUrl(req: any) {
  const env = String(process.env.APP_BASE_URL ?? "").trim();
  if (env) return env.replace(/\/$/, "");
  const proto = String((req.headers["x-forwarded-proto"] as any) ?? req.protocol ?? "http").split(",")[0].trim();
  const host = String((req.headers["x-forwarded-host"] as any) ?? req.get?.("host") ?? req.headers.host ?? "").split(",")[0].trim();
  if (!host) return "";
  return `${proto}://${host}`;
}

function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getRazorpayKeys() {
  const keyId = String(process.env.RAZORPAY_KEY_ID ?? "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET ?? "").trim();
  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured");
  }
  return { keyId, keySecret };
}

function getRazorpayConfig() {
  const { keyId, keySecret } = getRazorpayKeys();
  const currency = String(process.env.INTERN_PAYMENT_CURRENCY ?? "INR").trim() || "INR";
  const amountMinor = 2499 * 100;

  if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
    throw new Error("INTERN_PAYMENT_AMOUNT_MINOR or INTERN_PAYMENT_AMOUNT_RUPEES is not configured (must be > 0)");
  }

  return { keyId, keySecret, currency, amountMinor };
}

async function createRazorpayOrder(opts: {
  amountMinor: number;
  currency: string;
  receipt: string;
  notes?: Record<string, any>;
}) {
  const { keyId, keySecret } = getRazorpayKeys();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(opts.amountMinor),
      currency: opts.currency,
      receipt: opts.receipt,
      payment_capture: 1,
      notes: opts.notes ?? {},
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (json as any)?.error?.description ?? (json as any)?.message ?? res.statusText;
    throw new Error(msg || "Failed to create Razorpay order");
  }

  return json as any;
}

async function sendPasswordResetEmail(opts: { to: string; resetUrl: string }) {
  const brandName = "Findtern";
  const subject = `Reset your ${brandName} password`;
  const text =
    `We received a request to reset your ${brandName} password.\n\n` +
    `Reset password link (valid for 30 minutes):\n${opts.resetUrl}\n\n` +
    `If you did not request a password reset, you can ignore this email.`;

  const primary = "#2563EB";
  const subtle = "#6B7280";
  const bg = "#F3F4F6";
  const card = "#FFFFFF";

  const logoSvg =
    `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="1" y="1" width="26" height="26" rx="8" fill="${primary}"/>` +
    `<path d="M9 19V9h10v3H12v2h6v3h-6v2h7v0H9z" fill="white"/>` +
    `</svg>`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:${bg};font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Reset your ${brandName} password. This link is valid for 30 minutes.
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg};padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 4px 14px 4px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <div style="display:flex;align-items:center;gap:10px;">
                        <span style="display:inline-block;vertical-align:middle;">${logoSvg}</span>
                        <span style="font-size:18px;line-height:24px;font-weight:800;color:#111827;letter-spacing:-0.02em;">${brandName}</span>
                      </div>
                    </td>
                    <td align="right" style="vertical-align:middle;font-size:12px;line-height:18px;color:${subtle};">
                      Password reset
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:${card};border-radius:16px;box-shadow:0 6px 24px rgba(17,24,39,0.08);padding:26px 22px;">
                <div style="font-size:18px;line-height:26px;font-weight:800;color:#111827;">Reset your password</div>
                <div style="margin-top:8px;font-size:14px;line-height:22px;color:${subtle};">
                  We received a request to reset your ${brandName} password. If you made this request, click the button below.
                </div>

                <div style="margin-top:18px;">
                  <table role="presentation" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="border-radius:12px;" bgcolor="${primary}">
                        <a href="${opts.resetUrl}" target="_blank" rel="noreferrer"
                           style="display:inline-block;padding:12px 16px;font-size:14px;line-height:20px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;">
                          Reset password
                        </a>
                      </td>
                    </tr>
                  </table>
                </div>

                <div style="margin-top:14px;font-size:12px;line-height:18px;color:${subtle};">
                  This link is valid for <strong style="color:#111827;">30 minutes</strong>.
                </div>

                <div style="margin-top:18px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:14px;padding:14px 14px;">
                  <div style="font-size:12px;line-height:18px;color:${subtle};">
                    If the button doesn’t work, copy and paste this URL into your browser:
                  </div>
                  <div style="margin-top:8px;font-size:12px;line-height:18px;word-break:break-all;">
                    <a href="${opts.resetUrl}" target="_blank" rel="noreferrer" style="color:${primary};text-decoration:underline;">${opts.resetUrl}</a>
                  </div>
                </div>

                <div style="margin-top:16px;font-size:13px;line-height:20px;color:${subtle};">
                  If you didn’t request this, you can safely ignore this email.
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 6px 0 6px;font-size:12px;line-height:18px;color:${subtle};text-align:center;">
                For your security, don’t forward this email. The reset link is private.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await sendSmtpMail({
    to: opts.to,
    subject,
    text,
    html,
  });
}

async function sendFullTimeOfferReceivedInternEmail(opts: {
  to: string;
  internName: string;
  employerName: string;
  roleName: string;
  dashboardUrl: string;
  appBaseUrl: string;
}) {
  const brandName = "Findtern";
  const subject = `Full-Time Job Offer Received | ${brandName}`;

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const safeInternName = String(opts.internName ?? "").trim() || "Candidate";
  const safeInternInitial = getFirstInitial(safeInternName);
  const safeEmployerName = String(opts.employerName ?? "").trim() || "Company";
  const safeRoleName = String(opts.roleName ?? "").trim() || "the role";
  const appBaseUrl = String(opts.appBaseUrl ?? "").replace(/\/$/, "");
  const dashboardUrl = String(opts.dashboardUrl ?? "").trim();
  const contactUrl = appBaseUrl ? `${appBaseUrl}/contact` : "";

  const text =
    `Hi ${safeInternInitial},\n` +
    `Congratulations.\n` +
    `You have received a Full-Time Job Offer from ${safeEmployerName} for the position of ${safeRoleName} through ${brandName}.\n\n` +
    `To review the complete offer details — including compensation structure, role expectations, and joining timeline — please log in to your Findtern Intern Dashboard.\n\n` +
    `Next Steps:\n` +
    `Log in to your Findtern account.\n` +
    `Review the full offer carefully.\n` +
    `Accept or Reject the offer based on your decision.\n\n` +
    `Current Status: Awaiting Your Response\n` +
    `The employer will be notified immediately once you take action.\n\n` +
    `${dashboardUrl ? `Intern Dashboard:\n${dashboardUrl}\n\n` : ""}` +
    `If you require any clarification regarding the offer, please contact us at:\n` +
    `${contactUrl || "https://findtern.in/contact"}\n\n` +
    `Best regards,\n` +
    `Team ${brandName}\n` +
    `Building trust in internship hiring\n` +
    `www.findtern.in`;

  const primary = "#0E6049";
  const subtle = "#6B7280";
  const bg = "#F3F4F6";
  const card = "#FFFFFF";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:${bg};font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg};padding:30px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 4px 14px 4px;">
                <div style="font-size:18px;line-height:24px;font-weight:900;color:#111827;">${brandName}</div>
              </td>
            </tr>
            <tr>
              <td style="background:${card};border-radius:16px;box-shadow:0 6px 24px rgba(17,24,39,0.08);padding:22px 20px;">
                <div style="font-size:16px;line-height:22px;font-weight:900;color:#111827;">Full-Time Job Offer Received</div>
                <div style="margin-top:10px;font-size:14px;line-height:22px;color:${subtle};">Hi <strong style="color:#111827;">${escapeHtml(
                  safeInternInitial,
                )}</strong>,</div>
                <div style="margin-top:10px;font-size:14px;line-height:22px;color:${subtle};">
                  Congratulations. You have received a Full-Time Job Offer from <strong style="color:#111827;">${escapeHtml(
                    safeEmployerName,
                  )}</strong> for the position of <strong style="color:#111827;">${escapeHtml(safeRoleName)}</strong> through ${brandName}.
                </div>

                <div style="margin-top:12px;font-size:14px;line-height:22px;color:${subtle};">
                  To review the complete offer details — including compensation structure, role expectations, and joining timeline — please log in to your Findtern Intern Dashboard.
                </div>

                <div style="margin-top:16px;font-size:14px;line-height:22px;color:#111827;font-weight:900;">Next Steps:</div>
                <ol style="margin:10px 0 0 18px;padding:0;color:${subtle};font-size:14px;line-height:22px;">
                  <li>Log in to your Findtern account.</li>
                  <li>Review the full offer carefully.</li>
                  <li>Accept or Reject the offer based on your decision.</li>
                </ol>

                <div style="margin-top:14px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:14px;padding:14px 14px;">
                  <div style="font-size:12px;line-height:18px;color:${subtle};">Current Status</div>
                  <div style="margin-top:6px;font-size:14px;line-height:22px;font-weight:900;color:#064E3B;">Awaiting Your Response</div>
                </div>

                <div style="margin-top:10px;font-size:12px;line-height:18px;color:${subtle};">
                  The employer will be notified immediately once you take action.
                </div>

                ${dashboardUrl ? `<div style="margin-top:18px;">
                  <a href="${escapeHtml(dashboardUrl)}" target="_blank" rel="noreferrer"
                     style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:11px 14px;border-radius:12px;font-weight:800;font-size:13px;">
                    Open Intern Dashboard
                  </a>
                </div>` : ""}

                <div style="margin-top:16px;font-size:12px;line-height:18px;color:${subtle};">
                  If you require any clarification regarding the offer, please contact us at:
                  <a href="${escapeHtml(contactUrl || "https://findtern.in/contact")}" target="_blank" rel="noreferrer" style="color:${primary};text-decoration:underline;">${escapeHtml(
                    contactUrl || "https://findtern.in/contact",
                  )}</a>
                </div>

                <div style="margin-top:18px;font-size:12px;line-height:18px;color:${subtle};">
                  Best regards,<br/>Team ${brandName}<br/>Building trust in internship hiring<br/>
                  <a href="https://findtern.in" target="_blank" rel="noreferrer" style="color:${primary};text-decoration:underline;">www.findtern.in</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 6px 0 6px;font-size:12px;line-height:18px;color:${subtle};text-align:center;">Sent by ${brandName}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await sendSmtpMail({
    to: opts.to,
    subject,
    text,
    html,
  });
}

function getFirstInitial(value: unknown) {
  const raw = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const firstWord = raw.split(" ").filter(Boolean)[0] ?? "";
  if (!firstWord) return "Candidate";
  return firstWord;
}

async function sendProposalReceivedInternEmail(opts: {
  to: string;
  internName: string;
  employerName: string;
  roleName: string;
  proposalUrl: string;
  appBaseUrl: string;
}) {
  const brandName = "Findtern";
  const subject = `You’ve Received a New Internship Proposal on ${brandName}`;

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const safeInternName = String(opts.internName ?? "").trim() || "Candidate";
  const safeInternInitial = getFirstInitial(safeInternName);
  const safeEmployerName = String(opts.employerName ?? "").trim() || "Employer";
  const displayEmployerName = maskDisplayName(safeEmployerName) || safeEmployerName;
  const safeRoleName = String(opts.roleName ?? "").trim() || "the role";
  const appBaseUrl = String(opts.appBaseUrl ?? "").replace(/\/$/, "");
  const proposalUrl = String(opts.proposalUrl ?? "").trim();
  const contactUrl = appBaseUrl ? `${appBaseUrl}/contact` : "";

  const text =
    `Hi ${safeInternInitial},\n\n` +
    `Good news!\n` +
    `You’ve received a new internship proposal from ${displayEmployerName} for the role of ${safeRoleName}.\n\n` +
    `What you need to do:\n` +
    `- Review the proposal details carefully\n` +
    `- Accept if it aligns with your goals\n` +
    `- Reject if it’s not the right fit — no pressure, no penalties\n\n` +
    `${proposalUrl ? `Open proposal:\n${proposalUrl}\n\n` : ""}` +
    `${contactUrl ? `If you have questions about the role, expectations, or timeline, feel free to send us a query:\n${contactUrl}\n\nChoose what’s right for you — we’ve got your back.\n\n` : ""}` +
    `Best\nTeam ${brandName}\nBuilding trust in internship hiring\nwww.findtern.in`;

  const primary = "#0E6049";
  const subtle = "#6B7280";
  const bg = "#F3F4F6";
  const card = "#FFFFFF";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:${bg};font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      New proposal received on ${brandName}
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg};padding:30px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 4px 14px 4px;">
                <div style="font-size:18px;line-height:24px;font-weight:900;color:#111827;">${brandName}</div>
              </td>
            </tr>

            <tr>
              <td style="background:${card};border-radius:16px;box-shadow:0 6px 24px rgba(17,24,39,0.08);padding:22px 20px;">
                <div style="font-size:16px;line-height:22px;font-weight:900;color:#111827;">You’ve received a new proposal</div>
                <div style="margin-top:10px;font-size:14px;line-height:22px;color:${subtle};">Hi <strong style="color:#111827;">${escapeHtml(safeInternInitial)}</strong>,</div>
                <div style="margin-top:10px;font-size:14px;line-height:22px;color:${subtle};">
                  Good news! You’ve received a new internship proposal from <strong style="color:#111827;">${escapeHtml(displayEmployerName)}</strong> for the role of <strong style="color:#111827;">${escapeHtml(safeRoleName)}</strong>.
                </div>

                <div style="margin-top:16px;font-size:14px;line-height:22px;color:#111827;font-weight:900;">What you need to do:</div>
                <ul style="margin:10px 0 0 18px;padding:0;color:${subtle};font-size:14px;line-height:22px;">
                  <li>Review the proposal details carefully</li>
                  <li><strong style="color:#111827;">Accept</strong> if it aligns with your goals</li>
                  <li><strong style="color:#111827;">Reject</strong> if it’s not the right fit — no pressure, no penalties</li>
                </ul>

                <div style="margin-top:14px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:14px;padding:14px 14px;">
                  <div style="font-size:12px;line-height:18px;color:${subtle};">Status</div>
                  <div style="margin-top:6px;font-size:14px;line-height:22px;font-weight:900;color:#064E3B;">Awaiting your response</div>
                </div>

                ${proposalUrl ? `<div style="margin-top:18px;">
                  <a href="${escapeHtml(proposalUrl)}" target="_blank" rel="noreferrer"
                     style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:11px 14px;border-radius:12px;font-weight:800;font-size:13px;">
                    View proposal
                  </a>
                </div>` : ""}

                ${contactUrl ? `<div style="margin-top:16px;font-size:12px;line-height:18px;color:${subtle};">
                  If you have questions about the role, expectations, or timeline, feel free to send us a query:
                  <a href="${escapeHtml(contactUrl)}" target="_blank" rel="noreferrer" style="color:${primary};text-decoration:underline;">${escapeHtml(contactUrl)}</a>
                </div>
                <div style="margin-top:10px;font-size:12px;line-height:18px;color:${subtle};">
                  Choose what’s right for you — we’ve got your back.
                </div>` : ""}

                <div style="margin-top:18px;font-size:12px;line-height:18px;color:${subtle};">
                  Best,<br/>Team ${brandName}<br/>Building trust in internship hiring<br/>
                  <a href="https://findtern.in" target="_blank" rel="noreferrer" style="color:${primary};text-decoration:underline;">www.findtern.in</a>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 6px 0 6px;font-size:12px;line-height:18px;color:${subtle};text-align:center;">Sent by ${brandName}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await sendSmtpMail({
    to: opts.to,
    subject,
    text,
    html,
  });
}

async function sendProposalStatusUpdatedEmployerEmail(opts: {
  to: string;
  employerName: string;
  internName: string;
  roleName: string;
  status: "accepted" | "rejected";
  proposalUrl: string;
  appBaseUrl: string;
}) {
  const brandName = "Findtern";
  const subject = `Candidate Decision Update | ${brandName}`;

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const safeEmployerName = String(opts.employerName ?? "").trim() || "Employer";
  const safeInternName = String(opts.internName ?? "").trim() || "Candidate";
  const safeRoleName = String(opts.roleName ?? "").trim() || "the role";
  const decisionLabel = String(opts.status ?? "").trim().toLowerCase() === "accepted" ? "Accepted" : "Rejected";
  const appBaseUrl = String(opts.appBaseUrl ?? "").replace(/\/$/, "");
  const proposalUrl = String(opts.proposalUrl ?? "").trim();
  const contactUrl = appBaseUrl ? `${appBaseUrl}/contact` : "";

  const text =
    `Hi ${safeEmployerName},\n\n` +
    `This is to inform you that ${safeInternName} has submitted their decision regarding the Full-Time Job Offer for the position of ${safeRoleName}.\n\n` +
    `Decision Status: ${decisionLabel}\n\n` +
    `To view complete details of the candidate’s response, please log in to your Findtern Employer Dashboard.\n` +
    `All relevant updates and next steps (if applicable) are available within your account.\n\n` +
    `If you need assistance or further clarification, please reach out to us at:\n` +
    `${contactUrl || "https://findtern.in/contact"}\n\n` +
    `Best regards,\n` +
    `Team ${brandName}\n` +
    `Building trust in internship hiring\n` +
    `www.findtern.in`;

  const primary = "#0E6049";
  const subtle = "#6B7280";
  const bg = "#F3F4F6";
  const card = "#FFFFFF";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:${bg};font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg};padding:30px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 4px 14px 4px;">
                <div style="font-size:18px;line-height:24px;font-weight:900;color:#111827;">${brandName}</div>
              </td>
            </tr>

            <tr>
              <td style="background:${card};border-radius:16px;box-shadow:0 6px 24px rgba(17,24,39,0.08);padding:22px 20px;">
                <div style="font-size:16px;line-height:22px;font-weight:900;color:#111827;">Candidate Decision Update</div>
                <div style="margin-top:10px;font-size:14px;line-height:22px;color:${subtle};">Hi <strong style="color:#111827;">${escapeHtml(safeEmployerName)}</strong>,</div>
                <div style="margin-top:10px;font-size:14px;line-height:22px;color:${subtle};">
                  This is to inform you that <strong style="color:#111827;">${escapeHtml(safeInternName)}</strong> has submitted their decision regarding the Full-Time Job Offer for the position of <strong style="color:#111827;">${escapeHtml(safeRoleName)}</strong>.
                </div>

                <div style="margin-top:14px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:14px;padding:14px 14px;">
                  <div style="font-size:12px;line-height:18px;color:${subtle};">Decision Status</div>
                  <div style="margin-top:6px;font-size:14px;line-height:22px;font-weight:900;color:#111827;">${escapeHtml(decisionLabel)}</div>
                </div>

                <div style="margin-top:12px;font-size:14px;line-height:22px;color:${subtle};">
                  To view complete details of the candidate’s response, please log in to your Findtern Employer Dashboard.
                </div>
                <div style="margin-top:8px;font-size:14px;line-height:22px;color:${subtle};">
                  All relevant updates and next steps (if applicable) are available within your account.
                </div>

                ${proposalUrl ? `<div style="margin-top:18px;">
                  <a href="${escapeHtml(proposalUrl)}" target="_blank" rel="noreferrer"
                     style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:11px 14px;border-radius:12px;font-weight:800;font-size:13px;">
                    View in dashboard
                  </a>
                </div>` : ""}

                ${contactUrl ? `<div style="margin-top:16px;font-size:12px;line-height:18px;color:${subtle};">
                  If you need assistance or further clarification, please reach out to us at: <a href="${escapeHtml(contactUrl)}" target="_blank" rel="noreferrer" style="color:${primary};text-decoration:underline;">${escapeHtml(contactUrl)}</a>
                </div>` : ""}

                <div style="margin-top:18px;font-size:12px;line-height:18px;color:${subtle};">
                  Best regards,<br/>Team ${brandName}<br/>Building trust in internship hiring<br/>
                  <a href="https://findtern.in" target="_blank" rel="noreferrer" style="color:${primary};text-decoration:underline;">www.findtern.in</a>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 6px 0 6px;font-size:12px;line-height:18px;color:${subtle};text-align:center;">Sent by ${brandName}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await sendSmtpMail({
    to: opts.to,
    subject,
    text,
    html,
  });
}

async function sendStipendTransferredInternEmail(opts: {
  to: string;
  internName: string;
  roleName: string;
  amountMinor: number;
  currency: "INR" | "USD";
  appBaseUrl: string;
  dashboardUrl: string;
}) {
  const brandName = "Findtern";
  const subject = `Stipend Transferred Successfully | ${brandName}`;

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const safeInternName = String(opts.internName ?? "").trim() || "Candidate";
  const safeInternInitial = getFirstInitial(safeInternName);
  const safeRoleName = String(opts.roleName ?? "").trim() || "your internship";
  const amountMinor = Number(opts.amountMinor ?? 0);
  const currency = (String(opts.currency ?? "INR").toUpperCase() === "USD" ? "USD" : "INR") as "INR" | "USD";
  const formatAmount = () => {
    const locale = currency === "INR" ? "en-IN" : "en-US";
    const major = Number.isFinite(amountMinor) ? Math.max(0, amountMinor) / 100 : 0;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(major || 0);
  };
  const safeAmountLabel = formatAmount();
  const dashboardUrl = String(opts.dashboardUrl ?? "").trim();
  const appBaseUrl = String(opts.appBaseUrl ?? "").replace(/\/$/, "");
  const contactUrl = appBaseUrl ? `${appBaseUrl}/contact` : "";

  const text =
    `Hi ${safeInternInitial},\n` +
    `Your stipend for ${safeRoleName} has been successfully transferred.\n` +
    `Amount: ${safeAmountLabel}\n\n` +
    `You can view the payment details, amount, and transaction status in your ${brandName} dashboard.\n` +
    `${dashboardUrl ? `${dashboardUrl}\n\n` : "\n"}` +
    `If you don’t see the amount reflected in your account immediately, please allow standard bank processing time.\n\n` +
    `For any issues or questions, reach out to us through the platform.\n\n` +
    `Best,\n` +
    `Team ${brandName}\n` +
    `Transparent payments, zero confusion\n` +
    `www.findtern.in`;

  const primary = "#0E6049";
  const subtle = "#6B7280";
  const bg = "#F3F4F6";
  const card = "#FFFFFF";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:${bg};font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg};padding:30px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 4px 14px 4px;">
                <div style="font-size:18px;line-height:24px;font-weight:900;color:#111827;">${brandName}</div>
              </td>
            </tr>

            <tr>
              <td style="background:${card};border-radius:16px;box-shadow:0 6px 24px rgba(17,24,39,0.08);padding:22px 20px;">
                <div style="font-size:16px;line-height:22px;font-weight:900;color:#111827;">Stipend Transferred Successfully</div>
                <div style="margin-top:10px;font-size:14px;line-height:22px;color:${subtle};">Hi <strong style="color:#111827;">${escapeHtml(safeInternName)}</strong>,</div>
                <div style="margin-top:10px;font-size:14px;line-height:22px;color:${subtle};">
                  Your stipend for <strong style="color:#111827;">${escapeHtml(safeRoleName)}</strong> has been successfully transferred.
                </div>

                <div style="margin-top:12px;font-size:14px;line-height:22px;color:${subtle};">
                  Amount paid: <strong style="color:#111827;">${escapeHtml(safeAmountLabel)}</strong>
                </div>

                <div style="margin-top:12px;font-size:14px;line-height:22px;color:${subtle};">
                  👉 You can view the payment details, amount, and transaction status in your ${brandName} dashboard.
                </div>

                ${dashboardUrl ? `<div style="margin-top:18px;">
                  <a href="${escapeHtml(dashboardUrl)}" target="_blank" rel="noreferrer"
                     style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:11px 14px;border-radius:12px;font-weight:800;font-size:13px;">
                    View dashboard
                  </a>
                </div>` : ""}

                <div style="margin-top:16px;font-size:12px;line-height:18px;color:${subtle};">
                  If you don’t see the amount reflected in your account immediately, please allow standard bank processing time.
                </div>

                <div style="margin-top:16px;font-size:12px;line-height:18px;color:${subtle};">
                  For any issues or questions, reach out to us through the platform.
                </div>

                <div style="margin-top:18px;font-size:12px;line-height:18px;color:${subtle};">
                  Best,<br/>Team ${brandName}<br/>
                  Transparent payments, zero confusion<br/>
                  <a href="https://findtern.in" target="_blank" rel="noreferrer" style="color:${primary};text-decoration:underline;">www.findtern.in</a>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 6px 0 6px;font-size:12px;line-height:18px;color:${subtle};text-align:center;">Sent by ${brandName}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await sendSmtpMail({
    to: opts.to,
    subject,
    text,
    html,
  });
}

async function sendInternActivationPaymentSuccessEmail(opts: {
  to: string;
  internName: string;
  appBaseUrl: string;
  dashboardUrl: string;
  amountMinor?: number;
  currency?: string;
}) {
  const brandName = "Findtern";
  const subject = `Payment Successful | Welcome to ${brandName}`;

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const safeInternName = String(opts.internName ?? "").trim() || "Candidate";
  const safeInternInitial = safeInternName;
  const appBaseUrl = String(opts.appBaseUrl ?? "").replace(/\/$/, "");
  const dashboardUrl = String(opts.dashboardUrl ?? "").trim();
  const contactUrl = appBaseUrl ? `${appBaseUrl}/contact` : "";
  const currency = String(opts.currency ?? "INR").trim().toUpperCase() || "INR";
  const amountMinor = Number.isFinite(Number(opts.amountMinor)) ? Number(opts.amountMinor) : 0;
  const amountLabel = (() => {
    if (!amountMinor || amountMinor <= 0) return "";
    const major = amountMinor / 100;
    const locale = currency === "INR" ? "en-IN" : "en-US";
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(major);
    } catch {
      return `${major}`;
    }
  })();

  const text =
    `Hi ${safeInternInitial},\n\n` +
    `Your ${brandName} sign-up fee payment has been successfully received.\n\n` +
    `${amountLabel ? `Amount: ${amountLabel}\n\n` : ""}` +
    `You now have full access to the ${brandName} platform and its features.\n\n` +
    `${dashboardUrl ? `Open your dashboard: ${dashboardUrl}\n\n` : ""}` +
    `${contactUrl ? `Need help? Contact us: ${contactUrl}\n\n` : ""}` +
    `Welcome aboard\nTeam ${brandName}`;

  const primary = "#0E6049";
  const subtle = "#6B7280";
  const bg = "#F3F4F6";
  const card = "#FFFFFF";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:${bg};font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg};padding:30px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 4px 14px 4px;">
                <div style="font-size:18px;line-height:24px;font-weight:900;color:#111827;">${brandName}</div>
              </td>
            </tr>

            <tr>
              <td style="background:${card};border-radius:16px;box-shadow:0 6px 24px rgba(17,24,39,0.08);padding:22px 20px;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="width:34px;height:34px;border-radius:10px;background:${primary};color:white;display:flex;align-items:center;justify-content:center;font-weight:900;">✓</div>
                  <div>
                    <div style="font-size:16px;line-height:22px;font-weight:900;color:#111827;">Payment successful</div>
                    <div style="font-size:12px;line-height:18px;color:${subtle};">Your account is now active.</div>
                  </div>
                </div>

                <div style="margin-top:16px;font-size:14px;line-height:22px;color:${subtle};">Hi <strong style="color:#111827;">${escapeHtml(
                  safeInternInitial,
                )}</strong>,</div>

                <div style="margin-top:10px;font-size:14px;line-height:22px;color:${subtle};">
                  Your <strong style="color:#111827;">${brandName}</strong> sign-up fee payment has been successfully received.
                </div>

                ${amountLabel ? `<div style="margin-top:12px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:14px;padding:14px 14px;">
                  <div style="font-size:12px;line-height:18px;color:${subtle};">Amount</div>
                  <div style="margin-top:6px;font-size:16px;line-height:22px;font-weight:900;color:#064E3B;">${escapeHtml(
                    amountLabel,
                  )}</div>
                </div>` : ""}

                <div style="margin-top:14px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:14px;padding:14px 14px;">
                  <div style="font-size:12px;line-height:18px;color:${subtle};">What you can do next</div>
                  <ul style="margin:10px 0 0 18px;padding:0;color:${subtle};font-size:14px;line-height:22px;">
                    <li>Complete and optimize your profile</li>
                    <li>Apply for AI interview for vetting process</li>
                    <li>Receive proposals from employers</li>
                  </ul>
                </div>

                ${dashboardUrl ? `<div style="margin-top:18px;">
                  <a href="${escapeHtml(dashboardUrl)}" target="_blank" rel="noreferrer"
                     style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:11px 14px;border-radius:12px;font-weight:800;font-size:13px;">
                    Open dashboard
                  </a>
                </div>` : ""}

                ${contactUrl ? `<div style="margin-top:16px;font-size:12px;line-height:18px;color:${subtle};">
                  If you have questions, contact us: <a href="${escapeHtml(contactUrl)}" target="_blank" rel="noreferrer" style="color:${primary};text-decoration:underline;">${escapeHtml(
                    contactUrl,
                  )}</a>
                </div>` : ""}

                <div style="margin-top:18px;font-size:12px;line-height:18px;color:${subtle};">Welcome aboard,<br/>Team ${brandName}</div>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 6px 0 6px;font-size:12px;line-height:18px;color:${subtle};text-align:center;">Sent by ${brandName}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await sendSmtpMail({
    to: opts.to,
    subject,
    text,
    html,
  });
}

async function sendInternHireConfirmedEmail(opts: {
  to: string;
  internName: string;
  companyName: string;
  roleName: string;
  appBaseUrl: string;
  dashboardUrl: string;
}) {
  const brandName = "Findtern";
  const subject = `You’re Hired! | Internship Confirmed on ${brandName}`;

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const safeInternName = String(opts.internName ?? "").trim() || "Candidate";
  const safeCompanyName = String(opts.companyName ?? "").trim() || "Company";
  const safeRoleName = String(opts.roleName ?? "").trim() || "the role";
  const appBaseUrl = String(opts.appBaseUrl ?? "").replace(/\/$/, "");
  const dashboardUrl = String(opts.dashboardUrl ?? "").trim();
  const contactUrl = appBaseUrl ? `${appBaseUrl}/contact` : "";

  const text =
    `Hi ${safeInternName},\n` +
    `\n` +
    `Congratulations! 🎉\n` +
    `You’ve been officially hired for ${safeRoleName} with ${safeCompanyName}.\n` +
    `The employer has completed the required payment, and your engagement is now confirmed on ${brandName}.\n` +
    `\n` +
    `👉 Please log in to your ${brandName} dashboard to view:\n` +
    `- Engagement details\n` +
    `- Start date and next steps\n` +
    `- Employer communication\n` +
    `\n` +
    `The employer may reach out shortly to begin onboarding.\n` +
    `${dashboardUrl ? `\nOpen dashboard: ${dashboardUrl}\n` : ""}` +
    `\n` +
    `Well done — this is a big step forward\n` +
    `Team ${brandName}\n` +
    `Turning opportunities into outcomes\n` +
    `www.findtern.in`;

  const primary = "#0E6049";
  const subtle = "#6B7280";
  const bg = "#F3F4F6";
  const card = "#FFFFFF";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:${bg};font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg};padding:30px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 4px 14px 4px;">
                <div style="font-size:18px;line-height:24px;font-weight:900;color:#111827;">${brandName}</div>
              </td>
            </tr>

            <tr>
              <td style="background:${card};border-radius:16px;box-shadow:0 6px 24px rgba(17,24,39,0.08);padding:22px 20px;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="width:34px;height:34px;border-radius:10px;background:${primary};color:white;display:flex;align-items:center;justify-content:center;font-weight:900;">✓</div>
                  <div>
                    <div style="font-size:16px;line-height:22px;font-weight:900;color:#111827;">Internship confirmed</div>
                    <div style="font-size:12px;line-height:18px;color:${subtle};">You’re officially hired.</div>
                  </div>
                </div>

                <div style="margin-top:16px;font-size:14px;line-height:22px;color:${subtle};">Hi <strong style="color:#111827;">${escapeHtml(
                  safeInternName,
                )}</strong>,</div>

                <div style="margin-top:10px;font-size:14px;line-height:22px;color:${subtle};">
                  Congratulations! 🎉 You’ve been officially hired for <strong style="color:#111827;">${escapeHtml(
                    safeRoleName,
                  )}</strong> with <strong style="color:#111827;">${escapeHtml(safeCompanyName)}</strong>.
                </div>

                <div style="margin-top:10px;font-size:14px;line-height:22px;color:${subtle};">
                  The employer has completed the required payment, and your engagement is now confirmed on ${brandName}.
                </div>

                <div style="margin-top:14px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:14px;padding:14px 14px;">
                  <div style="font-size:12px;line-height:18px;color:${subtle};">Please log in to your ${brandName} dashboard to view</div>
                  <div style="margin-top:8px;font-size:12px;line-height:18px;color:${subtle};">
                    <div>• Engagement details</div>
                    <div>• Start date and next steps</div>
                    <div>• Employer communication</div>
                  </div>
                </div>

                <div style="margin-top:12px;font-size:12px;line-height:18px;color:${subtle};">
                  The employer may reach out shortly to begin onboarding.
                </div>

                ${dashboardUrl ? `<div style="margin-top:18px;">
                  <a href="${escapeHtml(dashboardUrl)}" target="_blank" rel="noreferrer"
                     style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:11px 14px;border-radius:12px;font-weight:800;font-size:13px;">
                    Open dashboard
                  </a>
                </div>` : ""}

                ${contactUrl ? `<div style="margin-top:16px;font-size:12px;line-height:18px;color:${subtle};">
                  If you have questions, contact us: <a href="${escapeHtml(contactUrl)}" target="_blank" rel="noreferrer" style="color:${primary};text-decoration:underline;">${escapeHtml(
                    contactUrl,
                  )}</a>
                </div>` : ""}

                <div style="margin-top:18px;font-size:12px;line-height:18px;color:${subtle};">
                  Well done — this is a big step forward<br/>
                  Team ${brandName}<br/>
                  Turning opportunities into outcomes<br/>
                  <a href="https://www.findtern.in" target="_blank" rel="noreferrer" style="color:${primary};text-decoration:underline;">www.findtern.in</a>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 6px 0 6px;font-size:12px;line-height:18px;color:${subtle};text-align:center;">Sent by ${brandName}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await sendSmtpMail({
    to: opts.to,
    subject,
    text,
    html,
  });
}

async function sendEmployerPaymentReceivedEmail(opts: {
  to: string;
  employerName: string;
  roleName: string;
  ordersUrl: string;
  appBaseUrl: string;
}) {
  const brandName = "Findtern";
  const subject = `Payment Received Successfully | ${brandName}`;

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const safeEmployerName = String(opts.employerName ?? "").trim() || "Employer";
  const safeRoleName = String(opts.roleName ?? "").trim() || "your order";
  const appBaseUrl = String(opts.appBaseUrl ?? "").replace(/\/$/, "");
  const ordersUrl = String(opts.ordersUrl ?? "").trim();
  const contactUrl = appBaseUrl ? `${appBaseUrl}/contact` : "";

  const text =
    `Hi ${safeEmployerName},\n\n` +
    `We’ve successfully received your payment for ${safeRoleName}.\n` +
    `${ordersUrl ? `👉 You can view the payment details and invoice in your ${brandName} dashboard.\n${ordersUrl}\n\n` : "\n"}` +
    `The process will now move forward as per the agreed workflow. Any next steps or updates will be visible inside the portal.\n` +
    `If you have questions regarding billing or documentation, feel free to reach out to us through ${brandName}.\n\n` +
    `Best regards,\nTeam ${brandName}\nSecure, transparent hiring\nwww.findtern.in`;

  const primary = "#0E6049";
  const subtle = "#6B7280";
  const bg = "#F3F4F6";
  const card = "#FFFFFF";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:${bg};font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg};padding:30px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 4px 14px 4px;">
                <div style="font-size:18px;line-height:24px;font-weight:900;color:#111827;">${brandName}</div>
              </td>
            </tr>

            <tr>
              <td style="background:${card};border-radius:16px;box-shadow:0 6px 24px rgba(17,24,39,0.08);padding:22px 20px;">
                <div style="font-size:16px;line-height:22px;font-weight:900;color:#111827;">Payment received</div>
                <div style="margin-top:10px;font-size:14px;line-height:22px;color:${subtle};">Hi <strong style="color:#111827;">${escapeHtml(safeEmployerName)}</strong>,</div>
                <div style="margin-top:10px;font-size:14px;line-height:22px;color:${subtle};">
                  We’ve successfully received your payment for <strong style="color:#111827;">${escapeHtml(safeRoleName)}</strong>.
                </div>

                <div style="margin-top:14px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:14px;padding:14px 14px;">
                  <div style="font-size:12px;line-height:18px;color:${subtle};">Next step</div>
                  <div style="margin-top:6px;font-size:12px;line-height:18px;color:${subtle};">
                    The process will now move forward as per the agreed workflow. Any next steps or updates will be visible inside the portal.
                  </div>
                </div>

                ${ordersUrl ? `<div style="margin-top:18px;">
                  <a href="${escapeHtml(ordersUrl)}" target="_blank" rel="noreferrer"
                     style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:11px 14px;border-radius:12px;font-weight:800;font-size:13px;">
                    View payment details
                  </a>
                </div>` : ""}

                <div style="margin-top:16px;font-size:12px;line-height:18px;color:${subtle};">
                  If you have questions regarding billing or documentation, feel free to reach out to us through ${brandName}.
                </div>

                <div style="margin-top:18px;font-size:12px;line-height:18px;color:${subtle};">
                  Best regards,<br/>Team ${brandName}<br/>Secure, transparent hiring<br/>
                  <a href="https://findtern.in" target="_blank" rel="noreferrer" style="color:${primary};text-decoration:underline;">www.findtern.in</a>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 6px 0 6px;font-size:12px;line-height:18px;color:${subtle};text-align:center;">Sent by ${brandName}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await sendSmtpMail({
    to: opts.to,
    subject,
    text,
    html,
  });
}

async function sendMeetingScheduledInternEmail(opts: {
  to: string;
  internName: string;
  employerName: string;
  projectName?: string | null;
  timezone: string;
  startTimeUtc: Date;
  endTimeUtc: Date;
  meetingLink?: string | null;
  interviewId: string;
  appBaseUrl: string;
}) {
  const brandName = "Findtern";
  const subject = `Meeting Scheduled Successfully | ${brandName}`;

  const safeInternName = String(opts.internName ?? "").trim() || "Candidate";
  const safeInternInitial = getFirstInitial(safeInternName);
  const safeEmployerName = String(opts.employerName ?? "").trim() || "Employer";
  const safeProjectName = String(opts.projectName ?? "").trim();
  const timezone = String(opts.timezone ?? "").trim() || "UTC";
  const appBaseUrl = String(opts.appBaseUrl ?? "").replace(/\/$/, "");
  const dashboardUrl = `${appBaseUrl}/interviews`;

  const formatSlot = (d: Date) => {
    try {
      return d.toLocaleString(undefined, {
        timeZone: timezone,
        dateStyle: "full",
        timeStyle: "short",
      });
    } catch {
      return d.toISOString();
    }
  };

  const whenLabel = formatSlot(opts.startTimeUtc);
  const meet = String(opts.meetingLink ?? "").trim();
  const meetLabel = meet ? (meet.startsWith("http") ? meet : `https://${meet}`) : "";

  const text =
    `Hi ${safeInternInitial},\n\n` +
    `Your meeting has been successfully scheduled on ${brandName}.\n\n` +
    `Company: ${safeEmployerName}${safeProjectName ? `\nProject: ${safeProjectName}` : ""}\n` +
    `When: ${whenLabel} (${timezone})\n` +
    `${meetLabel ? `Meet link: ${meetLabel}\n` : ""}` +
    `\nYou can view the meeting details in your ${brandName} dashboard:\n${dashboardUrl}\n\n` +
    `Please make sure you’re available at the scheduled time.\n\n` +
    `Best\nTeam ${brandName}`;

  const primary = "#0E6049";
  const subtle = "#6B7280";
  const bg = "#F3F4F6";
  const card = "#FFFFFF";

  const meetRow = meetLabel
    ? `<div style="margin-top:12px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:14px;padding:12px 12px;">
         <div style="font-size:12px;color:${subtle};">Joining link</div>
         <div style="margin-top:6px;word-break:break-all;">
           <a href="${meetLabel}" target="_blank" rel="noreferrer" style="color:${primary};text-decoration:underline;">${meetLabel}</a>
         </div>
       </div>`
    : `<div style="margin-top:12px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:14px;padding:12px 12px;">
         <div style="font-size:12px;color:#92400E;">Meet link may appear shortly.</div>
         <div style="margin-top:6px;font-size:12px;color:#92400E;">If it doesn't, please check your dashboard later.</div>
       </div>`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:${bg};font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg};padding:30px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 4px 14px 4px;">
                <div style="font-size:18px;line-height:24px;font-weight:900;color:#111827;">${brandName}</div>
                <div style="font-size:12px;line-height:18px;color:${subtle};margin-top:2px;">Meeting confirmation</div>
              </td>
            </tr>
            <tr>
              <td style="background:${card};border-radius:16px;box-shadow:0 6px 24px rgba(17,24,39,0.08);padding:22px 20px;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="width:34px;height:34px;border-radius:10px;background:${primary};color:white;display:flex;align-items:center;justify-content:center;font-weight:900;">✓</div>
                  <div>
                    <div style="font-size:16px;line-height:22px;font-weight:900;color:#111827;">Meeting scheduled</div>
                    <div style="font-size:12px;line-height:18px;color:${subtle};">You’re all set. See details below.</div>
                  </div>
                </div>

                <div style="margin-top:16px;font-size:14px;line-height:22px;color:#111827;">Hi <strong>${safeInternInitial}</strong>,</div>
                <div style="margin-top:10px;font-size:14px;line-height:22px;color:${subtle};">
                  Your meeting with <strong>${safeEmployerName}</strong>${safeProjectName ? ` for <strong>${safeProjectName}</strong>` : ""} has been successfully scheduled.
                </div>

                <div style="margin-top:14px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:14px;padding:14px 14px;">
                  <div style="font-size:12px;line-height:18px;color:${subtle};">Scheduled time</div>
                  <div style="margin-top:6px;font-size:15px;line-height:22px;font-weight:900;color:#064E3B;">${whenLabel}</div>
                  <div style="margin-top:4px;font-size:12px;line-height:18px;color:${subtle};">Time zone: ${timezone}</div>
                </div>

                ${meetRow}

                <div style="margin-top:18px;">
                  <a href="${dashboardUrl}" target="_blank" rel="noreferrer"
                     style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:11px 14px;border-radius:12px;font-weight:800;font-size:13px;">
                    View in dashboard
                  </a>
                </div>

                <div style="margin-top:16px;font-size:12px;line-height:18px;color:${subtle};">
                  Please be available at the scheduled time.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 6px 0 6px;font-size:12px;line-height:18px;color:${subtle};text-align:center;">
                Sent by ${brandName}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const uid = `findtern-interview-${String(opts.interviewId ?? "").trim() || uuidv4()}@findtern`;
  const ics = buildIcsInvite({
    uid,
    summary: `${brandName} Interview`,
    description: `Interview scheduled via ${brandName}${meetLabel ? `\n\n${meetLabel}` : ""}`,
    startTime: opts.startTimeUtc,
    endTime: opts.endTimeUtc,
    organizerEmail: String(process.env.SMTP_FROM ?? "").trim() || null,
    organizerName: brandName,
    meetingLink: meetLabel || null,
  });

  await sendSmtpMail({
    to: opts.to,
    subject,
    text,
    html,
    attachments: [
      {
        filename: "findtern-interview.ics",
        content: ics,
        contentType: "text/calendar; charset=utf-8; method=REQUEST",
      },
    ],
  });
}

async function sendMeetingScheduledEmployerEmail(opts: {
  to: string;
  employerName: string;
  internName: string;
  projectName?: string | null;
  timezone: string;
  startTimeUtc: Date;
  endTimeUtc: Date;
  meetingLink?: string | null;
  interviewId: string;
  appBaseUrl: string;
}) {
  const brandName = "Findtern";
  const subject = `Meeting Scheduled | Candidate Confirmed a Slot`;

  const safeEmployerName = String(opts.employerName ?? "").trim() || "Employer";
  const safeInternName = String(opts.internName ?? "").trim() || "Candidate";
  const safeProjectName = String(opts.projectName ?? "").trim();
  const timezone = String(opts.timezone ?? "").trim() || "UTC";
  const appBaseUrl = String(opts.appBaseUrl ?? "").replace(/\/$/, "");
  const dashboardUrl = `${appBaseUrl}/employer/schedule`;

  const formatSlot = (d: Date) => {
    try {
      return d.toLocaleString(undefined, {
        timeZone: timezone,
        dateStyle: "full",
        timeStyle: "short",
      });
    } catch {
      return d.toISOString();
    }
  };

  const whenLabel = formatSlot(opts.startTimeUtc);
  const meet = String(opts.meetingLink ?? "").trim();
  const meetLabel = meet ? (meet.startsWith("http") ? meet : `https://${meet}`) : "";

  const text =
    `Hi ${safeEmployerName},\n\n` +
    `The meeting has been successfully scheduled — the candidate confirmed a slot.\n\n` +
    `Candidate: ${safeInternName}${safeProjectName ? `\nProject: ${safeProjectName}` : ""}\n` +
    `When: ${whenLabel} (${timezone})\n` +
    `${meetLabel ? `Meet link: ${meetLabel}\n` : ""}` +
    `\nPlease log in to your ${brandName} dashboard to view final meeting time and joining details:\n${dashboardUrl}\n\n` +
    `Best regards,\nTeam ${brandName}`;

  const primary = "#0E6049";
  const subtle = "#6B7280";
  const bg = "#F3F4F6";
  const card = "#FFFFFF";

  const meetRow = meetLabel
    ? `<div style="margin-top:12px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:14px;padding:12px 12px;">
         <div style="font-size:12px;color:${subtle};">Joining link</div>
         <div style="margin-top:6px;word-break:break-all;">
           <a href="${meetLabel}" target="_blank" rel="noreferrer" style="color:${primary};text-decoration:underline;">${meetLabel}</a>
         </div>
       </div>`
    : `<div style="margin-top:12px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:14px;padding:12px 12px;">
         <div style="font-size:12px;color:#92400E;">Meet link may be pending.</div>
         <div style="margin-top:6px;font-size:12px;color:#92400E;">You can manage meeting actions from your dashboard.</div>
       </div>`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:${bg};font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg};padding:30px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 4px 14px 4px;">
                <div style="font-size:18px;line-height:24px;font-weight:900;color:#111827;">${brandName}</div>
                <div style="font-size:12px;line-height:18px;color:${subtle};margin-top:2px;">Candidate confirmed a slot</div>
              </td>
            </tr>
            <tr>
              <td style="background:${card};border-radius:16px;box-shadow:0 6px 24px rgba(17,24,39,0.08);padding:22px 20px;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="width:34px;height:34px;border-radius:10px;background:${primary};color:white;display:flex;align-items:center;justify-content:center;font-weight:900;">✓</div>
                  <div>
                    <div style="font-size:16px;line-height:22px;font-weight:900;color:#111827;">Meeting scheduled</div>
                    <div style="font-size:12px;line-height:18px;color:${subtle};">Final time is confirmed.</div>
                  </div>
                </div>

                <div style="margin-top:16px;font-size:14px;line-height:22px;color:#111827;">Hi <strong>${safeEmployerName}</strong>,</div>
                <div style="margin-top:10px;font-size:14px;line-height:22px;color:${subtle};">
                  The meeting is successfully scheduled with <strong>${safeInternName}</strong>${safeProjectName ? ` for <strong>${safeProjectName}</strong>` : ""}.
                </div>

                <div style="margin-top:14px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:14px;padding:14px 14px;">
                  <div style="font-size:12px;line-height:18px;color:${subtle};">Scheduled time</div>
                  <div style="margin-top:6px;font-size:15px;line-height:22px;font-weight:900;color:#064E3B;">${whenLabel}</div>
                  <div style="margin-top:4px;font-size:12px;line-height:18px;color:${subtle};">Time zone: ${timezone}</div>
                </div>

                ${meetRow}

                <div style="margin-top:18px;">
                  <a href="${dashboardUrl}" target="_blank" rel="noreferrer"
                     style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:11px 14px;border-radius:12px;font-weight:800;font-size:13px;">
                    Open employer dashboard
                  </a>
                </div>

                <div style="margin-top:16px;font-size:12px;line-height:18px;color:${subtle};">
                  All meeting-related actions can be managed from the portal.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 6px 0 6px;font-size:12px;line-height:18px;color:${subtle};text-align:center;">
                Sent by ${brandName}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const uid = `findtern-interview-${String(opts.interviewId ?? "").trim() || uuidv4()}@findtern`;
  const ics = buildIcsInvite({
    uid,
    summary: `${brandName} Interview`,
    description: `Interview scheduled via ${brandName}${meetLabel ? `\n\n${meetLabel}` : ""}`,
    startTime: opts.startTimeUtc,
    endTime: opts.endTimeUtc,
    organizerEmail: String(process.env.SMTP_FROM ?? "").trim() || null,
    organizerName: brandName,
    meetingLink: meetLabel || null,
  });

  await sendSmtpMail({
    to: opts.to,
    subject,
    text,
    html,
    attachments: [
      {
        filename: "findtern-interview.ics",
        content: ics,
        contentType: "text/calendar; charset=utf-8; method=REQUEST",
      },
    ],
  });
}

function maskDisplayName(value: string) {
  const s = String(value ?? "").trim();
  if (!s) return s;
  const first = s[0] ?? "";
  const last = s[s.length - 1] ?? "";
  if (s.length <= 2) return first + "*";
  return `${first}${"*".repeat(Math.min(6, Math.max(3, s.length - 2)))}${last}`;
}

async function sendInterviewInvitationEmail(opts: {
  to: string;
  internName: string;
  employerName: string;
  projectName?: string | null;
  timezone: string;
  slotsUtc: Date[];
  interviewId: string;
  appBaseUrl: string;
}) {
  const brandName = "Findtern";
  const safeInternName = String(opts.internName ?? "").trim() || "Candidate";
  const safeInternGreetingName = safeInternName.split(" ").filter(Boolean)[0] || safeInternName;
  const safeEmployerName = String(opts.employerName ?? "").trim() || "a company";
  const displayEmployerName = maskDisplayName(safeEmployerName) || "a company";
  const timezone = String(opts.timezone ?? "").trim() || "UTC";

  const subject = `Interview Invitation | Select a Time Slot on ${brandName}`;

  const slots = (Array.isArray(opts.slotsUtc) ? opts.slotsUtc : [])
    .filter((d) => d instanceof Date && !Number.isNaN(d.getTime()))
    .slice(0, 3);

  const formatSlot = (d: Date) => {
    try {
      return d.toLocaleString(undefined, {
        timeZone: timezone,
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return d.toISOString();
    }
  };

  const dashboardUrl = `${String(opts.appBaseUrl ?? "").replace(/\/$/, "")}/interviews`;

  const text =
    `Hi ${safeInternGreetingName},\n\n` +
    `You’ve received a meeting invitation from ${displayEmployerName} on ${brandName}.\n\n` +
    `The employer has shared multiple available time slots for the discussion.\n\n` +
    `Please log in to your ${brandName} dashboard to:\n` +
    `- View the available slots\n` +
    `- Select the time that works best for you\n` +
    `- Confirm the meeting\n\n` +
    `Status: Awaiting your slot selection\n\n` +
    `Open dashboard: ${dashboardUrl}\n\n` +
    `Best\nTeam ${brandName}\nHelping you move forward, smoothly\nwww.findtern.in`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#ffffff;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:24px 18px;">
      <div style="font-size:14px;line-height:22px;">
        <p style="margin:0 0 14px 0;">Hi <strong>${safeInternGreetingName}</strong>,</p>
        <p style="margin:0 0 14px 0;">You’ve received a meeting invitation from <strong style="color:#000000;">${displayEmployerName}</strong> on <strong>${brandName}</strong>.</p>
        <p style="margin:0 0 10px 0;">The employer has shared multiple available time slots for the discussion.</p>

        <div style="margin:0 0 12px 0;">Please log in to your <strong>${brandName} dashboard</strong> to:</div>
        <ul style="margin:0 0 14px 18px;padding:0;">
          <li style="margin:6px 0;">View the available slots</li>
          <li style="margin:6px 0;">Select the time that works best for you</li>
          <li style="margin:6px 0;">Confirm the meeting</li>
        </ul>

        <div style="margin:0 0 18px 0;"><strong>Status:</strong> Awaiting your slot selection</div>

        <div style="margin:18px 0 22px 0;">
          <a href="${dashboardUrl}" target="_blank" rel="noreferrer"
             style="display:inline-block;background:#0E6049;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:700;">
            Open Findtern Dashboard
          </a>
        </div>

        <div style="margin-top:22px;padding-top:14px;border-top:1px solid #E5E7EB;">
          <div>Best</div>
          <div style="font-weight:800;">Team ${brandName}</div>
          <div style="margin-top:6px;">Helping you move forward, smoothly</div>
          <div style="margin-top:6px;"><a href="https://findtern.in" target="_blank" rel="noreferrer" style="color:#0E6049;text-decoration:underline;">www.findtern.in</a></div>
        </div>
      </div>
    </div>
  </body>
</html>`;

  await sendSmtpMail({
    to: opts.to,
    subject,
    text,
    html,
  });
}

function generateEmailOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendEmailOtpEmail(opts: {
  to: string;
  otp: string;
  ttlMinutes: number;
  subject?: string;
  heading?: string;
  subheading?: string;
  tag?: string;
}) {
  const brandName = "Findtern";
  const subject = opts.subject ?? "Verify your Findtern email";
  const heading = opts.heading ?? "Verify your email";
  const subheading =
    opts.subheading ?? `Use the code below to confirm your ${brandName} email address.`;
  const tag = opts.tag ?? "Email verification";

  const text =
    `${brandName} verification code: ${opts.otp}\n\n` +
    `This code expires in ${opts.ttlMinutes} minutes.\n\n` +
    `If you did not request this code, you can ignore this email.`;
  const primary = "#2563EB";
  const subtle = "#6B7280";
  const bg = "#F3F4F6";
  const card = "#FFFFFF";

  const logoSvg =
    `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="1" y="1" width="26" height="26" rx="8" fill="${primary}"/>` +
    `<path d="M9 19V9h10v3H12v2h6v3h-6v2h7v0H9z" fill="white"/>` +
    `</svg>`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:${bg};font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Your ${brandName} verification code is ${opts.otp}. It expires in ${opts.ttlMinutes} minutes.
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg};padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 4px 14px 4px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <div style="display:flex;align-items:center;gap:10px;">
                        <span style="display:inline-block;vertical-align:middle;">${logoSvg}</span>
                        <span style="font-size:18px;line-height:24px;font-weight:800;color:#111827;letter-spacing:-0.02em;">${brandName}</span>
                      </div>
                    </td>
                    <td align="right" style="vertical-align:middle;font-size:12px;line-height:18px;color:${subtle};">
                      ${tag}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:${card};border-radius:16px;box-shadow:0 6px 24px rgba(17,24,39,0.08);padding:26px 22px;">
                <div style="font-size:18px;line-height:26px;font-weight:800;color:#111827;">${heading}</div>
                <div style="margin-top:8px;font-size:14px;line-height:22px;color:${subtle};">
                  ${subheading}
                </div>

                <div style="margin-top:18px;background:#EFF6FF;border:1px solid #DBEAFE;border-radius:14px;padding:18px 16px;text-align:center;">
                  <div style="font-size:12px;line-height:18px;color:${subtle};letter-spacing:0.08em;text-transform:uppercase;">Verification code</div>
                  <div style="margin-top:6px;font-size:34px;line-height:40px;font-weight:900;color:#111827;letter-spacing:0.25em;">${opts.otp}</div>
                  <div style="margin-top:10px;font-size:12px;line-height:18px;color:${subtle};">
                    Expires in <strong style="color:#111827;">${opts.ttlMinutes} minutes</strong>
                  </div>
                </div>

                <div style="margin-top:16px;font-size:13px;line-height:20px;color:${subtle};">
                  If you didn’t request this, you can safely ignore this email.
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 6px 0 6px;font-size:12px;line-height:18px;color:${subtle};text-align:center;">
                This email was sent by ${brandName}. Please don’t share your verification code with anyone.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const from = String(process.env.SMTP_FROM ?? "").trim();
  const host = String(process.env.SMTP_HOST ?? "").trim();
  const user = String(process.env.SMTP_USER ?? "").trim();
  const pass = String(process.env.SMTP_PASS ?? "").trim();

  if (!from || !host || !user || !pass) {
    console.warn("SMTP is not configured; email OTP for:", opts.to);
    return;
  }

  await sendSmtpMail({
    to: opts.to,
    subject,
    text,
    html,
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // ---------------------------------------------
  // Public Auth Endpoints
  // ---------------------------------------------

  app.get("/api/timezones", async (_req, res) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      const upstreamRes = await fetch("https://worldtimeapi.org/api/timezone", {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!upstreamRes.ok) {
        return res.status(502).json({ timezones: [] });
      }

      const json = await upstreamRes.json().catch(() => null);
      if (!Array.isArray(json)) {
        return res.status(502).json({ timezones: [] });
      }

      return res.json({ timezones: json });
    } catch {
      return res.status(502).json({ timezones: [] });
    }
  });

  app.get("/api/time/current/zone", async (req, res) => {
    try {
      const timeZone = String(req.query.timeZone ?? "").trim();
      if (!timeZone) {
        return res.status(400).json({ message: "timeZone is required" });
      }

      if (timeZone.length > 128 || !/^[A-Za-z0-9_+\-./]+$/.test(timeZone)) {
        return res.status(400).json({ message: "Invalid timeZone" });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      const url = `https://timeapi.io/api/Time/current/zone?timeZone=${encodeURIComponent(timeZone)}`;
      const upstreamRes = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!upstreamRes.ok) {
        return res.status(502).json({ message: "Failed to fetch time" });
      }

      const json = await upstreamRes.json().catch(() => null);
      if (!json || typeof json !== "object") {
        return res.status(502).json({ message: "Invalid time response" });
      }

      return res.json({
        year: (json as any).year,
        month: (json as any).month,
        day: (json as any).day,
        hour: (json as any).hour,
        minute: (json as any).minute,
        seconds: (json as any).seconds,
        milliSeconds: (json as any).milliSeconds,
        dateTime: (json as any).dateTime,
        date: (json as any).date,
        time: (json as any).time,
        timeZone: (json as any).timeZone,
        dayOfWeek: (json as any).dayOfWeek,
        dstActive: Boolean((json as any).dstActive),
      });
    } catch {
      return res.status(502).json({ message: "Failed to fetch time" });
    }
  });

  app.get("/api/employer/:employerId/google/status", async (req, res) => {
    try {
      const employerId = req.params.employerId;
      const tokenRow = await storage.getEmployerGoogleToken(employerId);

      return res.json({
        employerId,
        connected: Boolean(tokenRow?.refreshToken || tokenRow?.accessToken),
        hasRefreshToken: Boolean(tokenRow?.refreshToken),
        hasAccessToken: Boolean(tokenRow?.accessToken),
        scope: tokenRow?.scope ?? null,
        expiryDate: tokenRow?.expiryDate ? tokenRow.expiryDate.toISOString() : null,
      });
    } catch (error) {
      console.error("Employer Google status error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while fetching Google connection status" });
    }
  });

  app.get("/api/findtern/google/oauth/start", async (req, res) => {
    try {
      const setupKey = String(process.env.FINDTERN_GOOGLE_OAUTH_SETUP_KEY ?? "").trim();
      if (setupKey) {
        const provided = String(req.query.key ?? "").trim();
        if (!provided || provided !== setupKey) {
          return res.status(403).send("Forbidden");
        }
      }

      const oauth2Client = getFindternOAuth2Client();
      const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent select_account",
        include_granted_scopes: true,
        scope: ["https://www.googleapis.com/auth/calendar"],
      });
      return res.redirect(url);
    } catch (error) {
      console.error("Findtern Google OAuth start error:", error);
      return res.status(500).send("Failed to start Google OAuth");
    }
  });

  app.get("/google/auth", async (req, res) => {
    try {
      const setupKey = String(process.env.FINDTERN_GOOGLE_OAUTH_SETUP_KEY ?? "").trim();
      if (setupKey) {
        const provided = String(req.query.key ?? "").trim();
        if (!provided || provided !== setupKey) {
          return res.status(403).send("Forbidden");
        }
      }

      const oauth2Client = getFindternOAuth2Client();
      const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent select_account",
        include_granted_scopes: true,
        scope: ["https://www.googleapis.com/auth/calendar"],
      });
      return res.redirect(url);
    } catch (error) {
      console.error("Findtern Google OAuth start error:", error);
      return res.status(500).send("Failed to start Google OAuth");
    }
  });

  app.get("/auth/google/callback/auth", async (req, res) => {
    try {
      const setupKey = String(process.env.FINDTERN_GOOGLE_OAUTH_SETUP_KEY ?? "").trim();
      if (setupKey) {
        const provided = String(req.query.key ?? "").trim();
        if (!provided || provided !== setupKey) {
          return res.status(403).send("Forbidden");
        }
      }

      const oauth2Client = getOAuth2Client();
      const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent select_account",
        include_granted_scopes: true,
        scope: ["https://www.googleapis.com/auth/calendar"],
      });

      return res.redirect(url);
    } catch (error) {
      console.error("Findtern Google OAuth (auth callback) start error:", error);
      return res.status(500).send("Failed to start Google OAuth");
    }
  });

  app.get("/api/findtern/google/oauth/debug", async (req, res) => {
    try {
      const setupKey = String(process.env.FINDTERN_GOOGLE_OAUTH_SETUP_KEY ?? "").trim();
      if (setupKey) {
        const provided = String(req.query.key ?? "").trim();
        if (!provided || provided !== setupKey) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      const { clientId, redirectUri } = getFindternGoogleOAuthClientConfig();
      const oauth2Client = getFindternOAuth2Client();
      const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent select_account",
        include_granted_scopes: true,
        scope: ["https://www.googleapis.com/auth/calendar"],
      });

      return res.json({
        clientId,
        redirectUri,
        generatedAuthUrl: url,
      });
    } catch (error) {
      console.error("Findtern Google OAuth debug error:", error);
      return res.status(500).json({ message: "Debug failed" });
    }
  });

  app.get("/api/findtern/google/oauth/callback", async (req, res) => {
    try {
      const code = String(req.query.code ?? "").trim();
      if (!code) {
        return res.status(400).send("Missing code");
      }

      await ensureAiInterviewEmployer();

      const oauth2Client = getFindternOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);

      const tokenOwnerId = getFindternGoogleTokenOwnerId();
      const existing = await storage.getEmployerGoogleToken(tokenOwnerId).catch(() => undefined);

      await storage.upsertEmployerGoogleToken(tokenOwnerId, {
        accessToken: tokens.access_token ?? null,
        refreshToken: tokens.refresh_token ?? existing?.refreshToken ?? null,
        scope: tokens.scope ?? null,
        tokenType: tokens.token_type ?? null,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      } as any);

      return res.status(200).send("Findtern Google connected ✅");
    } catch (error) {
      console.error("Findtern Google OAuth callback error:", error);
      return res.status(500).send("Failed to complete Google OAuth");
    }
  });

  app.get("/google/callback", async (req, res) => {
    try {
      const code = String(req.query.code ?? "").trim();
      if (!code) {
        return res.status(400).send("Missing code");
      }

      await ensureAiInterviewEmployer();

      const oauth2Client = getFindternOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);

      const tokenOwnerId = getFindternGoogleTokenOwnerId();
      const existing = await storage.getEmployerGoogleToken(tokenOwnerId).catch(() => undefined);

      await storage.upsertEmployerGoogleToken(tokenOwnerId, {
        accessToken: tokens.access_token ?? null,
        refreshToken: tokens.refresh_token ?? existing?.refreshToken ?? null,
        scope: tokens.scope ?? null,
        tokenType: tokens.token_type ?? null,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      } as any);

      return res.status(200).send("Findtern Google connected ✅");
    } catch (error) {
      console.error("Findtern Google OAuth callback error:", error);
      return res.status(500).send("Failed to complete Google OAuth");
    }
  });

  app.get("/api/google/oauth/start", async (req, res) => {
    try {
      const employerId = String(req.query.employerId ?? "").trim();
      if (!employerId) {
        return res.status(400).json({ message: "employerId is required" });
      }

      const nonce = crypto.randomBytes(16).toString("hex");
      const state = signOAuthState({ employerId, nonce });

      const oauth2Client = getOAuth2Client();
      const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent select_account",
        include_granted_scopes: true,
        scope: [
          "https://www.googleapis.com/auth/calendar.events",
          "https://www.googleapis.com/auth/calendar",
        ],
        state,
      });

      return res.redirect(url);
    } catch (error) {
      console.error("Google OAuth start error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while starting Google OAuth" });
    }
  });

  app.get("/api/auth/google/start", async (req, res) => {
    try {
      const roleRaw = String(req.query.role ?? "").trim().toLowerCase();
      const role: AuthOAuthRole = roleRaw === "employer" ? "employer" : "intern";
      const next = typeof req.query.next === "string" ? req.query.next : null;

      const nonce = crypto.randomBytes(16).toString("hex");
      const state = signOAuthState({ role, nonce, next });

      const oauth2Client = getOAuth2Client();
      const url = oauth2Client.generateAuthUrl({
        access_type: "online",
        prompt: "select_account",
        include_granted_scopes: true,
        scope: ["openid", "email", "profile"],
        state,
      });

      return res.redirect(url);
    } catch (error) {
      console.error("Google auth start error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while starting Google authentication" });
    }
  });

  const googleOAuthCallbackHandler = async (req: any, res: any) => {
    try {
      const code = String(req.query.code ?? "");
      const state = String(req.query.state ?? "");

      if (code && !state) {
        const scope = String(req.query.scope ?? "");
        if (!scope.toLowerCase().includes("calendar")) {
          return res.status(400).json({ message: "Missing code or state" });
        }

        await ensureAiInterviewEmployer();

        const tokenOwnerId = getFindternGoogleTokenOwnerId();
        const existing = await storage.getEmployerGoogleToken(tokenOwnerId).catch(() => undefined);

        let tokens: any = null;
        let tokenError: unknown = null;

        try {
          const oauth2Client = getFindternOAuth2Client();
          const result = await oauth2Client.getToken(code);
          tokens = result?.tokens;
        } catch (err) {
          tokenError = err;
        }

        if (!tokens) {
          try {
            const oauth2Client = getOAuth2Client();
            const result = await oauth2Client.getToken(code);
            tokens = result?.tokens;
            tokenError = null;
          } catch (err) {
            tokenError = err;
          }
        }

        if (!tokens) {
          throw tokenError ?? new Error("Failed to exchange OAuth code");
        }

        await storage.upsertEmployerGoogleToken(tokenOwnerId, {
          accessToken: tokens.access_token ?? null,
          refreshToken: tokens.refresh_token ?? existing?.refreshToken ?? null,
          scope: tokens.scope ?? null,
          tokenType: tokens.token_type ?? null,
          expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        } as any);

        return res.status(200).send("Findtern Google connected ✅");
      }

      if (!code || !state) {
        return res.status(400).json({ message: "Missing code or state" });
      }

      const payload = verifyOAuthState(state);
      const oauth2Client = getOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);

      if (isCalendarOAuthStatePayload(payload)) {
        const existing = await storage
          .getEmployerGoogleToken(payload.employerId)
          .catch(() => undefined);

        await storage.upsertEmployerGoogleToken(payload.employerId, {
          accessToken: tokens.access_token ?? null,
          refreshToken: tokens.refresh_token ?? existing?.refreshToken ?? null,
          scope: tokens.scope ?? null,
          tokenType: tokens.token_type ?? null,
          expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        } as any);

        const redirect = process.env.GOOGLE_OAUTH_SUCCESS_REDIRECT;
        if (redirect) {
          return res.redirect(redirect);
        }

        return res.status(200).json({
          message: "Google Calendar connected successfully",
          employerId: payload.employerId,
        });
      }

      if (!isAuthOAuthStatePayload(payload)) {
        return res.status(400).json({ message: "Invalid OAuth state payload" });
      }

      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const me = await oauth2.userinfo.get();
      const email = String(me?.data?.email ?? "").trim().toLowerCase();

      if (!email) {
        return res.status(400).json({ message: "Google account did not provide an email" });
      }

      const next = payload.next ? String(payload.next) : "";

      if (payload.role === "intern") {
        const domain = String(email.split("@")[1] ?? "").trim().toLowerCase();
        const isGmail = domain === "gmail.com" || domain === "googlemail.com";
        if (!isGmail) {
          const errMsg = encodeURIComponent(
            "Please use a personal Gmail account. Work/school email addresses are not allowed.",
          );
          const to = `/login?oauthError=${errMsg}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
          return res.redirect(to);
        }
      }

      const givenName = String((me?.data as any)?.given_name ?? "").trim();
      const familyName = String((me?.data as any)?.family_name ?? "").trim();

      if (payload.role === "intern") {
        let user = await storage.getUserByEmail(email).catch(() => undefined);

        const normalizeName = (value: string, fallback: string) => {
          const v = String(value ?? "").trim();
          const base = v || fallback || "User";
          if (base.length >= 2) return base;
          return `${base}User`.slice(0, 2);
        };

        if (!user) {
          const password = `${crypto.randomBytes(18).toString("base64url")}Aa1!`;
          const candidate = {
            firstName: normalizeName(givenName, email.split("@")[0] || "User"),
            lastName: normalizeName(familyName, "User"),
            email,
            countryCode: "+91",
            phoneNumber: "0000000000",
            password,
            agreedToTerms: true,
          };

          const parsed = insertUserSchema.safeParse(candidate);
          const insertPayload = parsed.success ? parsed.data : (candidate as any);

          try {
            user = await storage.createUser(insertPayload as any);
          } catch {
            user = await storage.getUserByEmail(email).catch(() => undefined);
          }

          if (!user) {
            const to =
              `/signup?googleEmail=${encodeURIComponent(email)}` +
              `${givenName ? `&firstName=${encodeURIComponent(givenName)}` : ""}` +
              `${familyName ? `&lastName=${encodeURIComponent(familyName)}` : ""}` +
              `${next ? `&next=${encodeURIComponent(next)}` : ""}`;
            return res.redirect(to);
          }

          await storage.updateUser(String(user.id), { emailVerified: true } as any);
        } else {
          if (user && !Boolean((user as any).emailVerified)) {
            const updated = await storage.updateUser(String(user.id), { emailVerified: true } as any).catch(() => undefined);
            if (updated) user = updated;
          }
        }

        const to =
          `/login?googleUserId=${encodeURIComponent(String(user.id))}` +
          `&email=${encodeURIComponent(email)}` +
          `${next ? `&next=${encodeURIComponent(next)}` : ""}`;
        return res.redirect(to);
      }

      let employer = await storage.getEmployerByEmail(email).catch(() => undefined);
      if (!employer) {
        const generateUniquePhone = async (countryCode: string) => {
          const code = String(countryCode ?? "+91").trim() || "+91";
          const len = code === "+91" ? 10 : 11;
          for (let attempt = 0; attempt < 20; attempt++) {
            const digits = Array.from({ length: len }, () => String(Math.floor(Math.random() * 10))).join("");
            if (!digits || /^0+$/.test(digits)) continue;
            const existingEmployer = await storage
              .getEmployerByCountryCodeAndPhoneNumber(code, digits)
              .catch(() => undefined);
            if (existingEmployer) continue;
            const existingUser = await storage
              .getUserByCountryCodeAndPhoneNumber(code, digits)
              .catch(() => undefined);
            if (existingUser) continue;
            return digits;
          }
          const fallback = String(Date.now()).replace(/\D/g, "");
          return fallback.slice(-len).padStart(len, "1");
        };

        const password = `${crypto.randomBytes(18).toString("base64url")}Aa1!`;
        const countryCode = "+91";
        const phoneNumber = await generateUniquePhone(countryCode);
        const candidate = {
          name: givenName || email.split("@")[0] || "Employer",
          companyName: "Company",
          companyEmail: email,
          countryCode,
          phoneNumber,
          password,
          agreedToTerms: true,
        };

        const parsed = insertEmployerSchema.safeParse(candidate);
        if (!parsed.success) {
          const to =
            `/employer/signup?googleEmail=${encodeURIComponent(email)}` +
            `${next ? `&next=${encodeURIComponent(next)}` : ""}`;
          return res.redirect(to);
        }

        try {
          employer = await storage.createEmployer(parsed.data as any);
        } catch {
          employer = await storage.getEmployerByEmail(email).catch(() => undefined);
        }

        if (!employer) {
          const to =
            `/employer/signup?googleEmail=${encodeURIComponent(email)}` +
            `${next ? `&next=${encodeURIComponent(next)}` : ""}`;
          return res.redirect(to);
        }

        if (employer && !Boolean((employer as any).emailVerified)) {
          const updated = await storage.updateEmployer(String(employer.id), { emailVerified: true } as any).catch(() => undefined);
          if (updated) employer = updated;
        }
      }

      const to =
        `/employer/login?googleEmployerId=${encodeURIComponent(String(employer.id))}` +
        `&email=${encodeURIComponent(email)}` +
        `${next ? `&next=${encodeURIComponent(next)}` : ""}`;
      return res.redirect(to);
    } catch (error) {
      const info = formatGoogleApiError(error);
      let googleClientConfig: { clientId?: string; redirectUri?: string } = {};
      try {
        const config = getGoogleOAuthClientConfig();
        googleClientConfig = { clientId: config.clientId, redirectUri: config.redirectUri };
      } catch {
        // ignore
      }

      let findternClientConfig: { clientId?: string; redirectUri?: string } = {};
      try {
        const config = getFindternGoogleOAuthClientConfig();
        findternClientConfig = { clientId: config.clientId, redirectUri: config.redirectUri };
      } catch {
        // ignore
      }

      console.error("Google OAuth callback error:", {
        ...info,
        path: String(req?.path ?? ""),
        hasCode: Boolean(req?.query?.code),
        hasState: Boolean(req?.query?.state),
        scope: String(req?.query?.scope ?? ""),
        googleClientConfig,
        findternClientConfig,
      });

      const stateRaw = String(req.query.state ?? "");
      let role: AuthOAuthRole = "intern";
      try {
        const payload = verifyOAuthState(stateRaw);
        if (isAuthOAuthStatePayload(payload)) role = payload.role;
      } catch {
        // ignore
      }

      const errMsg = encodeURIComponent(info.message);
      const to = role === "employer" ? `/employer/login?oauthError=${errMsg}` : `/login?oauthError=${errMsg}`;
      return res.redirect(to);
    }
  };

  app.get("/api/google/oauth/callback", googleOAuthCallbackHandler);
  app.get("/api/auth/google/callback", googleOAuthCallbackHandler);
  app.get("/auth/google/callback", googleOAuthCallbackHandler);

  app.post("/api/calendar/meet", async (req, res) => {
    try {
      const body = createMeetSchema.parse(req.body);

      const employerId = String((req.query as any)?.employerId ?? "").trim();
      if (!employerId) {
        return res.status(400).json({ message: "employerId is required" });
      }

      const start = new Date(body.startTime);
      const end = new Date(body.endTime);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid startTime or endTime" });
      }

      if (end.getTime() <= start.getTime()) {
        return res.status(400).json({ message: "endTime must be after startTime" });
      }

      const result = await createGoogleMeetLinkForEmployer({
        employerId,
        summary: body.summary,
        description: body.description,
        startTime: start,
        endTime: end,
        timezone: body.timezone,
      });

      return res.status(201).json({
        meetingLink: result.meetingLink,
        eventId: result.eventId,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }

      console.error("Create Google Meet link error:", error);
      return res.status(500).json({
        message: "An error occurred while creating Google Meet link",
      });
    }
  });

  // ---------------------------------------------
  // Password Reset Endpoints
  // ---------------------------------------------

  const forgotPasswordSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    role: z.enum(["intern", "employer"]).default("intern"),
  });

  const resetPasswordSchema = z.object({
    token: z.string().min(10),
    newPassword: z.string().min(8),
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const body = forgotPasswordSchema.parse(req.body);
      const role = body.role;
      const email = body.email;

      const subject =
        role === "employer"
          ? await storage.getEmployerByEmail(email).catch(() => undefined)
          : await storage.getUserByEmail(email).catch(() => undefined);

      if (!subject) {
        return res.json({ message: "If an account exists, a reset link will be sent." });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = sha256Hex(token);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

      await storage.createPasswordResetToken({
        subjectType: role,
        subjectId: String((subject as any).id),
        tokenHash,
        expiresAt,
      } as any);

      const baseUrl = getAppBaseUrl(req);
      const resetPath = role === "employer" ? "/employer/reset-password" : "/reset-password";
      const resetUrl = `${baseUrl}${resetPath}?token=${encodeURIComponent(token)}`;

      await sendPasswordResetEmail({ to: email, resetUrl });
      return res.json({ message: "If an account exists, a reset link will be sent." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("Forgot password error:", error);
      return res.status(500).json({ message: "An error occurred while requesting password reset" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const body = resetPasswordSchema.parse(req.body);

      if (!isStrongPassword(body.newPassword)) {
        return res.status(400).json({
          message:
            "Password is too weak. Use at least 8 characters with uppercase, lowercase, number, and special character.",
        });
      }

      const tokenHash = sha256Hex(body.token);
      const row = await storage.getPasswordResetTokenByHash(tokenHash);
      if (!row) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      if (row.usedAt) {
        return res.status(400).json({ message: "This reset link was already used" });
      }

      if (new Date(row.expiresAt).getTime() < Date.now()) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      if (row.subjectType === "employer") {
        await storage.updateEmployer(String(row.subjectId), {
          password: body.newPassword,
          passwordChangedAt: new Date(),
        } as any);
      } else {
        await storage.updateUser(String(row.subjectId), {
          password: body.newPassword,
        } as any);
      }

      await storage.markPasswordResetTokenUsed(String(row.id), new Date());
      return res.json({ message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("Reset password error:", error);
      return res.status(500).json({ message: "An error occurred while resetting password" });
    }
  });

  const sendEmailOtpSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    role: z.enum(["intern", "employer"]).default("intern"),
  });

  const signupSendOtpSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
  });

  const verifyEmailOtpSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    role: z.enum(["intern", "employer"]).default("intern"),
    otp: z.string().regex(/^\d{6}$/),
  });

  const signupVerifyOtpSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    otp: z.string().regex(/^\d{6}$/),
  });

  app.post("/api/auth/signup/send-otp", async (req, res) => {
    try {
      const body = signupSendOtpSchema.parse(req.body);
      const email = body.email;

      const existingUser = await storage.getUserByEmail(email).catch(() => undefined);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const subjectType = "signup_intern";
      const subjectId = email;

      const latest = await storage.getLatestEmailOtpForSubject(subjectType, subjectId).catch(() => undefined);
      if (latest?.createdAt) {
        const createdAtValue: any = (latest as any).createdAt;
        const createdAt = createdAtValue instanceof Date ? createdAtValue.getTime() : new Date(createdAtValue).getTime();
        const minIntervalMs = 60 * 1000;
        if (Number.isFinite(createdAt)) {
          const deltaMs = Date.now() - createdAt;
          if (deltaMs >= 0 && deltaMs < minIntervalMs) {
            const remainingMs = minIntervalMs - deltaMs;
            return res.status(429).json({
              message: "Please wait before requesting a new code",
              remainingSeconds: Math.max(0, Math.min(60, Math.ceil(remainingMs / 1000))),
            });
          }
        }
      }

      const ttlMinutes = 10;
      const otp = generateEmailOtpCode();
      const otpHash = sha256Hex(otp);
      const expiresAt = new Date(Date.now() + 1000 * 60 * ttlMinutes);

      await storage.createEmailOtp({
        subjectType,
        subjectId,
        otpHash,
        expiresAt,
      } as any);

      await sendEmailOtpEmail({ to: email, otp, ttlMinutes });
      return res.json({ message: "Verification code sent" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("Signup send OTP error:", error);
      return res.status(500).json({ message: "An error occurred while sending verification code" });
    }
  });

  app.post("/api/auth/signup/verify-otp", async (req, res) => {
    try {
      const body = signupVerifyOtpSchema.parse(req.body);
      const email = body.email;

      const subjectType = "signup_intern";
      const subjectId = email;
      const latest = await storage.getLatestEmailOtpForSubject(subjectType, subjectId);
      if (!latest || latest.usedAt) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      if (new Date(latest.expiresAt).getTime() < Date.now()) {
        return res.status(400).json({ message: "Verification code expired" });
      }

      const otpHash = sha256Hex(body.otp);
      if (otpHash !== String((latest as any).otpHash)) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      await storage.markEmailOtpUsed(String((latest as any).id), new Date());
      await storage.deleteEmailOtpsForSubject(subjectType, subjectId).catch(() => undefined);

      req.session.signupEmailVerification = {
        email,
        verifiedAt: Date.now(),
      };

      return res.json({ message: "Email verified" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("Signup verify OTP error:", error);
      return res.status(500).json({ message: "An error occurred while verifying email" });
    }
  });

  app.post("/api/auth/email/send-otp", async (req, res) => {
    try {
      const body = sendEmailOtpSchema.parse(req.body);
      const role = body.role;
      const email = body.email;

      const subject =
        role === "employer"
          ? await storage.getEmployerByEmail(email).catch(() => undefined)
          : await storage.getUserByEmail(email).catch(() => undefined);

      if (!subject) {
        return res.json({ message: "If an account exists, a verification code will be sent." });
      }

      if (Boolean((subject as any).emailVerified)) {
        return res.json({ message: "Email is already verified" });
      }

      const subjectId = String((subject as any).id);
      const latest = await storage.getLatestEmailOtpForSubject(role, subjectId).catch(() => undefined);

      if (latest?.createdAt) {
        const createdAtValue: any = (latest as any).createdAt;
        const createdAt = createdAtValue instanceof Date ? createdAtValue.getTime() : new Date(createdAtValue).getTime();
        const minIntervalMs = 60 * 1000;
        if (Number.isFinite(createdAt) && createdAt <= Date.now()) {
          const deltaMs = Date.now() - createdAt;
          if (deltaMs < minIntervalMs) {
            const remainingMs = minIntervalMs - deltaMs;
            return res.status(429).json({
              message: "Please wait before requesting a new code",
              remainingSeconds: Math.max(0, Math.min(60, Math.ceil(remainingMs / 1000))),
            });
          }
        }
      }

      const ttlMinutes = 10;
      const otp = generateEmailOtpCode();
      const otpHash = sha256Hex(otp);
      const expiresAt = new Date(Date.now() + 1000 * 60 * ttlMinutes);

      await storage.createEmailOtp({
        subjectType: role,
        subjectId,
        otpHash,
        expiresAt,
      } as any);

      await sendEmailOtpEmail({ to: email, otp, ttlMinutes });
      return res.json({ message: "If an account exists, a verification code will be sent." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("Send email OTP error:", error);
      return res.status(500).json({ message: "An error occurred while sending verification code" });
    }
  });

  app.post("/api/auth/email/verify-otp", async (req, res) => {
    try {
      const body = verifyEmailOtpSchema.parse(req.body);
      const role = body.role;
      const email = body.email;

      const subject =
        role === "employer"
          ? await storage.getEmployerByEmail(email).catch(() => undefined)
          : await storage.getUserByEmail(email).catch(() => undefined);

      if (!subject) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      if (Boolean((subject as any).emailVerified)) {
        const { password, ...safeSubject } = subject as any;
        return res.json({ message: "Email already verified", subject: safeSubject });
      }

      const subjectId = String((subject as any).id);
      const latest = await storage.getLatestEmailOtpForSubject(role, subjectId);
      if (!latest || latest.usedAt) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      if (new Date(latest.expiresAt).getTime() < Date.now()) {
        return res.status(400).json({ message: "Verification code expired" });
      }

      const otpHash = sha256Hex(body.otp);
      if (otpHash !== String((latest as any).otpHash)) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      await storage.markEmailOtpUsed(String((latest as any).id), new Date());
      await storage.deleteEmailOtpsForSubject(role, subjectId).catch(() => undefined);

      if (role === "employer") {
        const updated = await storage.updateEmployer(subjectId, { emailVerified: true } as any);
        const { password, ...safe } = (updated ?? subject) as any;
        return res.json({ message: "Email verified", subject: safe });
      }

      const updated = await storage.updateUser(subjectId, { emailVerified: true } as any);
      const { password, ...safe } = (updated ?? subject) as any;
      return res.json({ message: "Email verified", subject: safe });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("Verify email OTP error:", error);
      return res.status(500).json({ message: "An error occurred while verifying email" });
    }
  });

  // User registration endpoint - /signup
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);

      const sessionVerification = req.session?.signupEmailVerification;
      const normalizedEmail = String(validatedData.email ?? "").trim().toLowerCase();
      const verifiedEmail = String(sessionVerification?.email ?? "").trim().toLowerCase();
      const verifiedAt = Number(sessionVerification?.verifiedAt ?? 0);
      const verifiedTtlMs = 15 * 60 * 1000;
      if (!verifiedEmail || verifiedEmail !== normalizedEmail || !verifiedAt || Date.now() - verifiedAt > verifiedTtlMs) {
        return res.status(400).json({ message: "Please verify your email before creating your account" });
      }

      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "An account with this email already exists" });
      }

      const existingPhoneUser = await storage
        .getUserByCountryCodeAndPhoneNumber(validatedData.countryCode, validatedData.phoneNumber)
        .catch(() => undefined);
      if (existingPhoneUser) {
        return res.status(409).json({ message: "Phone number already in use" });
      }

      const emergencyInUse = await storage
        .isInternEmergencyContactInUse(validatedData.countryCode, validatedData.phoneNumber)
        .catch(() => false);
      if (emergencyInUse) {
        return res.status(409).json({ message: "Phone number already in use" });
      }

      const secondPocInUse = await storage
        .isInternSecondPocContactInUse(validatedData.countryCode, validatedData.phoneNumber)
        .catch(() => false);
      if (secondPocInUse) {
        return res.status(409).json({ message: "Phone number already in use" });
      }

      const escalationInUse = await storage
        .isEmployerEscalationContactInUse(validatedData.countryCode, validatedData.phoneNumber)
        .catch(() => false);
      if (escalationInUse) {
        return res.status(409).json({ message: "Phone number already in use" });
      }

      const existingPhoneEmployer = await storage
        .getEmployerByCountryCodeAndPhoneNumber(validatedData.countryCode, validatedData.phoneNumber)
        .catch(() => undefined);
      if (existingPhoneEmployer) {
        return res.status(409).json({ message: "Phone number already in use" });
      }

      let user: any;
      try {
        user = await storage.createUser({ ...(validatedData as any), emailVerified: true } as any);
      } catch (e: any) {
        const code = String(e?.code ?? e?.original?.code ?? "").trim();
        if (code === "23505") {
          return res.status(409).json({ message: "Phone number already in use" });
        }
        throw e;
      }
      console.log("User created:", user);
      const { password, ...userWithoutPassword } = user;

      req.session.signupEmailVerification = undefined;

      return res.status(201).json({
        message: "Account created successfully",
        user: userWithoutPassword,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("Signup error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred during registration" });
    }
  });

  // Employer registration endpoint - /employer/signup
  app.post("/api/auth/employer/signup", async (req, res) => {
    try {
      const validatedData = insertEmployerSchema.parse(req.body);

      const existingEmployer = await storage.getEmployerByEmail(
        validatedData.companyEmail,
      );
      if (existingEmployer) {
        return res.status(400).json({
          message: "An employer with this email already exists",
        });
      }

      const existingPhoneEmployer = await storage
        .getEmployerByCountryCodeAndPhoneNumber(validatedData.countryCode, validatedData.phoneNumber)
        .catch(() => undefined);
      if (existingPhoneEmployer) {
        return res.status(409).json({ message: "Phone number already in use" });
      }

      const existingPhoneUser = await storage
        .getUserByCountryCodeAndPhoneNumber(validatedData.countryCode, validatedData.phoneNumber)
        .catch(() => undefined);
      if (existingPhoneUser) {
        return res.status(409).json({ message: "Phone number already in use" });
      }

      const emergencyInUse = await storage
        .isInternEmergencyContactInUse(validatedData.countryCode, validatedData.phoneNumber)
        .catch(() => false);
      if (emergencyInUse) {
        return res.status(409).json({ message: "Phone number already in use" });
      }

      const secondPocInUse = await storage
        .isInternSecondPocContactInUse(validatedData.countryCode, validatedData.phoneNumber)
        .catch(() => false);
      if (secondPocInUse) {
        return res.status(409).json({ message: "Phone number already in use" });
      }

      const escalationInUse = await storage
        .isEmployerEscalationContactInUse(validatedData.countryCode, validatedData.phoneNumber)
        .catch(() => false);
      if (escalationInUse) {
        return res.status(409).json({ message: "Phone number already in use" });
      }

      let employer: any;
      try {
        employer = await storage.createEmployer(validatedData);
      } catch (e: any) {
        const code = String(e?.code ?? e?.original?.code ?? "").trim();
        if (code === "23505") {
          return res.status(409).json({ message: "Phone number already in use" });
        }
        throw e;
      }
      const { password, ...employerWithoutPassword } = employer;

      try {
        const ttlMinutes = 10;
        const otp = generateEmailOtpCode();
        const otpHash = sha256Hex(otp);
        const expiresAt = new Date(Date.now() + 1000 * 60 * ttlMinutes);
        await storage.createEmailOtp({
          subjectType: "employer",
          subjectId: String(employer.id),

          otpHash,
          expiresAt,
        } as any);
        await sendEmailOtpEmail({
          to: String(employer.companyEmail),
          otp,
          ttlMinutes,
          subject: "Verify your company email",
          heading: "Verify your company email",
          subheading:
            "Use the code below to verify your company email address and activate your Findtern employer account.",
          tag: "Employer signup",
        });
      } catch (e) {
        console.error("Failed to send employer signup email OTP:", e);
      }

      return res.status(201).json({
        message: "Employer account created successfully",
        requiresEmailVerification: true,
        employer: employerWithoutPassword,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("Employer signup error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred during employer registration" });
    }
  });

  // Employer login endpoint - /api/auth/employer/login
  app.post("/api/auth/employer/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);

      const employer = await storage.getEmployerByEmail(validatedData.email);
      if (!employer || employer.password !== validatedData.password) {
        return res
          .status(401)
          .json({ message: "Invalid email or password" });
      }

      if ((employer as any)?.isActive === false) {
        return res.status(403).json({ message: "Account is deactivated" });
      }

      const { password, ...safeEmployer } = employer;

      return res.status(200).json({
        message: "Employer login successful",
        employer: safeEmployer,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("Employer login error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred during employer login" });
    }
  });

  // Employer: get own profile (used by company setup/profile pages)
  app.get("/api/employer/:id", async (req, res) => {
    try {
      const employerId = String(req.params.id ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "employerId is required" });

      const employer = await storage.getEmployer(employerId);
      if (!employer) return res.status(404).json({ message: "Employer not found" });

      const { password, ...safeEmployer } = employer;
      return res.json({ employer: safeEmployer });
    } catch (error) {
      console.error("Get employer profile error:", error);
      return res.status(500).json({ message: "An error occurred while fetching employer profile" });
    }
  });

  const employerLogoUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        try {
          const dir = path.join(getUploadsDir(), "company-logos");
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        } catch (e) {
          cb(e as any, "");
        }
      },
      filename: (_req, file, cb) => {
        const ext = path.extname(String(file.originalname ?? "")).slice(0, 10);
        const safeExt = ext && ext.startsWith(".") ? ext : "";
        cb(null, `${Date.now()}-${uuidv4()}${safeExt}`);
      },
    }),
    limits: {
      fileSize: 1 * 1024 * 1024,
    },
  });

  const employerLogoUploadSingle = employerLogoUpload.single("logo");

  app.post("/api/employer/:id/logo/upload", (req, res) => {
    employerLogoUploadSingle(req, res, async (err: any) => {
      try {
        if (err) {
          const code = String(err?.code ?? "");
          if (code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ message: "Logo must be 1MB or smaller" });
          }
          return res.status(400).json({ message: "Failed to upload logo" });
        }

        const employerId = String(req.params.id ?? "").trim();
        if (!employerId) return res.status(400).json({ message: "employerId is required" });

        const employer = await storage.getEmployer(employerId);
        if (!employer) return res.status(404).json({ message: "Employer not found" });

        const file = (req as any).file as Express.Multer.File | undefined;
        const filePath = String((file as any)?.path ?? "").trim();
        if (!filePath) return res.status(400).json({ message: "logo file is required" });

        const filename = path.basename(filePath);
        const logoUrl = `/uploads/company-logos/${encodeURIComponent(filename)}`;

        const updated = await storage.updateEmployer(employerId, {
          logoUrl,
        } as any);
        if (!updated) return res.status(404).json({ message: "Employer not found" });

        const { password, ...safeEmployer } = updated;
        return res.json({
          message: "Logo uploaded",
          logoUrl,
          employer: safeEmployer,
        });
      } catch (error) {
        console.error("Employer logo upload error:", error);
        return res.status(500).json({ message: "An error occurred while uploading logo" });
      }
    });
  });

  // Employer: update setup/profile fields (frontend calls this)
  app.put("/api/employer/:id/setup", async (req, res) => {
    try {
      const employerId = String(req.params.id ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "employerId is required" });

      const employer = await storage.getEmployer(employerId);
      if (!employer) return res.status(404).json({ message: "Employer not found" });

      const payload = employerSetupSchema.parse(req.body);

      const primaryCountryCode = String(payload.primaryContactCountryCode ?? (employer as any).countryCode ?? "+91").trim();
      const primaryPhoneDigits = String(payload.primaryContactPhone ?? (employer as any).phoneNumber ?? "")
        .trim()
        .replace(/\D/g, "");
      const secondaryCountryCode = String(payload.secondaryContactCountryCode ?? "").trim();
      const secondaryPhoneDigits = String(payload.secondaryContactPhone ?? "")
        .trim()
        .replace(/\D/g, "");

      if (
        primaryCountryCode &&
        secondaryCountryCode &&
        primaryPhoneDigits &&
        secondaryPhoneDigits &&
        primaryCountryCode === secondaryCountryCode &&
        primaryPhoneDigits === secondaryPhoneDigits
      ) {
        return res.status(409).json({ message: "Number already exists" });
      }

      const update: any = {
        setupCompleted: true,
      };

      if (payload.companyName !== undefined) update.companyName = payload.companyName;
      if (payload.logoUrl !== undefined) update.logoUrl = payload.logoUrl;
      if (payload.websiteUrl !== undefined) update.websiteUrl = payload.websiteUrl;
      if (payload.companyEmail !== undefined) update.companyEmail = payload.companyEmail;
      if (payload.companySize !== undefined) update.companySize = payload.companySize;
      if (payload.country !== undefined) update.country = payload.country;
      if (payload.city !== undefined) update.city = payload.city;
      if (payload.state !== undefined) update.state = payload.state;

      if (payload.primaryContactName !== undefined) {
        update.primaryContactName = payload.primaryContactName;
        update.name = payload.primaryContactName;
      }
      if (payload.primaryContactRole !== undefined) update.primaryContactRole = payload.primaryContactRole;
      if (payload.primaryContactCountryCode !== undefined) update.countryCode = payload.primaryContactCountryCode;
      if (payload.primaryContactPhone !== undefined) update.phoneNumber = primaryPhoneDigits;

      if (payload.primaryContactCountryCode !== undefined || payload.primaryContactPhone !== undefined) {
        const nextCountryCode =
          payload.primaryContactCountryCode !== undefined
            ? String(payload.primaryContactCountryCode)
            : String((employer as any).countryCode ?? "+91");
        const nextPhoneNumber = payload.primaryContactPhone !== undefined
          ? String(payload.primaryContactPhone).trim().replace(/\D/g, "")
          : String((employer as any).phoneNumber ?? "").trim().replace(/\D/g, "");

        const existingPhoneEmployer = await storage
          .getEmployerByCountryCodeAndPhoneNumber(nextCountryCode, nextPhoneNumber)
          .catch(() => undefined);
        if (existingPhoneEmployer && String(existingPhoneEmployer.id) !== employerId) {
          return res.status(409).json({ message: "Phone number already in use" });
        }

        const existingPhoneUser = await storage
          .getUserByCountryCodeAndPhoneNumber(nextCountryCode, nextPhoneNumber)
          .catch(() => undefined);
        if (existingPhoneUser) {
          return res.status(409).json({ message: "Phone number already in use" });
        }

        const isInternEmergencyInUse = await storage
          .isInternEmergencyContactInUse(nextCountryCode, nextPhoneNumber)
          .catch(() => false);
        if (isInternEmergencyInUse) {
          return res.status(409).json({ message: "Number already exists" });
        }
      }

      if (payload.secondaryContactCountryCode !== undefined || payload.secondaryContactPhone !== undefined) {
        const nextSecondaryCountryCode =
          payload.secondaryContactCountryCode !== undefined
            ? String(payload.secondaryContactCountryCode)
            : String((employer as any).escalationContactCountryCode ?? "");
        const nextSecondaryPhoneNumber =
          payload.secondaryContactPhone !== undefined
            ? String(payload.secondaryContactPhone).trim().replace(/\D/g, "")
            : String((employer as any).escalationContactPhone ?? "").trim().replace(/\D/g, "");

        if (nextSecondaryCountryCode && nextSecondaryPhoneNumber) {
          const existingSecondaryEmployerPrimary = await storage
            .getEmployerByCountryCodeAndPhoneNumber(nextSecondaryCountryCode, nextSecondaryPhoneNumber)
            .catch(() => undefined);
          if (existingSecondaryEmployerPrimary && String(existingSecondaryEmployerPrimary.id) !== employerId) {
            return res.status(409).json({ message: "Phone number already in use" });
          }

          const existingSecondaryEmployerEscalation = await storage
            .getEmployerByEscalationCountryCodeAndPhoneNumber(nextSecondaryCountryCode, nextSecondaryPhoneNumber)
            .catch(() => undefined);
          if (existingSecondaryEmployerEscalation && String(existingSecondaryEmployerEscalation.id) !== employerId) {
            return res.status(409).json({ message: "Phone number already in use" });
          }

          const existingSecondaryUser = await storage
            .getUserByCountryCodeAndPhoneNumber(nextSecondaryCountryCode, nextSecondaryPhoneNumber)
            .catch(() => undefined);
          if (existingSecondaryUser) {
            return res.status(409).json({ message: "Phone number already in use" });
          }
        }

        const isInternEmergencyInUseSecondary = await storage
          .isInternEmergencyContactInUse(nextSecondaryCountryCode, nextSecondaryPhoneNumber)
          .catch(() => false);
        if (isInternEmergencyInUseSecondary) {
          return res.status(409).json({ message: "Number already exists" });
        }
      }

      if (payload.secondaryContactName !== undefined) update.escalationContactName = payload.secondaryContactName;
      if (payload.secondaryContactEmail !== undefined) update.escalationContactEmail = payload.secondaryContactEmail;
      if (payload.secondaryContactCountryCode !== undefined)
        update.escalationContactCountryCode = payload.secondaryContactCountryCode;
      if (payload.secondaryContactPhone !== undefined) update.escalationContactPhone = secondaryPhoneDigits;
      if (payload.secondaryContactRole !== undefined) update.escalationContactRole = payload.secondaryContactRole;

      const updated = await storage.updateEmployer(employerId, update);
      if (!updated) return res.status(404).json({ message: "Employer not found" });

      const { password, ...safeEmployer } = updated;
      return res.json({
        message: "Employer setup updated",
        employer: safeEmployer,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Employer setup update error:", error);
      return res.status(500).json({ message: "An error occurred while updating employer setup" });
    }
  });

  // Employer: onboarding (creates the first project + marks onboarding completed)
  app.put("/api/employer/:id/onboarding", async (req, res) => {
    try {
      const employerId = String(req.params.id ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "employerId is required" });

      const body = employerOnboardingSchema.parse(req.body);

      const project = await storage.createProject({
        employerId,
        projectName: body.projectName,
        skills: body.skills ?? [],
        scopeOfWork: body.scopeOfWork ?? undefined,
        fullTimeOffer: body.fullTimeOffer ?? false,
        locationType: body.locationType ?? undefined,
        preferredLocations: body.preferredLocations ?? [],
        pincode: body.pincode ?? undefined,
        city: body.city ?? undefined,
        state: body.state ?? undefined,
        timezone: body.timezone ?? undefined,
      } as any);

      const updated = await storage.updateEmployer(employerId, {
        onboardingCompleted: true,
      } as any);
      if (!updated) return res.status(404).json({ message: "Employer not found" });

      const { password, ...safeEmployer } = updated;
      return res.json({
        message: "Employer onboarding completed",
        employer: safeEmployer,
        project,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Employer onboarding error:", error);
      return res.status(500).json({ message: "An error occurred while completing employer onboarding" });
    }
  });

  // User login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(validatedData.email);
      if (!user || user.password !== validatedData.password) {
        return res
          .status(401)
          .json({ message: "Invalid email or password" });
      }

      if (!Boolean((user as any).emailVerified)) {
        return res.status(403).json({ message: "Please verify your email before logging in" });
      }

      if ((user as any)?.isActive === false) {
        return res.status(403).json({ message: "Account is deactivated" });
      }

      const { password, ...userWithoutPassword } = user;

      return res.status(200).json({
        message: "Login successful",
        user: userWithoutPassword,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("Login error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred during login" });
    }
  });

  // Admin login endpoint - /admin/login
  app.post("/api/admin/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);

      const admin = await storage.getAdminByEmail(validatedData.email);
      if (!admin || admin.password !== validatedData.password) {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }

      const roleKey = String((admin as any)?.role ?? "").trim();
      const role = roleKey ? await storage.getAdminRoleByKey(roleKey) : undefined;
      const permissions = String(roleKey).toLowerCase() === "super_admin" ? ["*"] : (role?.permissions ?? []);

      const { password, ...adminWithoutPassword } = admin;

      req.session.admin = {
        id: String((adminWithoutPassword as any).id),
        email: String((adminWithoutPassword as any).email),
        role: (adminWithoutPassword as any).role ?? null,
        name: (adminWithoutPassword as any).name ?? null,
        permissions,
      };

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return res.status(200).json({
        message: "Admin login successful",
        admin: adminWithoutPassword,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("Admin login error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred during admin login" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.admin = undefined;
    return req.session.destroy((err) => {
      if (err) {
        console.error("Admin logout error:", err);
        return res.status(500).json({ message: "An error occurred during admin logout" });
      }
      return res.status(200).json({ message: "Logged out" });
    });
  });

  app.put("/api/admin/profile", async (req, res) => {
    try {
      const admin = req.session.admin;
      if (!admin || !admin.id) {
        return res.status(401).json({ message: "Admin login required" });
      }

      const { firstName, lastName, email } = req.body as {
        firstName?: string;
        lastName?: string;
        email?: string;
      };

      if (!firstName || typeof firstName !== "string" || !firstName.trim()) {
        return res.status(400).json({ message: "First name is required" });
      }
      if (!lastName || typeof lastName !== "string" || !lastName.trim()) {
        return res.status(400).json({ message: "Last name is required" });
      }
      if (!email || typeof email !== "string" || !email.trim()) {
        return res.status(400).json({ message: "Email is required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }

      const updated = await storage.updateAdmin(admin.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
      });

      if (updated) {
        req.session.admin.firstName = updated.firstName;
        req.session.admin.lastName = updated.lastName;
        req.session.admin.email = updated.email;
      }

      return res.json({
        message: "Profile updated successfully",
        admin: {
          id: req.session.admin.id,
          firstName: req.session.admin.firstName,
          lastName: req.session.admin.lastName,
          email: req.session.admin.email,
          role: req.session.admin.role,
          permissions: req.session.admin.permissions,
        },
      });
    } catch (error) {
      console.error("Admin profile update error:", error);
      return res.status(500).json({ message: "An error occurred while updating profile" });
    }
  });

  app.post("/api/admin/change-password", async (req, res) => {
    try {
      const admin = req.session.admin;
      if (!admin || !admin.id) {
        return res.status(401).json({ message: "Admin login required" });
      }

      const { currentPassword, newPassword } = req.body as {
        currentPassword?: string;
        newPassword?: string;
      };

      if (!currentPassword || typeof currentPassword !== "string" || !currentPassword) {
        return res.status(400).json({ message: "Current password is required" });
      }
      if (!newPassword || typeof newPassword !== "string" || !newPassword) {
        return res.status(400).json({ message: "New password is required" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }

      const adminRecord = await storage.getAdmin(admin.id);
      if (!adminRecord) {
        return res.status(404).json({ message: "Admin not found" });
      }

      if (!adminRecord.password) {
        return res.status(400).json({ message: "Password not set for this account. Please contact super admin." });
      }

      const passwordMatch = adminRecord.password === currentPassword;
      if (!passwordMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      await storage.updateAdminPassword(admin.id, newPassword);

      return res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Admin change password error:", error);
      return res.status(500).json({ message: "An error occurred while changing password" });
    }
  });

  app.use("/api/admin", (req, res, next) => {
    if (req.path === "/login" || req.path === "/logout" || req.path === "/profile" || req.path === "/change-password") return next();

    const admin = req.session.admin;
    if (!admin) {
      return res.status(401).json({ message: "Admin login required" });
    }
    return next();
  });

  const resolveAdminPermissions = async (req: any): Promise<string[]> => {
    const admin = req?.session?.admin;
    if (!admin) return [];
    if (Array.isArray(admin.permissions)) return admin.permissions;

    const roleKey = String(admin.role ?? "").trim();
    if (!roleKey) {
      admin.permissions = [];
      return admin.permissions;
    }

    if (roleKey.toLowerCase() === "super_admin") {
      admin.permissions = ["*"];
      return admin.permissions;
    }

    const role = await storage.getAdminRoleByKey(roleKey);
    admin.permissions = role?.permissions ?? [];
    return admin.permissions;
  };

  const hasPermission = (perms: string[], required: string) => {
    if (!required) return true;
    if (perms.includes("*")) return true;
    return perms.includes(required);
  };

  const requireAnyPermission = (permissions: string[]) => {
    return async (req: any, res: any, next: any) => {
      try {
        const perms = await resolveAdminPermissions(req);
        if (perms.includes("*")) return next();

        const ok = permissions.some((p) => hasPermission(perms, p));
        if (!ok) {
          return res.status(403).json({ message: "Forbidden" });
        }
        return next();
      } catch (error) {
        console.error("Admin permission error:", error);
        return res.status(500).json({ message: "Authorization error" });
      }
    };
  };

  const contactQueryTypeBucket = (queryType: unknown): "intern" | "employer" => {
    const qt = String(queryType ?? "").trim().toLowerCase();
    if (qt === "intern") return "intern";
    if (qt === "hiring") return "employer";
    return "employer";
  };

  const requirePermission = (permission: string) => {
    return async (req: any, res: any, next: any) => {
      try {
        const perms = await resolveAdminPermissions(req);
        if (!hasPermission(perms, permission)) {
          return res.status(403).json({ message: "Forbidden" });
        }
        return next();
      } catch (error) {
        console.error("Admin permission error:", error);
        return res.status(500).json({ message: "Authorization error" });
      }
    };
  };

  const adminRoleCreateSchema = z.object({
    key: z.string().min(1),
    name: z.string().min(1),
    permissions: z.union([z.array(z.string()), z.string()]).optional().default([]),
  });

  const adminRoleUpdateSchema = adminRoleCreateSchema.partial();

  app.get("/api/admin/me", (req, res) => {
    return res.status(200).json({ admin: req.session.admin });
  });

  app.get("/api/admin/roles", requirePermission("roles:write"), async (_req, res) => {
    try {
      let roles = await storage.listAdminRoles();

      const presets: Array<{ key: string; name: string; permissions: string[] }> = [
        {
          key: "super_admin",
          name: "Super Admin",
          permissions: ["*"],
        },
        {
          key: "admin",
          name: "Admin",
          permissions: [
            "dashboard:read",
            "users:read",
            "interns:read",
            "companies:read",
            "reports:read",
            "transactions:read",
            "contact:intern:read",
            "contact:employer:read",
            "notifications:read",
            "cms:read",
          ],
        },
        {
          key: "exec_accounts",
          name: "Executive - Accounts",
          permissions: ["reports:read", "transactions:read"],
        },
        {
          key: "exec_operations",
          name: "Executive - Operations",
          permissions: ["interns:read", "notifications:read", "contact:intern:read"],
        },
        {
          key: "exec_sales",
          name: "Executive - Sales",
          permissions: ["companies:read", "contact:employer:read"],
        },
      ];

      try {
        const existingKeys = new Set((roles ?? []).map((r: any) => String(r?.key ?? "").trim()).filter(Boolean));
        const missing = presets.filter((p) => !existingKeys.has(p.key));
        if (missing.length > 0) {
          for (const r of missing) {
            try {
              await storage.createAdminRole({
                key: r.key,
                name: r.name,
                permissions: r.permissions,
              } as any);
            } catch {
              // ignore (role may already exist or table missing)
            }
          }
          roles = await storage.listAdminRoles();
        }
      } catch {
        // ignore seed errors
      }

      return res.json({ roles: roles ?? [] });
    } catch (error) {
      console.error("Admin roles list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching roles" });
    }
  });

  app.post("/api/admin/roles", requirePermission("roles:write"), async (req, res) => {
    try {
      const payload = adminRoleCreateSchema.parse(req.body);
      const permissions = Array.isArray(payload.permissions)
        ? payload.permissions
        : String(payload.permissions ?? "")
            .split(/[\n,]+/g)
            .map((s) => s.trim())
            .filter(Boolean);

      const role = await storage.createAdminRole({
        key: String(payload.key).trim(),
        name: String(payload.name).trim(),
        permissions,
      } as any);
      return res.status(201).json({ role });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin roles create error:", error);
      return res.status(500).json({ message: "An error occurred while creating role" });
    }
  });

  app.put("/api/admin/roles/:id", requirePermission("roles:write"), async (req, res) => {
    try {
      const id = String(req.params.id ?? "").trim();
      if (!id) return res.status(400).json({ message: "id is required" });

      const payload = adminRoleUpdateSchema.parse(req.body);
      const patch: any = { ...payload };

      if (payload.permissions !== undefined) {
        patch.permissions = Array.isArray(payload.permissions)
          ? payload.permissions
          : String(payload.permissions ?? "")
              .split(/[\n,]+/g)
              .map((s) => s.trim())
              .filter(Boolean);
      }

      const role = await storage.updateAdminRole(id, patch);
      if (!role) return res.status(404).json({ message: "Role not found" });
      return res.json({ role });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin roles update error:", error);
      return res.status(500).json({ message: "An error occurred while updating role" });
    }
  });

  app.delete("/api/admin/roles/:id", requirePermission("roles:write"), async (req, res) => {
    try {
      const id = String(req.params.id ?? "").trim();
      if (!id) return res.status(400).json({ message: "id is required" });
      await storage.deleteAdminRole(id);
      return res.status(204).send();
    } catch (error) {
      console.error("Admin roles delete error:", error);
      return res.status(500).json({ message: "An error occurred while deleting role" });
    }
  });

  const adminUserCreateSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().optional().nullable(),
    roleKey: z.string().min(1),
  });

  app.get("/api/admin/admins", requirePermission("roles:write"), async (_req, res) => {
    try {
      const admins = await storage.listAdmins();
      const safe = (admins ?? []).map((a: any) => {
        const { password, ...rest } = a;
        return rest;
      });
      return res.json({ admins: safe });
    } catch (error) {
      console.error("Admin admins list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching admins" });
    }
  });

  app.post("/api/admin/admins", requirePermission("roles:write"), async (req, res) => {
    try {
      const payload = adminUserCreateSchema.parse(req.body);
      const email = String(payload.email ?? "").trim().toLowerCase();
      const roleKey = String(payload.roleKey ?? "").trim();
      const name = payload.name != null ? String(payload.name).trim() : null;

      const existing = await storage.getAdminByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "Admin with this email already exists" });
      }

      if (roleKey.toLowerCase() !== "super_admin") {
        const role = await storage.getAdminRoleByKey(roleKey);
        if (!role) {
          return res.status(400).json({ message: "Invalid role" });
        }
      }

      const created = await storage.createAdmin({
        email,
        password: String(payload.password),
        name,
        role: roleKey,
      } as any);

      const { password, ...safe } = created as any;
      return res.status(201).json({ admin: safe });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin admin create error:", error);
      return res.status(500).json({ message: "An error occurred while creating admin" });
    }
  });

  app.put("/api/admin/admins/:id/role", requirePermission("roles:write"), async (req, res) => {
    try {
      const id = String(req.params.id ?? "").trim();
      if (!id) return res.status(400).json({ message: "id is required" });

      const body = z
        .object({
          roleKey: z.union([z.string().min(1), z.null()]),
        })
        .parse(req.body);
      const roleKey = body.roleKey;

      if (roleKey != null && String(roleKey).toLowerCase() !== "super_admin") {
        const role = await storage.getAdminRoleByKey(String(roleKey));
        if (!role) return res.status(400).json({ message: "Invalid role" });
      }

      const updated = await storage.updateAdminRoleKey(id, roleKey != null ? String(roleKey) : null);
      if (!updated) return res.status(404).json({ message: "Admin not found" });
      const { password, ...safe } = updated as any;
      return res.json({ admin: safe });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin admin role update error:", error);
      return res.status(500).json({ message: "An error occurred while updating role" });
    }
  });

  app.put("/api/admin/admins/:id/password", requirePermission("roles:write"), async (req, res) => {
    try {
      const id = String(req.params.id ?? "").trim();
      if (!id) return res.status(400).json({ message: "id is required" });

      const body = z.object({ password: z.string().min(8) }).parse(req.body);
      const nextPassword = String(body.password);

      if (!isStrongPassword(nextPassword)) {
        return res.status(400).json({
          message:
            "Password is too weak. Use at least 8 characters with uppercase, lowercase, number, and special character.",
        });
      }

      const updated = await storage.updateAdminPassword(id, nextPassword);
      if (!updated) return res.status(404).json({ message: "Admin not found" });
      const { password, ...safe } = updated as any;
      return res.json({ admin: safe });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin admin password update error:", error);
      return res.status(500).json({ message: "An error occurred while updating password" });
    }
  });

  app.delete("/api/admin/admins/:id", requirePermission("roles:write"), async (req, res) => {
    try {
      const id = String(req.params.id ?? "").trim();
      if (!id) return res.status(400).json({ message: "id is required" });
      await storage.deleteAdmin(id);
      return res.status(204).send();
    } catch (error) {
      console.error("Admin admin delete error:", error);
      return res.status(500).json({ message: "An error occurred while deleting admin" });
    }
  });

  const adminUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });

  // Admin: list all users
  app.get("/api/admin/users", requirePermission("users:read"), async (_req, res) => {
    const users = await storage.getUsers();
    const safeUsers = users.map(({ password, ...rest }) => rest);
    return res.json({ users: safeUsers });
  });

  app.get("/api/admin/transactions", requirePermission("transactions:read"), async (req, res) => {
    try {
      const currency = String((req.query as any)?.currency ?? "all").trim().toUpperCase();
      const status = String((req.query as any)?.status ?? "all").trim().toLowerCase();
      const source = String((req.query as any)?.source ?? "all").trim().toLowerCase();
      const q = String((req.query as any)?.q ?? "").trim();
      const fromRaw = String((req.query as any)?.from ?? "").trim();
      const toRaw = String((req.query as any)?.to ?? "").trim();
      const limitRaw = Number((req.query as any)?.limit ?? 200);

      const limit = Number.isFinite(limitRaw) ? Math.min(500, Math.max(1, Math.floor(limitRaw))) : 200;
      const from = fromRaw ? new Date(fromRaw) : undefined;
      const to = toRaw ? new Date(toRaw) : undefined;
      const fromDate = from && Number.isFinite(from.getTime()) ? from : undefined;
      const toDate = to && Number.isFinite(to.getTime()) ? to : undefined;
      
      const filterCurrency = currency && currency !== "ALL" ? currency : undefined;
      const displayCurrency = filterCurrency || "INR";
      const statusFilter = status && status !== "all" ? status : undefined;

      const sourceFilter: "all" | "employer" | "intern" =
        source === "employer" || source === "intern" ? (source as any) : "all";

      const USD_TO_INR_RATE = 100; // Updated to exactly 100 as requested
      const convertAmount = (amount: number, fromC: string, toC: string) => {
        const from = String(fromC ?? "INR").toUpperCase();
        const to = String(toC ?? "INR").toUpperCase();
        const n = Number(amount ?? 0);
        if (!Number.isFinite(n)) return 0;
        if (from === to) return n;
        if (from === "USD" && to === "INR") return Math.round(n * USD_TO_INR_RATE);
        if (from === "INR" && to === "USD") return Math.round(n / USD_TO_INR_RATE);
        return n;
      };

      const [employerPayments, internPayments, employers, users] = await Promise.all([
        sourceFilter === "intern"
          ? Promise.resolve([] as any[])
          : storage.listAllEmployerPayments({
              status: statusFilter,
              q,
              from: fromDate,
              to: toDate,
              limit: 20000,
            }),
        sourceFilter === "employer"
          ? Promise.resolve([] as any[])
          : storage.listAllInternPayments({
              status: statusFilter,
              q,
              from: fromDate,
              to: toDate,
              limit: 20000,
            }),
        storage.getEmployers(),
        storage.getUsers(),
      ]);

      const employerById = new Map<string, any>();
      for (const e of employers ?? []) employerById.set(String((e as any)?.id ?? ""), e);

      const userById = new Map<string, any>();
      for (const u of users ?? []) userById.set(String((u as any)?.id ?? ""), u);

      const toMs = (d: any) => {
        const dt = d instanceof Date ? d : d ? new Date(d) : null;
        const t = dt ? dt.getTime() : NaN;
        return Number.isFinite(t) ? t : null;
      };

      const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
      const fmtTime = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

      type Tx = {
        id: string;
        date: string;
        time: string;
        type: "credit" | "debit";
        amount: number;
        currency: string;
        description: string;
        internName: string;
        companyName: string;
        status: string;
        paymentMethod: string;
        referenceId: string;
        source: "employer" | "intern";
        createdAt: string;
        raw: any;
      };

      const txs: Tx[] = [];

      for (const p of employerPayments ?? []) {
        const created = (p as any)?.createdAt instanceof Date ? (p as any).createdAt : new Date((p as any)?.createdAt ?? Date.now());
        const employerId = String((p as any)?.employerId ?? "");
        const employer = employerById.get(employerId);
        const companyName = String(((employer as any)?.companyName ?? (employer as any)?.name ?? employerId) || "-");
        const employerName = String(
          ((employer as any)?.name ?? (employer as any)?.primaryContactName ?? (employer as any)?.companyName ?? employerId) || "-",
        );

        const amtMajor = Math.round((Number((p as any)?.amountMinor ?? 0) || 0) / 100);
        const stat = String((p as any)?.status ?? "").toLowerCase() || "unknown";
        const txCurrency = String((p as any)?.currency ?? "INR").toUpperCase();

        if (filterCurrency && txCurrency !== filterCurrency) continue;

        txs.push({
          id: String((p as any)?.orderId ?? (p as any)?.id ?? ""),
          date: fmtDate(created),
          time: fmtTime(created),
          type: "credit",
          amount: amtMajor,
          currency: txCurrency,
          description: "Employer Payment",
          internName: employerName,
          companyName,
          status: stat === "paid" ? "completed" : stat,
          paymentMethod: String((p as any)?.gateway ?? "").toUpperCase() || "-",
          referenceId: String((p as any)?.paymentId ?? (p as any)?.orderId ?? ""),
          source: "employer",
          createdAt: created.toISOString(),
          raw: (p as any)?.raw ?? {},
          employerId: employerId,
        });
      }

      for (const p of internPayments ?? []) {
        const created = (p as any)?.createdAt instanceof Date ? (p as any).createdAt : new Date((p as any)?.createdAt ?? Date.now());
        const internId = String((p as any)?.internId ?? "");
        const user = userById.get(internId);
        const internName = user
          ? `${String((user as any)?.firstName ?? "").trim()} ${String((user as any)?.lastName ?? "").trim()}`.trim()
          : internId || "-";

        const amtMajor = Math.round((Number((p as any)?.amountMinor ?? 0) || 0) / 100);
        const stat = String((p as any)?.status ?? "").toLowerCase() || "unknown";
        const txCurrency = String((p as any)?.currency ?? "INR").toUpperCase();

        if (filterCurrency && txCurrency !== filterCurrency) continue;

        txs.push({
          id: String((p as any)?.orderId ?? (p as any)?.id ?? ""),
          date: fmtDate(created),
          time: fmtTime(created),
          type: "credit",
          amount: amtMajor,
          currency: txCurrency,
          description: "Intern Payment",
          internName,
          companyName: "-",
          status: stat === "paid" ? "completed" : stat,
          paymentMethod: String((p as any)?.gateway ?? "").toUpperCase() || "-",
          referenceId: String((p as any)?.paymentId ?? (p as any)?.orderId ?? ""),
          source: "intern",
          createdAt: created.toISOString(),
          raw: (p as any)?.raw ?? {},
        });
      }

      // sort newest first
      txs.sort((a, b) => (toMs(b.createdAt) ?? 0) - (toMs(a.createdAt) ?? 0));

      // apply UI-friendly search (client also filters, but do server-side to cut payload)
      const qLower = q.toLowerCase();

      const filteredBySource =
        sourceFilter === "all" ? txs : txs.filter((t) => t.source === sourceFilter);

      const filtered = qLower
        ? filteredBySource.filter((t) => {
            return (
              t.id.toLowerCase().includes(qLower) ||
              t.description.toLowerCase().includes(qLower) ||
              t.companyName.toLowerCase().includes(qLower) ||
              t.internName.toLowerCase().includes(qLower) ||
              t.referenceId.toLowerCase().includes(qLower)
            );
          })
        : filteredBySource;

      const items = filtered.slice(0, limit);

      const totalsByCurrency = (list: Tx[]) => {
        const map: Record<string, { revenue: number; pending: number; count: number }> = {};
        
        // Always include displayCurrency in totals
        map[displayCurrency] = { revenue: 0, pending: 0, count: 0 };
        if (displayCurrency !== "INR") {
          map["INR"] = { revenue: 0, pending: 0, count: 0 };
        }

        for (const t of list) {
          const c = String(t.currency ?? "INR").toUpperCase();
          
          const amtInDisplay = convertAmount(t.amount, t.currency, displayCurrency);
          const amtInInr = convertAmount(t.amount, t.currency, "INR");

          map[displayCurrency].count += 1;
          if (t.type === "credit" && t.status === "completed") {
            map[displayCurrency].revenue += amtInDisplay;
            if (map["INR"] && displayCurrency !== "INR") {
              map["INR"].revenue += amtInInr;
            }
          }
          if (t.status === "pending") {
            map[displayCurrency].pending += amtInDisplay;
            if (map["INR"] && displayCurrency !== "INR") {
              map["INR"].pending += amtInInr;
            }
          }

          // Also track in original currency if it's different and not already tracked
          if (c !== displayCurrency && c !== "INR") {
            if (!map[c]) map[c] = { revenue: 0, pending: 0, count: 0 };
            map[c].count += 1;
            if (t.type === "credit" && t.status === "completed") map[c].revenue += t.amount;
            if (t.status === "pending") map[c].pending += t.amount;
          }
        }
        return map;
      };

      const totals = totalsByCurrency(filtered);

      // Monthly (last 6 months) and daily (last 7 days) aggregates for charts.
      const now = new Date();
      const startMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = (d: Date) => new Intl.DateTimeFormat("en-US", { month: "short" }).format(d);
      const monthlyMap = new Map<string, { month: string; revenue: number; transactions: number }>();
      for (let m = new Date(startMonth); m <= new Date(now.getFullYear(), now.getMonth(), 1); m.setMonth(m.getMonth() + 1)) {
        const key = monthKey(m);
        monthlyMap.set(key, { month: monthLabel(new Date(m)), revenue: 0, transactions: 0 });
      }
      const dayLabel = (d: Date) => new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(d);
      const dailyMap = new Map<string, { day: string; amount: number }>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        dailyMap.set(fmtDate(d), { day: dayLabel(d), amount: 0 });
      }

      for (const t of filtered) {
        const created = new Date(t.createdAt);
        if (t.type === "credit" && t.status === "completed") {
          const mKey = monthKey(new Date(created.getFullYear(), created.getMonth(), 1));
          const existing = monthlyMap.get(mKey);
          if (existing) {
            existing.revenue += convertAmount(t.amount, t.currency, displayCurrency);
            existing.transactions += 1;
          }
          const dKey = fmtDate(new Date(created.getFullYear(), created.getMonth(), created.getDate()));
          const dExisting = dailyMap.get(dKey);
          if (dExisting) {
            dExisting.amount += convertAmount(t.amount, t.currency, displayCurrency);
          }
        }
      }

      return res.json({
        items,
        totals,
        charts: {
          monthlyRevenueData: Array.from(monthlyMap.values()),
          dailyTransactionData: Array.from(dailyMap.values()),
        },
      });
    } catch (error) {
      console.error("Admin transactions list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching transactions" });
    }
  });

  app.get("/api/admin/reports/transactions", requirePermission("reports:read"), async (req, res) => {
    try {
      const receivablesFilterRaw = String((req.query as any)?.receivablesFilter ?? (req.query as any)?.filter ?? "both")
        .trim()
        .toLowerCase();
      const payablesFilterRaw = String((req.query as any)?.payablesFilter ?? (req.query as any)?.filter ?? "both")
        .trim()
        .toLowerCase();

      const receivablesFilter: "candidate" | "company" | "both" =
        receivablesFilterRaw === "candidate" || receivablesFilterRaw === "company" ? (receivablesFilterRaw as any) : "both";
      const payablesFilter: "candidate" | "company" | "both" =
        payablesFilterRaw === "candidate" || payablesFilterRaw === "company" ? (payablesFilterRaw as any) : "both";

      const fromRaw = String((req.query as any)?.from ?? "").trim();
      const toRaw = String((req.query as any)?.to ?? "").trim();

      const parseDate = (value: string) => {
        if (!value) return undefined;
        const dt = new Date(value);
        if (Number.isNaN(dt.getTime())) return undefined;
        return dt;
      };

      const from = parseDate(fromRaw);
      const to = (() => {
        const dt = parseDate(toRaw);
        if (!dt) return undefined;
        if (/^\d{4}-\d{2}-\d{2}$/.test(toRaw)) {
          dt.setHours(23, 59, 59, 999);
        }
        return dt;
      })();

      const within = (d: any) => {
        const dt = d instanceof Date ? d : d ? new Date(d) : null;
        const t = dt ? dt.getTime() : NaN;
        if (!Number.isFinite(t)) return false;
        if (from && t < from.getTime()) return false;
        if (to && t > to.getTime()) return false;
        return true;
      };

      const [usersRaw, employersRaw, onboardingRaw, employerPaymentsRaw, internPayoutsRaw, proposalsRaw, projectsRaw] = await Promise.all([
        storage.getUsers(),
        storage.getEmployers(),
        storage.getAllInternOnboarding(),
        receivablesFilter === "candidate" ? Promise.resolve([] as any[]) : storage.listAllEmployerPayments({ limit: 20000 }),
        payablesFilter === "company" ? Promise.resolve([] as any[]) : storage.listAllInternPayouts({ limit: 20000 }),
        storage.getAllProposals(),
        storage.getAllProjects(),
      ]);

      const users = usersRaw ?? [];
      const employers = employersRaw ?? [];
      const onboarding = onboardingRaw ?? [];
      const employerPayments = employerPaymentsRaw ?? [];
      const internPayouts = internPayoutsRaw ?? [];
      const proposals = proposalsRaw ?? [];
      const projects = projectsRaw ?? [];

      const userById = new Map<string, any>();
      for (const u of users) userById.set(String((u as any)?.id ?? ""), u);

      const employerById = new Map<string, any>();
      for (const e of employers) employerById.set(String((e as any)?.id ?? ""), e);

      const projectById = new Map<string, any>();
      for (const p of projects) projectById.set(String((p as any)?.id ?? ""), p);

      const monthsFromDuration = (duration: unknown) => {
        const s = String(duration ?? "").trim().toLowerCase();
        if (s.includes("month")) {
          const m = parseInt(s);
          return isNaN(m) ? 1 : m;
        }
        switch (s) {
          case "2m": return 2;
          case "3m": return 3;
          case "6m": return 6;
          default: return 1;
        }
      };

      const addMonthsToIso = (iso: string, months: number) => {
        const s = String(iso ?? "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
        const [yy, mm, dd] = s.split("-").map(v => Number(v));
        const d = new Date(yy, mm - 1, dd);
        if (isNaN(d.getTime())) return null;
        d.setMonth(d.getMonth() + Math.max(0, months));
        return d;
      };

      const norm = (v: any) => String(v ?? "").trim().toLowerCase();
      const orderPurpose = (row: any) => {
        const raw = row?.raw ?? {};
        const notes = raw?.notes ?? raw?.order?.notes ?? {};
        return norm((notes as any)?.purpose ?? "");
      };

      const orderProposalIds = (row: any) => {
        const raw = row?.raw ?? {};
        const notes = raw?.notes ?? raw?.order?.notes ?? {};
        const idsRaw = (notes as any)?.proposalIds ?? (notes as any)?.proposal_ids ?? (raw as any)?.proposalIds ?? (raw as any)?.proposal_ids ?? [];
        return Array.isArray(idsRaw) ? idsRaw.map(v => String(v ?? "").trim()).filter(Boolean) : [];
      };

      type ReportRow = {
        id: string;
        date: string;
        source: "candidate" | "company";
        category: "receivable" | "payable";
        amountMajor: number;
        dueAmountMajor?: number;
        currency: string;
        status: string;
        description: string;
        candidateId: string | null;
        candidateName: string | null;
        companyId: string | null;
        companyName: string | null;
        referenceId: string | null;
        createdAt: string;
        raw: any;
      };

      const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
      const toName = (u: any) => {
        const n = `${String(u?.firstName ?? "").trim()} ${String(u?.lastName ?? "").trim()}`.trim();
        return n || null;
      };

      const withCandidatePrefix = (candidateName: string | null, desc: string) => {
        const name = String(candidateName ?? "").trim();
        if (!name) return desc;
        return `${name} - ${desc}`;
      };

      const receivables: ReportRow[] = [];
      const payables: ReportRow[] = [];

      // Pre-calculate paid installments count per proposal
      const paidInstallmentsCount = new Map<string, number>();
      for (const p of employerPayments) {
        const stat = String((p as any)?.status ?? "").trim().toLowerCase();
        if (stat !== "paid" && stat !== "completed") continue;
        const purpose = orderPurpose(p);
        if (purpose !== "employer_monthly_payment" && purpose !== "employer_checkout") continue;
        
        const ids = orderProposalIds(p);
        for (const id of ids) {
          paidInstallmentsCount.set(id, (paidInstallmentsCount.get(id) ?? 0) + 1);
        }
      }

      if (receivablesFilter !== "candidate") {
        for (const p of employerPayments) {
          const createdAt =
            (p as any)?.createdAt instanceof Date ? (p as any).createdAt : new Date((p as any)?.createdAt ?? Date.now());
          const effectiveAt = (p as any)?.paidAt ? new Date((p as any)?.paidAt) : createdAt;
          if (!within(effectiveAt)) continue;

          const raw = (p as any)?.raw ?? {};
          const notes = raw?.notes ?? raw?.order?.notes ?? {};
          const purpose = String(notes?.purpose ?? "").trim().toLowerCase();
          if (purpose && purpose !== "employer_monthly_payment") continue;

          const stat = String((p as any)?.status ?? "").trim().toLowerCase();

          const employerId = String((p as any)?.employerId ?? "").trim();
          const employer = employerById.get(employerId);
          const companyName = String(((employer as any)?.companyName ?? (employer as any)?.name ?? "") || "-");

          const amountMajor = Math.round((Number((p as any)?.amountMinor ?? 0) || 0) / 100);
          const isPaid = stat === "paid" || stat === "completed";

          receivables.push({
            id: String((p as any)?.orderId ?? (p as any)?.id ?? ""),
            date: fmtDate(effectiveAt),
            source: "company",
            category: "receivable",
            amountMajor,
            dueAmountMajor: isPaid ? 0 : amountMajor,
            currency: String((p as any)?.currency ?? "INR").toUpperCase(),
            status: stat || "created",
            description: "Employer monthly billing",
            candidateId: null,
            candidateName: null,
            companyId: employerId || null,
            companyName,
            referenceId: String((p as any)?.paymentId ?? (p as any)?.orderId ?? "") || null,
            createdAt: effectiveAt.toISOString(),
            raw,
          });
        }

        // Add upcoming installments for active hires
        const hiredProposals = proposals.filter(p => {
          const stat = norm(p?.status ?? "");
          return stat === "hired" || stat === "accepted";
        });

        for (const p of hiredProposals) {
          const proposalId = String(p?.id ?? "").trim();
          const employerId = String((p as any)?.employerId ?? (p as any)?.employer_id ?? "").trim();
          const internId = String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim();
          
          const offer = (p?.offerDetails ?? p?.offer_details ?? {}) as any;
          const startDate = String(offer?.startDate ?? offer?.start_date ?? "").trim();
          if (!startDate) continue;

          const duration = String(offer?.duration ?? "").trim();
          const totalMonths = monthsFromDuration(duration);
          const paidCount = paidInstallmentsCount.get(proposalId) ?? 0;
          
          const monthlyAmountMajor = Number(offer?.monthlyAmount ?? 0) || 0;
          const currency = String(p?.currency ?? offer?.currency ?? "INR").toUpperCase();

          const employer = employerById.get(employerId);
          const companyName = String(((employer as any)?.companyName ?? (employer as any)?.name ?? "") || "-");
          const intern = userById.get(internId);
          const candidateName = intern ? toName(intern) : null;

          for (let i = 1; i <= totalMonths; i++) {
            const installmentDate = addMonthsToIso(startDate, i);
            if (!installmentDate) continue;
            if (!within(installmentDate)) continue;

            // If this installment index is greater than what was paid, it's due
            if (i > paidCount) {
              receivables.push({
                id: `upcoming_installment:${proposalId}:${i}`,
                date: fmtDate(installmentDate),
                source: "company",
                category: "receivable",
                amountMajor: monthlyAmountMajor,
                dueAmountMajor: monthlyAmountMajor,
                currency,
                status: "upcoming",
                description: withCandidatePrefix(candidateName, `Upcoming monthly installment (${i}/${totalMonths})`),
                candidateId: internId || null,
                candidateName,
                companyId: employerId || null,
                companyName,
                referenceId: null,
                createdAt: installmentDate.toISOString(),
                raw: { proposalId, installmentIndex: i },
              });
            }
          }
        }
      }

      if (receivablesFilter !== "company") {
        const { currency: activationCurrency, amountMinor: activationAmountMinor } = getRazorpayConfig();

        const internUsers = users.filter((u: any) => String((u as any)?.role ?? "").trim().toLowerCase() === "intern");
        const onboardingByUserId = new Map<string, any>();
        for (const o of onboarding) onboardingByUserId.set(String((o as any)?.userId ?? "").trim(), o);

        for (const u of internUsers) {
          const internId = String((u as any)?.id ?? "").trim();
          if (!internId) continue;
          const o = onboardingByUserId.get(internId);
          if (!o) continue;

          const isPaid = Boolean((o as any)?.extraData?.payment?.isPaid);
          if (isPaid) continue;

          const created = (o as any)?.createdAt instanceof Date ? (o as any).createdAt : new Date((o as any)?.createdAt ?? Date.now());
          if (!within(created)) continue;

          const candidateName = toName(u);

          receivables.push({
            id: `intern_activation:${internId}`,
            date: fmtDate(created),
            source: "candidate",
            category: "receivable",
            amountMajor: Math.round((Number(activationAmountMinor ?? 0) || 0) / 100),
            currency: String(activationCurrency ?? "INR").toUpperCase(),
            status: "unpaid",
            description: withCandidatePrefix(candidateName, "Candidate account created (activation fee unpaid)"),
            candidateId: internId,
            candidateName,
            companyId: null,
            companyName: null,
            referenceId: null,
            createdAt: created.toISOString(),
            raw: { onboardingId: String((o as any)?.id ?? "") },
          });
        }
      }

      if (payablesFilter !== "company") {
        for (const p of internPayouts) {
          const createdAt =
            (p as any)?.createdAt instanceof Date ? (p as any).createdAt : new Date((p as any)?.createdAt ?? Date.now());
          const effectiveAt = (p as any)?.paidAt ? new Date((p as any)?.paidAt) : createdAt;
          if (!within(effectiveAt)) continue;

          const internId = String((p as any)?.internId ?? "").trim();
          const user = userById.get(internId);
          const candidateName = user ? toName(user) : null;
          const stat = String((p as any)?.status ?? "").trim().toLowerCase();

          payables.push({
            id: String((p as any)?.id ?? ""),
            date: fmtDate(effectiveAt),
            source: "candidate",
            category: "payable",
            amountMajor: Math.round((Number((p as any)?.amountMinor ?? 0) || 0) / 100),
            currency: String((p as any)?.currency ?? "INR").toUpperCase(),
            status: stat || "pending",
            description: withCandidatePrefix(candidateName, "Candidate payout"),
            candidateId: internId || null,
            candidateName,
            companyId: null,
            companyName: null,
            referenceId: String((p as any)?.referenceId ?? "") || null,
            createdAt: effectiveAt.toISOString(),
            raw: (p as any)?.raw ?? {},
          });
        }
      }

      receivables.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      payables.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const totalByCurrency = (rows: ReportRow[]) => {
        const map: Record<string, { count: number; amount: number }> = {};
        for (const r of rows) {
          const c = String(r.currency ?? "INR").toUpperCase();
          if (!map[c]) map[c] = { count: 0, amount: 0 };
          map[c].count += 1;
          map[c].amount += Number(r.amountMajor ?? 0) || 0;
        }
        return map;
      };

      return res.json({
        receivables,
        payables,
        totals: {
          receivables: totalByCurrency(receivables),
          payables: totalByCurrency(payables),
        },
      });
    } catch (error) {
      console.error("Admin reports transactions error:", error);
      return res.status(500).json({ message: "An error occurred while fetching transactions report" });
    }
  });

  app.get("/api/admin/reports/analytics", requirePermission("reports:read"), async (req, res) => {
    try {
      const range = String((req.query as any)?.range ?? "last-18-months").trim();
      const currency = String((req.query as any)?.currency ?? "INR").trim().toUpperCase();
      const displayCurrency = currency === "USD" ? "USD" : "INR";

      const USD_TO_INR_RATE = 100;
      const convertAmountMajor = (amountMajor: number, fromC: string, toC: string) => {
        const from = String(fromC ?? "INR").toUpperCase();
        const to = String(toC ?? "INR").toUpperCase();
        const n = Number(amountMajor ?? 0);
        if (!Number.isFinite(n)) return 0;
        if (from === to) return n;
        if (from === "USD" && to === "INR") return Math.round(n * USD_TO_INR_RATE);
        if (from === "INR" && to === "USD") return Math.round(n / USD_TO_INR_RATE);
        return n;
      };

      const parseDateOnly = (raw: unknown) => {
        const s = String(raw ?? "").trim();
        if (!s) return null;
        // Accept YYYY-MM-DD (native <input type="date">) and DD-MM-YYYY (some locale UIs)
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          const d = new Date(`${s}T00:00:00.000Z`);
          if (Number.isNaN(d.getTime())) return null;
          return d;
        }
        if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
          const [dd, mm, yyyy] = s.split("-");
          const iso = `${yyyy}-${mm}-${dd}`;
          const d = new Date(`${iso}T00:00:00.000Z`);
          if (Number.isNaN(d.getTime())) return null;
          return d;
        }
        return null;
      };

      const customFrom = parseDateOnly((req.query as any)?.from);
      const customTo = parseDateOnly((req.query as any)?.to);

      const now = (() => {
        if (range === "custom" && customTo) {
          // include the entire 'to' day
          const d = new Date(customTo);
          d.setUTCHours(23, 59, 59, 999);
          return d;
        }
        return new Date();
      })();

      const since = (() => {
        if (range === "custom" && customFrom) return new Date(customFrom);
        const d = new Date(now);
        switch (range) {
          case "last-7-days":
            d.setDate(d.getDate() - 7);
            return d;
          case "last-30-days":
            d.setDate(d.getDate() - 30);
            return d;
          case "last-3-months":
            d.setMonth(d.getMonth() - 3);
            return d;
          case "last-6-months":
            d.setMonth(d.getMonth() - 6);
            return d;
          case "last-18-months":
          default:
            d.setMonth(d.getMonth() - 18);
            return d;
        }
      })();

      const [usersRaw, employersRaw, projectsRaw, proposalsRaw, interviewsRaw, paymentsRaw, internPaymentsRaw, onboardingRaw] =
        await Promise.all([
          storage.getUsers(),
          storage.getEmployers(),
          storage.getAllProjects(),
          storage.getAllProposals(),
          storage.getAllInterviews(),
          storage.listAllEmployerPayments({ status: "paid" }),
          storage.listAllInternPayments({ status: "paid" }),
          storage.getAllInternOnboarding(),
        ]);

      const users = usersRaw ?? [];
      const employers = employersRaw ?? [];
      const projects = projectsRaw ?? [];
      const proposals = proposalsRaw ?? [];
      const interviews = interviewsRaw ?? [];
      const payments = paymentsRaw ?? [];
      const internPayments = internPaymentsRaw ?? [];
      const onboarding = onboardingRaw ?? [];

      const toMs = (d: any) => {
        const dt = d instanceof Date ? d : d ? new Date(d) : null;
        const t = dt ? dt.getTime() : NaN;
        return Number.isFinite(t) ? t : null;
      };

      const within = (d: any) => {
        const t = toMs(d);
        if (t == null) return false;
        return t >= since.getTime() && t <= now.getTime();
      };

      const proposalsInRange = (proposals as any[]).filter((p: any) => within((p as any)?.createdAt ?? (p as any)?.created_at));
      const interviewsInRange = (interviews as any[]).filter((i: any) => within((i as any)?.createdAt ?? (i as any)?.created_at));
      const employersInRangeAll = (employers as any[]).filter((e: any) => within((e as any)?.createdAt ?? (e as any)?.created_at));
      const isReportEmployer = (e: any) => {
        const id = String((e as any)?.id ?? "").trim();
        if (!id) return false;
        if (id.toLowerCase() === "admin") return false;
        const email = String((e as any)?.companyEmail ?? "").trim().toLowerCase();
        if (email === "ai-interview@findtern.ai") return false;
        return true;
      };

      const excludedEmployerIds = new Set<string>();
      for (const e of employers as any[]) {
        const id = String((e as any)?.id ?? "").trim();
        if (!id) continue;
        if (id.toLowerCase() === "admin") {
          excludedEmployerIds.add(id);
          continue;
        }
        const email = String((e as any)?.companyEmail ?? "").trim().toLowerCase();
        if (email === "ai-interview@findtern.ai") excludedEmployerIds.add(id);
      }

      const employersInRange = employersInRangeAll.filter((e: any) => isReportEmployer(e));
      const projectsInRange = (projects as any[]).filter((p: any) => within((p as any)?.createdAt ?? (p as any)?.created_at));
      const onboardingInRange = (onboarding as any[]).filter((o: any) => within((o as any)?.createdAt ?? (o as any)?.created_at));
      const paymentsInRange = (payments as any[]).filter((p: any) => {
        const raw = (p as any)?.paidAt ?? (p as any)?.createdAt ?? (p as any)?.created_at ?? null;
        return within(raw);
      });

      const proposalPaidAtById = (() => {
        const map = new Map<string, number>();
        for (const pay of payments as any[]) {
          const status = String((pay as any)?.status ?? "").trim().toLowerCase();
          if (status && status !== "paid") continue;

          const paidAtMs =
            toMs((pay as any)?.paidAt ?? null) ??
            toMs((pay as any)?.createdAt ?? (pay as any)?.created_at ?? null);
          if (paidAtMs == null) continue;

          const raw = (pay as any)?.raw ?? {};
          const notes = raw?.notes ?? raw?.order?.notes ?? raw?.order?.order?.notes ?? {};
          const proposalIds = (() => {
            const ids = notes?.proposalIds ?? notes?.proposal_ids ?? [];
            return Array.isArray(ids) ? ids.map((v: any) => String(v ?? "").trim()).filter(Boolean) : [];
          })();
          if (proposalIds.length === 0) continue;

          for (const id of proposalIds) {
            const prev = map.get(id);
            if (prev == null || paidAtMs < prev) map.set(id, paidAtMs);
          }
        }
        return map;
      })();

      const internPaymentsInRange = (internPayments as any[]).filter((p: any) => {
        const raw = (p as any)?.paidAt ?? (p as any)?.createdAt ?? (p as any)?.created_at ?? null;
        const status = String((p as any)?.status ?? "").trim().toLowerCase();
        if (status && status !== "paid") return false;
        return within(raw);
      });

      const distinct = (arr: any[]) => Array.from(new Set(arr));
      const appliedInterns = distinct(
        proposalsInRange
          .map((p: any) => String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim())
          .filter(Boolean),
      );
      const interviewedInterns = distinct(
        interviewsInRange
          .map((i: any) => String((i as any)?.internId ?? (i as any)?.intern_id ?? "").trim())
          .filter(Boolean),
      );

      const formatMonth = (d: Date) =>
        new Intl.DateTimeFormat("en-US", { month: "short" }).format(d);
      const formatDay = (d: Date) =>
        new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(d);

      const internUsers = (users as any[]).filter((u: any) => String((u as any)?.role ?? "").trim().toLowerCase() === "intern");
      const internUserIds = new Set(internUsers.map((u: any) => String((u as any)?.id ?? "").trim()).filter(Boolean));

      const internOnboardingInRange = (onboardingInRange as any[]).filter((o: any) => {
        const id = String((o as any)?.userId ?? (o as any)?.user_id ?? "").trim();
        if (!id) return false;
        return internUserIds.has(id);
      });

      const internUserIdsInRange = new Set(
        onboardingInRange
          .map((o: any) => String((o as any)?.userId ?? (o as any)?.user_id ?? "").trim())
          .filter(Boolean),
      );

      const onboardingUserIds = distinct(
        (onboarding as any[])
          .map((o: any) => String((o as any)?.userId ?? (o as any)?.user_id ?? "").trim())
          .filter(Boolean),
      );

      const onboardingUserIdsInRange = distinct(
        onboardingInRange
          .map((o: any) => String((o as any)?.userId ?? (o as any)?.user_id ?? "").trim())
          .filter(Boolean),
      );

      const isMeaningfulOnboarding = (o: any) => {
        if (!o) return false;
        const linkedinUrl = String((o as any)?.linkedinUrl ?? (o as any)?.linkedin_url ?? "").trim();
        if (linkedinUrl) return true;
        const bio = String((o as any)?.bio ?? "").trim();
        if (bio) return true;
        const previewSummary = String((o as any)?.previewSummary ?? (o as any)?.preview_summary ?? "").trim();
        if (previewSummary) return true;
        const city = String((o as any)?.city ?? "").trim();
        const state = String((o as any)?.state ?? "").trim();
        const pinCode = String((o as any)?.pinCode ?? (o as any)?.pin_code ?? "").trim();
        if (city || state || pinCode) return true;
        const skills = Array.isArray((o as any)?.skills) ? (o as any).skills : [];
        if (skills.length > 0) return true;
        return false;
      };

      const meaningfulOnboardingIdsInRange = new Set(
        onboardingInRange
          .filter((o: any) => isMeaningfulOnboarding(o))
          .map((o: any) => String((o as any)?.userId ?? (o as any)?.user_id ?? "").trim())
          .filter(Boolean),
      );

      const totalUsers = internOnboardingInRange.length;
      const totalCompanies = employersInRange.length;
      const activeProjects = projectsInRange.filter((p: any) => String(p?.status ?? "").toLowerCase() === "active").length;
      const completedInternships = proposalsInRange.filter((p: any) => {
        const st = String(p?.status ?? "").toLowerCase();
        if (!(st === "accepted" || st === "hired")) return false;
        const pid = String((p as any)?.id ?? "").trim();
        const paidAtMs = pid ? proposalPaidAtById.get(pid) : undefined;
        return paidAtMs != null && paidAtMs >= since.getTime() && paidAtMs <= now.getTime();
      }).length;
      const pendingApplications = proposalsInRange.filter((p: any) => {
        const s = String(p?.status ?? "").toLowerCase();
        return s === "sent" || s === "interview_scheduled" || s === "draft" || s === "under_review";
      }).length;
      const activeUsers = Array.from(meaningfulOnboardingIdsInRange).filter((id) => internUserIdsInRange.has(id)).length;

      const projectById = new Map<string, any>();
      for (const p of projects as any[]) {
        const pid = String((p as any)?.id ?? "").trim();
        if (pid) projectById.set(pid, p);
      }

      const isFullTimeProposal = (proposal: any) => {
        try {
          const offer = (proposal as any)?.offerDetails ?? (proposal as any)?.offer_details ?? {};
          const ft = (offer as any)?.fullTimeOffer;
          
          // If the proposal itself explicitly defines the type, use it
          if (ft === true || (ft && typeof ft === "object" && Object.keys(ft).length > 0)) return true;
          if (ft === false) return false;

          // Check if it's an internship based on duration field
          const duration = String(offer?.duration ?? offer?.internshipDuration ?? "").toLowerCase();
          if (duration && (duration.includes("month") || /^\d+m$/.test(duration))) {
            return false;
          }

          // Otherwise fallback to project default
          const projectId = String((proposal as any)?.projectId ?? (proposal as any)?.project_id ?? "").trim();
          const proj = projectId ? projectById.get(projectId) : null;
          return Boolean((proj as any)?.fullTimeOffer);
        } catch {
          return false;
        }
      };

      const fullTimeProposalCount = proposalsInRange.filter((p: any) => isFullTimeProposal(p)).length;
      const internshipProposalCount = Math.max(0, proposalsInRange.length - fullTimeProposalCount);

      const totalRevenueFromEmployers = paymentsInRange
        .filter((p: any) => {
          const s = String(p?.status ?? "").toLowerCase();
          return s === "paid" || s === "completed";
        })
        .reduce((acc: number, p: any) => {
          const minor = Number(p?.amountMinor ?? 0) || 0;
          const major = Math.round(minor / 100);
          const fromC = String((p as any)?.currency ?? "INR").toUpperCase();
          return acc + convertAmountMajor(major, fromC, displayCurrency);
        }, 0);

      const totalRevenueFromInterns = internPaymentsInRange
        .filter((p: any) => {
          const s = String(p?.status ?? "").toLowerCase();
          return s === "paid" || s === "completed";
        })
        .reduce((acc: number, p: any) => {
          const minor = Number((p as any)?.amountMinor ?? 0) || 0;
          const major = Math.round(minor / 100);
          const fromC = String((p as any)?.currency ?? "INR").toUpperCase();
          return acc + convertAmountMajor(major, fromC, displayCurrency);
        }, 0);

      const totalRevenueMajor = Math.round(totalRevenueFromEmployers + totalRevenueFromInterns);

      const proposalsCount = proposalsInRange.length;
      const acceptedCount = completedInternships;
      const newCompanies = employersInRange.length;
      const newProjects = projectsInRange.length;

      const avgAppsPerUser = totalUsers > 0 ? Number((proposalsCount / totalUsers).toFixed(1)) : 0;

      const placedInternIds = new Set(
        proposalsInRange
          .filter((p: any) => {
            const st = String((p as any)?.status ?? "").toLowerCase();
            return st === "accepted" || st === "hired";
          })
          .map((p: any) => String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim())
          .filter(Boolean),
      );

      const placementRate = appliedInterns.length > 0
        ? Number(((placedInternIds.size / appliedInterns.length) * 100).toFixed(1))
        : 0;
      const projectsPerCompany = totalCompanies > 0 ? Number((projects.length / totalCompanies).toFixed(1)) : 0;
      const hiresPerCompany = totalCompanies > 0 ? Number((acceptedCount / totalCompanies).toFixed(1)) : 0;
      const successRate = proposalsCount > 0 ? Number(((acceptedCount / proposalsCount) * 100).toFixed(1)) : 0;
      const interviewRate = appliedInterns.length > 0 ? Number(((interviewedInterns.length / appliedInterns.length) * 100).toFixed(1)) : 0;
      const profileCompletionRate =
        totalUsers > 0 ? Number(((meaningfulOnboardingIdsInRange.size / totalUsers) * 100).toFixed(1)) : 0;
      const applicationSuccessRate = appliedInterns.length > 0 ? Number(((acceptedCount / appliedInterns.length) * 100).toFixed(1)) : 0;

      const acceptedDurations = proposalsInRange
        .filter((p: any) => {
          const st = String((p as any)?.status ?? "").toLowerCase();
          return st === "accepted" || st === "hired";
        })
        .map((p: any) => {
          const start = toMs((p as any)?.createdAt);
          const end = toMs((p as any)?.updatedAt);
          if (start == null || end == null) return null;
          const diff = end - start;
          if (!Number.isFinite(diff) || diff < 0) return null;
          return diff;
        })
        .filter((v: any) => typeof v === "number") as number[];
      const avgHireTimeDays =
        acceptedDurations.length > 0
          ? Number(((acceptedDurations.reduce((a, b) => a + b, 0) / acceptedDurations.length) / (1000 * 60 * 60 * 24)).toFixed(1))
          : null;

      const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const startMonth = new Date(since.getFullYear(), since.getMonth(), 1);
      const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const performanceTrendsData: Array<{
        month: string;
        successRate: number;
        interviewRate: number;
        applicationSuccessRate: number;
      }> = [];
      for (let m = new Date(startMonth); m <= endMonth; m.setMonth(m.getMonth() + 1)) {
        const start = new Date(m.getFullYear(), m.getMonth(), 1);
        const end = new Date(m.getFullYear(), m.getMonth() + 1, 1);

        const proposalsMonth = (proposals as any[]).filter((p: any) => {
          const t = toMs((p as any)?.createdAt);
          return t != null && t >= start.getTime() && t < end.getTime();
        });
        const interviewsMonth = (interviews as any[]).filter((it: any) => {
          const t = toMs((it as any)?.createdAt);
          return t != null && t >= start.getTime() && t < end.getTime();
        });

        const appliedIds = Array.from(
          new Set(proposalsMonth.map((p: any) => String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim()).filter(Boolean)),
        );
        const interviewedIds = Array.from(
          new Set(interviewsMonth.map((i: any) => String((i as any)?.internId ?? (i as any)?.intern_id ?? "").trim()).filter(Boolean)),
        );
        const acceptedIds = Array.from(
          new Set(
            proposalsMonth
              .filter((p: any) => {
                const st = String((p as any)?.status ?? "").toLowerCase();
                return st === "accepted" || st === "hired";
              })
              .map((p: any) => String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim())
              .filter(Boolean),
          ),
        );

        const successRateMonth = proposalsMonth.length > 0 ? Number(((acceptedIds.length / proposalsMonth.length) * 100).toFixed(1)) : 0;
        const interviewRateMonth = appliedIds.length > 0 ? Number(((interviewedIds.length / appliedIds.length) * 100).toFixed(1)) : 0;
        const applicationSuccessRateMonth = appliedIds.length > 0 ? Number(((acceptedIds.length / appliedIds.length) * 100).toFixed(1)) : 0;

        performanceTrendsData.push({
          month: formatMonth(start),
          successRate: successRateMonth,
          interviewRate: interviewRateMonth,
          applicationSuccessRate: applicationSuccessRateMonth,
        });
      }

      const growthWindowStart = (() => {
        const d = new Date(since);
        const windowMs = now.getTime() - since.getTime();
        d.setTime(d.getTime() - windowMs);
        return d;
      })();

      const signupsCurrent = internOnboardingInRange.length;
      const signupsPrev = (onboarding as any[]).filter((o: any) => {
        const id = String((o as any)?.userId ?? (o as any)?.user_id ?? "").trim();
        if (!id || !internUserIds.has(id)) return false;
        const t = toMs((o as any)?.createdAt ?? (o as any)?.created_at);
        if (t == null) return false;
        return t >= growthWindowStart.getTime() && t < since.getTime();
      }).length;

      const monthlyGrowth = signupsPrev > 0 ? Number((((signupsCurrent - signupsPrev) / signupsPrev) * 100).toFixed(1)) : 0;

      const monthlyTrendsData: any[] = [];
      for (let m = new Date(startMonth); m <= endMonth; m.setMonth(m.getMonth() + 1)) {
        const start = new Date(m.getFullYear(), m.getMonth(), 1);
        const end = new Date(m.getFullYear(), m.getMonth() + 1, 1);
        const usersCount = (internUsers as any[]).filter((u: any) => {
          const id = String((u as any)?.id ?? "").trim();
          if (!id) return false;
          const o = (onboarding as any[]).find((row: any) => String((row as any)?.userId ?? (row as any)?.user_id ?? "").trim() === id);
          const t = toMs((o as any)?.createdAt ?? (o as any)?.created_at);
          return t != null && t >= start.getTime() && t < end.getTime();
        }).length;
        const companiesCount = employers.filter((e: any) => {
          if (!isReportEmployer(e)) return false;
          const t = toMs((e as any)?.createdAt);
          return t != null && t >= start.getTime() && t < end.getTime();
        }).length;
        const internshipsCount = proposals.filter((p: any) => {
          const status = String((p as any)?.status ?? "").trim().toLowerCase();
          if (status !== "hired") return false;
          const t = toMs((p as any)?.createdAt);
          return t != null && t >= start.getTime() && t < end.getTime();
        }).length;

        const revenueEmployerMajor = (payments as any[])
          .filter((p: any) => {
            const status = String((p as any)?.status ?? "").trim().toLowerCase();
            if (status !== "paid" && status !== "completed") return false;
            const t = toMs((p as any)?.paidAt ?? (p as any)?.createdAt ?? (p as any)?.created_at);
            return t != null && t >= start.getTime() && t < end.getTime();
          })
          .reduce((acc: number, p: any) => {
            const minor = Number((p as any)?.amountMinor ?? 0) || 0;
            const major = Math.round(minor / 100);
            const fromC = String((p as any)?.currency ?? "INR").toUpperCase();
            return acc + convertAmountMajor(major, fromC, displayCurrency);
          }, 0);

        const revenueInternMajor = (internPayments as any[])
          .filter((p: any) => {
            const status = String((p as any)?.status ?? "").trim().toLowerCase();
            if (status !== "paid" && status !== "completed") return false;
            const t = toMs((p as any)?.paidAt ?? (p as any)?.createdAt ?? (p as any)?.created_at);
            return t != null && t >= start.getTime() && t < end.getTime();
          })
          .reduce((acc: number, p: any) => {
            const minor = Number((p as any)?.amountMinor ?? 0) || 0;
            const major = Math.round(minor / 100);
            const fromC = String((p as any)?.currency ?? "INR").toUpperCase();
            return acc + convertAmountMajor(major, fromC, displayCurrency);
          }, 0);

        const revenueMajor = Math.round(revenueEmployerMajor + revenueInternMajor);
        monthlyTrendsData.push({
          month: formatMonth(start),
          users: usersCount,
          companies: companiesCount,
          internships: internshipsCount,
          revenue: revenueMajor,
          _k: monthKey(start),
        });
      }

      const weeklyActivityData: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setHours(0, 0, 0, 0);
        day.setDate(day.getDate() - i);
        const next = new Date(day);
        next.setDate(next.getDate() + 1);

        const signups = onboarding.filter((o: any) => {
          const t = toMs((o as any)?.createdAt);
          return t != null && t >= day.getTime() && t < next.getTime();
        }).length;

        const applications = proposals.filter((p: any) => {
          const t = toMs((p as any)?.createdAt);
          return t != null && t >= day.getTime() && t < next.getTime();
        }).length;

        const interviewsCount = interviews.filter((it: any) => {
          const t = toMs((it as any)?.createdAt);
          if (!(t != null && t >= day.getTime() && t < next.getTime())) return false;
          const employerId = String((it as any)?.employerId ?? (it as any)?.employer_id ?? "").trim();
          if (employerId && excludedEmployerIds.has(employerId)) return false;
          return true;
        }).length;

        weeklyActivityData.push({ day: formatDay(day), signups, applications, interviews: interviewsCount });
      }

      const selectedInternIds = new Set(
        proposalsInRange
          .filter((p: any) => {
            const st = String((p as any)?.status ?? "").toLowerCase();
            return st === "accepted" || st === "hired";
          })
          .map((p: any) => String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim())
          .filter(Boolean),
      );
      const selectedCount = selectedInternIds.size;

      const completedInternIds = new Set(
        interviewsInRange
          .filter((i: any) => String((i as any)?.status ?? "").toLowerCase() === "completed")
          .map((i: any) => String((i as any)?.internId ?? (i as any)?.intern_id ?? "").trim())
          .filter(Boolean),
      );
      const completedCount = completedInternIds.size;

      const conversionFunnelBase = Math.max(1, totalUsers);
      const conversionFunnelData = [
        {
          stage: "Profile Complete",
          value: meaningfulOnboardingIdsInRange.size,
          percentage: Number(((meaningfulOnboardingIdsInRange.size / conversionFunnelBase) * 100).toFixed(1)),
        },
        {
          stage: "Applied",
          value: appliedInterns.length,
          percentage: Number(((appliedInterns.length / conversionFunnelBase) * 100).toFixed(1)),
        },
        {
          stage: "Interviewed",
          value: interviewedInterns.length,
          percentage: Number(((interviewedInterns.length / conversionFunnelBase) * 100).toFixed(1)),
        },
        {
          stage: "Selected",
          value: selectedCount,
          percentage: Number(((selectedCount / conversionFunnelBase) * 100).toFixed(1)),
        },
        {
          stage: "Completed",
          value: completedCount,
          percentage: Number(((completedCount / conversionFunnelBase) * 100).toFixed(1)),
        },
      ];

      const skillCounts = new Map<string, number>();
      for (const p of projects as any[]) {
        const skills = Array.isArray((p as any)?.skills) ? ((p as any).skills as any[]) : [];
        for (const s of skills) {
          const key = String(s ?? "").trim();
          if (!key) continue;
          skillCounts.set(key, (skillCounts.get(key) ?? 0) + 1);
        }
      }

      const topSkills = Array.from(skillCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
      const maxSkill = Math.max(1, ...(topSkills.map(([, c]) => c) as any));
      const skillDemandData = topSkills.map(([skill, count]) => ({
        skill,
        demand: Math.round((count / maxSkill) * 100),
      }));

      const normalizeSkills = (proposal: any) => {
        const skills = Array.isArray((proposal as any)?.skills) ? ((proposal as any).skills as any[]) : [];
        const offer = ((proposal as any)?.offerDetails ?? (proposal as any)?.offer_details ?? {}) as any;
        const required = Array.isArray(offer?.requiredSkills) ? (offer.requiredSkills as any[]) : [];
        const projectSkills = Array.isArray(offer?.projectSkills) ? (offer.projectSkills as any[]) : [];
        return Array.from(
          new Set(
            [...skills, ...required, ...projectSkills]
              .map((s) => String(s ?? "").trim())
              .filter(Boolean),
          ),
        );
      };

      const highestPayingSkillsData = (() => {
        const skillAgg = new Map<string, { total: number; count: number }>();
        for (const p of proposalsInRange as any[]) {
          const offer = ((p as any)?.offerDetails ?? (p as any)?.offer_details ?? {}) as any;
          const monthlyAmountRaw = Number(offer?.monthlyAmount ?? offer?.monthly_amount ?? 0);
          if (!Number.isFinite(monthlyAmountRaw) || monthlyAmountRaw <= 0) continue;
          const fromC = String((p as any)?.currency ?? "INR").toUpperCase();
          const monthlyAmount = convertAmountMajor(monthlyAmountRaw, fromC, displayCurrency);
          if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) continue;

          const skills = normalizeSkills(p);
          for (const s of skills) {
            const cur = skillAgg.get(s) ?? { total: 0, count: 0 };
            cur.total += monthlyAmount;
            cur.count += 1;
            skillAgg.set(s, cur);
          }
        }
        const rows = Array.from(skillAgg.entries())
          .map(([skill, agg]) => ({
            skill,
            avgPay: agg.count > 0 ? Math.round(agg.total / agg.count) : 0,
            postings: agg.count,
          }))
          .filter((r) => r.avgPay > 0)
          .sort((a, b) => b.avgPay - a.avgPay)
          .slice(0, 8);
        return rows;
      })();

      const regionWiseDemandData = (() => {
        const byRegion = new Map<string, number>();
        const projectInRangeIds = new Set(
          projectsInRange.map((p: any) => String((p as any)?.id ?? "").trim()).filter(Boolean),
        );
        for (const p of projects as any[]) {
          const pid = String((p as any)?.id ?? "").trim();
          if (!pid || !projectInRangeIds.has(pid)) continue;
          const locationType = String((p as any)?.locationType ?? (p as any)?.location_type ?? "").trim().toLowerCase();
          const state = String((p as any)?.state ?? "").trim();
          const city = String((p as any)?.city ?? "").trim();
          const label =
            locationType === "remote"
              ? "Remote"
              : state || city || "Unknown";
          byRegion.set(label, (byRegion.get(label) ?? 0) + 1);
        }
        return Array.from(byRegion.entries())
          .map(([region, demand]) => ({ region, demand }))
          .sort((a, b) => b.demand - a.demand)
          .slice(0, 10);
      })();

      let employerBehaviorAnalytics:
        | {
            avgHireTimeDays: number | null;
            dropOffRate: number;
            dropOffEmployers: number;
            activeEmployers: number;
            repeatEmployers: number;
          }
        | null = null;

      const conversionAnalytics = (() => {
        // Intern-only sequential funnel to keep all step rates <= 100%
        const signupInternIds = new Set(onboardingUserIdsInRange.map((id) => String(id ?? "").trim()).filter(Boolean));
        const signupCount = signupInternIds.size;

        const paidInternIds = new Set(
          internPaymentsInRange
            .map((p: any) => String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim())
            .filter((id: string) => Boolean(id) && signupInternIds.has(id)),
        );
        const paidCount = paidInternIds.size;

        const interviewedInternIds = new Set(
          interviewsInRange
            .map((i: any) => String((i as any)?.internId ?? (i as any)?.intern_id ?? "").trim())
            .filter((id: string) => Boolean(id) && paidInternIds.has(id)),
        );
        const interviewCount = interviewedInternIds.size;

        const hiredInternIds = new Set(
          proposalsInRange
            .filter((p: any) => {
              const st = String((p as any)?.status ?? "").toLowerCase();
              if (!(st === "accepted" || st === "hired")) return false;
              const iid = String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim();
              return Boolean(iid) && interviewedInternIds.has(iid);
            })
            .map((p: any) => String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim())
            .filter(Boolean),
        );
        const hireCount = hiredInternIds.size;

        const signupToPaid = signupCount > 0 ? Number(((paidCount / signupCount) * 100).toFixed(1)) : 0;
        const paidToInterview = paidCount > 0 ? Number(((interviewCount / paidCount) * 100).toFixed(1)) : 0;
        const interviewToHire = interviewCount > 0 ? Number(((hireCount / interviewCount) * 100).toFixed(1)) : 0;

        return {
          signupCount,
          paidCount,
          interviewCount,
          hireCount,
          signupToPaid,
          paidToInterview,
          interviewToHire,
        };
      })();

      const inferIndustry = (skills: string[]) => {
        const s = skills.map((x) => x.toLowerCase());
        const has = (re: RegExp) => s.some((v) => re.test(v));
        if (has(/react|node|javascript|typescript|python|java|software|web|app|devops|aws|cloud/)) return "IT & Software";
        if (has(/finance|account|bank|trading|fintech/)) return "Finance";
        if (has(/health|medical|hospital|pharma|bio/)) return "Healthcare";
        if (has(/e-?commerce|shop|retail|marketplace/)) return "E-commerce";
        if (has(/manufacturing|supply|factory|industrial/)) return "Manufacturing";
        return "Others";
      };

      const industryColor: Record<string, string> = {
        "IT & Software": "hsl(152, 61%, 40%)",
        Finance: "hsl(217, 91%, 60%)",
        Healthcare: "hsl(43, 96%, 56%)",
        "E-commerce": "hsl(262, 83%, 58%)",
        Manufacturing: "hsl(0, 72%, 51%)",
        Others: "hsl(200, 20%, 60%)",
      };

      const industryCounts = new Map<string, number>();
      for (const p of projects as any[]) {
        const skills = Array.isArray((p as any)?.skills) ? ((p as any).skills as string[]) : [];
        const label = inferIndustry(skills);
        industryCounts.set(label, (industryCounts.get(label) ?? 0) + 1);
      }
      const industryTotal = Math.max(1, Array.from(industryCounts.values()).reduce((a, b) => a + b, 0));
      const industryDistributionData = Array.from(industryCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, count]) => ({
          name,
          value: Math.round((count / industryTotal) * 100),
          color: industryColor[name] ?? industryColor.Others,
        }));

      const employerById = new Map<string, any>();
      for (const e of employers as any[]) {
        const id = String((e as any)?.id ?? "").trim();
        if (!id) continue;
        if (id.toLowerCase() === "admin") continue;
        const email = String((e as any)?.companyEmail ?? "").trim().toLowerCase();
        if (email === "ai-interview@findtern.ai") continue;
        employerById.set(id, e);
      }

      const proposalsByEmployer = new Map<string, any[]>();
      for (const p of proposals as any[]) {
        const id = String((p as any)?.employerId ?? "");
        if (!id) continue;
        if (!employerById.has(id)) continue;
        const list = proposalsByEmployer.get(id) ?? [];
        list.push(p);
        proposalsByEmployer.set(id, list);
      }

      employerBehaviorAnalytics = (() => {
        const activeEmployerIds = new Set<string>();
        for (const p of projectsInRange as any[]) {
          const eid = String((p as any)?.employerId ?? (p as any)?.employer_id ?? "").trim();
          if (eid) activeEmployerIds.add(eid);
        }
        for (const pr of proposalsInRange as any[]) {
          const eid = String((pr as any)?.employerId ?? (pr as any)?.employer_id ?? "").trim();
          if (eid) activeEmployerIds.add(eid);
        }

        const dropOffEmployerIds = new Set<string>();
        for (const [eid, list] of proposalsByEmployer.entries()) {
          if (!activeEmployerIds.has(eid)) continue;
          const total = list.filter((p) => within((p as any)?.createdAt ?? (p as any)?.created_at)).length;
          if (!total) continue;
          const hires = list.filter((p) => {
            const st = String((p as any)?.status ?? "").toLowerCase();
            if (!(st === "accepted" || st === "hired")) return false;
            return within((p as any)?.createdAt ?? (p as any)?.created_at);
          }).length;
          if (!hires) dropOffEmployerIds.add(eid);
        }

        const dropOffBase = Math.max(1, activeEmployerIds.size);
        const dropOffRate = Number(((dropOffEmployerIds.size / dropOffBase) * 100).toFixed(1));

        const repeatEmployers = new Set<string>();
        const paymentsByEmployer = new Map<string, number>();
        for (const pay of paymentsInRange as any[]) {
          const eid = String((pay as any)?.employerId ?? (pay as any)?.employer_id ?? "").trim();
          if (!eid) continue;
          paymentsByEmployer.set(eid, (paymentsByEmployer.get(eid) ?? 0) + 1);
        }
        for (const [eid, c] of paymentsByEmployer.entries()) {
          if (c >= 2) repeatEmployers.add(eid);
        }

        return {
          avgHireTimeDays,
          dropOffRate,
          dropOffEmployers: dropOffEmployerIds.size,
          activeEmployers: activeEmployerIds.size,
          repeatEmployers: repeatEmployers.size,
        };
      })();

      const projectsByEmployer = new Map<string, any[]>();
      for (const p of projects as any[]) {
        const id = String((p as any)?.employerId ?? "");
        if (!id) continue;
        if (!employerById.has(id)) continue;
        const list = projectsByEmployer.get(id) ?? [];
        list.push(p);
        projectsByEmployer.set(id, list);
      }

      const topCompanies = Array.from(employerById.entries())
        .map(([employerId, e]) => {
          const projCount = (projectsByEmployer.get(employerId) ?? []).length;
          const hires = (proposalsByEmployer.get(employerId) ?? []).filter(
            (p) => {
              const st = String((p as any)?.status ?? "").toLowerCase();
              return st === "accepted" || st === "hired";
            },
          ).length;
          const sent = (proposalsByEmployer.get(employerId) ?? []).length;
          const rating = Math.min(5, Math.max(3.5, 3.5 + (sent ? hires / sent : 0) * 1.5));
          const status = projCount > 0 ? "active" : "inactive";
          return {
            name: String((e as any)?.companyName ?? (e as any)?.name ?? employerId),
            projects: projCount,
            hires,
            rating: Number(rating.toFixed(1)),
            status,
          };
        })
        .sort((a, b) => b.hires - a.hires || b.projects - a.projects)
        .slice(0, 5);

      const userById = new Map<string, any>();
      for (const u of users as any[]) userById.set(String((u as any)?.id ?? ""), u);

      const proposalsByIntern = new Map<string, any[]>();
      for (const p of proposals as any[]) {
        const id = String((p as any)?.internId ?? "");
        if (!id) continue;
        const list = proposalsByIntern.get(id) ?? [];
        list.push(p);
        proposalsByIntern.set(id, list);
      }

      const interviewsByIntern = new Map<string, any[]>();
      for (const i of interviews as any[]) {
        const id = String((i as any)?.internId ?? "");
        if (!id) continue;
        const list = interviewsByIntern.get(id) ?? [];
        list.push(i);
        interviewsByIntern.set(id, list);
      }

      const topInterns = Array.from(proposalsByIntern.entries())
        .map(([internId, props]) => {
          const offers = props.filter((p) => {
            const st = String((p as any)?.status ?? "").toLowerCase();
            return st === "accepted" || st === "hired";
          }).length;
          const ints = (interviewsByIntern.get(internId) ?? []).filter((i: any) => {
            const employerId = String((i as any)?.employerId ?? (i as any)?.employer_id ?? "").trim();
            if (!employerId) return false;
            if (excludedEmployerIds.has(employerId)) return false;
            return true;
          }).length;
          const user = userById.get(internId);
          const name = user ? `${String((user as any)?.firstName ?? "").trim()} ${String((user as any)?.lastName ?? "").trim()}`.trim() : internId;
          const status = offers > 0 ? "placed" : ints > 0 ? "interviewing" : "applied";
          return { name, applications: props.length, interviews: ints, offers, status };
        })
        .sort((a, b) => b.offers - a.offers || b.interviews - a.interviews || b.applications - a.applications)
        .slice(0, 5);

      const fullTimeHiredInterns: Array<{ internId: string; internName: string; companyId: string | null; companyName: string | null; hiredAt: string; status: string }> = [];
      const internshipHiredInterns: Array<{ internId: string; internName: string; companyId: string | null; companyName: string | null; hiredAt: string; status: string }> = [];
      for (const p of proposalsInRange as any[]) {
        const st = String((p as any)?.status ?? "").toLowerCase();
        if (!(st === "accepted" || st === "hired")) continue;

        const proposalId = String((p as any)?.id ?? "").trim();
        const paidAtMs = proposalId ? proposalPaidAtById.get(proposalId) : undefined;
        if (paidAtMs == null) continue;
        if (paidAtMs < since.getTime() || paidAtMs > now.getTime()) continue;

        const internId = String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim();
        if (!internId) continue;
        const employerId = String((p as any)?.employerId ?? (p as any)?.employer_id ?? "").trim();
        const employer = employerId ? employerById.get(employerId) : null;
        const companyName = employer ? String((employer as any)?.companyName ?? (employer as any)?.name ?? employerId) : (employerId || null);

        const user = userById.get(internId);
        const internName = user
          ? `${String((user as any)?.firstName ?? "").trim()} ${String((user as any)?.lastName ?? "").trim()}`.trim()
          : internId;

        const hiredAt = new Date(paidAtMs).toISOString();

        const isFullTime = isFullTimeProposal(p);
        const row = {
          internId,
          internName,
          companyId: employerId || null,
          companyName: companyName || null,
          hiredAt,
          status: st,
        };
        if (isFullTime) {
          fullTimeHiredInterns.push(row);
        } else {
          internshipHiredInterns.push(row);
        }
      }

      fullTimeHiredInterns.sort((a, b) => new Date(b.hiredAt).getTime() - new Date(a.hiredAt).getTime());
      internshipHiredInterns.sort((a, b) => new Date(b.hiredAt).getTime() - new Date(a.hiredAt).getTime());

      const cityCounts = new Map<string, number>();
      for (const o of onboarding as any[]) {
        const city = String((o as any)?.city ?? "").trim();
        if (!city) continue;
        cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
      }
      const cityTotal = Math.max(1, Array.from(cityCounts.values()).reduce((a, b) => a + b, 0));
      const geographicData = Array.from(cityCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

      const topCities = geographicData.map(([city, count]) => {
        const percentage = Number(((count / cityTotal) * 100).toFixed(1));
        return { city, users: count, percentage };
      });

      const otherCount = cityTotal - geographicData.reduce((a, [, c]) => a + c, 0);
      if (otherCount > 0) {
        topCities.push({
          city: "Others",
          users: otherCount,
          percentage: Number(((otherCount / cityTotal) * 100).toFixed(1)),
        });
      }

      const statusCounts = new Map<string, number>();
      for (const p of proposals as any[]) {
        const raw = String((p as any)?.status ?? "").trim().toLowerCase();
        if (!raw) continue;

        const bucket = (() => {
          if (raw === "accepted" || raw === "hired") {
            return isFullTimeProposal(p) ? "Hired (Full-time)" : "Hired (Internship)";
          }
          if (raw === "rejected") return "Rejected";
          if (raw === "interview_scheduled" || raw === "interviewed") return "Interviewed";
          if (raw === "under_review" || raw === "review" || raw === "reviewing") return "Under Review";
          if (raw === "withdrawn" || raw === "expired") return "Withdrawn";
          // includes 'sent', 'draft' etc.
          return "Applied";
        })();

        statusCounts.set(bucket, (statusCounts.get(bucket) ?? 0) + 1);
      }

      const statusColor: Record<string, string> = {
        Applied: "hsl(217, 91%, 60%)",
        "Under Review": "hsl(43, 96%, 56%)",
        Interviewed: "hsl(262, 83%, 58%)",
        "Hired (Internship)": "hsl(152, 61%, 40%)",
        "Hired (Full-time)": "hsl(262, 83%, 58%)",
        Rejected: "hsl(0, 72%, 51%)",
        Withdrawn: "hsl(215, 16%, 47%)",
      };

      const applicationStatusData = Array.from(statusCounts.entries())
        .map(([name, value]) => ({
          name,
          value,
          color: statusColor[String(name)] ?? "hsl(200, 20%, 60%)",
        }))
        .sort((a, b) => b.value - a.value);

      return res.json({
        platformMetrics: {
          totalUsers,
          activeUsers,
          totalCompanies,
          activeProjects,
          completedInternships,
          pendingApplications,
          totalRevenue: totalRevenueMajor,
          monthlyGrowth,
        },
        hiredInterns: {
          fullTime: fullTimeHiredInterns,
          internship: internshipHiredInterns,
        },
        performanceTrendsData,
        conversionAnalytics,
        highestPayingSkillsData,
        regionWiseDemandData,
        employerBehaviorAnalytics,
        rangeMeta: {
          range,
          from: range === "custom" ? (customFrom ? customFrom.toISOString().slice(0, 10) : null) : null,
          to: range === "custom" ? (customTo ? customTo.toISOString().slice(0, 10) : null) : null,
        },
        derivedMetrics: {
          avgAppsPerUser,
          placementRate,
          projectsPerCompany,
          hiresPerCompany,
          successRate,
          avgHireTimeDays,
          interviewRate,
          profileCompletionRate,
          applicationSuccessRate,
          newCompanies,
          newProjects,
          fullTimeProposalCount,
          internshipProposalCount,
        },
        monthlyTrendsData,
        weeklyActivityData,
        conversionFunnelData,
        industryDistributionData,
        skillDemandData,
        topCompanies,
        topInterns,
        geographicData: topCities,
        applicationStatusData,
      });

    } catch (error) {
      console.error("Admin reports analytics error:", error);
      return res.status(500).json({ message: "An error occurred while generating analytics" });
    }
  });

  const zInt = z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v),
    z.number().int(),
  );

  const zBool = z.preprocess(
    (v) => {
      if (typeof v === "boolean") return v;
      if (typeof v === "string") return v.toLowerCase() === "true";
      return v;
    },
    z.boolean(),
  );

  const sliderItemSchema = z.object({
    title: z.string().min(1),
    subtitle: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    ctaText: z.string().optional().nullable(),
    ctaHref: z.string().optional().nullable(),
    sortOrder: zInt.optional().default(0),
    isActive: zBool.optional().default(true),
  });

  const blogPostSchema = z.object({
    slug: z.string().min(1),
    title: z.string().min(1),
    excerpt: z.string().optional().nullable(),
    coverImageUrl: z.string().optional().nullable(),
    bannerImageUrl: z.string().optional().nullable(),
    body: z.string().min(1),
    status: z.string().min(1).default("draft"),
  });

  const featuredSkillSchema = z.object({
    title: z.string().min(1),
    iconClass: z.string().optional().nullable(),
    metaText: z.string().optional().nullable(),
    resourceCount: zInt.optional().default(0),
    href: z.string().optional().nullable(),
    sortOrder: zInt.optional().default(0),
    isActive: zBool.optional().default(true),
  });

  const happyFaceSchema = z.object({
    quote: z.string().min(1),
    title: z.string().min(1),
    name: z.string().min(1),
    company: z.string().min(1),
    avatarUrl: z.string().optional().nullable(),
    sortOrder: zInt.optional().default(0),
    isActive: zBool.optional().default(true),
  });

  const partnerSchema = z.object({
    name: z.string().min(1),
    logoUrl: z.string().min(1),
    href: z.string().optional().nullable(),
    sortOrder: zInt.optional().default(0),
    isActive: zBool.optional().default(true),
  });

  const planSchema = z.object({
    name: z.string().min(1),
    priceText: z.string().optional().nullable(),
    subtitle: z.string().optional().nullable(),
    features: z.array(z.string()).optional().default([]),
    sortOrder: zInt.optional().default(0),
    isActive: zBool.optional().default(true),
  });

  const faqSchema = z.object({
    category: z.string().min(1),
    question: z.string().min(1),
    answer: z.string().min(1),
    sortOrder: zInt.optional().default(0),
    isActive: zBool.optional().default(true),
  });

  const termsSchema = z.object({
    title: z.string().min(1),
    bodyHtml: z.string().min(1),
  });

  const internNonDisclosureClauseSchema = z.object({
    title: z.string().min(1),
    bodyHtml: z.string().min(1),
    sortOrder: zInt.optional().default(0),
    isActive: zBool.optional().default(true),
  });

  app.get("/api/admin/website/slider", requirePermission("cms:read"), async (_req, res) => {
    try {
      const items = await storage.listWebsiteSlider();
      return res.json({ items: items ?? [] });
    } catch (error) {
      console.error("Admin website slider list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching slider" });
    }
  });

  app.post("/api/admin/website/slider", requirePermission("cms:write"), async (req, res) => {
    try {
      const payload = sliderItemSchema.parse(req.body);
      const item = await storage.createWebsiteSliderItem(payload as any);
      return res.status(201).json({ item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin website slider create error:", error);
      return res.status(500).json({ message: "An error occurred while creating slider item" });
    }
  });

  app.put("/api/admin/website/slider/:id", requirePermission("cms:write"), async (req, res) => {
    try {
      const payload = sliderItemSchema.partial().parse(req.body);
      const item = await storage.updateWebsiteSliderItem(req.params.id, payload as any);
      if (!item) return res.status(404).json({ message: "Slider item not found" });
      return res.json({ item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin website slider update error:", error);
      return res.status(500).json({ message: "An error occurred while updating slider item" });
    }
  });

  app.delete("/api/admin/website/slider/:id", requirePermission("cms:write"), async (req, res) => {
    try {
      await storage.deleteWebsiteSliderItem(req.params.id);
      return res.status(204).send();
    } catch (error) {
      console.error("Admin website slider delete error:", error);
      return res.status(500).json({ message: "An error occurred while deleting slider item" });
    }
  });

  app.get("/api/admin/website/blogs", requirePermission("cms:read"), async (_req, res) => {
    try {
      const posts = await storage.listWebsiteBlogPosts();
      return res.json({ posts: posts ?? [] });
    } catch (error) {
      console.error("Admin website blogs list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching blog posts" });
    }
  });

  app.post("/api/admin/website/blogs", requirePermission("cms:write"), async (req, res) => {
    try {
      const payload = blogPostSchema.parse(req.body);
      const post = await storage.createWebsiteBlogPost(payload as any);
      return res.status(201).json({ post });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin website blogs create error:", error);
      return res.status(500).json({ message: "An error occurred while creating blog post" });
    }
  });

  app.put("/api/admin/website/blogs/:id", requirePermission("cms:write"), async (req, res) => {
    try {
      const payload = blogPostSchema.partial().parse(req.body);
      const post = await storage.updateWebsiteBlogPost(req.params.id, payload as any);
      if (!post) return res.status(404).json({ message: "Blog post not found" });
      return res.json({ post });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin website blogs update error:", error);
      return res.status(500).json({ message: "An error occurred while updating blog post" });
    }
  });

  app.delete("/api/admin/website/blogs/:id", requirePermission("cms:write"), async (req, res) => {
    try {
      await storage.deleteWebsiteBlogPost(req.params.id);
      return res.status(204).send();
    } catch (error) {
      console.error("Admin website blogs delete error:", error);
      return res.status(500).json({ message: "An error occurred while deleting blog post" });
    }
  });

  app.get("/api/admin/website/skills", requirePermission("cms:read"), async (_req, res) => {
    try {
      const items = await storage.listWebsiteFeaturedSkills();
      return res.json({ items: items ?? [] });
    } catch (error) {
      console.error("Admin website skills list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching featured skills" });
    }
  });

  app.post("/api/admin/website/skills", requirePermission("cms:write"), async (req, res) => {
    try {
      const payload = featuredSkillSchema.parse(req.body);
      const item = await storage.createWebsiteFeaturedSkill(payload as any);
      return res.status(201).json({ item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin website skills create error:", error);
      return res.status(500).json({ message: "An error occurred while creating featured skill" });
    }
  });

  app.put("/api/admin/website/skills/:id", async (req, res) => {
    try {
      const payload = featuredSkillSchema.partial().parse(req.body);
      const item = await storage.updateWebsiteFeaturedSkill(req.params.id, payload as any);
      if (!item) return res.status(404).json({ message: "Featured skill not found" });
      return res.json({ item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin website skills update error:", error);
      return res.status(500).json({ message: "An error occurred while updating featured skill" });
    }
  });

  app.delete("/api/admin/website/skills/:id", async (req, res) => {
    try {
      await storage.deleteWebsiteFeaturedSkill(req.params.id);
      return res.status(204).send();
    } catch (error) {
      console.error("Admin website skills delete error:", error);
      return res.status(500).json({ message: "An error occurred while deleting featured skill" });
    }
  });

  app.get("/api/admin/website/faces", requirePermission("cms:read"), async (_req, res) => {
    try {
      const items = await storage.listWebsiteHappyFaces();
      return res.json({ items: items ?? [] });
    } catch (error) {
      console.error("Admin website faces list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching happy faces" });
    }
  });

  app.post("/api/admin/website/faces", requirePermission("cms:write"), async (req, res) => {
    try {
      const payload = happyFaceSchema.parse(req.body);
      const item = await storage.createWebsiteHappyFace(payload as any);
      return res.status(201).json({ item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin website faces create error:", error);
      return res.status(500).json({ message: "An error occurred while creating happy face" });
    }
  });

  app.put("/api/admin/website/faces/:id", async (req, res) => {
    try {
      const payload = happyFaceSchema.partial().parse(req.body);
      const item = await storage.updateWebsiteHappyFace(req.params.id, payload as any);
      if (!item) return res.status(404).json({ message: "Happy face not found" });
      return res.json({ item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin website faces update error:", error);
      return res.status(500).json({ message: "An error occurred while updating happy face" });
    }
  });

  app.delete("/api/admin/website/faces/:id", async (req, res) => {
    try {
      await storage.deleteWebsiteHappyFace(req.params.id);
      return res.status(204).send();
    } catch (error) {
      console.error("Admin website faces delete error:", error);
      return res.status(500).json({ message: "An error occurred while deleting happy face" });
    }
  });

  app.get("/api/admin/website/partners", requirePermission("cms:read"), async (_req, res) => {
    try {
      const items = await storage.listWebsitePartners();
      return res.json({ items: items ?? [] });
    } catch (error) {
      console.error("Admin website partners list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching partners" });
    }
  });

  app.post("/api/admin/website/partners", requirePermission("cms:write"), async (req, res) => {
    try {
      const payload = partnerSchema.parse(req.body);
      const item = await storage.createWebsitePartner(payload as any);
      return res.status(201).json({ item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin website partners create error:", error);
      return res.status(500).json({ message: "An error occurred while creating partner" });
    }
  });

  app.put("/api/admin/website/partners/:id", async (req, res) => {
    try {
      const payload = partnerSchema.partial().parse(req.body);
      const item = await storage.updateWebsitePartner(req.params.id, payload as any);
      if (!item) return res.status(404).json({ message: "Partner not found" });
      return res.json({ item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin website partners update error:", error);
      return res.status(500).json({ message: "An error occurred while updating partner" });
    }
  });

  app.delete("/api/admin/website/partners/:id", async (req, res) => {
    try {
      await storage.deleteWebsitePartner(req.params.id);
      return res.status(204).send();
    } catch (error) {
      console.error("Admin website partners delete error:", error);
      return res.status(500).json({ message: "An error occurred while deleting partner" });
    }
  });

  app.get("/api/admin/website/plans", requirePermission("cms:read"), async (_req, res) => {
    try {
      const items = await storage.listWebsitePlans();
      return res.json({ items: items ?? [] });
    } catch (error) {
      console.error("Admin website plans list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching plans" });
    }
  });

  app.post("/api/admin/website/plans", requirePermission("cms:write"), async (req, res) => {
    try {
      const payload = planSchema.parse(req.body);
      const item = await storage.createWebsitePlan(payload as any);
      return res.status(201).json({ item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin website plans create error:", error);
      return res.status(500).json({ message: "An error occurred while creating plan" });
    }
  });

  app.put("/api/admin/website/plans/:id", async (req, res) => {
    try {
      const payload = planSchema.partial().parse(req.body);
      const item = await storage.updateWebsitePlan(req.params.id, payload as any);
      if (!item) return res.status(404).json({ message: "Plan not found" });
      return res.json({ item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin website plans update error:", error);
      return res.status(500).json({ message: "An error occurred while updating plan" });
    }
  });

  app.delete("/api/admin/website/plans/:id", async (req, res) => {
    try {
      await storage.deleteWebsitePlan(req.params.id);
      return res.status(204).send();
    } catch (error) {
      console.error("Admin website plans delete error:", error);
      return res.status(500).json({ message: "An error occurred while deleting plan" });
    }
  });

  app.get("/api/admin/website/faq", requirePermission("cms:read"), async (_req, res) => {
    try {
      const items = await storage.listWebsiteFaqs();
      return res.json({ items: items ?? [] });
    } catch (error) {
      console.error("Admin website FAQ list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching FAQ" });
    }
  });

  app.post("/api/admin/website/faq", requirePermission("cms:write"), async (req, res) => {
    try {
      const payload = faqSchema.parse(req.body);
      const item = await storage.createWebsiteFaq(payload as any);
      return res.status(201).json({ item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin website FAQ create error:", error);
      return res.status(500).json({ message: "An error occurred while creating FAQ item" });
    }
  });

  app.put("/api/admin/website/faq/:id", async (req, res) => {
    try {
      const payload = faqSchema.partial().parse(req.body);
      const item = await storage.updateWebsiteFaq(req.params.id, payload as any);
      if (!item) return res.status(404).json({ message: "FAQ item not found" });
      return res.json({ item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin website FAQ update error:", error);
      return res.status(500).json({ message: "An error occurred while updating FAQ item" });
    }
  });

  app.delete("/api/admin/website/faq/:id", async (req, res) => {
    try {
      await storage.deleteWebsiteFaq(req.params.id);
      return res.status(204).send();
    } catch (error) {
      console.error("Admin website FAQ delete error:", error);
      return res.status(500).json({ message: "An error occurred while deleting FAQ item" });
    }
  });

  app.get("/api/admin/website/terms", requirePermission("cms:read"), async (_req, res) => {
    try {
      const terms = await storage.getWebsiteTerms();
      return res.json({ terms: terms ?? null });
    } catch (error) {
      console.error("Admin website terms get error:", error);
      return res.status(500).json({ message: "An error occurred while fetching terms" });
    }
  });

  app.put("/api/admin/website/terms", requirePermission("cms:write"), async (req, res) => {
    try {
      const payload = termsSchema.parse(req.body);
      const terms = await storage.setWebsiteTerms({
        title: payload.title,
        bodyHtml: payload.bodyHtml,
      } as any);
      return res.json({ terms });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin website terms set error:", error);
      return res.status(500).json({ message: "An error occurred while saving terms" });
    }
  });

  app.get("/api/admin/intern/terms", requirePermission("interns:read"), async (_req, res) => {
    try {
      const terms = await storage.getInternTerms();
      return res.json({ terms: terms ?? null });
    } catch (error) {
      console.error("Admin intern terms get error:", error);
      return res.status(500).json({ message: "An error occurred while fetching terms" });
    }
  });

  app.get("/api/intern/terms", async (_req, res) => {
    try {
      const terms = await storage.getInternTerms();
      return res.json({ terms: terms ?? null });
    } catch (error) {
      console.error("Intern terms get error:", error);
      return res.status(500).json({ message: "An error occurred while fetching terms" });
    }
  });

  app.get("/api/intern/non-disclosure", async (_req, res) => {
    try {
      const items = await storage.listInternNonDisclosureClauses();
      const primary = (items ?? [])
        .filter((i) => i.isActive)
        .sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return String(a.title).localeCompare(String(b.title));
        })[0];

      if (!primary) return res.json({ terms: null });

      return res.json({ terms: { title: primary.title, bodyHtml: primary.bodyHtml } });
    } catch (error) {
      console.error("Intern non-disclosure get error:", error);
      return res.status(500).json({ message: "An error occurred while fetching non-disclosure" });
    }
  });

  app.put("/api/admin/intern/terms", requirePermission("interns:write"), async (req, res) => {
    try {
      const payload = termsSchema.parse(req.body);
      const terms = await storage.setInternTerms({
        title: payload.title,
        bodyHtml: payload.bodyHtml,
      } as any);
      return res.json({ terms });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin intern terms set error:", error);
      return res.status(500).json({ message: "An error occurred while saving terms" });
    }
  });

  app.get("/api/admin/intern/non-disclosure-clauses", requirePermission("interns:read"), async (_req, res) => {
    try {
      const items = await storage.listInternNonDisclosureClauses();
      return res.json({ items: items ?? [] });
    } catch (error) {
      console.error("Admin intern non-disclosure clauses list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching clauses" });
    }
  });

  app.post("/api/admin/intern/non-disclosure-clauses", async (req, res) => {
    try {
      const payload = internNonDisclosureClauseSchema.parse(req.body);
      const item = await storage.createInternNonDisclosureClause({
        title: payload.title,
        bodyHtml: payload.bodyHtml,
        sortOrder: payload.sortOrder,
        isActive: payload.isActive,
      } as any);
      return res.status(201).json({ item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin intern non-disclosure clause create error:", error);
      return res.status(500).json({ message: "An error occurred while creating clause" });
    }
  });

  app.put("/api/admin/intern/non-disclosure-clauses/:id", requirePermission("interns:write"), async (req, res) => {
    try {
      const id = String(req.params.id ?? "").trim();
      if (!id) return res.status(400).json({ message: "id is required" });
      const payload = internNonDisclosureClauseSchema.partial().parse(req.body);
      const item = await storage.updateInternNonDisclosureClause(id, payload as any);
      if (!item) return res.status(404).json({ message: "Clause not found" });
      return res.json({ item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin intern non-disclosure clause update error:", error);
      return res.status(500).json({ message: "An error occurred while updating clause" });
    }
  });

  app.delete("/api/admin/intern/non-disclosure-clauses/:id", requirePermission("interns:write"), async (req, res) => {
    try {
      const id = String(req.params.id ?? "").trim();
      if (!id) return res.status(400).json({ message: "id is required" });
      await storage.deleteInternNonDisclosureClause(id);
      return res.status(204).send();
    } catch (error) {
      console.error("Admin intern non-disclosure clause delete error:", error);
      return res.status(500).json({ message: "An error occurred while deleting clause" });
    }
  });

  app.get("/api/admin/company/terms", requirePermission("companies:read"), async (_req, res) => {
    try {
      const terms = await storage.getEmployerTerms();
      return res.json({ terms: terms ?? null });
    } catch (error) {
      console.error("Admin company terms get error:", error);
      return res.status(500).json({ message: "An error occurred while fetching terms" });
    }
  });

  app.put("/api/admin/company/terms", requirePermission("companies:write"), async (req, res) => {
    try {
      const payload = termsSchema.parse(req.body);
      const terms = await storage.setEmployerTerms({
        title: payload.title,
        bodyHtml: payload.bodyHtml,
      } as any);
      return res.json({ terms });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin company terms set error:", error);
      return res.status(500).json({ message: "An error occurred while saving terms" });
    }
  });

  app.get(
    "/api/admin/contact/messages",
    requireAnyPermission(["contact:intern:read", "contact:employer:read"]),
    async (req, res) => {
    try {
      const limitRaw = String(req.query.limit ?? "").trim();
      const limit = limitRaw ? Number(limitRaw) : undefined;
      const perms = await resolveAdminPermissions(req);
      const allowIntern = hasPermission(perms, "contact:intern:read");
      const allowEmployer = hasPermission(perms, "contact:employer:read");

      const itemsRaw = await storage.listContactMessages(
        typeof limit === "number" && Number.isFinite(limit) ? limit : undefined,
      );

      const items = (itemsRaw ?? []).filter((m: any) => {
        const bucket = contactQueryTypeBucket((m as any)?.queryType);
        if (bucket === "intern") return allowIntern;
        return allowEmployer;
      });

      return res.json({ items });
    } catch (error) {
      console.error("Admin contact messages list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching contact messages" });
    }
  });

  app.put(
    "/api/admin/contact/messages/:id/read",
    async (req, res) => {
    try {
      const id = String(req.params.id ?? "").trim();
      if (!id) return res.status(400).json({ message: "id is required" });

      const perms = await resolveAdminPermissions(req);
      const message = await storage.getContactMessage(id);
      if (!message) return res.status(404).json({ message: "Message not found" });

      const bucket = contactQueryTypeBucket((message as any)?.queryType);
      const needed = bucket === "intern" ? "contact:intern:write" : "contact:employer:write";
      if (!hasPermission(perms, needed)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const isRead = z.object({ isRead: z.boolean() }).parse(req.body).isRead;
      const item = await storage.markContactMessageRead(id, isRead);
      if (!item) return res.status(404).json({ message: "Message not found" });
      return res.json({ item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin contact message read toggle error:", error);
      return res.status(500).json({ message: "An error occurred while updating message" });
    }
  });

  app.delete(
    "/api/admin/contact/messages/:id",
    async (req, res) => {
    try {
      const id = String(req.params.id ?? "").trim();
      if (!id) return res.status(400).json({ message: "id is required" });

      const perms = await resolveAdminPermissions(req);
      const message = await storage.getContactMessage(id);
      if (!message) return res.status(404).json({ message: "Message not found" });

      const bucket = contactQueryTypeBucket((message as any)?.queryType);
      const needed = bucket === "intern" ? "contact:intern:write" : "contact:employer:write";
      if (!hasPermission(perms, needed)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteContactMessage(id);
      return res.status(204).send();
    } catch (error) {
      console.error("Admin contact message delete error:", error);
      return res.status(500).json({ message: "An error occurred while deleting message" });
    }
  });

  app.get("/api/admin/proposals-tracker", requirePermission("interns:read"), async (_req, res) => {
    try {
      const [proposals, interviews, users, projects, employers] = await Promise.all([
        storage.getAllProposals(),
        storage.getAllInterviews(),
        storage.getUsers(),
        storage.getAllProjects(),
        storage.getEmployers(),
      ]);

      const excludedEmployerIds = new Set<string>();
      for (const e of employers as any[]) {
        const id = String(e?.id ?? "").trim();
        if (!id) continue;
        if (id.toLowerCase() === "admin") {
          excludedEmployerIds.add(id.toLowerCase());
          continue;
        }
        const email = String(e?.companyEmail ?? "").trim().toLowerCase();
        if (email === "ai-interview@findtern.ai") excludedEmployerIds.add(id.toLowerCase());
      }

      const filteredInterviews = (interviews as any[]).filter((i) => {
        const employerId = String(i?.employerId ?? i?.employer_id ?? "").trim().toLowerCase();
        return !excludedEmployerIds.has(employerId);
      });

      const filteredProposals = (proposals as any[]).filter((p) => {
        const employerId = String(p?.employerId ?? p?.employer_id ?? "").trim().toLowerCase();
        return !excludedEmployerIds.has(employerId);
      });

      const internUsersById = new Map<string, any>();
      for (const u of users as any[]) {
        if (String(u?.role ?? "").toLowerCase() === "intern") {
          const { password, ...safeUser } = u;
          internUsersById.set(String(u.id), safeUser);
        }
      }

      const employersById = new Map<string, any>();
      for (const e of employers as any[]) {
        const { password, ...safeEmployer } = e;
        employersById.set(String(e.id), safeEmployer);
      }

      const projectsById = new Map<string, any>();
      for (const p of projects as any[]) {
        projectsById.set(String(p.id), p);
      }

      return res.json({
        proposals: filteredProposals,
        interviews: filteredInterviews,
        interns: Array.from(internUsersById.values()),
        employers: Array.from(employersById.values()),
        projects: Array.from(projectsById.values()),
      });
    } catch (e: any) {
      console.error("Failed to load proposals tracker data", e);
      return res.status(500).json({ message: e.message || "Failed to load tracker data" });
    }
  });

  app.get("/api/admin/interns", requirePermission("interns:read"), async (_req, res) => {
    try {
      const [onboardingList, users, interviews, proposals, projects, payouts] = await Promise.all([
        storage.getAllInternOnboarding(),
        storage.getUsers(),
        storage.getAllInterviews(),
        storage.getAllProposals(),
        storage.getAllProjects(),
        storage.listAllInternPayouts({ limit: 20000 }).catch(() => []),
      ]);

      const internUsersById = new Map<string, any>();
      for (const u of users as any[]) {
        const id = String(u?.id ?? "").trim();
        if (!id) continue;
        const role = String(u?.role ?? "intern").trim().toLowerCase();
        if (role !== "intern") continue;
        const { password, ...safeUser } = u as any;
        internUsersById.set(id, safeUser);
      }

      const projectsById = new Map<string, any>();
      for (const p of projects as any[]) {
        const id = String(p?.id ?? "").trim();
        if (id) projectsById.set(id, p);
      }

      const pickNewer = (a: any, b: any) => {
        const aRaw = a?.updatedAt ?? a?.updated_at ?? a?.createdAt ?? a?.created_at ?? null;
        const bRaw = b?.updatedAt ?? b?.updated_at ?? b?.createdAt ?? b?.created_at ?? null;
        const aT = aRaw ? new Date(aRaw).getTime() : 0;
        const bT = bRaw ? new Date(bRaw).getTime() : 0;
        return bT >= aT ? b : a;
      };

      const latestInterviewByInternId = new Map<string, any>();
      for (const i of interviews as any[]) {
        const internId = String(i?.internId ?? i?.intern_id ?? "").trim();
        if (!internId) continue;
        const existing = latestInterviewByInternId.get(internId);
        latestInterviewByInternId.set(internId, existing ? pickNewer(existing, i) : i);
      }

      const pendingInterviewCountByInternId = new Map<string, number>();
      const totalInterviewCountByInternId = new Map<string, number>();
      const interviewSentCountByInternId = new Map<string, number>();
      const interviewScheduledCountByInternId = new Map<string, number>();
      const interviewCompletedCountByInternId = new Map<string, number>();
      const interviewExpiredCountByInternId = new Map<string, number>();

      for (const i of interviews as any[]) {
        const internId = String(i?.internId ?? i?.intern_id ?? "").trim();
        if (!internId) continue;
        const status = String(i?.status ?? "").trim().toLowerCase();
        
        totalInterviewCountByInternId.set(internId, (totalInterviewCountByInternId.get(internId) ?? 0) + 1);

        if (status === "pending") {
          pendingInterviewCountByInternId.set(internId, (pendingInterviewCountByInternId.get(internId) ?? 0) + 1);
        }
        if (status === "sent") {
          interviewSentCountByInternId.set(internId, (interviewSentCountByInternId.get(internId) ?? 0) + 1);
        }
        if (status === "scheduled") {
          interviewScheduledCountByInternId.set(internId, (interviewScheduledCountByInternId.get(internId) ?? 0) + 1);
        }
        if (status === "completed") {
          interviewCompletedCountByInternId.set(internId, (interviewCompletedCountByInternId.get(internId) ?? 0) + 1);
        }
        if (status === "expired") {
          interviewExpiredCountByInternId.set(internId, (interviewExpiredCountByInternId.get(internId) ?? 0) + 1);
        }
      }

      const pendingProposalCountByInternId = new Map<string, number>();
      for (const p of proposals as any[]) {
        const internId = String(p?.internId ?? p?.intern_id ?? "").trim();
        if (!internId) continue;
        const status = String(p?.status ?? "").trim().toLowerCase();
        const isPending = status === "sent" || status === "pending";
        if (!isPending) continue;
        pendingProposalCountByInternId.set(internId, (pendingProposalCountByInternId.get(internId) ?? 0) + 1);
      }

      const latestAcceptedProposalByInternId = new Map<string, any>();
      for (const p of proposals as any[]) {
        const internId = String(p?.internId ?? p?.intern_id ?? "").trim();
        if (!internId) continue;
        const status = String(p?.status ?? "").trim().toLowerCase();
        if (status !== "accepted") continue;
        const existing = latestAcceptedProposalByInternId.get(internId);
        latestAcceptedProposalByInternId.set(internId, existing ? pickNewer(existing, p) : p);
      }

      const latestProposalByInternId = new Map<string, any>();
      for (const p of proposals as any[]) {
        const internId = String(p?.internId ?? p?.intern_id ?? "").trim();
        if (!internId) continue;
        const existing = latestProposalByInternId.get(internId);
        latestProposalByInternId.set(internId, existing ? pickNewer(existing, p) : p);
      }

      const latestHiredProposalByInternId = new Map<string, any>();
      for (const p of proposals as any[]) {
        const internId = String(p?.internId ?? p?.intern_id ?? "").trim();
        if (!internId) continue;
        const status = String(p?.status ?? "").trim().toLowerCase();
        if (status !== "hired") continue;
        const existing = latestHiredProposalByInternId.get(internId);
        latestHiredProposalByInternId.set(internId, existing ? pickNewer(existing, p) : p);
      }

      const payoutAggByInternId = new Map<
        string,
        {
          pendingSumMinor: number;
          pendingCount: number;
          paidSumMinor: number;
          totalCount: number;
          upcomingAmountMinor: number;
          upcomingCreatedAt: string | null;
        }
      >();

      for (const row of (Array.isArray(payouts) ? payouts : []) as any[]) {
        const internId = String(row?.internId ?? row?.intern_id ?? "").trim();
        if (!internId) continue;

        const status = String(row?.status ?? "").trim().toLowerCase();
        const currency = String(row?.currency ?? "INR").trim().toUpperCase();

        const amountMinor = Number(row?.amountMinor ?? row?.amount_minor ?? 0);
        const safeAmount = Number.isFinite(amountMinor) ? Math.max(0, Math.floor(amountMinor)) : 0;
        
        // Convert to INR minor (paise) for consistent aggregation.
        // Assuming USD_TO_INR_RATE = 100 as per common practice in this file.
        const inrAmountMinor = currency === "USD" ? safeAmount * 100 : safeAmount;

        const createdRaw = row?.createdAt ?? row?.created_at ?? null;
        const createdAt = createdRaw ? new Date(createdRaw) : null;
        const createdIso = createdAt && Number.isFinite(createdAt.getTime()) ? createdAt.toISOString() : null;

        const existing = payoutAggByInternId.get(internId) ?? {
          pendingSumMinor: 0,
          pendingCount: 0,
          paidSumMinor: 0,
          totalCount: 0,
          upcomingAmountMinor: 0,
          upcomingCreatedAt: null,
        };

        existing.totalCount += 1;

        if (status === "paid") {
          existing.paidSumMinor += inrAmountMinor;
        }

        if (status === "pending") {
          existing.pendingSumMinor += inrAmountMinor;
          existing.pendingCount += 1;

          const existingUpcomingT = existing.upcomingCreatedAt ? new Date(existing.upcomingCreatedAt).getTime() : null;
          const thisT = createdAt && Number.isFinite(createdAt.getTime()) ? createdAt.getTime() : null;

          if (existingUpcomingT === null || (thisT !== null && thisT < existingUpcomingT)) {
            existing.upcomingAmountMinor = inrAmountMinor;
            existing.upcomingCreatedAt = createdIso;
          }
        }

        payoutAggByInternId.set(internId, existing);
      }

      const parseDateOnly = (raw: unknown) => {
        const value = String(raw ?? "").trim();
        const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return null;
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const d = Number(m[3]);
        if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
        const dt = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0));
        return Number.isNaN(dt.getTime()) ? null : dt;
      };

      const addMonths = (dt: Date, months: number) => {
        const base = new Date(dt.getTime());
        const y = base.getUTCFullYear();
        const m = base.getUTCMonth();
        const day = base.getUTCDate();
        const targetMonth = m + months;
        const firstOfTarget = new Date(Date.UTC(y, targetMonth, 1, 0, 0, 0));
        const daysInTargetMonth = new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0)).getUTCDate();
        const safeDay = Math.min(day, daysInTargetMonth);
        return new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth(), safeDay, 0, 0, 0));
      };

      const isMeaningfulOnboarding = (o: any) => {
        if (!o) return false;
        const linkedinUrl = String(o?.linkedinUrl ?? o?.linkedin_url ?? "").trim();
        if (linkedinUrl) return true;
        const bio = String(o?.bio ?? "").trim();
        if (bio) return true;
        const previewSummary = String(o?.previewSummary ?? o?.preview_summary ?? "").trim();
        if (previewSummary) return true;
        const city = String(o?.city ?? "").trim();
        const state = String(o?.state ?? "").trim();
        const pinCode = String(o?.pinCode ?? o?.pin_code ?? "").trim();
        if (city || state || pinCode) return true;
        const skills = Array.isArray(o?.skills) ? o.skills : [];
        if (skills.length > 0) return true;
        const locationTypes = Array.isArray(o?.locationTypes) ? o.locationTypes : [];
        const preferredLocations = Array.isArray(o?.preferredLocations) ? o.preferredLocations : [];
        if (locationTypes.length > 0 || preferredLocations.length > 0) return true;
        const experienceJson = Array.isArray(o?.experienceJson) ? o.experienceJson : [];
        if (experienceJson.length > 0) return true;
        if (typeof o?.hasLaptop === "boolean") return true;
        const extra = o?.extraData ?? o?.extra_data ?? {};
        const bankDetails = extra?.bankDetails ?? extra?.bank_details ?? {};
        const hasBank =
          Boolean(String(bankDetails?.accountNumber ?? "").trim()) ||
          Boolean(String(bankDetails?.upiId ?? "").trim());
        if (hasBank) return true;
        return false;
      };

      const onboardingByUserId = new Map<string, any>();
      for (const o of onboardingList as any[]) {
        const id = String(o?.userId ?? o?.user_id ?? "").trim();
        if (id) onboardingByUserId.set(id, o);
      }

      const enriched = Array.from(internUsersById.values())
        .map((user) => {
          const internId = String(user?.id ?? "").trim();
          if (!internId) return null;

          const onboarding = onboardingByUserId.get(internId) ?? null;

          const latestInterviewRaw = latestInterviewByInternId.get(internId) ?? null;
          const latestInterview = latestInterviewRaw ? serializeInterview(latestInterviewRaw) : null;

          const extra = (onboarding as any)?.extraData ?? {};
          const isProfileComplete = isMeaningfulOnboarding(onboarding);
          const openToWork = extra?.openToWork;
          const liveStatus = typeof openToWork === "boolean" ? (openToWork ? "Live" : "Hidden") : "Live";

          const paid = Boolean(extra?.payment?.isPaid);
          const paymentStatus = paid ? "Paid" : "Unpaid";

          const onboardingStatus = (() => {
            const explicit = (extra as any)?.onboardingStatus;
            if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
            const explicitBool = (extra as any)?.isOnboarded;
            if (typeof explicitBool === "boolean") return explicitBool ? "Onboarded" : "Not onboarded";
            const isPaid = Boolean(extra?.payment?.isPaid);
            return isPaid ? "Onboarded" : "Not onboarded";
          })();

          const payoutAgg = payoutAggByInternId.get(internId) ?? {
            pendingSumMinor: 0,
            pendingCount: 0,
            paidSumMinor: 0,
            totalCount: 0,
            upcomingAmountMinor: 0,
            upcomingCreatedAt: null,
          };

          const hired = latestHiredProposalByInternId.get(internId) ?? null;
          const accepted = latestAcceptedProposalByInternId.get(internId) ?? null;
          const latestProposal = latestProposalByInternId.get(internId) ?? null;

          const offerSource = hired ?? accepted;
          const offerDetails = offerSource ? ((offerSource as any)?.offerDetails ?? (offerSource as any)?.offer_details ?? {}) : {};
          const offerCurrency = (() => {
            const cur = String((offerSource as any)?.currency ?? (offerDetails as any)?.currency ?? "INR")
              .trim()
              .toUpperCase();
            return cur === "USD" ? "USD" : "INR";
          })();
          const startDate = offerDetails
            ? parseDateOnly((offerDetails as any)?.startDate ?? (offerDetails as any)?.start_date)
            : null;
          const monthsFromDuration = (duration: unknown) => {
            switch (String(duration ?? "").trim().toLowerCase()) {
              case "2m":
                return 2;
              case "3m":
                return 3;
              case "6m":
                return 6;
              default:
                return 1;
            }
          };
          const monthlyMajorRaw = Number((offerDetails as any)?.monthlyAmount ?? (offerDetails as any)?.monthly_amount ?? 0);
          const monthlyMajor = Number.isFinite(monthlyMajorRaw) ? Math.max(0, monthlyMajorRaw) : 0;
          let employerMonthlyMinor = Math.round(monthlyMajor * 100);
          let internMonthlyMinor = Math.round(employerMonthlyMinor * 0.5);

          // Convert to INR paise if the offer is in USD
          if (offerCurrency === "USD") {
            employerMonthlyMinor = Math.round(employerMonthlyMinor * 100);
            internMonthlyMinor = Math.round(internMonthlyMinor * 100);
          }

          const totalPlannedMinor = (() => {
            if (!offerSource || !Number.isFinite(internMonthlyMinor) || internMonthlyMinor <= 0) return null;
            const totalMonths = Math.max(1, monthsFromDuration((offerDetails as any)?.duration));
            return Math.max(0, Math.floor(internMonthlyMinor * totalMonths));
          })();
          const leftToPayMinor = (() => {
            if (totalPlannedMinor === null) return null;
            const paidMinor = Math.max(0, Number(payoutAgg.paidSumMinor ?? 0) || 0);
            return Math.max(0, totalPlannedMinor - paidMinor);
          })();

          const scheduledAgg = (() => {
            if (!offerSource || !startDate || !Number.isFinite(internMonthlyMinor) || internMonthlyMinor <= 0) return null;

            const paidMonths = Math.floor((Number(payoutAgg.paidSumMinor ?? 0) || 0) / internMonthlyMinor);
            const totalMonths = Math.max(1, monthsFromDuration((offerDetails as any)?.duration));
            if (paidMonths >= totalMonths) {
              return {
                nextDueIso: null as string | null,
                computedToPayMinor: 0,
                upcomingAmountMinor: 0,
              };
            }

            // Month-wise due date on the same day as the start date:
            // Start: 2026-02-11 => 1st due: 2026-03-11
            // After paying 1 month => 2026-04-11, and so on.
            const nextDueAt = addMonths(startDate, Math.max(0, paidMonths + 1));
            const nextDueIso = nextDueAt.toISOString();

            const now = new Date();
            const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));

            const dueCount = (() => {
              if (todayUtc.getTime() < startDate.getTime()) return 0;
              const yDiff = todayUtc.getUTCFullYear() - startDate.getUTCFullYear();
              const mDiff = todayUtc.getUTCMonth() - startDate.getUTCMonth();
              let months = yDiff * 12 + mDiff;
              const dueThisMonth = todayUtc.getUTCDate() >= startDate.getUTCDate();
              months += dueThisMonth ? 1 : 0;
              return Math.max(0, months);
            })();

            const expectedDueMinor = dueCount * internMonthlyMinor;
            const paidMinor = Math.max(0, Number(payoutAgg.paidSumMinor ?? 0) || 0);
            const computedToPayMinor = Math.max(0, expectedDueMinor - paidMinor);

            return {
              nextDueIso,
              computedToPayMinor,
              upcomingAmountMinor: employerMonthlyMinor,
            };
          })();

          const payoutAggFinal = (() => {
            if (!scheduledAgg) {
              return {
                ...payoutAgg,
                upcomingDueAt: null as string | null,
                pendingSumMinor: payoutAgg.pendingSumMinor ?? 0,
              };
            }

            // Completed: all months are already paid.
            if (!scheduledAgg.nextDueIso) {
              const pendingSumMinor = Number(payoutAgg.pendingSumMinor ?? 0) || 0;
              const derivedToPay = Number(scheduledAgg.computedToPayMinor ?? 0) || 0;
              const finalToPay = Math.max(0, Math.max(pendingSumMinor, derivedToPay));
              return {
                ...payoutAgg,
                pendingSumMinor: finalToPay,
                upcomingAmountMinor: 0,
                upcomingDueAt: null as string | null,
              };
            }

            const pendingSumMinor = Number(payoutAgg.pendingSumMinor ?? 0) || 0;
            const derivedToPay = scheduledAgg.computedToPayMinor;
            const finalToPay = Math.max(pendingSumMinor, derivedToPay, internMonthlyMinor);
            const upcomingAmountMinor = scheduledAgg.upcomingAmountMinor;

            return {
              ...payoutAgg,
              pendingSumMinor: finalToPay,
              upcomingAmountMinor,
              upcomingDueAt: scheduledAgg.nextDueIso,
            };
          })();

          const hiredProjectId = hired
            ? String((hired as any)?.projectId ?? (hired as any)?.project_id ?? "").trim()
            : "";
          const hiredProject = hiredProjectId ? projectsById.get(hiredProjectId) ?? null : null;
          const projectStatus = String(hiredProject?.status ?? "").trim().toLowerCase();
          const internshipStatus = hired
            ? projectStatus === "completed"
              ? "Completed"
              : "Ongoing"
            : "-";

          const offerStatus = (() => {
            const statusRaw = String((latestProposal as any)?.status ?? "").trim().toLowerCase();
            if (!statusRaw) return "-";
            if (statusRaw === "rejected") return "Rejected";
            if (statusRaw === "accepted") return "Accepted";
            if (statusRaw === "hired") return "Hired";
            if (statusRaw === "sent") return "Sent";
            if (statusRaw === "draft") return "Draft";
            if (statusRaw === "interview_scheduled") return "Interview scheduled";
            return statusRaw;
          })();

          return {
            user,
            onboarding,
            latestInterview,
            liveStatus,
            isProfileComplete,
            paymentStatus,
            internshipStatus,
            onboardingStatus,
            offerCurrency,
            offerStatus,
            payoutAgg: payoutAggFinal,
            payoutTotals: {
              totalPlannedMinor,
              leftToPayMinor,
            },
            pendingProposalCount: pendingProposalCountByInternId.get(internId) ?? 0,
            pendingInterviewCount: pendingInterviewCountByInternId.get(internId) ?? 0,
            totalInterviewCount: totalInterviewCountByInternId.get(internId) ?? 0,
            interviewSentCount: interviewSentCountByInternId.get(internId) ?? 0,
            interviewScheduledCount: interviewScheduledCountByInternId.get(internId) ?? 0,
            interviewCompletedCount: interviewCompletedCountByInternId.get(internId) ?? 0,
            interviewExpiredCount: interviewExpiredCountByInternId.get(internId) ?? 0,
          };
        })
        .filter(Boolean);

      return res.json({ interns: enriched });
    } catch (error) {
      console.error("Admin interns list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching interns" });
    }
  });

  app.get("/api/admin/interns/ratings/sample", async (_req, res) => {
    const header = [
      "email",
      "communication",
      "coding",
      "aptitude",
      "ai interview",
      "findternScore",
    ];

    const rows = [
      {
        email: "intern@example.com",
        communication: 8,
        coding: 7,
        aptitude: 6,
        "ai interview": 7,
        findternScore: 7,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(rows, { header });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ratings");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="intern-skill-ratings-sample.xlsx"',
    );
    return res.status(200).send(buf);
  });

  app.post(
    "/api/admin/interns/ratings/upload",
    adminUpload.single("file"),
    async (req, res) => {
      try {
        const file = (req as any).file as Express.Multer.File | undefined;
        if (!file?.buffer) {
          return res.status(400).json({ message: "file is required" });
        }

        const workbook = XLSX.read(file.buffer, { type: "buffer" });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          return res.status(400).json({ message: "No sheets found in file" });
        }
        const ws = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];

        const failures: Array<{ row: number; email?: string; reason: string }> = [];
        let updatedCount = 0;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i] ?? {};
          const email = String(row.email ?? row.Email ?? "").trim().toLowerCase();
          if (!email) {
            failures.push({ row: i + 2, reason: "Missing email" });
            continue;
          }

          const user = await storage.getUserByEmail(email);
          if (!user) {
            failures.push({ row: i + 2, email, reason: "User not found" });
            continue;
          }

          const existing = await storage.getInternOnboardingByUserId(user.id);
          if (!existing) {
            failures.push({ row: i + 2, email, reason: "Onboarding not found" });
            continue;
          }

          const toNumberOrNull = (v: any) => {
            const n = Number(String(v ?? "").trim());
            return Number.isFinite(n) ? n : null;
          };

          const getCell = (r: any, key: string) => {
            if (!r) return undefined;
            const direct = r[key];
            if (direct !== undefined) return direct;
            const upper = r[key.toUpperCase()];
            if (upper !== undefined) return upper;
            const title = r[key[0].toUpperCase() + key.slice(1)];
            if (title !== undefined) return title;
            const spaced = key.replace(/[A-Z]/g, (m) => ` ${m.toLowerCase()}`).trim();
            const spacedTitle = spaced.replace(/^\w/, (m) => m.toUpperCase());
            return r[spaced] ?? r[spacedTitle] ?? undefined;
          };

          const ratingsPatch: Record<string, number> = {};
          const keys = [
            "communication",
            "coding",
            "aptitude",
            "interview",
            "ai interview",
            "overall",
            "academic",
          ];
          for (const k of keys) {
            const val = toNumberOrNull(getCell(row, k));
            if (val !== null) {
              const targetKey = k === "ai interview" ? "interview" : k;
              ratingsPatch[targetKey] = val;
            }
          }

          const providedFindternScore = toNumberOrNull(
            getCell(row, "findternScore") ?? getCell(row, "findtern score") ?? getCell(row, "findtern_score"),
          );

          if (Object.keys(ratingsPatch).length === 0 && providedFindternScore === null) {
            failures.push({ row: i + 2, email, reason: "No rating columns found" });
            continue;
          }

          const prevExtra = ((existing as any)?.extraData ?? {}) as Record<string, any>;
          const prevRatings = (prevExtra as any).ratings ?? {};

          const nextRatings: Record<string, number> = { ...prevRatings };
          for (const [k, v] of Object.entries(ratingsPatch)) {
            nextRatings[k] = v as number;
          }

          const clampRating = (n: number) => Math.min(10, Math.max(0, n));
          const round1 = (n: number) => Math.round(n * 10) / 10;
          const asNumber = (v: any) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
          };

          const comm = asNumber((nextRatings as any).communication);
          const coding = asNumber((nextRatings as any).coding);
          const aptitude = asNumber((nextRatings as any).aptitude);
          const interview = asNumber((nextRatings as any).interview);

          const computedFindternScore = (() => {
            if (providedFindternScore !== null) return round1(clampRating(providedFindternScore));
            return comm !== null && coding !== null && aptitude !== null && interview !== null
              ? round1((clampRating(comm) + clampRating(coding) + clampRating(aptitude) + clampRating(interview)) / 4)
              : null;
          })();

          const saved = await storage.updateInternOnboarding(user.id, {
            extraData: {
              ...prevExtra,
              ratings: nextRatings,
              ...(computedFindternScore !== null ? { findternScore: computedFindternScore } : {}),
            },
          } as any);

          if (saved) updatedCount++;
        }

        return res.json({
          message: "Ratings upload processed",
          updated: updatedCount,
          failed: failures.length,
          failures,
        });
      } catch (error) {
        console.error("Admin upload ratings error:", error);
        return res.status(500).json({ message: "An error occurred while uploading ratings" });
      }
    },
  );

  const adminUpdateRatingsSchema = z.object({
    communication: z.number().nullable().optional(),
    academic: z.number().nullable().optional(),
    interview: z.number().nullable().optional(),
    overall: z.number().nullable().optional(),
    aptitude: z.number().nullable().optional(),
    coding: z.number().nullable().optional(),
    findternScore: z.number().nullable().optional(),
  });

  const adminUpdateApprovalSchema = z.object({
    approvalStatus: z.enum(["Pending", "Approved", "Rejected"]),
  });

  const adminUpdateInternSkillsSchema = z.object({
    skills: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          rating: z.number().min(1).max(5),
        }),
      )
      .min(0)
      .max(7),
  });

  app.put("/api/admin/interns/:internId/skills", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      if (!internId) {
        return res.status(400).json({ message: "internId is required" });
      }

      const payload = adminUpdateInternSkillsSchema.parse(req.body ?? {});
      const onboarding = await storage.getInternOnboardingByUserId(internId);
      if (!onboarding) {
        return res.status(404).json({ message: "Onboarding not found" });
      }

      const normalized = (payload.skills ?? [])
        .map((s) => ({
          id: String(s.id ?? "").trim(),
          name: String(s.name ?? "").trim(),
          rating: Math.min(5, Math.max(1, Math.round(Number(s.rating)))),
        }))
        .filter((s) => s.id && s.name);

      const updated = await storage.updateInternOnboarding(internId, {
        skills: normalized,
      } as any);

      return res.json({ message: "Skills updated", onboarding: updated ?? null });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin update intern skills error:", error);
      return res.status(500).json({ message: "An error occurred while updating skills" });
    }
  });

  app.get("/api/admin/interns/:internId/payouts", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      if (!internId) {
        return res.status(400).json({ message: "internId is required" });
      }

      const limitRaw = Number((req.query as any)?.limit ?? 200);
      const limit = Number.isFinite(limitRaw) ? Math.min(1000, Math.max(1, Math.floor(limitRaw))) : 200;

      const items = await storage.listInternPayoutsByInternId(internId, { limit });
      return res.json({ items: items ?? [] });
    } catch (error) {
      console.error("Admin list intern payouts error:", error);
      return res.status(500).json({ message: "An error occurred while fetching payout history" });
    }
  });

  const adminCreateInternPayoutSchema = z.object({
    amountMinor: z.number().int().min(1),
    currency: z.enum(["INR", "USD"]).optional().default("INR"),
    status: z.enum(["pending", "paid", "failed"]).optional().default("paid"),
    method: z.string().min(1).optional().default("bank"),
    referenceId: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    paidAt: z.string().optional().nullable(),
    scheduledFor: z.string().optional().nullable(),
    source: z.string().optional().nullable(),
    proposalId: z.string().optional().nullable(),
    employerId: z.string().optional().nullable(),
    cycle: z
      .object({
        remaining: z.number().int().min(1).optional(),
        monthsStep: z.number().int().min(1).optional(),
        amountMinor: z.number().int().min(1).optional(),
        currency: z.enum(["INR", "USD"]).optional(),
        method: z.string().min(1).optional(),
      })
      .optional()
      .nullable(),
  });

  app.post("/api/admin/interns/:internId/payouts", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      if (!internId) {
        return res.status(400).json({ message: "internId is required" });
      }

      if (!(req as any)?.session?.admin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const intern = await storage.getUser(internId);
      if (!intern) {
        return res.status(404).json({ message: "Intern not found" });
      }

      const payload = adminCreateInternPayoutSchema.parse(req.body ?? {});

      const paidAt = payload.paidAt ? new Date(payload.paidAt) : null;
      const paidAtDate = paidAt && Number.isFinite(paidAt.getTime()) ? paidAt : null;

      const scheduledFor = payload.scheduledFor ? new Date(payload.scheduledFor) : null;
      const scheduledForDate = scheduledFor && Number.isFinite(scheduledFor.getTime()) ? scheduledFor : null;

      const prevRaw = {} as any;
      const nextRaw: any = {
        ...(prevRaw ?? {}),
      };
      if (scheduledForDate) {
        nextRaw.scheduledFor = scheduledForDate.toISOString().slice(0, 10);
      }
      if (payload.source) {
        nextRaw.source = String(payload.source);
      }
      if (payload.proposalId) {
        nextRaw.proposalId = String(payload.proposalId);
      }
      if (payload.employerId) {
        nextRaw.employerId = String(payload.employerId);
      }
      if (payload.cycle && typeof payload.cycle === "object") {
        nextRaw.cycle = {
          ...(payload.cycle as any),
          remaining: payload.cycle.remaining ?? (payload.cycle as any).remainingMonths ?? undefined,
        };
      }

      const created = await storage.createInternPayout({
        internId,
        amountMinor: payload.amountMinor,
        currency: payload.currency,
        status: payload.status,
        method: payload.method,
        referenceId: payload.referenceId ?? null,
        notes: payload.notes ?? null,
        raw: nextRaw,
        paidAt: paidAtDate,
      } as any);

      try {
        const statusLower = String((created as any)?.status ?? "").trim().toLowerCase();
        if (statusLower === "paid") {
          const roleName = String(payload.notes ?? "").trim() || "your internship";
          await storage.createNotificationDeduped({
            recipientType: "intern",
            recipientId: internId,
            type: "stipend_paid",
            title: "Stipend paid",
            message: "💰 Great news! Your monthly stipend has been credited.",
            data: {
              payoutId: String((created as any)?.id ?? "").trim(),
              amountMinor: payload.amountMinor,
              currency: payload.currency,
              roleName,
            },
            dedupeKey: `stipend_paid:${String((created as any)?.id ?? "").trim()}`,
            isRead: false,
          } as any);
        }
      } catch (notifyErr) {
        console.error("Intern payout notification error:", notifyErr);
      }

      try {
        const statusLower = String((created as any)?.status ?? "").trim().toLowerCase();
        if (statusLower === "paid") {
          const internEmail = String((intern as any)?.email ?? "").trim();
          const internName = `${String((intern as any)?.firstName ?? "").trim()} ${String((intern as any)?.lastName ?? "").trim()}`.trim();
          const roleName = String(payload.notes ?? "").trim();
          const appBaseUrl = getAppBaseUrl(req);
          const dashboardUrl = appBaseUrl ? `${appBaseUrl}/earnings` : "";

          if (internEmail && dashboardUrl) {
            await sendStipendTransferredInternEmail({
              to: internEmail,
              internName: internName || "Candidate",
              roleName: roleName || "your internship",
              amountMinor: payload.amountMinor,
              currency: (String(payload.currency ?? "INR").toUpperCase() === "USD" ? "USD" : "INR") as any,
              appBaseUrl,
              dashboardUrl,
            });
          }
        }
      } catch (mailErr) {
        console.error("Intern payout email error:", mailErr);
      }

      return res.status(201).json({ item: created });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin create intern payout error:", error);
      return res.status(500).json({ message: "An error occurred while creating payout" });
    }
  });

  const adminMarkInternPayoutPaidSchema = z.object({
    referenceId: z.string().min(1),
  });

  app.post("/api/admin/interns/:internId/payouts/:payoutId/mark-paid", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      const payoutId = String(req.params.payoutId ?? "").trim();
      if (!internId) return res.status(400).json({ message: "internId is required" });
      if (!payoutId) return res.status(400).json({ message: "payoutId is required" });

      if (!(req as any)?.session?.admin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const payload = adminMarkInternPayoutPaidSchema.parse(req.body ?? {});

      const existing = await storage.getInternPayout(payoutId);
      if (!existing) return res.status(404).json({ message: "Payout not found" });
      if (String((existing as any)?.internId ?? "") !== internId) {
        return res.status(403).json({ message: "Payout does not belong to this intern" });
      }

      const existingStatus = String((existing as any)?.status ?? "").trim().toLowerCase();
      if (existingStatus === "paid") {
        return res.json({ message: "Already paid", item: existing });
      }

      const updated = await storage.updateInternPayout(payoutId, {
        status: "paid",
        referenceId: payload.referenceId,
        paidAt: new Date(),
      } as any);

      try {
        const amountMinor = Number((updated as any)?.amountMinor ?? (updated as any)?.amount_minor ?? (existing as any)?.amountMinor ?? 0);
        const currencyRaw = String((updated as any)?.currency ?? (existing as any)?.currency ?? "INR").toUpperCase();
        const currency = (currencyRaw === "USD" ? "USD" : "INR") as any;
        const roleName = String((existing as any)?.notes ?? "").trim() || "your internship";

        await storage.createNotificationDeduped({
          recipientType: "intern",
          recipientId: internId,
          type: "stipend_paid",
          title: "Stipend paid",
          message: "💰 Great news! Your monthly stipend has been credited.",
          data: {
            payoutId,
            amountMinor: Number.isFinite(amountMinor) ? Math.max(0, Math.round(amountMinor)) : 0,
            currency,
            roleName,
            referenceId: payload.referenceId,
          },
          dedupeKey: `stipend_paid:${payoutId}`,
          isRead: false,
        } as any);
      } catch (notifyErr) {
        console.error("Mark payout paid notification error:", notifyErr);
      }

      const nextCreated = await (async () => {
        const raw = ((existing as any)?.raw ?? {}) as any;
        const cycle = raw?.cycle ?? null;
        const scheduledForRaw = raw?.scheduledFor ?? raw?.scheduled_for ?? null;

        if (!cycle || typeof cycle !== "object") return null;

        const remainingRaw = Number((cycle as any)?.remaining ?? (cycle as any)?.remainingMonths ?? 0);
        const remaining = Number.isFinite(remainingRaw) ? Math.floor(remainingRaw) : 0;
        if (remaining <= 1) return null;

        const monthsStepRaw = Number((cycle as any)?.monthsStep ?? 1);
        const monthsStep = Number.isFinite(monthsStepRaw) ? Math.max(1, Math.floor(monthsStepRaw)) : 1;
        const amountMinorRaw = Number((cycle as any)?.amountMinor ?? (cycle as any)?.amount_minor ?? (existing as any)?.amountMinor ?? 0);
        const amountMinor = Number.isFinite(amountMinorRaw) ? Math.max(0, Math.floor(amountMinorRaw)) : 0;
        if (!amountMinor) return null;

        const currency = String((cycle as any)?.currency ?? (existing as any)?.currency ?? "INR").toUpperCase();

        const base = scheduledForRaw ? new Date(String(scheduledForRaw)) : null;
        const baseDt = base && Number.isFinite(base.getTime()) ? base : null;
        if (!baseDt) return null;
        const nextScheduled = new Date(Date.UTC(baseDt.getUTCFullYear(), baseDt.getUTCMonth() + monthsStep, baseDt.getUTCDate(), 0, 0, 0));

        return storage.createInternPayout({
          internId,
          amountMinor,
          currency,
          status: "pending",
          method: String((cycle as any)?.method ?? (existing as any)?.method ?? "bank"),
          referenceId: null,
          notes: (existing as any)?.notes ?? null,
          paidAt: null,
          raw: {
            ...(raw ?? {}),
            scheduledFor: nextScheduled.toISOString().slice(0, 10),
            cycle: {
              ...(cycle as any),
              remaining: remaining - 1,
            },
          },
        } as any);
      })();

      try {
        const intern = await storage.getUser(internId).catch(() => undefined);
        const internEmail = String((intern as any)?.email ?? "").trim();
        const internName = `${String((intern as any)?.firstName ?? "").trim()} ${String((intern as any)?.lastName ?? "").trim()}`.trim();

        const raw = ((existing as any)?.raw ?? {}) as any;
        const proposalId = String(raw?.proposalId ?? raw?.proposal_id ?? "").trim();
        const proposal = proposalId ? await storage.getProposal(proposalId).catch(() => undefined) : undefined;
        const offer = (proposal as any)?.offerDetails ?? (proposal as any)?.offer_details ?? {};
        const roleName =
          String((existing as any)?.notes ?? "").trim() ||
          String((proposal as any)?.projectName ?? (proposal as any)?.project_name ?? offer?.roleTitle ?? "").trim() ||
          "your internship";

        const appBaseUrl = getAppBaseUrl(req);
        const dashboardUrl = appBaseUrl ? `${appBaseUrl}/earnings` : "";
        const amountMinor = Number((updated as any)?.amountMinor ?? (updated as any)?.amount_minor ?? (existing as any)?.amountMinor ?? 0);
        const currency = (String((updated as any)?.currency ?? (existing as any)?.currency ?? "INR").toUpperCase() === "USD" ? "USD" : "INR") as any;

        if (internEmail && dashboardUrl) {
          await sendStipendTransferredInternEmail({
            to: internEmail,
            internName: internName || "Candidate",
            roleName,
            amountMinor: Number.isFinite(amountMinor) ? Math.max(0, Math.round(amountMinor)) : 0,
            currency,
            appBaseUrl,
            dashboardUrl,
          });
        }
      } catch (mailErr) {
        console.error("Intern payout email error:", mailErr);
      }

      return res.json({ message: "Payout marked paid", item: updated ?? null, nextCreated: nextCreated ?? null });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin mark payout paid error:", error);
      return res.status(500).json({ message: "An error occurred while marking payout paid" });
    }
  });

  app.post("/api/admin/interns/:internId/payouts/:payoutId/send-stipend-email", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      const payoutId = String(req.params.payoutId ?? "").trim();
      if (!internId) return res.status(400).json({ message: "internId is required" });
      if (!payoutId) return res.status(400).json({ message: "payoutId is required" });

      if (!(req as any)?.session?.admin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const payout = await storage.getInternPayout(payoutId);
      if (!payout) return res.status(404).json({ message: "Payout not found" });
      if (String((payout as any)?.internId ?? "") !== internId) {
        return res.status(403).json({ message: "Payout does not belong to this intern" });
      }

      const status = String((payout as any)?.status ?? "").trim().toLowerCase();
      if (status !== "paid") {
        return res.status(400).json({ message: "Payout must be paid to send this email" });
      }

      const intern = await storage.getUser(internId).catch(() => undefined);
      const internEmail = String((intern as any)?.email ?? "").trim();
      if (!internEmail) return res.status(400).json({ message: "Intern email not found" });

      const internName = `${String((intern as any)?.firstName ?? "").trim()} ${String((intern as any)?.lastName ?? "").trim()}`.trim();

      const raw = ((payout as any)?.raw ?? {}) as any;
      const proposalId = String(raw?.proposalId ?? raw?.proposal_id ?? "").trim();
      const proposal = proposalId ? await storage.getProposal(proposalId).catch(() => undefined) : undefined;
      const offer = (proposal as any)?.offerDetails ?? (proposal as any)?.offer_details ?? {};
      const roleName =
        String((payout as any)?.notes ?? "").trim() ||
        String((proposal as any)?.projectName ?? (proposal as any)?.project_name ?? offer?.roleTitle ?? "").trim() ||
        "your internship";

      const appBaseUrl = getAppBaseUrl(req);
      const dashboardUrl = appBaseUrl ? `${appBaseUrl}/earnings` : "";
      const amountMinor = Number((payout as any)?.amountMinor ?? (payout as any)?.amount_minor ?? 0);
      const currency = (String((payout as any)?.currency ?? "INR").toUpperCase() === "USD" ? "USD" : "INR") as any;

      if (!dashboardUrl) return res.status(400).json({ message: "App base URL not available" });

      await sendStipendTransferredInternEmail({
        to: internEmail,
        internName: internName || "Candidate",
        roleName,
        amountMinor: Number.isFinite(amountMinor) ? Math.max(0, Math.round(amountMinor)) : 0,
        currency,
        appBaseUrl,
        dashboardUrl,
      });

      return res.json({ message: "Email sent" });
    } catch (error) {
      console.error("Admin send stipend email error:", error);
      return res.status(500).json({ message: "Failed to send email" });
    }
  });

  app.put("/api/admin/interns/:internId/ratings", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      if (!internId) {
        return res.status(400).json({ message: "internId is required" });
      }

      const data = adminUpdateRatingsSchema.parse(req.body ?? {});
      const { findternScore: findternScoreValue, ...ratingUpdates } = data as any;

      const providedRatings = Object.entries(ratingUpdates).filter(
        ([, v]) => typeof v === "number" && Number.isFinite(v),
      );
      const clearedRatings = Object.entries(ratingUpdates)
        .filter(([, v]) => v === null)
        .map(([k]) => k);

      const hasFindternScoreNumber =
        typeof findternScoreValue === "number" && Number.isFinite(findternScoreValue);
      const hasFindternScoreNull = findternScoreValue === null;

      const onboarding = await storage.getInternOnboardingByUserId(internId);
      if (!onboarding) {
        return res.status(404).json({ message: "Onboarding not found" });
      }

      if (
        providedRatings.length === 0 &&
        clearedRatings.length === 0 &&
        !hasFindternScoreNumber &&
        !hasFindternScoreNull
      ) {
        return res.json({ message: "No rating updates provided", onboarding });
      }

      const prevExtra = (onboarding as any).extraData ?? {};
      const prevFindternScoreRaw = (prevExtra as any)?.findternScore;
      const prevFindternScoreNum = Number(prevFindternScoreRaw ?? 0);
      const prevHadLiveScore = Number.isFinite(prevFindternScoreNum) && prevFindternScoreNum > 0;
      const prevRatings = (prevExtra as any).ratings ?? {};

      const nextRatings: Record<string, number> = { ...prevRatings };
      for (const [k, v] of providedRatings) {
        nextRatings[k] = v as number;
      }

      for (const k of clearedRatings) {
        delete (nextRatings as any)[k];
      }

      const clampRating = (n: number) => Math.min(10, Math.max(0, n));
      const round1 = (n: number) => Math.round(n * 10) / 10;
      const asNumber = (v: any) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      const computedFindternScore = (() => {
        const comm = asNumber((nextRatings as any).communication);
        const coding = asNumber((nextRatings as any).coding);
        const aptitude = asNumber((nextRatings as any).aptitude);
        const interview = asNumber((nextRatings as any).interview);

        const values = [comm, coding, aptitude, interview].filter(
          (v): v is number => typeof v === "number" && Number.isFinite(v),
        );

        if (values.length === 0) return null;
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return round1(clampRating(avg));
      })();

      const coreKeys = new Set(["communication", "coding", "aptitude", "interview"]);
      const changedCore = [...providedRatings.map(([k]) => k), ...clearedRatings].some((k) => coreKeys.has(k));

      const nextExtra: any = {
        ...prevExtra,
        ratings: nextRatings,
      };

      if (hasFindternScoreNumber) {
        nextExtra.findternScore = round1(clampRating(findternScoreValue));
      } else if (hasFindternScoreNull) {
        delete nextExtra.findternScore;
      } else if (typeof computedFindternScore === "number" && Number.isFinite(computedFindternScore)) {
        nextExtra.findternScore = computedFindternScore;
      } else if (changedCore) {
        delete nextExtra.findternScore;
      }

      const updated = await storage.updateInternOnboarding(internId, {
        extraData: nextExtra,
      } as any);

      try {
        const nextExtraData = (updated as any)?.extraData ?? nextExtra;
        const nextFindternScoreRaw = (nextExtraData as any)?.findternScore;
        const nextFindternScoreNum = Number(nextFindternScoreRaw ?? 0);
        const nextHasLiveScore = Number.isFinite(nextFindternScoreNum) && nextFindternScoreNum > 0;

        if (!prevHadLiveScore && nextHasLiveScore) {
          const internUser = await storage.getUser(internId).catch(() => undefined);
          const internName = internUser
            ? `${String((internUser as any)?.firstName ?? "").trim()} ${String((internUser as any)?.lastName ?? "").trim()}`.trim() || "Candidate"
            : "Candidate";

          await storage.createNotificationDeduped({
            recipientType: "intern",
            recipientId: internId,
            type: "ai_interview_scores_live",
            title: "AI interview scores are live",
            message: formatNotification(
              "🎉 Hurray [Name]! Your AI interview is complete. Scores will be live soon.",
              { Name: internName },
            ),
            data: {
              findternScore: nextFindternScoreNum,
            },
            dedupeKey: `ai_interview_scores_live:${internId}`,
          } as any);
        }

        if (nextHasLiveScore) {
          const interviews = await storage.getInterviewsByInternId(internId).catch(() => [] as any[]);
          const aiInterview = (Array.isArray(interviews) ? interviews : []).find(
            (i) => String((i as any)?.employerId ?? (i as any)?.employer_id ?? "").trim() === "admin",
          );
          const aiInterviewId = String((aiInterview as any)?.id ?? "").trim();
          const currentStatus = String((aiInterview as any)?.status ?? "").trim().toLowerCase();

          if (aiInterviewId && currentStatus && currentStatus !== "completed") {
            await storage.updateInterviewStatus(aiInterviewId, "completed");
          }
        }
      } catch (notifyErr) {
        console.error("AI interview scores live notification error:", notifyErr);
      }

      return res.json({ message: "Ratings updated", onboarding: updated ?? null });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin update ratings error:", error);
      return res.status(500).json({ message: "An error occurred while updating ratings" });
    }
  });

  app.put("/api/admin/interns/:internId/approval", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      if (!internId) {
        return res.status(400).json({ message: "internId is required" });
      }

      const data = adminUpdateApprovalSchema.parse(req.body ?? {});

      const onboarding = await storage.getInternOnboardingByUserId(internId);
      if (!onboarding) {
        return res.status(404).json({ message: "Onboarding not found" });
      }

      const prevExtra = (onboarding as any).extraData ?? {};
      const updated = await storage.updateInternOnboarding(internId, {
        extraData: {
          ...prevExtra,
          approvalStatus: data.approvalStatus,
        },
      } as any);

      return res.json({ message: "Approval status updated", onboarding: updated ?? null });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin update approval error:", error);
      return res.status(500).json({ message: "An error occurred while updating approval" });
    }
  });

  app.get("/api/admin/dashboard", requirePermission("dashboard:read"), async (req, res) => {
    try {
      const parsePositiveInt = (value: unknown, fallback: number) => {
        const n = Number(String(value ?? "").trim());
        if (!Number.isFinite(n)) return fallback;
        const i = Math.floor(n);
        if (i <= 0) return fallback;
        return i;
      };

      const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

      const internPage = parsePositiveInt(req.query.internPage, 1);
      const internLimit = clamp(parsePositiveInt(req.query.internLimit, 5), 1, 50);
      const internQ = String(req.query.internQ ?? "").trim().toLowerCase();
      const internStatus = String(req.query.internStatus ?? "all").trim().toLowerCase();
      const internProfile = String((req.query as any).internProfile ?? "all").trim().toLowerCase();
      const internLive = String((req.query as any).internLive ?? "all").trim().toLowerCase();
      const internOnboardingStatus = String((req.query as any).internOnboardingStatus ?? "all")
        .trim()
        .toLowerCase();

      const projectPage = parsePositiveInt(req.query.projectPage, 1);
      const projectLimit = clamp(parsePositiveInt(req.query.projectLimit, 5), 1, 50);

      const [users, employers, projects, proposals, interviews, onboarding] = await Promise.all([
        storage.getUsers(),
        storage.getEmployers(),
        storage.getAllProjects(),
        storage.getAllProposals(),
        storage.getAllInterviews(),
        storage.getAllInternOnboarding(),
      ]);

      const safeUsers = users.map(({ password, ...rest }) => rest);
      const safeEmployers = employers.map(({ password, ...rest }) => rest);

      const excludedEmployerIds = new Set<string>();
      for (const e of safeEmployers as any[]) {
        const id = String((e as any)?.id ?? "").trim();
        if (!id) continue;
        if (id.toLowerCase() === "admin") {
          excludedEmployerIds.add(id.toLowerCase());
          continue;
        }
        const email = String((e as any)?.companyEmail ?? "").trim().toLowerCase();
        if (email === "ai-interview@findtern.ai") excludedEmployerIds.add(id.toLowerCase());
      }

      const proposalCountByInternId = new Map<string, number>();
      const proposalCountByProjectId = new Map<string, number>();
      let selectedCount = 0;
      const proposalStatusCounts: Record<string, number> = {};

      for (const p of proposals as any[]) {
        const internId = String(p?.internId ?? p?.intern_id ?? "").trim();
        const projectId = String(p?.projectId ?? p?.project_id ?? "").trim();
        const status = String(p?.status ?? "").trim().toLowerCase();

        if (internId) {
          proposalCountByInternId.set(internId, (proposalCountByInternId.get(internId) ?? 0) + 1);
        }
        if (projectId) {
          proposalCountByProjectId.set(projectId, (proposalCountByProjectId.get(projectId) ?? 0) + 1);
        }

        if (status === "accepted") selectedCount += 1;

        proposalStatusCounts[status] = (proposalStatusCounts[status] || 0) + 1;
      }

      const nowMs = Date.now();
      const getInterviewEffectiveStatus = (interview: any) => {
        const rawStatus = String(interview?.status ?? "sent").trim().toLowerCase();

        const isScheduled = rawStatus === "scheduled" && Boolean(interview?.selectedSlot);
        if (isScheduled) {
          const selectedKey = `slot${interview.selectedSlot}`;
          const slotValue = interview?.[selectedKey];
          if (!slotValue) return "scheduled";
          const t = new Date(slotValue);
          if (Number.isNaN(t.getTime())) return "scheduled";
          return nowMs > t.getTime() ? "completed" : "scheduled";
        }

        if (!interview?.selectedSlot) {
          const slots = [interview?.slot1, interview?.slot2, interview?.slot3]
            .map((v) => {
              if (!v) return null;
              const d = new Date(v);
              if (Number.isNaN(d.getTime())) return null;
              return d;
            })
            .filter(Boolean) as Date[];

          if (slots.length > 0) {
            const latest = Math.max(...slots.map((d) => d.getTime()));
            if (nowMs > latest) return "expired";
          }

          return "sent";
        }

        if (rawStatus === "completed") return "completed";
        if (rawStatus === "expired") return "expired";
        return rawStatus || "sent";
      };

      let completedInterviewsCount = 0;
      const scheduledInterviewCount = (interviews as any[]).reduce((acc, i) => {
        const effective = getInterviewEffectiveStatus(i);
        const employerId = String(i?.employerId ?? i?.employer_id ?? "").trim().toLowerCase();
        const isExcludedEmployer = employerId ? excludedEmployerIds.has(employerId) : false;

        if (effective === "completed") {
          // Count all completed interviews (records) excluding admin/test employers
          if (!isExcludedEmployer) completedInterviewsCount += 1;
        }
        // Only count interviews that are actually scheduled by employers (exclude admin/test)
        const isEmployerScheduled = !isExcludedEmployer && effective === "scheduled";
        return acc + (isEmployerScheduled ? 1 : 0);
      }, 0);

      const activeInternships = (projects as any[]).reduce((acc, p) => {
        const status = String(p?.status ?? "active").trim().toLowerCase();
        return acc + (status === "active" ? 1 : 0);
      }, 0);

      const activeCompanies = (safeEmployers as any[])
        .filter((e) => {
          const id = String((e as any)?.id ?? "").trim();
          const email = String((e as any)?.companyEmail ?? "").trim().toLowerCase();
          if (!id) return false;
          if (id === "admin") return false;
          if (email === "ai-interview@findtern.ai") return false;
          if ((e as any)?.isActive === false) return false;
          if ((e as any)?.onboardingCompleted !== true) return false;
          return true;
        })
        .length;

      const employerById = new Map<string, any>();
      for (const e of safeEmployers as any[]) {
        const id = String(e?.id ?? "").trim();
        if (id) employerById.set(id, e);
      }

      const allInternUsers = (safeUsers as any[]).filter((u) => {
        const role = String(u?.role ?? "intern").trim().toLowerCase();
        return role === "intern";
      });

      const isMeaningfulOnboarding = (o: any) => {
        if (!o) return false;

        const linkedinUrl = String(o?.linkedinUrl ?? o?.linkedin_url ?? "").trim();
        if (linkedinUrl) return true;

        const bio = String(o?.bio ?? "").trim();
        if (bio) return true;

        const previewSummary = String(o?.previewSummary ?? o?.preview_summary ?? "").trim();
        if (previewSummary) return true;

        const city = String(o?.city ?? "").trim();
        const state = String(o?.state ?? "").trim();
        const pinCode = String(o?.pinCode ?? o?.pin_code ?? "").trim();
        if (city || state || pinCode) return true;

        const skills = Array.isArray(o?.skills) ? o.skills : [];
        if (skills.length > 0) return true;

        const locationTypes = Array.isArray(o?.locationTypes) ? o.locationTypes : [];
        const preferredLocations = Array.isArray(o?.preferredLocations) ? o.preferredLocations : [];
        if (locationTypes.length > 0 || preferredLocations.length > 0) return true;

        const experienceJson = Array.isArray(o?.experienceJson) ? o.experienceJson : [];
        if (experienceJson.length > 0) return true;

        if (typeof o?.hasLaptop === "boolean") return true;

        const extra = o?.extraData ?? o?.extra_data ?? {};
        const bankDetails = extra?.bankDetails ?? extra?.bank_details ?? {};
        const hasBank =
          Boolean(String(bankDetails?.accountNumber ?? "").trim()) ||
          Boolean(String(bankDetails?.upiId ?? "").trim());
        if (hasBank) return true;

        return false;
      };

      const onboardingCompleteUserIds = new Set(
        (onboarding as any[])
          .filter((o) => isMeaningfulOnboarding(o))
          .map((o) => String(o?.userId ?? o?.user_id ?? "").trim())
          .filter(Boolean),
      );

      const onboardingByUserId = new Map<string, any>();
      for (const o of onboarding as any[]) {
        const id = String((o as any)?.userId ?? (o as any)?.user_id ?? "").trim();
        if (!id) continue;
        if (!onboardingByUserId.has(id)) onboardingByUserId.set(id, o);
      }

      const deriveOnboardingStatus = (o: any) => {
        const extra = (o as any)?.extraData ?? (o as any)?.extra_data ?? {};
        const explicit = (extra as any)?.onboardingStatus;
        if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
        const explicitBool = (extra as any)?.isOnboarded;
        if (typeof explicitBool === "boolean") return explicitBool ? "Onboarded" : "Not onboarded";
        const isPaid = Boolean(extra?.payment?.isPaid);
        return isPaid ? "Onboarded" : "Not onboarded";
      };

      const deriveLiveStatus = (o: any) => {
        const extra = (o as any)?.extraData ?? (o as any)?.extra_data ?? {};
        const openToWork = (extra as any)?.openToWork;
        if (typeof openToWork === "boolean") return openToWork ? "Live" : "Hidden";
        return "Live";
      };

      const filteredInternUsers = allInternUsers.filter((u) => {
        const name = `${String(u?.firstName ?? "").trim()} ${String(u?.lastName ?? "").trim()}`
          .trim()
          .toLowerCase();
        const email = String(u?.email ?? "").trim().toLowerCase();
        const status = (u as any)?.isActive === false ? "inactive" : "active";
        const id = String(u?.id ?? "").trim();
        const isProfileComplete = id ? onboardingCompleteUserIds.has(id) : false;

        const onboardRow = id ? onboardingByUserId.get(id) : null;
        const onboardStatus = onboardRow ? deriveOnboardingStatus(onboardRow) : "Not onboarded";
        const liveStatus = onboardRow ? deriveLiveStatus(onboardRow) : "Live";

        if (internProfile !== "all") {
          if (internProfile === "complete" && !isProfileComplete) return false;
          if (internProfile === "incomplete" && isProfileComplete) return false;
        }

        if (internStatus !== "all" && status !== internStatus) return false;

        if (internLive !== "all") {
          if (internLive === "live" && liveStatus.toLowerCase() !== "live") return false;
          if (internLive === "hidden" && liveStatus.toLowerCase() !== "hidden") return false;
        }

        if (internOnboardingStatus !== "all") {
          const key = onboardStatus.toLowerCase() === "onboarded" ? "onboarded" : "not_onboarded";
          if (internOnboardingStatus !== key) return false;
        }

        if (internQ) {
          if (!name.includes(internQ) && !email.includes(internQ)) return false;
        }
        return true;
      });

      const internTotal = filteredInternUsers.length;
      const internOffset = (internPage - 1) * internLimit;
      const internPageItems = filteredInternUsers.slice(internOffset, internOffset + internLimit);

      const previewUsers = internPageItems.map((u) => {
        const id = String(u?.id ?? "");
        const status = (u as any)?.isActive === false ? "inactive" : "active";
        const role = String(u?.role ?? "intern");

        const onboardRow = id ? onboardingByUserId.get(id) : null;
        const createdAtRaw = (onboardRow as any)?.createdAt ?? (onboardRow as any)?.created_at ?? null;
        const createdAt = createdAtRaw
          ? (() => {
              const d = new Date(createdAtRaw);
              return Number.isNaN(d.getTime()) ? String(createdAtRaw) : d.toISOString().slice(0, 10);
            })()
          : "-";

        const onboardingStatus = onboardRow ? deriveOnboardingStatus(onboardRow) : "Not onboarded";
        const liveStatus = onboardRow ? deriveLiveStatus(onboardRow) : "Live";

        return {
          id,
          name:
            `${String(u?.firstName ?? "").trim()} ${String(u?.lastName ?? "").trim()}`.trim() || "-",
          email: String(u?.email ?? "-"),
          phoneNumber: String(u?.phoneNumber ?? ""),
          countryCode: String(u?.countryCode ?? "+91"),
          status,
          role,
          joined: createdAt,
          applications: proposalCountByInternId.get(id) ?? 0,
          createdAt,
          onboardingStatus,
          liveStatus,
        };
      });

      const projectTotal = (projects as any[]).length;
      const projectOffset = (projectPage - 1) * projectLimit;
      const projectPageItems = (projects as any[]).slice(projectOffset, projectOffset + projectLimit);

      const previewProjects = projectPageItems.map((p) => {
          const employerId = String(p?.employerId ?? p?.employer_id ?? "").trim();
          const employer = employerById.get(employerId) ?? null;
          const createdAtRaw = p?.createdAt ?? p?.created_at ?? null;
          const posted = createdAtRaw
            ? (() => {
                const d = new Date(createdAtRaw);
                return Number.isNaN(d.getTime()) ? String(createdAtRaw) : d.toISOString().slice(0, 10);
              })()
            : "-";
          const id = String(p?.id ?? "");
          return {
            id,
            title: String(p?.projectName ?? "-"),
            company: String(employer?.companyName ?? employer?.name ?? "-") || "-",
            status: String(p?.status ?? "active"),
            applications: proposalCountByProjectId.get(id) ?? 0,
            posted,
          };
        });

      const makeMonthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const months: Array<{ key: string; label: string }> = [];
      const base = new Date();
      base.setDate(1);
      base.setHours(0, 0, 0, 0);
      for (let i = 5; i >= 0; i--) {
        const d = new Date(base);
        d.setMonth(d.getMonth() - i);
        months.push({
          key: makeMonthKey(d),
          label: d.toLocaleString("en-US", { month: "short" }),
        });
      }

      const proposalCountByMonth = new Map<string, number>();
      for (const p of proposals as any[]) {
        const raw = p?.createdAt ?? p?.created_at ?? null;
        if (!raw) continue;
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) continue;
        const key = makeMonthKey(d);
        proposalCountByMonth.set(key, (proposalCountByMonth.get(key) ?? 0) + 1);
      }

      const interviewCountByMonth = new Map<string, number>();
      for (const i of interviews as any[]) {
        const employerId = String(i?.employerId ?? i?.employer_id ?? "").trim().toLowerCase();
        if (employerId && excludedEmployerIds.has(employerId)) continue;

        const raw = i?.createdAt ?? i?.created_at ?? null;
        if (!raw) continue;
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) continue;
        const key = makeMonthKey(d);
        interviewCountByMonth.set(key, (interviewCountByMonth.get(key) ?? 0) + 1);
      }

      const trendData = months.map((m) => ({
        month: m.label,
        applications: proposalCountByMonth.get(m.key) ?? 0,
        interviews: interviewCountByMonth.get(m.key) ?? 0,
      }));

      const appliedInternIds = new Set(
        (proposals as any[])
          .map((p) => String(p?.internId ?? p?.intern_id ?? "").trim())
          .filter(Boolean),
      );
      const appliedCount = appliedInternIds.size;

      const profileCompleteCount = onboardingCompleteUserIds.size;
      const incompleteProfileCount = Math.max(0, allInternUsers.length - profileCompleteCount);

      const interviewedInternIds = new Set<string>();
      for (const i of interviews as any[]) {
        const s = getInterviewEffectiveStatus(i);
        if (!(s === "scheduled" || s === "completed")) continue;
        const internId = String(i?.internId ?? i?.intern_id ?? "").trim();
        if (internId) interviewedInternIds.add(internId);
      }
      const interviewedCount = interviewedInternIds.size;

      const pickNewer = (a: any, b: any) => {
        const aRaw = a?.updatedAt ?? a?.updated_at ?? a?.createdAt ?? a?.created_at ?? null;
        const bRaw = b?.updatedAt ?? b?.updated_at ?? b?.createdAt ?? b?.created_at ?? null;
        const aT = aRaw ? new Date(aRaw).getTime() : 0;
        const bT = bRaw ? new Date(bRaw).getTime() : 0;
        return bT >= aT ? b : a;
      };

      const latestAiInterviewByInternId = new Map<string, any>();
      for (const i of interviews as any[]) {
        const internId = String(i?.internId ?? i?.intern_id ?? "").trim();
        if (!internId) continue;
        const employerId = String(i?.employerId ?? i?.employer_id ?? "").trim().toLowerCase();
        if (employerId !== "admin") continue;
        const existing = latestAiInterviewByInternId.get(internId);
        latestAiInterviewByInternId.set(internId, existing ? pickNewer(existing, i) : i);
      }

      const aiCompletedInternIds = new Set<string>();
      for (const internId of latestAiInterviewByInternId.keys()) {
        const latest = latestAiInterviewByInternId.get(internId);
        const rawStatus = String((latest as any)?.status ?? "").trim().toLowerCase();
        const effective = getInterviewEffectiveStatus(latest);
        if (rawStatus !== "completed" && effective !== "completed") continue;
        aiCompletedInternIds.add(internId);
      }
      const aiCompletedCount = aiCompletedInternIds.size;

      const hiredInternIds = new Set<string>();
      for (const p of proposals as any[]) {
        const status = String(p?.status ?? "").trim().toLowerCase();
        if (status !== "hired") continue;
        const internId = String(p?.internId ?? p?.intern_id ?? "").trim();
        if (internId) hiredInternIds.add(internId);
      }
      const hiredUniqueCount = hiredInternIds.size;

      const funnelData = [
        { stage: "Signups", value: allInternUsers.length },
        { stage: "Profile Complete", value: profileCompleteCount },
        { stage: "Applied", value: appliedCount },
        { stage: "Interviewed", value: completedInterviewsCount },
        { stage: "Internship Selected", value: hiredUniqueCount },
      ];

      const internUserById = new Map<string, any>();
      for (const u of safeUsers as any[]) {
        const id = String((u as any)?.id ?? "").trim();
        if (!id) continue;
        const role = String((u as any)?.role ?? "intern").trim().toLowerCase();
        if (role !== "intern") continue;
        internUserById.set(id, u);
      }

      const projectById = new Map<string, any>();
      for (const p of projects as any[]) {
        const id = String((p as any)?.id ?? "").trim();
        if (id) projectById.set(id, p);
      }

      const isFullTimeProposal = (proposal: any) => {
        try {
          const offer = (proposal as any)?.offerDetails ?? (proposal as any)?.offer_details ?? {};
          const ft = (offer as any)?.fullTimeOffer;
          
          // If the proposal itself explicitly defines the type, use it
          if (ft === true || (ft && typeof ft === "object" && Object.keys(ft).length > 0)) return true;
          if (ft === false) return false;

          // Check if it's an internship based on duration field
          const duration = String(offer?.duration ?? offer?.internshipDuration ?? "").toLowerCase();
          if (duration && (duration.includes("month") || /^\d+m$/.test(duration))) {
            return false;
          }

          // Otherwise fallback to project default
          const projectId = String((proposal as any)?.projectId ?? (proposal as any)?.project_id ?? "").trim();
          const proj = projectId ? projectById.get(projectId) : null;
          return Boolean((proj as any)?.fullTimeOffer);
        } catch {
          return false;
        }
      };

      const normalizeIsoDate = (raw: any) => {
        if (!raw) return null;
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return String(raw);
        return d.toISOString();
      };

      const hiredRows = (proposals as any[])
        .filter((p: any) => String((p as any)?.status ?? "").trim().toLowerCase() === "hired")
        .map((p: any) => {
          const internId = String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim();
          const employerId = String((p as any)?.employerId ?? (p as any)?.employer_id ?? "").trim();
          const projectId = String((p as any)?.projectId ?? (p as any)?.project_id ?? "").trim();
          const user = internId ? internUserById.get(internId) : null;
          const employer = employerId ? employerById.get(employerId) : null;
          const project = projectId ? projectById.get(projectId) : null;
          const offerDetails = (p as any)?.offerDetails ?? (p as any)?.offer_details ?? {};

          return {
            proposalId: String((p as any)?.id ?? ""),
            internId,
            internName:
              user
                ? `${String((user as any)?.firstName ?? "").trim()} ${String((user as any)?.lastName ?? "").trim()}`.trim() || "-"
                : "-",
            internEmail: String((user as any)?.email ?? "-") || "-",
            internPhone: [String((user as any)?.countryCode ?? "").trim(), String((user as any)?.phoneNumber ?? "").trim()]
              .filter(Boolean)
              .join(" ") || "-",
            employerId,
            companyName: String((employer as any)?.companyName ?? (employer as any)?.name ?? "-") || "-",
            projectId,
            projectName: String((project as any)?.projectName ?? "-") || "-",
            status: String((p as any)?.status ?? "-") || "-",
            createdAt: normalizeIsoDate((p as any)?.createdAt ?? (p as any)?.created_at),
            updatedAt: normalizeIsoDate((p as any)?.updatedAt ?? (p as any)?.updated_at),
            currency: String((p as any)?.currency ?? (offerDetails as any)?.currency ?? "INR"),
            offerDetails,
            fullTimeOffer: isFullTimeProposal(p),
          };
        })
        .sort((a: any, b: any) => {
          const ta = a?.updatedAt ? new Date(a.updatedAt).getTime() : a?.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b?.updatedAt ? new Date(b.updatedAt).getTime() : b?.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });

      const hiredFullTimeInterns = hiredRows.filter((r: any) => r.fullTimeOffer).slice(0, 50);
      const hiredInternshipInterns = hiredRows.filter((r: any) => !r.fullTimeOffer).slice(0, 50);

      const selectedRowsRaw = (proposals as any[])
        .filter((p: any) => {
          const st = String((p as any)?.status ?? "").trim().toLowerCase();
          return st === "accepted" || st === "hired";
        })
        .map((p: any) => {
          const internId = String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim();
          const employerId = String((p as any)?.employerId ?? (p as any)?.employer_id ?? "").trim();
          const projectId = String((p as any)?.projectId ?? (p as any)?.project_id ?? "").trim();
          const user = internId ? internUserById.get(internId) : null;
          const employer = employerId ? employerById.get(employerId) : null;
          const project = projectId ? projectById.get(projectId) : null;
          const offerDetails = (p as any)?.offerDetails ?? (p as any)?.offer_details ?? {};

          return {
            proposalId: String((p as any)?.id ?? ""),
            internId,
            internName:
              user
                ? `${String((user as any)?.firstName ?? "").trim()} ${String((user as any)?.lastName ?? "").trim()}`.trim() || "-"
                : "-",
            internEmail: String((user as any)?.email ?? "-") || "-",
            internPhone: [String((user as any)?.countryCode ?? "").trim(), String((user as any)?.phoneNumber ?? "").trim()]
              .filter(Boolean)
              .join(" ") || "-",
            employerId,
            companyName: String((employer as any)?.companyName ?? (employer as any)?.name ?? "-") || "-",
            projectId,
            projectName: String((project as any)?.projectName ?? "-") || "-",
            status: String((p as any)?.status ?? "-") || "-",
            createdAt: normalizeIsoDate((p as any)?.createdAt ?? (p as any)?.created_at),
            updatedAt: normalizeIsoDate((p as any)?.updatedAt ?? (p as any)?.updated_at),
            currency: String((p as any)?.currency ?? (offerDetails as any)?.currency ?? "INR"),
            offerDetails,
            fullTimeOffer: isFullTimeProposal(p),
          };
        });

      const selectedLatestByInternId = new Map<string, any>();
      for (const row of selectedRowsRaw) {
        const internId = String((row as any)?.internId ?? "").trim();
        if (!internId) continue;
        const prev = selectedLatestByInternId.get(internId);
        if (!prev) {
          selectedLatestByInternId.set(internId, row);
          continue;
        }
        const prevT = prev?.updatedAt ? new Date(prev.updatedAt).getTime() : prev?.createdAt ? new Date(prev.createdAt).getTime() : 0;
        const curT = row?.updatedAt ? new Date(row.updatedAt).getTime() : row?.createdAt ? new Date(row.createdAt).getTime() : 0;
        if (curT >= prevT) selectedLatestByInternId.set(internId, row);
      }

      const selectedInterns = Array.from(selectedLatestByInternId.values()).sort((a: any, b: any) => {
        const ta = a?.updatedAt ? new Date(a.updatedAt).getTime() : a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b?.updatedAt ? new Date(b.updatedAt).getTime() : b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      return res.json({
        stats: {
          totalUsers: profileCompleteCount,
          totalSignups: allInternUsers.length,
          incompleteProfiles: incompleteProfileCount,
          activeCompanies,
          activeInternships,
          pendingApplications: scheduledInterviewCount,
          completedInterviews: completedInterviewsCount,
          proposalStatusCounts,
        },
        users: {
          items: previewUsers,
          total: internTotal,
          page: internPage,
          limit: internLimit,
        },
        internships: {
          items: previewProjects,
          total: projectTotal,
          page: projectPage,
          limit: projectLimit,
        },
        trendData,
        funnelData,
        hiredFullTimeInterns,
        hiredInternshipInterns,
        selectedInterns,
      });
    } catch (error) {
      console.error("Admin dashboard error:", error);
      return res.status(500).json({ message: "An error occurred while fetching dashboard" });
    }
  });

  app.get("/api/admin/metrics", requirePermission("dashboard:read"), async (_req, res) => {
    try {
      const [projects, employers] = await Promise.all([
        storage.getAllProjects(),
        storage.getEmployers(),
      ]);

      const totalProjects = projects.length;
      const fullTimeOfferCount = projects.reduce((acc, p: any) => acc + (p?.fullTimeOffer ? 1 : 0), 0);

      const hiringByEmployer = await Promise.all(
        employers.map(async (e: any) => {
          const employerId = String(e?.id ?? "").trim();
          const companyName = String(e?.companyName ?? e?.name ?? "").trim();
          if (!employerId) {
            return {
              employerId: "",
              companyName,
              acceptedCount: 0,
              averageDays: null as number | null,
              _durations: [] as number[],
            };
          }

          const proposals = await storage.getProposalsByEmployerId(employerId);
          const acceptedOrHired = (proposals ?? []).filter((p: any) => {
            const s = String(p?.status ?? "").trim().toLowerCase();
            return s === "accepted" || s === "hired";
          });
          
          const durations = acceptedOrHired
            .map((p: any) => {
              const created = p?.createdAt ? new Date(p.createdAt).getTime() : NaN;
              const updated = p?.updatedAt ? new Date(p.updatedAt).getTime() : NaN;
              
              if (!Number.isFinite(created) || !Number.isFinite(updated)) return null;
              
              const diffMs = updated - created;
              // If it was accepted/hired in less than 1 minute, assume 0.1 days for visibility if needed
              // or just return the actual difference.
              if (!Number.isFinite(diffMs)) return null;
              
              // We allow 0 days if it was instantaneous
              const days = Math.max(0, diffMs) / (1000 * 60 * 60 * 24);
              return days;
            })
            .filter((n): n is number => n !== null && Number.isFinite(n));

          const avg = durations.length
            ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
            : null;

          return {
            employerId,
            companyName,
            acceptedCount: durations.length,
            averageDays: avg,
            _durations: durations,
          };
        }),
      );

      const allDurations = hiringByEmployer.flatMap((r) => r._durations);
      const overallAverageDays = allDurations.length
        ? Math.round((allDurations.reduce((a, b) => a + b, 0) / allDurations.length) * 10) / 10
        : null;

      const employersSummary = hiringByEmployer
        .filter((r) => r.employerId)
        .map(({ _durations, ...rest }) => rest)
        .sort((a, b) => String(a.companyName).localeCompare(String(b.companyName)));

      return res.json({
        projects: {
          total: totalProjects,
          fullTimeOfferCount,
        },
        hiring: {
          overallAverageDays,
          employers: employersSummary,
        },
      });
    } catch (error) {
      console.error("Admin metrics error:", error);
      return res.status(500).json({ message: "An error occurred while fetching metrics" });
    }
  });

  const adminSendNotificationSchema = z.object({
    recipientType: z.enum(["intern", "employer"]),
    recipientId: z.string().optional().nullable(),
    recipientIds: z.array(z.string().min(1)).optional(),
    broadcast: z.boolean().optional().default(false),
    type: z.string().min(1).optional().default("custom"),
    title: z.string().min(1),
    message: z.string().min(1),
    data: z.record(z.any()).optional().default({}),
  });

  // Admin: send custom notification (single or broadcast)
  app.post("/api/admin/notifications", requirePermission("notifications:write"), async (req, res) => {
    try {
      const payload = adminSendNotificationSchema.parse(req.body);

      const recipientType = payload.recipientType;
      const broadcast = Boolean(payload.broadcast);

      const targets = new Set<string>();

      if (broadcast) {
        if (recipientType === "intern") {
          const users = await storage.getUsers();
          for (const u of users) {
            const id = String((u as any)?.id ?? "").trim();
            if (id) targets.add(id);
          }
        } else {
          const employers = await storage.getEmployers();
          for (const e of employers) {
            const id = String((e as any)?.id ?? "").trim();
            if (id) targets.add(id);
          }
        }
      } else {
        const list = Array.isArray(payload.recipientIds) ? payload.recipientIds : [];
        for (const id of list) {
          const v = String(id ?? "").trim();
          if (v) targets.add(v);
        }

        const single = String(payload.recipientId ?? "").trim();
        if (single) targets.add(single);
      }

      if (targets.size === 0) {
        return res.status(400).json({
          message: broadcast
            ? "No recipients found for broadcast"
            : "recipientId or recipientIds is required (or set broadcast=true)",
        });
      }

      const ids = Array.from(targets);

      const created: any[] = [];
      const chunkSize = 50;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const results = await Promise.all(
          chunk.map((recipientId) =>
            storage.createNotification({
              recipientType,
              recipientId,
              type: payload.type,
              title: payload.title,
              message: payload.message,
              data: payload.data ?? {},
              isRead: false,
            } as any),
          ),
        );
        created.push(...results);
      }

      return res.status(201).json({
        createdCount: created.length,
        notification: created[0] ?? null,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("Admin send notification error:", error);
      return res.status(500).json({ message: "An error occurred while sending notification" });
    }
  });

  // Admin: list all projects
  app.get("/api/admin/projects", requirePermission("companies:read"), async (_req, res) => {
    try {
      const [projects, employers] = await Promise.all([
        storage.getAllProjects(),
        storage.getEmployers(),
      ]);

      const employerById = new Map<string, any>();
      for (const e of employers) {
        employerById.set(String((e as any).id), e);
      }

      const mapped = projects.map((p) => {
        const e = employerById.get(String((p as any).employerId)) ?? null;
        return {
          ...p,
          employerCompanyName: (e as any)?.companyName ?? (e as any)?.name ?? null,
          employerName: (e as any)?.name ?? null,
        };
      });

      return res.json({ projects: mapped });
    } catch (error) {
      console.error("Admin list projects error:", error);
      return res.status(500).json({ message: "An error occurred while fetching projects" });
    }
  });

  app.get("/api/admin/employers", requirePermission("companies:read"), async (req, res) => {
    try {
      const profileStatus = String(req.query.profileStatus ?? "all").trim().toLowerCase();

      const [employers, projects, payments, proposals] = await Promise.all([
        storage.getEmployers(),
        storage.getAllProjects().catch(() => [] as any[]),
        storage.listAllEmployerPayments({ limit: 20000 }).catch(() => [] as any[]),
        storage.getAllProposals().catch(() => [] as any[]),
      ]);

      const proposalById = new Map<string, any>();
      for (const pr of proposals as any[]) {
        const id = String((pr as any)?.id ?? "").trim();
        if (id) proposalById.set(id, pr);
      }

      const visibleEmployers = (employers as any[]).filter((e) => {
        const id = String((e as any)?.id ?? "").trim();
        const email = String((e as any)?.companyEmail ?? "").trim().toLowerCase();
        if (id === "admin") return false;
        if (email === "ai-interview@findtern.ai") return false;

        if (profileStatus !== "all") {
          const isComplete = e.onboardingCompleted;
          if (profileStatus === "complete" && !isComplete) return false;
          if (profileStatus === "incomplete" && isComplete) return false;
        }

        return true;
      });

      console.log("Visible Employers:", visibleEmployers);

      const activeInternshipsByEmployerId = new Map<string, number>();
      const projectById = new Map<string, any>();
      const fullTimeProjectIds = new Set<string>();

      const isActiveProjectStatus = (status: unknown) => {
        const s = String(status ?? "").trim().toLowerCase();
        if (!s) return true;
        if (s === "inactive" || s === "closed" || s === "archived") return false;
        return true;
      };

      for (const p of projects as any[]) {
        const projectId = String((p as any)?.id ?? "").trim();
        if (projectId) projectById.set(projectId, p);

        const employerId = String((p as any)?.employerId ?? "").trim();
        const status = String((p as any)?.status ?? "").trim().toLowerCase();
        if (employerId && isActiveProjectStatus(status)) {
          activeInternshipsByEmployerId.set(
            employerId,
            (activeInternshipsByEmployerId.get(employerId) ?? 0) + 1,
          );
        }

        if ((p as any)?.fullTimeOffer === true && employerId && projectId) {
          fullTimeProjectIds.add(projectId);
        }
      }

      const lastPaymentAtByEmployerId = new Map<string, Date>();
      const upcomingPaymentByEmployerId = new Map<
        string,
        { createdAt: Date; amountMinor: number; currency: string; status: string }
      >();

      const totalBilledMinorByEmployerId = new Map<string, number>();
      const totalPaidMinorByEmployerId = new Map<string, number>();
      const totalDealMinorByEmployerId = new Map<string, number>();

      const paidOrdersByEmployerId = new Map<string, any[]>();

      const usdToInrRate = 100;
      const toInrMinorIfUsd = (amountMinor: number, currency: string) => {
        const cur = String(currency ?? "INR").trim().toUpperCase() || "INR";
        const minor = Number.isFinite(amountMinor) ? amountMinor : 0;
        if (cur !== "USD") return minor;
        const safeRate = Number.isFinite(usdToInrRate) && usdToInrRate > 0 ? usdToInrRate : 100;
        return Math.round(minor * safeRate);
      };

      const monthsFromDuration = (duration: unknown) => {
        switch (String(duration ?? "").trim().toLowerCase()) {
          case "2m":
            return 2;
          case "3m":
            return 3;
          case "6m":
            return 6;
          default:
            return 1;
        }
      };

      const addMonthsToIso = (iso: string, months: number) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "";
        const safeMonths = Number.isFinite(months) ? Math.max(0, Math.floor(months)) : 0;
        d.setMonth(d.getMonth() + safeMonths);
        if (Number.isNaN(d.getTime())) return "";
        return d.toISOString().slice(0, 10);
      };

      const orderPurpose = (o: any) => {
        const raw = (o as any)?.raw ?? {};
        const order = raw?.order ?? (o as any)?.order ?? {};
        const notes = order?.notes ?? {};
        return String(notes?.purpose ?? "").trim().toLowerCase();
      };

      const orderPaymentMode = (o: any) => {
        const raw = (o as any)?.raw ?? {};
        const order = raw?.order ?? (o as any)?.order ?? {};
        const notes = order?.notes ?? {};
        return String(notes?.paymentMode ?? "").trim().toLowerCase();
      };

      const orderProposalIds = (o: any) => {
        const raw = (o as any)?.raw ?? {};
        const order = raw?.order ?? (o as any)?.order ?? {};
        const notes = order?.notes ?? {};
        const ids = notes?.proposalIds ?? notes?.proposal_ids ?? [];
        return Array.isArray(ids) ? ids.map((v: any) => String(v ?? "").trim()).filter(Boolean) : [];
      };

      const isUpcomingPaymentStatus = (status: unknown) => {
        const s = String(status ?? "").trim().toLowerCase();
        return s === "created" || s === "pending";
      };

      const isBilledStatus = (status: unknown) => {
        const s = String(status ?? "").trim().toLowerCase();
        return s === "paid" || s === "created" || s === "pending";
      };

      for (const pay of payments as any[]) {
        const employerId = String((pay as any)?.employerId ?? "").trim();
        if (!employerId) continue;

        const status = String((pay as any)?.status ?? "").trim().toLowerCase();
        const createdRaw = (pay as any)?.createdAt ?? (pay as any)?.created_at ?? null;
        const paidRaw = (pay as any)?.paidAt ?? null;

        const rawPayload = (pay as any)?.raw ?? {};
        const rawOrder = rawPayload?.order ?? (pay as any)?.order ?? {};
        const rawNotes = rawOrder?.notes ?? {};

        const proposalIds = (() => {
          const ids = rawNotes?.proposalIds ?? rawNotes?.proposal_ids ?? [];
          return Array.isArray(ids) ? ids.map((v: any) => String(v ?? "").trim()).filter(Boolean) : [];
        })();

        const amountMinorRaw = Number((pay as any)?.amountMinor ?? (pay as any)?.amount_minor ?? 0);
        const computedMinorRaw = Number(rawNotes?.computedAmountMinor ?? rawNotes?.computed_amount_minor ?? 0);
        const resolvedMinorRaw = amountMinorRaw > 0 ? amountMinorRaw : computedMinorRaw;
        const amountMinor = Number.isFinite(resolvedMinorRaw) ? Math.max(0, Math.floor(resolvedMinorRaw)) : 0;
        const currency = String((pay as any)?.currency ?? rawOrder?.currency ?? "INR").trim().toUpperCase() || "INR";
        const amountMinorInr = toInrMinorIfUsd(amountMinor, currency);
        const currencyInr = currency === "USD" ? "INR" : currency;

        if (isBilledStatus(status) && amountMinorInr > 0) {
          totalBilledMinorByEmployerId.set(
            employerId,
            (totalBilledMinorByEmployerId.get(employerId) ?? 0) + amountMinorInr,
          );
        }

        

        if (status === "paid" && amountMinorInr > 0) {
          totalPaidMinorByEmployerId.set(
            employerId,
            (totalPaidMinorByEmployerId.get(employerId) ?? 0) + amountMinorInr,
          );

          const prev = paidOrdersByEmployerId.get(employerId) ?? [];
          prev.push(pay);
          paidOrdersByEmployerId.set(employerId, prev);
        }

        if (status === "paid") {
          const raw = paidRaw ?? createdRaw ?? null;
          if (raw) {
            const dt = new Date(raw);
            if (!Number.isNaN(dt.getTime())) {
              const prev = lastPaymentAtByEmployerId.get(employerId);
              if (!prev || dt.getTime() > prev.getTime()) {
                lastPaymentAtByEmployerId.set(employerId, dt);
              }
            }
          }
        }

        if (isUpcomingPaymentStatus(status)) {
          const createdFallback = createdRaw ?? rawOrder?.created_at ?? rawOrder?.createdAt ?? null;
          if (!createdFallback) continue;
          const createdAt = new Date(createdFallback);
          if (Number.isNaN(createdAt.getTime())) continue;

          const candidate = upcomingPaymentByEmployerId.get(employerId);
          if (!candidate || createdAt.getTime() < candidate.createdAt.getTime()) {
            upcomingPaymentByEmployerId.set(employerId, {
              createdAt,
              amountMinor: amountMinorInr,
              currency: currencyInr,
              status,
            });
          }
        }
      }

      const proposalsByEmployerId = new Map<string, any[]>();
      for (const pr of proposals as any[]) {
        const employerId = String((pr as any)?.employerId ?? (pr as any)?.employer_id ?? "").trim();
        if (!employerId) continue;
        const status = String((pr as any)?.status ?? "").trim().toLowerCase();
        if (status !== "hired") continue;
        const list = proposalsByEmployerId.get(employerId) ?? [];
        list.push(pr);
        proposalsByEmployerId.set(employerId, list);
      }

      const upcomingByEmployerId = new Map<string, { at: string; amountMinor: number; currency: string }>();
      for (const [employerId, list] of proposalsByEmployerId.entries()) {
        const paidOrders = paidOrdersByEmployerId.get(employerId) ?? [];
        let totalDealMinor = 0;

        for (const p of list) {
          const offer = ((p as any)?.offerDetails ?? (p as any)?.offer_details ?? {}) as any;
          const fullTimeOffer = (offer as any)?.fullTimeOffer ?? (offer as any)?.full_time_offer ?? null;
          const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";

          const startDate = String(offer?.startDate ?? offer?.start_date ?? "").trim();
          const duration = String(offer?.duration ?? "").trim();
          const rawMonthlyAmount = Number(offer?.monthlyAmount ?? offer?.monthly_amount ?? 0);
          const totalPrice = Number(offer?.totalPrice ?? offer?.total_price ?? 0);

          const currencyCode = String(
            (hasFullTimeOffer ? (fullTimeOffer as any)?.ctcCurrency : offer?.currency) ?? (p as any)?.currency ?? "INR",
          )
            .trim()
            .toUpperCase();
          const cur = currencyCode === "USD" ? "USD" : "INR";

          const annualCtc = Number((fullTimeOffer as any)?.annualCtc ?? (fullTimeOffer as any)?.annual_ctc ?? 0);
          const fullTimeFeeMajor =
            hasFullTimeOffer && Number.isFinite(annualCtc) && annualCtc > 0 ? Math.max(0, Math.round((annualCtc * 8.33) / 100)) : 0;

          const totalMonths = hasFullTimeOffer ? 1 : Math.max(1, monthsFromDuration(duration));
          const effectiveMonthlyAmount = hasFullTimeOffer
            ? fullTimeFeeMajor
            : Number.isFinite(rawMonthlyAmount) && rawMonthlyAmount > 0
              ? rawMonthlyAmount
              : Number.isFinite(totalPrice) && totalPrice > 0
                ? totalPrice / totalMonths
                : 0;

          const monthlyMinor = Math.round(Math.max(0, effectiveMonthlyAmount) * 100);
          const totalAmountMinorRaw = hasFullTimeOffer
            ? monthlyMinor
            : Number.isFinite(totalPrice) && totalPrice > 0
              ? Math.round(Math.max(0, totalPrice) * 100)
              : monthlyMinor * totalMonths;

          const proposalId = String((p as any)?.id ?? "").trim();

          const paidForProposal = paidOrders.filter((o: any) => {
            const ids = orderProposalIds(o);
            if (!ids.includes(proposalId)) return false;
            const purpose = orderPurpose(o);
            return purpose === "employer_monthly_payment" || purpose === "employer_checkout";
          });

          const checkoutTotalPaidForThisProposal = paidForProposal.some((o: any) => {
            if (orderPurpose(o) !== "employer_checkout") return false;
            if (orderPaymentMode(o) !== "total") return false;
            const ids = orderProposalIds(o);
            return ids.length === 1 && ids[0] === proposalId;
          });

          const discountEligible = checkoutTotalPaidForThisProposal && totalMonths > 1 && rawMonthlyAmount > 0;
          const totalAmountMinor = discountEligible ? Math.max(0, Math.round(totalAmountMinorRaw * 0.9)) : totalAmountMinorRaw;

          const paidAmountMinor = paidForProposal.reduce((sum: number, o: any) => {
            const raw = (o as any)?.raw ?? {};
            const order = raw?.order ?? (o as any)?.order ?? {};
            const notes = order?.notes ?? {};
            const curRaw = String((o as any)?.currency ?? order?.currency ?? "INR").trim().toUpperCase();
            const amt = Number((o as any)?.amountMinor ?? (o as any)?.amount_minor ?? notes?.computedAmountMinor ?? 0);
            const safe = Number.isFinite(amt) ? Math.max(0, amt) : 0;
            return sum + toInrMinorIfUsd(safe, curRaw);
          }, 0);

          const totalAmountMinorInr = toInrMinorIfUsd(totalAmountMinor, cur);
          totalDealMinor += totalAmountMinorInr;

          const dueAmountMinorInr = Math.max(0, totalAmountMinorInr - paidAmountMinor);
          if (dueAmountMinorInr <= 0) continue;

          const paidMonths = paidForProposal.filter((o: any) => orderPurpose(o) === "employer_monthly_payment").length;
          const upcomingDate = startDate ? addMonthsToIso(startDate, Math.max(1, paidMonths + 1)) : "";
          const upcomingInstallmentMinorInr = toInrMinorIfUsd(monthlyMinor, cur);

          if (upcomingDate) {
            const prev = upcomingByEmployerId.get(employerId);
            if (!prev || upcomingDate < prev.at) {
              upcomingByEmployerId.set(employerId, {
                at: upcomingDate,
                amountMinor: Math.min(dueAmountMinorInr, upcomingInstallmentMinorInr),
                currency: "INR",
              });
            }
          }
        }

        totalDealMinorByEmployerId.set(employerId, totalDealMinor);
      }

      const proposalTotalsByEmployerId = new Map<string, number>();
      const proposalSentByEmployerId = new Map<string, number>();
      const proposalAcceptedByEmployerId = new Map<string, number>();
      const proposalHiredByEmployerId = new Map<string, number>();
      const proposalRejectedByEmployerId = new Map<string, number>();
      const proposalExpiredByEmployerId = new Map<string, number>();

      const hiredInternIdsByEmployerId = new Map<string, Set<string>>();
      const hiredCountByEmployerId = new Map<string, number>();
      const fullTimeHiredCountByEmployerId = new Map<string, number>();
      for (const pr of proposals as any[]) {
        const employerId = String((pr as any)?.employerId ?? "").trim();
        if (!employerId) continue;

        const status = String((pr as any)?.status ?? "").trim().toLowerCase();
        proposalTotalsByEmployerId.set(employerId, (proposalTotalsByEmployerId.get(employerId) ?? 0) + 1);
        if (status === "sent") {
          proposalSentByEmployerId.set(employerId, (proposalSentByEmployerId.get(employerId) ?? 0) + 1);
        }
        if (status === "accepted" || status === "hired") {
          proposalAcceptedByEmployerId.set(employerId, (proposalAcceptedByEmployerId.get(employerId) ?? 0) + 1);
        }
        if (status === "rejected") {
          proposalRejectedByEmployerId.set(employerId, (proposalRejectedByEmployerId.get(employerId) ?? 0) + 1);
        }
        if (status === "expired" || status === "withdrawn") {
          proposalExpiredByEmployerId.set(employerId, (proposalExpiredByEmployerId.get(employerId) ?? 0) + 1);
        }
        if (status !== "hired") continue;
        proposalHiredByEmployerId.set(employerId, (proposalHiredByEmployerId.get(employerId) ?? 0) + 1);

        const internId = String((pr as any)?.internId ?? "").trim();
        const projectId = String((pr as any)?.projectId ?? "").trim();

        const set = hiredInternIdsByEmployerId.get(employerId) ?? new Set<string>();
        if (internId) set.add(internId);
        hiredInternIdsByEmployerId.set(employerId, set);

        hiredCountByEmployerId.set(employerId, (hiredCountByEmployerId.get(employerId) ?? 0) + 1);
        if (projectId && fullTimeProjectIds.has(projectId)) {
          fullTimeHiredCountByEmployerId.set(
            employerId,
            (fullTimeHiredCountByEmployerId.get(employerId) ?? 0) + 1,
          );
        }
      }

      const safeEmployers = (visibleEmployers as any[]).map((e) => {
        const { password, ...rest } = e as any;
        const employerId = String((rest as any)?.id ?? "").trim();
        const hiredResourcesCount = (hiredInternIdsByEmployerId.get(employerId) ?? new Set()).size;

        const hiredCount = hiredCountByEmployerId.get(employerId) ?? 0;
        const fullTimeHiredCount = fullTimeHiredCountByEmployerId.get(employerId) ?? 0;
        const conversionRate = hiredCount > 0 ? Math.round((fullTimeHiredCount / hiredCount) * 1000) / 10 : 0;

        const lastPaymentAt = lastPaymentAtByEmployerId.get(employerId);
        const upcoming = upcomingByEmployerId.get(employerId) ?? upcomingPaymentByEmployerId.get(employerId);

        const totalDealMinor = totalDealMinorByEmployerId.get(employerId) ?? 0;
        const totalPaidMinor = totalPaidMinorByEmployerId.get(employerId) ?? 0;
        const totalRemainingMinor = Math.max(0, totalDealMinor - totalPaidMinor);

        const proposalsTotal = proposalTotalsByEmployerId.get(employerId) ?? 0;
        const proposalsSent = proposalSentByEmployerId.get(employerId) ?? 0;
        const proposalsAccepted = proposalAcceptedByEmployerId.get(employerId) ?? 0;
        const proposalsHired = proposalHiredByEmployerId.get(employerId) ?? 0;
        const proposalsRejected = proposalRejectedByEmployerId.get(employerId) ?? 0;
        const proposalsExpired = proposalExpiredByEmployerId.get(employerId) ?? 0;

        return {
          ...rest,
          activeInternships: activeInternshipsByEmployerId.get(employerId) ?? 0,
          lastPaymentAt: lastPaymentAt ? lastPaymentAt.toISOString() : null,
          upcomingPaymentAt: upcoming ? ("at" in upcoming ? upcoming.at : upcoming.createdAt.toISOString()) : null,
          upcomingPaymentAmountMinor: upcoming ? upcoming.amountMinor : null,
          upcomingPaymentCurrency: upcoming ? upcoming.currency : null,
          upcomingPaymentStatus: upcoming ? upcoming.status : null,
          totalBilledAmountMinor: totalDealMinor,
          totalPaidAmountMinor: totalPaidMinor,
          totalRemainingAmountMinor: totalRemainingMinor,
          proposalsTotal,
          proposalsSent,
          proposalsAccepted,
          proposalsHired,
          proposalsRejected,
          proposalsExpired,
          totalHires: hiredCountByEmployerId.get(employerId) ?? 0,
          hiredResourcesCount,
          conversionRate,
        };
      });

      return res.json({ employers: safeEmployers });
    } catch (error) {
      console.error("Admin list employers error:", error);
      return res.status(500).json({ message: "An error occurred while fetching employers" });
    }
  });

  // Admin: list all projects
  app.get("/api/admin/projects", async (_req, res) => {
    try {
      const [projects, employers] = await Promise.all([
        storage.getAllProjects(),
        storage.getEmployers(),
      ]);

      const employerById = new Map<string, any>();
      for (const e of employers) {
        employerById.set(String((e as any).id), e);
      }

      const mapped = projects.map((p) => {
        const e = employerById.get(String((p as any).employerId)) ?? null;
        return {
          ...p,
          employerCompanyName: (e as any)?.companyName ?? (e as any)?.name ?? null,
          employerName: (e as any)?.name ?? null,
        };
      });

      return res.json({ projects: mapped });
    } catch (error) {
      console.error("Admin list projects error:", error);
      return res.status(500).json({ message: "An error occurred while fetching projects" });
    }
  });
  // Admin: get single employer
  app.get("/api/admin/employers/:id", requirePermission("companies:read"), async (req, res) => {
    const employer = await storage.getEmployer(req.params.id);
    if (!employer) {
      return res.status(404).json({ message: "Employer not found" });
    }
    const { password, ...safeEmployer } = employer;
    return res.json({ employer: safeEmployer });
  });

  app.post("/api/admin/employers/:id/toggle-active", async (req, res) => {
    try {
      const id = String(req.params.id ?? "").trim();
      if (!id) return res.status(400).json({ message: "Employer id is required" });

      const raw = (req.body as any)?.isActive;
      if (typeof raw !== "boolean") {
        return res.status(400).json({ message: "isActive (boolean) is required" });
      }

      const updated = await storage.updateEmployer(id, { isActive: raw } as any);
      if (!updated) return res.status(404).json({ message: "Employer not found" });

      const { password, ...safeEmployer } = updated as any;
      return res.json({ message: "Employer updated", employer: safeEmployer });
    } catch (error) {
      console.error("Admin toggle employer active error:", error);
      return res.status(500).json({ message: "An error occurred while updating employer" });
    }
  });

  app.post("/api/admin/employers/:id/international-fte/approve", async (req, res) => {
    try {
      const id = String(req.params.id ?? "").trim();
      if (!id) return res.status(400).json({ message: "Employer id is required" });

      const existing = await storage.getEmployer(id);
      if (!existing) return res.status(404).json({ message: "Employer not found" });

      const nextStatus = "approved";
      const updated = await storage.updateEmployer(id, {
        internationalFteStatus: nextStatus,
        internationalFteApprovedAt: new Date(),
      } as any);
      if (!updated) return res.status(404).json({ message: "Employer not found" });

      const { password, ...safeEmployer } = updated as any;
      return res.json({ message: "International FTE approved", employer: safeEmployer });
    } catch (error) {
      console.error("Admin approve International FTE error:", error);
      return res.status(500).json({ message: "An error occurred while approving International FTE" });
    }
  });

  app.post("/api/admin/employers/:id/international-fte/status", async (req, res) => {
    try {
      const id = String(req.params.id ?? "").trim();
      if (!id) return res.status(400).json({ message: "Employer id is required" });

      const statusRaw = String((req.body as any)?.status ?? "").trim().toLowerCase();
      const allowed = new Set(["none", "applied", "approved"]);
      if (!allowed.has(statusRaw)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const existing = await storage.getEmployer(id);
      if (!existing) return res.status(404).json({ message: "Employer not found" });

      const patch: any = {
        internationalFteStatus: statusRaw,
      };

      if (statusRaw === "approved") {
        patch.internationalFteApprovedAt = new Date();
      }

      if (statusRaw === "applied") {
        patch.internationalFteAppliedAt = new Date();
      }

      if (statusRaw === "none") {
        patch.internationalFteAppliedAt = null;
        patch.internationalFteApprovedAt = null;
      }

      const updated = await storage.updateEmployer(id, patch);
      if (!updated) return res.status(404).json({ message: "Employer not found" });

      const { password, ...safeEmployer } = updated as any;
      return res.json({ message: "International FTE status updated", employer: safeEmployer });
    } catch (error) {
      console.error("Admin update International FTE status error:", error);
      return res.status(500).json({ message: "An error occurred while updating International FTE status" });
    }
  });

  // Employer: change own password
  app.post("/api/employer/:id/change-password", async (req, res) => {
    try {
      const employerId = req.params.id;
      const body = changePasswordSchema.parse(req.body);

      const employer = await storage.getEmployer(employerId);
      if (!employer) {
        return res.status(404).json({ message: "Employer not found" });
      }

      if (employer.password !== body.currentPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      if (body.newPassword === body.currentPassword) {
        return res.status(400).json({ message: "New password must be different from current password" });
      }

      if (!isStrongPassword(body.newPassword)) {
        return res.status(400).json({
          message:
            "Password is too weak. Use at least 8 characters with uppercase, lowercase, number, and special character.",
        });
      }

      const updated = await storage.updateEmployer(employerId, {
        password: body.newPassword,
        passwordChangedAt: new Date(),
      } as any);

      if (!updated) {
        return res.status(404).json({ message: "Employer not found" });
      }

      const { password, ...safeEmployer } = updated;
      return res.json({
        message: "Password updated successfully",
        employer: safeEmployer,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("Employer change password error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while changing password" });
    }
  });

  app.post("/api/employer/:id/international-fte/apply", async (req, res) => {
    try {
      const employerId = String(req.params.id ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "employerId is required" });

      const existing = await storage.getEmployer(employerId);
      if (!existing) return res.status(404).json({ message: "Employer not found" });

      const cur = String((existing as any)?.internationalFteStatus ?? "none").trim().toLowerCase();
      const isAlready = cur === "applied" || cur === "approved";
      if (isAlready) {
        const { password, ...safeEmployer } = existing as any;
        return res.json({ message: "International FTE already requested", employer: safeEmployer });
      }

      const updated = await storage.updateEmployer(employerId, {
        internationalFteStatus: "applied",
        internationalFteAppliedAt: new Date(),
      } as any);
      if (!updated) return res.status(404).json({ message: "Employer not found" });

      const { password, ...safeEmployer } = updated as any;
      return res.json({ message: "International FTE applied", employer: safeEmployer });
    } catch (error) {
      console.error("Employer apply International FTE error:", error);
      return res.status(500).json({ message: "An error occurred while applying for International FTE" });
    }
  });

  // Intern/User: change own password
  app.post("/api/users/:id/change-password", async (req, res) => {
    try {
      const userId = req.params.id;
      const body = changePasswordSchema.parse(req.body);

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.password !== body.currentPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      if (body.newPassword === body.currentPassword) {
        return res.status(400).json({ message: "New password must be different from current password" });
      }

      if (!isStrongPassword(body.newPassword)) {
        return res.status(400).json({
          message:
            "Password is too weak. Use at least 8 characters with uppercase, lowercase, number, and special character.",
        });
      }

      const updated = await storage.updateUser(userId, {
        password: body.newPassword,
      } as any);

      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...safeUser } = updated as any;
      return res.json({
        message: "Password updated successfully",
        user: safeUser,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("User change password error:", error);
      return res.status(500).json({ message: "An error occurred while changing password" });
    }
  });

  // Admin: update employer
  app.put("/api/admin/employers/:id", async (req, res) => {
    const updated = await storage.updateEmployer(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ message: "Employer not found" });
    }
    const { password, ...safeEmployer } = updated;
    return res.json({ employer: safeEmployer });
  });

  // Admin: delete employer
  app.delete("/api/admin/employers/:id", async (req, res) => {
    await storage.deleteEmployer(req.params.id);
    return res.status(204).send();
  });

  // Employer: deactivate own account (hard delete for now)
  app.post("/api/employer/:id/deactivate", async (req, res) => {
    try {
      return res.status(403).json({
        message: "Deactivate account is disabled.",
      });
    } catch (error) {
      console.error("Employer deactivate error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while deactivating account" });
    }
  });

  // Intern/User: deactivate own account (hard delete for now)
  app.post("/api/users/:id/deactivate", async (req, res) => {
    try {
      const id = String(req.params.id ?? "").trim();
      if (!id) return res.status(400).json({ message: "User id is required" });

      const admin = (req.session as any)?.admin;
      if (!admin) {
        return res.status(403).json({ message: "Deactivate account is disabled." });
      }

      const user = await storage.getUser(id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const updated = await storage.updateUser(id, { isActive: false } as any);
      const { password, ...safe } = (updated ?? user) as any;
      return res.json({ message: "User deactivated", user: safe });
    } catch (error) {
      console.error("User deactivate error:", error);
      return res.status(500).json({ message: "An error occurred while deactivating account" });
    }
  });

  app.post("/api/users/:id/activate", async (req, res) => {
    try {
      const id = String(req.params.id ?? "").trim();
      if (!id) return res.status(400).json({ message: "User id is required" });

      const admin = (req.session as any)?.admin;
      if (!admin) return res.status(401).json({ message: "Admin login required" });

      const user = await storage.getUser(id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const updated = await storage.updateUser(id, { isActive: true } as any);
      const { password, ...safe } = (updated ?? user) as any;
      return res.json({ message: "User activated", user: safe });
    } catch (error) {
      console.error("User activate error:", error);
      return res.status(500).json({ message: "An error occurred while activating account" });
    }
  });

  // List projects for an employer
  app.get("/api/employer/:id/projects", async (req, res) => {
    const projects = await storage.getProjectsByEmployerId(req.params.id);
    return res.json({ projects });
  });

  // Create a project for an employer
  app.post("/api/employer/:id/projects", async (req, res) => {
    try {
      const employerId = req.params.id;
      const normalizedPincode = req.body.pincode ?? req.body.pinCode;
      const requestedName = String(req.body.projectName ?? "").trim();

      if (!requestedName) {
        return res.status(400).json({ message: "Project name is required" });
      }

      const existingProjects = await storage.getProjectsByEmployerId(employerId).catch(() => []);
      const requestedKey = requestedName.toLowerCase();
      const hasDuplicate = existingProjects.some((p: any) => {
        const name = String(p?.projectName ?? p?.project_name ?? "").trim().toLowerCase();
        return name && name === requestedKey;
      });
      if (hasDuplicate) {
        return res.status(409).json({ message: "Project name already exists. Please choose a unique name." });
      }

      const payload = {
        employerId,
        projectName: requestedName,
        skills: req.body.skills ?? [],
        scopeOfWork: req.body.scopeOfWork,
        fullTimeOffer: req.body.fullTimeOffer ?? false,
        locationType: req.body.locationType,
        preferredLocations: req.body.preferredLocations ?? [],
        pincode: normalizedPincode,
        city: req.body.city,
        state: req.body.state,
        timezone: req.body.timezone,
      } as any;

      const project = await storage.createProject(payload);
      return res.status(201).json({
        message: "Project created",
        project,
      });
    } catch (error) {
      console.error("Employer project create error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while creating project" });
    }
  });

  // Update a project
  app.put("/api/projects/:projectId", async (req, res) => {
    try {
      const projectId = String(req.params.projectId ?? "").trim();
      if (!projectId) {
        return res.status(400).json({ message: "projectId is required" });
      }

      const existing = await storage.getProject(projectId);
      if (!existing) {
        return res.status(404).json({ message: "Project not found" });
      }

      const employerId = String((existing as any)?.employerId ?? (existing as any)?.employer_id ?? "").trim();
      if ((req.body as any)?.projectName !== undefined || (req.body as any)?.project_name !== undefined) {
        const raw = (req.body as any)?.projectName ?? (req.body as any)?.project_name;
        const nextName = String(raw ?? "").trim();
        if (!nextName) {
          return res.status(400).json({ message: "Project name is required" });
        }

        const currentName = String((existing as any)?.projectName ?? (existing as any)?.project_name ?? "").trim();
        const changed = currentName.trim().toLowerCase() !== nextName.toLowerCase();
        if (changed && employerId) {
          const employerProjects = await storage.getProjectsByEmployerId(employerId).catch(() => []);
          const key = nextName.toLowerCase();
          const duplicate = employerProjects.some((p: any) => {
            const id = String(p?.id ?? "").trim();
            if (id && id === projectId) return false;
            const name = String(p?.projectName ?? p?.project_name ?? "").trim().toLowerCase();
            return name && name === key;
          });
          if (duplicate) {
            return res.status(409).json({ message: "Project name already exists. Please choose a unique name." });
          }
        }
      }

      const requestedStatusRaw = (req.body as any)?.status ?? (req.body as any)?.projectStatus;
      const requestedStatus = String(requestedStatusRaw ?? "").trim().toLowerCase();
      const wantsDeactivate = requestedStatus === "inactive";
      if (wantsDeactivate) {
        if (employerId) {
          const employerProjects = await storage.getProjectsByEmployerId(employerId).catch(() => []);
          const activeCount = employerProjects.filter((p: any) => {
            const id = String(p?.id ?? "").trim();
            if (id.toLowerCase() === projectId.toLowerCase()) return false;
            return String(p?.status ?? "active").trim().toLowerCase() !== "inactive";
          }).length;

          if (activeCount <= 0) {
            return res.status(400).json({ message: "At least one active project is required" });
          }
        }
      }

      const normalizeLocationType = (value: unknown) => {
        const v = String(value ?? "").trim().toLowerCase();
        if (v === "remote" || v === "hybrid" || v === "onsite") return v;
        return "";
      };

      const payload: any = { ...(req.body as any) };
      if (payload.location_type !== undefined && payload.locationType === undefined) {
        payload.locationType = payload.location_type;
      }
      delete payload.location_type;

      if (payload.locationType !== undefined) {
        const normalized = normalizeLocationType(payload.locationType);
        const raw = String(payload.locationType ?? "").trim();
        if (raw && !normalized) {
          return res.status(400).json({ message: "Invalid project location type" });
        }
        payload.locationType = normalized || null;
      }

      const updated = await storage.updateProject(projectId, payload);
      if (!updated) {
        return res.status(404).json({ message: "Project not found" });
      }
      return res.json({ message: "Project updated", project: updated });
    } catch (error) {
      console.error("Employer project update error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while updating project" });
    }
  });

  // Delete a project
  app.delete("/api/projects/:projectId", async (req, res) => {
    try {
      const projectId = String(req.params.projectId ?? "").trim();
      if (!projectId) {
        return res.status(400).json({ message: "projectId is required" });
      }

      const existing = await storage.getProject(projectId);
      if (!existing) {
        return res.status(404).json({ message: "Project not found" });
      }

      const employerId = String((existing as any)?.employerId ?? "").trim();
      if (employerId) {
        const [employerProposals, employerInterviews] = await Promise.all([
          storage.getProposalsByEmployerId(employerId).catch(() => [] as any[]),
          storage.getInterviewsByEmployerId(employerId).catch(() => [] as any[]),
        ]);

        const hasAnyProposal = (Array.isArray(employerProposals) ? employerProposals : []).some((p: any) => {
          return String(p?.projectId ?? "") === projectId;
        });

        const hasScheduledInterview = (Array.isArray(employerInterviews) ? employerInterviews : []).some((i: any) => {
          if (String(i?.projectId ?? "") !== projectId) return false;
          const rawStatus = String(i?.status ?? "").trim().toLowerCase();
          const selected = Number(i?.selectedSlot ?? i?.selected_slot);
          return rawStatus === "pending" || rawStatus === "scheduled" || selected === 1 || selected === 2 || selected === 3;
        });

        if (hasAnyProposal || hasScheduledInterview) {
          return res.status(409).json({
            message: "This project cannot be deleted because a meeting or proposal is already booked for it",
            code: "PROJECT_DELETE_BLOCKED",
          });
        }
      }

      await storage.deleteProject(projectId);
      return res.json({ message: "Project deleted", projectId });
    } catch (error) {
      console.error("Employer project delete error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while deleting project" });
    }
  });

  const employerCartSyncSchema = z.object({
    projectId: z.string().min(1),
    cartIds: z.array(z.string()).optional().default([]),
    checkoutIds: z.array(z.string()).optional().default([]),
  });

  const employerCartItemSchema = z.object({
    projectId: z.string().min(1),
    listType: z.enum(["cart", "checkout"]),
    internId: z.string().min(1),
  });

  // Employer cart: fetch cart/checkout ids for a project
  app.get("/api/employer/:employerId/cart", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      const projectId = String(req.query.projectId ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "employerId is required" });
      if (!projectId) return res.status(400).json({ message: "projectId is required" });

      const employer = await storage.getEmployer(employerId);
      if (!employer) return res.status(404).json({ message: "Employer not found" });

      const [cartIds, checkoutIds] = await Promise.all([
        storage.listEmployerCartInternIds(employerId, projectId, "cart"),
        storage.listEmployerCartInternIds(employerId, projectId, "checkout"),
      ]);

      return res.json({ projectId, cartIds, checkoutIds });
    } catch (error) {
      console.error("Employer cart fetch error:", error);
      return res.status(500).json({ message: "An error occurred while fetching cart" });
    }
  });

  // Employer cart: replace cart/checkout ids (used for migration and bulk updates)
  app.post("/api/employer/:employerId/cart/sync", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "employerId is required" });

      const employer = await storage.getEmployer(employerId);
      if (!employer) return res.status(404).json({ message: "Employer not found" });

      const body = employerCartSyncSchema.parse(req.body);
      const project = await storage.getProject(body.projectId).catch(() => undefined);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (String((project as any)?.employerId ?? "") !== employerId) {
        return res.status(403).json({ message: "Project does not belong to employer" });
      }

      const [cartIds, checkoutIds] = await Promise.all([
        storage.setEmployerCartInternIds(employerId, body.projectId, "cart", body.cartIds),
        storage.setEmployerCartInternIds(employerId, body.projectId, "checkout", body.checkoutIds),
      ]);

      return res.json({ message: "Cart synced", projectId: body.projectId, cartIds, checkoutIds });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Employer cart sync error:", error);
      return res.status(500).json({ message: "An error occurred while syncing cart" });
    }
  });

  // Employer cart: add single item
  app.post("/api/employer/:employerId/cart/items", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "employerId is required" });

      const employer = await storage.getEmployer(employerId);
      if (!employer) return res.status(404).json({ message: "Employer not found" });

      const body = employerCartItemSchema.parse(req.body);
      const project = await storage.getProject(body.projectId).catch(() => undefined);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (String((project as any)?.employerId ?? "") !== employerId) {
        return res.status(403).json({ message: "Project does not belong to employer" });
      }

      const item = await storage.addEmployerCartItem(employerId, body.projectId, body.listType, body.internId);
      if (!item) {
        return res.status(500).json({ message: "Failed to add to cart" });
      }
      return res.status(201).json({ message: "Added", item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Employer cart add item error:", error);
      return res.status(500).json({ message: "An error occurred while adding item" });
    }
  });

  // Employer cart: remove single item
  app.delete("/api/employer/:employerId/cart/items", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "employerId is required" });

      const employer = await storage.getEmployer(employerId);
      if (!employer) return res.status(404).json({ message: "Employer not found" });

      const body = employerCartItemSchema.parse(req.body);
      const project = await storage.getProject(body.projectId).catch(() => undefined);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (String((project as any)?.employerId ?? "") !== employerId) {
        return res.status(403).json({ message: "Project does not belong to employer" });
      }

      const ok = await storage.removeEmployerCartItem(employerId, body.projectId, body.listType, body.internId);
      return res.json({ message: "Removed", removed: ok });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Employer cart remove item error:", error);
      return res.status(500).json({ message: "An error occurred while removing item" });
    }
  });

  // Intern: list own interviews
  app.get("/api/intern/:internId/interviews", async (req, res) => {
    try {
      const internId = req.params.internId;
      const interviews = await storage.getInterviewsByInternId(internId);

      const employerIds = Array.from(
        new Set(
          (interviews ?? [])
            .map((i: any) => String(i?.employerId ?? "").trim())
            .filter(Boolean),
        ),
      );

      const employersById: Record<string, any> = {};
      await Promise.all(
        employerIds
          .filter((id) => id && id !== "admin")
          .map(async (id) => {
            const e = await storage.getEmployer(id).catch(() => undefined);
            if (e) employersById[id] = e as any;
          }),
      );

      const enriched = (interviews ?? []).map((i: any) => {
        const employerId = String(i?.employerId ?? "").trim();
        const employer = employerId && employerId !== "admin" ? employersById[employerId] : null;
        const employerName =
          employerId === "admin"
            ? "AI Interview"
            : String((employer as any)?.companyName ?? (employer as any)?.name ?? "").trim();

        return {
          ...i,
          employerName: employerName || null,
          employerCompanyName: employerName || null,
        };
      });

      return res.json({ interviews: enriched.map(serializeInterview) });
    } catch (error) {
      console.error("List intern interviews error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while fetching interviews" });
    }
  });

  // Intern: apply for AI interview (creates a waiting interview request that admin can act on)
  app.post("/api/intern/:internId/ai-interview/apply", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      if (!internId) {
        return res.status(400).json({ message: "internId is required" });
      }

      const onboarding = await storage.getInternOnboardingByUserId(internId);
      const isPaid = Boolean((onboarding as any)?.extraData?.payment?.isPaid);
      if (!isPaid) {
        return res.status(402).json({ message: "Payment required before applying for AI interview" });
      }

      const intern = await storage.getUser(internId);
      if (!intern) {
        return res.status(404).json({ message: "Intern not found" });
      }

      const existing = await storage.getInterviewsByInternId(internId);
      const latest = Array.isArray(existing) && existing.length > 0 ? existing[0] : null;
      const latestStatus = String(latest?.status ?? "").toLowerCase();

      if (latest && ["waiting", "pending", "scheduled"].includes(latestStatus)) {
        return res.status(409).json({
          message: "An interview request is already in progress",
          interview: serializeInterview(latest),
        });
      }

      await ensureAiInterviewEmployer();

      const created = await storage.createInterview({
        employerId: "admin",
        internId,
        projectId: null,
        status: "waiting",
        slot1: null,
        slot2: null,
        slot3: null,
        selectedSlot: null,
        timezone: "Asia/Kolkata",
        meetingLink: null,
        calendarEventId: null,
        notes: null,
      } as any);

      try {
        await storage.createNotificationDeduped({
          recipientType: "intern",
          recipientId: internId,
          type: "ai_interview_applied",
          title: "AI interview applied",
          message:
            "Thanks for applying for the AI interview, your AI interview link will be live in 24-48 hours.",
          data: {
            interviewId: (created as any)?.id ?? null,
          },
          dedupeKey: `ai_interview_applied:${String((created as any)?.id ?? "").trim()}`,
        } as any);
      } catch (notifyErr) {
        console.error("AI interview apply notification error:", notifyErr);
      }

      return res.status(201).json({
        message: "Applied for AI interview",
        interview: serializeInterview(created),
      });
    } catch (error) {
      console.error("Apply AI interview error:", error);
      return res.status(500).json({ message: "An error occurred while applying for AI interview" });
    }
  });

  // Admin: set/update interview meeting link
  const updateInterviewLinkSchema = z.object({
    meetingLink: z.string().min(1),
    notes: z.string().optional().nullable(),
  });

  app.put("/api/admin/interviews/:id/meeting-link", async (req, res) => {
    try {
      const interviewId = String(req.params.id ?? "").trim();
      if (!interviewId) {
        return res.status(400).json({ message: "Interview id is required" });
      }

      const before = await storage.getInterview(interviewId).catch(() => undefined);

      const body = updateInterviewLinkSchema.parse(req.body);

      const updated = await storage.updateInterviewMeetingLink(
        interviewId,
        body.meetingLink,
        body.notes ?? null,
      );
      if (!updated) {
        return res.status(404).json({ message: "Interview not found" });
      }

      try {
        const isAiInterview = String((before as any)?.employerId ?? (updated as any)?.employerId ?? "") === "admin";
        const wasEmpty = !String((before as any)?.meetingLink ?? "").trim();
        const hasLink = Boolean(String(body.meetingLink ?? "").trim());
        if (isAiInterview && wasEmpty && hasLink) {
          const internId = String((updated as any)?.internId ?? "").trim();
          if (internId) {
            await storage.createNotificationDeduped({
              recipientType: "intern",
              recipientId: internId,
              type: "ai_interview_unlocked",
              title: "AI interview unlocked",
              message: "🎤 Lights, camera, action! Your AI interview is unlocked.",
              data: { interviewId },
              dedupeKey: `ai_interview_unlocked:${interviewId}`,
            } as any);
          }
        }
      } catch (notifyErr) {
        console.error("AI interview unlocked notification error:", notifyErr);
      }

      const prevStatus = String((before as any)?.status ?? "").trim().toLowerCase();
      const shouldKeepStatus = ["completed", "expired", "cancelled", "canceled"].includes(prevStatus);
      const shouldSchedule = !shouldKeepStatus;

      const finalInterview = shouldSchedule
        ? await storage.updateInterviewStatus(interviewId, "scheduled")
        : updated;
      return res.json({
        message: "Interview link updated",
        interview: serializeInterview(finalInterview ?? updated),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("Admin update interview link error:", error);
      return res.status(500).json({ message: "An error occurred while updating interview link" });
    }
  });

  // Employer: create interview slots for an intern
  const createInterviewSchema = z.object({
    internId: z.string().min(1),
    projectId: z.string().nullable().optional(),
    timezone: z.string().min(1),
    slots: z.array(z.string().min(1)).length(3),
  });

  // Employer: list interviews (for schedule/cart pages)
  app.get("/api/employer/:employerId/interviews", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      if (!employerId) {
        return res.status(400).json({ message: "employerId is required" });
      }

      const employer = await storage.getEmployer(employerId);
      if (!employer) {
        return res.status(404).json({ message: "Employer not found" });
      }

      const list = await storage.getInterviewsByEmployerId(employerId);

      const projectIds = Array.from(
        new Set(
          (list ?? [])
            .map((i: any) => String(i?.projectId ?? "").trim())
            .filter(Boolean),
        ),
      );

      const projectsById: Record<string, any> = {};
      for (const pid of projectIds) {
        const p = await storage.getProject(pid).catch(() => undefined);
        if (p) projectsById[pid] = p;
      }

      const internIds = Array.from(
        new Set(
          (list ?? [])
            .map((i: any) => String(i?.internId ?? "").trim())
            .filter(Boolean),
        ),
      );

      const internsById: Record<string, any> = {};
      for (const iid of internIds) {
        const u = await storage.getUser(iid).catch(() => undefined);
        if (u) internsById[iid] = u;
      }

      const internDocs = await Promise.all(
        internIds.map(async (id) => {
          const docs = await storage.getInternDocumentsByUserId(id).catch(() => null);
          return { id, docs };
        }),
      );

      const internDocsById = internDocs.reduce<Record<string, any | null>>((acc, row) => {
        if (row?.id) acc[row.id] = row.docs ?? null;
        return acc;
      }, {});

      const interviews = (list ?? []).map((i: any) => {
        const intern = internsById[String(i?.internId ?? "").trim()] as any;
        const internName = intern
          ? `${intern.firstName ?? ""} ${intern.lastName ?? ""}`.trim() || "Intern"
          : "Intern";

        const internId = String(i?.internId ?? "").trim();
        const docs = internId ? internDocsById[internId] : null;

        const project = projectsById[String(i?.projectId ?? "").trim()] as any;
        const projectName = project?.projectName ?? null;

        return {
          ...serializeInterview(i),
          internName,
          projectName,
          internProfilePhotoName: String(docs?.profilePhotoName ?? "") || null,
          intern: intern
            ? {
                id: internId,
                firstName: (intern as any).firstName ?? null,
                lastName: (intern as any).lastName ?? null,
                fullName: internName,
                profilePhotoName: String(docs?.profilePhotoName ?? "") || null,
              }
            : null,
        };
      });

      return res.json({ interviews });
    } catch (error) {
      console.error("List employer interviews error:", error);
      return res.status(500).json({ message: "An error occurred while fetching interviews" });
    }
  });

  const upsertInterviewFeedbackSchema = z.object({
    feedbackText: z.string().trim().min(1).max(2000),
  });

  app.post("/api/interviews/:id/feedback", async (req, res) => {
    try {
      const interviewId = String(req.params.id ?? "").trim();
      if (!interviewId) return res.status(400).json({ message: "Interview id is required" });

      const body = upsertInterviewFeedbackSchema.parse(req.body);

      const interview = await storage.getInterview(interviewId).catch(() => undefined);
      if (!interview) return res.status(404).json({ message: "Interview not found" });

      const existingNotes = String((interview as any)?.notes ?? "");
      const lines = existingNotes
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const hasExistingFeedback = lines.some((l) => l.toLowerCase().startsWith("feedback_text:"));
      if (hasExistingFeedback) {
        return res.status(409).json({ message: "Feedback already submitted" });
      }

      const nextLines = lines.filter((l) => !l.toLowerCase().startsWith("feedback_text:"));
      nextLines.push(`feedback_text: ${String(body.feedbackText).trim()}`);

      const updated = await storage.updateInterviewNotes(interviewId, nextLines.join("\n"));
      if (!updated) return res.status(404).json({ message: "Interview not found" });

      const updatedWithStatus = await (async () => {
        try {
          const nextStatus = String((updated as any)?.status ?? "").trim().toLowerCase();
          if (nextStatus !== "completed") {
            const completed = await storage.updateInterviewStatus(interviewId, "completed");
            return completed ?? updated;
          }
        } catch {
          // ignore
        }
        return updated;
      })();

      try {
        const internId = String((interview as any)?.internId ?? "").trim();
        if (internId) {
          await storage.createNotificationDeduped({
            recipientType: "intern",
            recipientId: internId,
            type: "interview_feedback",
            title: "Interview feedback",
            message: "You have received feedback on your interview, have a look :)",
            data: {
              interviewId,
            },
            dedupeKey: `interview_feedback:${interviewId}`,
          } as any);
        }
      } catch (notifyErr) {
        console.error("Interview feedback notification error:", notifyErr);
      }

      return res.json({
        message: "Feedback saved",
        interview: serializeInterview(updatedWithStatus),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Save interview feedback error:", error);
      return res.status(500).json({ message: "An error occurred while saving feedback" });
    }
  });

  app.post("/api/employer/:employerId/interviews", async (req, res) => {
    try {
      const employerId = req.params.employerId;

      const employer = await storage.getEmployer(employerId);
      if (!employer) {
        return res.status(404).json({ message: "Employer not found" });
      }

      const data = createInterviewSchema.parse(req.body);

      const intern = await storage.getUser(data.internId);
      if (!intern) {
        return res.status(404).json({ message: "Intern not found" });
      }

      const project = data.projectId
        ? await storage.getProject(data.projectId).catch(() => undefined)
        : undefined;
      const projectName = project?.projectName ?? null;

      const latestExisting = await storage.getLatestInterviewForEmployerInternProject(
        employerId,
        data.internId,
        data.projectId ?? null,
      );

      if (latestExisting && (latestExisting.status === "pending" || latestExisting.status === "scheduled")) {
        return res.status(409).json({
          message: "Cannot send a proposal while interview confirmation is pending",
          interview: serializeInterview(latestExisting),
        });
      }

      const parsedSlots = data.slots.map((s) => parseInterviewSlotToUtcDate(s, data.timezone));
      if (parsedSlots.some((d) => !d || Number.isNaN(d.getTime()))) {
        return res.status(400).json({ message: "One or more slots are invalid" });
      }

      const internName = `${intern.firstName ?? ""} ${intern.lastName ?? ""}`.trim() || "Intern";
      const employerName = employer.companyName || employer.name || "Employer";

      let meetLinkWarning: string | null = null;
      let meetConnectUrl: string | null = null;
      if (!(await isGoogleConnectedForFindtern())) {
        meetLinkWarning = "Findtern Google Calendar is not connected";
        meetConnectUrl = getFindternGoogleConnectUrl();
      }

      const interview = await storage.createInterview({
        employerId,
        internId: data.internId,
        projectId: data.projectId ?? null,
        timezone: data.timezone,
        status: "pending",
        slot1: parsedSlots[0] as any,
        slot2: parsedSlots[1] as any,
        slot3: parsedSlots[2] as any,

        selectedSlot: null,
        meetingLink: null,
        notes: null,
      } as any);

      try {
        const msg = formatNotification(
          "⏰ Hey [Name], your interview is still pending. Confirm your time now!",
          { Name: internName },
        );

        await storage.createNotification({
          recipientType: "intern",
          recipientId: data.internId,
          type: "interview_pending",
          title: "Interview pending",
          message: msg,
          data: {
            interviewId: interview.id,
            internId: data.internId,
            employerId,
            projectId: data.projectId ?? null,
            projectName,
            internName,
            employerName,
          },
          isRead: false,
        } as any);
      } catch (notifyErr) {
        console.error("Create interview pending notification error:", notifyErr);
      }

      try {
        const internEmail = String((intern as any)?.email ?? "").trim();
        if (internEmail) {
          await sendInterviewInvitationEmail({
            to: internEmail,
            internName,
            employerName,
            projectName,
            timezone: data.timezone,
            slotsUtc: parsedSlots.filter(Boolean) as Date[],
            interviewId: String((interview as any)?.id ?? "").trim(),
            appBaseUrl: getAppBaseUrl(req),
          });
        }
      } catch (mailErr) {
        console.error("Send interview invitation email error:", mailErr);
      }

      return res.status(201).json({
        message: "Interview slots created",
        interview: serializeInterview(interview),
        meet: {
          created: false,
          warning: meetLinkWarning,
          connectUrl: meetConnectUrl,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("Create interview slots error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while creating interview slots" });
    }
  });

  // Intern: select a slot
  const selectSlotSchema = z.object({
    slot: z.number().int().min(1).max(3),
  });

  app.post("/api/interviews/:id/select-slot", async (req, res) => {
    try {
      const interviewId = req.params.id;
      const body = selectSlotSchema.parse(req.body);

      const existing = await storage.getInterview(interviewId);
      if (!existing) {
        return res.status(404).json({ message: "Interview not found" });
      }

      const project = existing.projectId
        ? await storage.getProject(existing.projectId).catch(() => undefined)
        : undefined;
      const projectName = project?.projectName ?? null;

      const slotKey = `slot${body.slot}` as keyof typeof existing;
      const slotValue = (existing as any)[slotKey];
      if (!slotValue) {
        return res.status(400).json({ message: "Selected slot time is not set" });
      }

      const startTime = new Date(slotValue as any);
      if (Number.isNaN(startTime.getTime())) {
        return res.status(400).json({ message: "Selected slot time is invalid" });
      }

      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      const timezone =
        String(existing.timezone ?? "").trim() ||
        String((project as any)?.timezone ?? "").trim() ||
        "UTC";

      const employer = await storage.getEmployer(existing.employerId).catch(() => undefined);
      const intern = await storage.getUser(existing.internId).catch(() => undefined);

      const internEmail = String((intern as any)?.email ?? "").trim();
      const employerEmail = String((employer as any)?.companyEmail ?? (employer as any)?.email ?? "").trim();

      const internName = intern
        ? `${intern.firstName ?? ""} ${intern.lastName ?? ""}`.trim() || "Intern"
        : "Intern";
      const employerName = employer?.companyName || employer?.name || "Employer";

      let meetingLink = existing.meetingLink || null;
      let calendarEventId: string | null = existing.calendarEventId || null;
      let meetLinkWarning: string | null = null;
      let meetConnectUrl: string | null = null;
      if (!meetingLink) {
        if (!(await isGoogleConnectedForFindtern())) {
          meetLinkWarning = "Findtern Google Calendar is not connected";
          meetConnectUrl = getFindternGoogleConnectUrl();
          meetingLink = null;
        } else {
          try {
            const attendees = Array.from(
              new Set([internEmail, employerEmail].map((s) => String(s ?? "").trim()).filter(Boolean)),
            ).map((email) => ({ email }));

            const { meetingLink: createdLink, eventId } = await createGoogleMeetLinkForFindtern({
              summary: "Findtern Interview",
              description: "Interview scheduled via Findtern",
              startTime,
              endTime,
              timezone,
              attendees,
            });
            meetingLink = createdLink;
            calendarEventId = eventId ?? null;
          } catch (meetError) {
            const info = formatGoogleApiError(meetError);
            meetLinkWarning = `${info.message}${info.status ? ` (status ${info.status})` : ""}${info.reason ? ` [${info.reason}]` : ""}`;
            if (info.message.includes("Findtern Google Calendar is not connected")) {
              meetConnectUrl = getFindternGoogleConnectUrl();
            } else {
              console.error("Create meeting link during slot selection error:", meetError);
            }
            meetingLink = null;
            calendarEventId = null;
          }
        }
      }

      const scheduled = await storage.updateInterviewScheduleWithMeetingLink(
        interviewId,
        body.slot,
        meetingLink,
        calendarEventId,
      );

      if (!scheduled) {
        return res.status(404).json({ message: "Interview not found" });
      }

      try {
        const internMsg = formatNotification(
          "✅ Your meeting is set! Check details and get ready, [Name].",
          { Name: internName },
        );

        await storage.createNotification({
          recipientType: "intern",
          recipientId: existing.internId,
          type: "meeting_scheduled",
          title: "Meeting scheduled",
          message: internMsg,
          data: {
            interviewId: existing.id,
            internId: existing.internId,
            employerId: existing.employerId,
            projectId: existing.projectId ?? null,
            projectName,
            meetingLink: scheduled.meetingLink ?? null,
            internName,
            employerName,
          },
          isRead: false,
        } as any);

        const employerMsg = formatNotification(
          "✅ Your meeting with the candidate is now scheduled.",
          {},
        );

        await storage.createNotification({
          recipientType: "employer",
          recipientId: existing.employerId,
          type: "meeting_scheduled",
          title: "Meeting scheduled",
          message: employerMsg,
          data: {
            interviewId: existing.id,
            internId: existing.internId,
            employerId: existing.employerId,
            projectId: existing.projectId ?? null,
            projectName,
            meetingLink: scheduled.meetingLink ?? null,
            internName,
            employerName,
          },
          isRead: false,
        } as any);
      } catch (notifyErr) {
        console.error("Create meeting scheduled notification error:", notifyErr);
      }

      const interviewWithEmployerName = {
        ...scheduled,
        employerName,
      };

      return res.json({
        message: "Slot selected",
        interview: serializeInterview(interviewWithEmployerName),
        meet: {
          created: Boolean(meetingLink),
          warning: meetLinkWarning,
          connectUrl: meetConnectUrl,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("Select interview slot error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while selecting interview slot" });
    }
  });

  // Employer: reschedule (reset to pending, clear selected slot)
  app.post("/api/interviews/:id/reschedule", async (req, res) => {
    try {
      const interviewId = req.params.id;

      const before = await storage.getInterview(interviewId).catch(() => undefined);

      const updated = await storage.resetInterviewToPending(interviewId);
      if (!updated) {
        return res.status(404).json({ message: "Interview not found" });
      }

      try {
        const internId = String((before as any)?.internId ?? (updated as any)?.internId ?? "").trim();
        const employerId = String((before as any)?.employerId ?? (updated as any)?.employerId ?? "").trim();

        if (internId) {
          const intern = await storage.getUser(internId).catch(() => undefined);
          const internName = intern
            ? `${String((intern as any)?.firstName ?? "").trim()} ${String((intern as any)?.lastName ?? "").trim()}`.trim() || "Intern"
            : "Intern";

          await storage.createNotificationDeduped({
            recipientType: "intern",
            recipientId: internId,
            type: "interview_rescheduled_by_employer",
            title: "Interview rescheduled",
            message: formatNotification("🔄 Heads up, [Name] — your interview has been rescheduled.", { Name: internName }),
            data: {
              interviewId,
              employerId: employerId || null,
              internId,
            },
            dedupeKey: `interview_rescheduled_by_employer:${interviewId}:${new Date().toISOString().slice(0, 10)}`,
            isRead: false,
          } as any);
        }
      } catch (notifyErr) {
        console.error("Reschedule interview notification error:", notifyErr);
      }

      return res.json({
        message: "Interview reset to pending",
        interview: updated,
      });
    } catch (error) {
      console.error("Reschedule interview error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while rescheduling interview" });
    }
  });

  // Intern: request reschedule (reset to pending, clear selected slot)
  app.post("/api/interviews/:id/reschedule-by-intern", async (req, res) => {
    try {
      const interviewId = String(req.params.id ?? "").trim();
      if (!interviewId) return res.status(400).json({ message: "Interview id is required" });

      const before = await storage.getInterview(interviewId).catch(() => undefined);

      const updated = await storage.resetInterviewToPending(interviewId);
      if (!updated) {
        return res.status(404).json({ message: "Interview not found" });
      }

      try {
        const internId = String((before as any)?.internId ?? (updated as any)?.internId ?? "").trim();
        const employerId = String((before as any)?.employerId ?? (updated as any)?.employerId ?? "").trim();

        if (employerId && employerId !== "admin") {
          await storage.createNotificationDeduped({
            recipientType: "employer",
            recipientId: employerId,
            type: "interview_reschedule_requested_by_intern",
            title: "Reschedule requested",
            message: "🔄 Candidate requested to reschedule the interview. Review now.",
            data: {
              interviewId,
              employerId,
              internId: internId || null,
            },
            dedupeKey: `interview_reschedule_requested_by_intern:${interviewId}:${new Date().toISOString().slice(0, 10)}`,
            isRead: false,
          } as any);
        }
      } catch (notifyErr) {
        console.error("Intern reschedule request notification error:", notifyErr);
      }

      return res.json({
        message: "Interview reset to pending",
        interview: updated,
      });
    } catch (error) {
      console.error("Intern reschedule request error:", error);
      return res.status(500).json({ message: "An error occurred while rescheduling interview" });
    }
  });

  app.post("/api/interviews/:id/send-reminder", async (req, res) => {
    try {
      const interviewId = String(req.params.id ?? "").trim();
      if (!interviewId) {
        return res.status(400).json({ message: "Interview id is required" });
      }

      const interview = await storage.getInterview(interviewId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      const internId = String((interview as any)?.internId ?? "").trim();
      if (!internId) {
        return res.status(400).json({ message: "Interview has no intern" });
      }

      const employerId = String((interview as any)?.employerId ?? "").trim();

      const intern = await storage.getUser(internId).catch(() => undefined);
      const employer = employerId ? await storage.getEmployer(employerId).catch(() => undefined) : undefined;

      const internName = intern
        ? `${(intern as any).firstName ?? ""} ${(intern as any).lastName ?? ""}`.trim() || "Intern"
        : "Intern";
      const employerName = employer?.companyName || employer?.name || "Employer";

      const isScheduled = (interview as any)?.status === "scheduled" && Boolean((interview as any)?.selectedSlot);

      if (isScheduled) {
        await storage.createNotificationDeduped({
          recipientType: "intern",
          recipientId: internId,
          type: "interview_reminder",
          title: "Interview reminder",
          message: "⏰ Reminder: your interview is coming up. Please be ready!",
          data: {
            interviewId,
            employerId: employerId || null,
          },
          dedupeKey: `manual_interview_reminder:${interviewId}:intern`,
        } as any);

        if (employerId && employerId !== "admin") {
          await storage.createNotificationDeduped({
            recipientType: "employer",
            recipientId: employerId,
            type: "interview_reminder",
            title: "Interview reminder",
            message: "⏰ Reminder: your interview is coming up.",
            data: {
              interviewId,
              internId,
            },
            dedupeKey: `manual_interview_reminder:${interviewId}:employer`,
          } as any);
        }
      } else {
        const msg = formatNotification(
          "⏰ Reminder: please confirm your interview slot now, [Name]!",
          { Name: internName },
        );

        await storage.createNotification({
          recipientType: "intern",
          recipientId: internId,
          type: "interview_pending",
          title: "Interview pending",
          message: msg,
          data: {
            interviewId,
            internId,
            employerId: employerId || null,
            employerName,
            internName,
          },
          isRead: false,
        } as any);
      }

      return res.json({ message: "Reminder sent" });
    } catch (error) {
      console.error("Send interview reminder error:", error);
      return res.status(500).json({ message: "An error occurred while sending reminder" });
    }
  });

  // Mark interview as missed (after selected slot + 15 min grace window)
  app.post("/api/interviews/:id/mark-missed", async (req, res) => {
    try {
      const interviewId = req.params.id;

      const interview = await storage.getInterview(interviewId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      if (interview.status !== "scheduled") {
        return res.status(400).json({ message: "Only scheduled interviews can be marked as missed" });
      }

      if (!interview.selectedSlot) {
        return res.status(400).json({ message: "No selected slot to evaluate for missed status" });
      }

      const selectedKey = `slot${interview.selectedSlot}` as keyof typeof interview;
      const slotValue = interview[selectedKey];

      if (!slotValue) {
        return res.status(400).json({ message: "Selected slot time is not set" });
      }

      const slotTime = new Date(slotValue as any);
      if (Number.isNaN(slotTime.getTime())) {
        return res.status(400).json({ message: "Selected slot time is invalid" });
      }

      const now = new Date();
      const graceMs = 15 * 60 * 1000;

      if (now.getTime() <= slotTime.getTime() + graceMs) {
        return res.status(400).json({ message: "Interview slot has not passed the grace window yet" });
      }

      const updated = await storage.updateInterviewStatus(interviewId, "missed");
      if (!updated) {
        return res.status(404).json({ message: "Interview not found" });
      }

      return res.json({
        message: "Interview marked as missed",
        interview: updated,
      });
    } catch (error) {
      console.error("Mark interview missed error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while marking interview as missed" });
    }
  });

  // ---------------------------------------------
  // Intern Onboarding Endpoints
  // ---------------------------------------------

  // Save/Update intern onboarding data
  app.post("/api/onboarding", async (req, res) => {
    try {
      const { userId, userEmail, ...rawOnboardingData } = req.body;

      if (!userId && !userEmail) {
        return res.status(400).json({ message: "User ID or userEmail is required" });
      }

      // Helper function to safely parse and ensure correct type
      const ensureArray = (val: any, fieldName: string): any[] => {
        console.log(`ensureArray[${fieldName}]: Input type=${typeof val}, isArray=${Array.isArray(val)}, value:`, JSON.stringify(val));

        // If it's already an array, return it
        if (Array.isArray(val)) {
          console.log(`ensureArray[${fieldName}]: Already array, returning as-is`);
          return val;
        }

        // If it's null or undefined, return empty array
        if (val == null) {
          console.log(`ensureArray[${fieldName}]: Value is null/undefined, returning empty array`);
          return [];
        }

        // If it's a JSON string, parse it
        if (typeof val === 'string') {
          // Check if it looks like JSON
          if (val.startsWith('[') || val.startsWith('{')) {
            try {
              const parsed = JSON.parse(val);
              console.log(`ensureArray[${fieldName}]: Parsed JSON string to:`, parsed);
              if (Array.isArray(parsed)) return parsed;
              if (typeof parsed === 'object') return [parsed];
            } catch (e) {
              console.log(`ensureArray[${fieldName}]: Failed to parse JSON string, error:`, e);
            }
          } else {
            console.log(`ensureArray[${fieldName}]: String doesn't look like JSON, treating as single value`);
            return [val];
          }
        }

        // If it's an object (but not an array), wrap it
        if (typeof val === 'object') {
          console.log(`ensureArray[${fieldName}]: Is object, wrapping in array`);
          return [val];
        }

        // Return empty array as fallback
        console.log(`ensureArray[${fieldName}]: Unexpected type, returning empty array`);
        return [];
      };

      // Helper function to safely handle objects
      const ensureObject = (val: any, fieldName: string): Record<string, any> => {
        console.log(`ensureObject[${fieldName}]: Input type=${typeof val}, isArray=${Array.isArray(val)}, value:`, JSON.stringify(val));

        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          console.log(`ensureObject[${fieldName}]: Already object, returning as-is`);
          return val;
        }

        if (val == null) {
          console.log(`ensureObject[${fieldName}]: Value is null/undefined, returning empty object`);
          return {};
        }

        if (typeof val === 'string') {
          if (val.startsWith('{') || val.startsWith('[')) {
            try {
              const parsed = JSON.parse(val);
              console.log(`ensureObject[${fieldName}]: Parsed JSON string to:`, parsed);
              if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
            } catch (e) {
              console.log(`ensureObject[${fieldName}]: Failed to parse JSON string, error:`, e);
            }
          }
        }

        console.log(`ensureObject[${fieldName}]: Unexpected type, returning empty object`);
        return {};
      };

      const normalizeStringArray = (input: any[], fieldName: string): string[] => {
        const out: string[] = [];
        for (const item of input) {
          if (typeof item === "string") {
            const v = item.trim();
            if (v) out.push(v);
            continue;
          }

          if (item && typeof item === "object") {
            const asAny = item as any;
            const fromValue = typeof asAny.value === "string" ? asAny.value.trim() : "";
            const fromType = typeof asAny.type === "string" ? asAny.type.trim() : "";
            const fromCity = typeof asAny.city === "string" ? asAny.city.trim() : "";

            const v = fromValue || fromType || fromCity;
            if (v) out.push(v);
            continue;
          }
        }

        const deduped: string[] = [];
        const seen = new Set<string>();
        for (const v of out) {
          const key = v.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push(v);
        }

        console.log(`normalizeStringArray[${fieldName}]:`, deduped);
        return deduped;
      };

      console.log("Raw request body:", JSON.stringify(rawOnboardingData, null, 2));

      // Ensure arrays and objects are properly formatted
      const locationTypesRaw = ensureArray(rawOnboardingData.locationTypes, "locationTypes");
      const preferredLocationsRaw = ensureArray(rawOnboardingData.preferredLocations, "preferredLocations");

      const onboardingData = {
        ...rawOnboardingData,
        // Accept both `pinCode` (intern schema) and `pincode` (employer/project schema) for consistency
        pinCode: rawOnboardingData.pinCode ?? rawOnboardingData.pincode ?? null,
        experienceJson: ensureArray(rawOnboardingData.experienceJson, "experienceJson"),
        skills: ensureArray(rawOnboardingData.skills, "skills"),
        locationTypes: normalizeStringArray(locationTypesRaw, "locationTypes"),
        preferredLocations: normalizeStringArray(preferredLocationsRaw, "preferredLocations"),
        extraData: ensureObject(rawOnboardingData.extraData, "extraData"),
      };

      const aadhaarNorm = String((onboardingData as any)?.aadhaarNumber ?? "")
        .replace(/\s+/g, "")
        .trim()
        .toUpperCase();
      const panNorm = String((onboardingData as any)?.panNumber ?? "")
        .replace(/\s+/g, "")
        .trim()
        .toUpperCase();

      (onboardingData as any).aadhaarNumber = aadhaarNorm || null;
      (onboardingData as any).panNumber = panNorm || null;
      if (aadhaarNorm && panNorm && aadhaarNorm === panNorm) {
        return res.status(400).json({ message: "Aadhaar and PAN number cannot be the same" });
      }

      const requiresPreferredLocations =
        Array.isArray(onboardingData.locationTypes) &&
        (onboardingData.locationTypes.includes("hybrid") || onboardingData.locationTypes.includes("onsite"));

      if (requiresPreferredLocations) {
        if (!Array.isArray(onboardingData.preferredLocations) || onboardingData.preferredLocations.length === 0) {
          return res.status(400).json({ message: "Preferred location is required" });
        }
      }

      const requiresLaptop = true;
      if (requiresLaptop && typeof (onboardingData as any).hasLaptop !== "boolean") {
        return res.status(400).json({ message: "Laptop information is required" });
      }

      console.log("Processed onboarding data:", JSON.stringify(onboardingData, null, 2));

      // Resolve effective user ID: prefer `userId`, fall back to lookup by `userEmail` if provided
      let effectiveUserId = userId;
      if (!effectiveUserId && userEmail) {
        const found = await storage.getUserByEmail(userEmail);
        if (!found) {
          return res.status(400).json({ message: "User not found for provided email. Please sign up or provide a valid email." });
        }
        effectiveUserId = found.id;
      }

      const extraData = ((onboardingData as any)?.extraData ?? {}) as Record<string, any>;
      const emergencyCountryCode = String(extraData?.emergencyCountryCode ?? "").trim();
      const emergencyPhoneDigits = String(extraData?.emergencyPhone ?? "").trim().replace(/\D/g, "");
      const secondPocCountryCode = String(extraData?.secondPocCountryCode ?? "").trim();
      const secondPocPhoneDigits = String(extraData?.secondPocPhone ?? "").trim().replace(/\D/g, "");

      if (emergencyCountryCode && emergencyPhoneDigits) {
        const existingPhoneUser = await storage
          .getUserByCountryCodeAndPhoneNumber(emergencyCountryCode, emergencyPhoneDigits)
          .catch(() => undefined);
        if (existingPhoneUser && String(existingPhoneUser.id) !== String(effectiveUserId)) {
          return res.status(409).json({ message: "Phone number already in use" });
        }

        const existingPhoneEmployer = await storage
          .getEmployerByCountryCodeAndPhoneNumber(emergencyCountryCode, emergencyPhoneDigits)
          .catch(() => undefined);
        if (existingPhoneEmployer) {
          return res.status(409).json({ message: "Phone number already in use" });
        }

        const emergencyInUse = await storage
          .isInternEmergencyContactInUse(emergencyCountryCode, emergencyPhoneDigits, String(effectiveUserId))
          .catch(() => false);
        if (emergencyInUse) {
          return res.status(409).json({ message: "Phone number already in use" });
        }

        const secondPocInUse = await storage
          .isInternSecondPocContactInUse(emergencyCountryCode, emergencyPhoneDigits, String(effectiveUserId))
          .catch(() => false);
        if (secondPocInUse) {
          return res.status(409).json({ message: "Phone number already in use" });
        }

        const escalationInUse = await storage
          .isEmployerEscalationContactInUse(emergencyCountryCode, emergencyPhoneDigits)
          .catch(() => false);
        if (escalationInUse) {
          return res.status(409).json({ message: "Phone number already in use" });
        }
      }

      if (secondPocCountryCode && secondPocPhoneDigits) {
        const existingPhoneUser = await storage
          .getUserByCountryCodeAndPhoneNumber(secondPocCountryCode, secondPocPhoneDigits)
          .catch(() => undefined);
        if (existingPhoneUser && String(existingPhoneUser.id) !== String(effectiveUserId)) {
          return res.status(409).json({ message: "Phone number already in use" });
        }

        const existingPhoneEmployer = await storage
          .getEmployerByCountryCodeAndPhoneNumber(secondPocCountryCode, secondPocPhoneDigits)
          .catch(() => undefined);
        if (existingPhoneEmployer) {
          return res.status(409).json({ message: "Phone number already in use" });
        }

        const emergencyInUse = await storage
          .isInternEmergencyContactInUse(secondPocCountryCode, secondPocPhoneDigits, String(effectiveUserId))
          .catch(() => false);
        if (emergencyInUse) {
          return res.status(409).json({ message: "Phone number already in use" });
        }

        const secondPocInUse = await storage
          .isInternSecondPocContactInUse(secondPocCountryCode, secondPocPhoneDigits, String(effectiveUserId))
          .catch(() => false);
        if (secondPocInUse) {
          return res.status(409).json({ message: "Phone number already in use" });
        }

        const escalationInUse = await storage
          .isEmployerEscalationContactInUse(secondPocCountryCode, secondPocPhoneDigits)
          .catch(() => false);
        if (escalationInUse) {
          return res.status(409).json({ message: "Phone number already in use" });
        }
      }

      if (aadhaarNorm) {
        const existingAadhaar = await storage.getInternOnboardingByAadhaarNumber(aadhaarNorm).catch(() => undefined);
        const existingUserId = String((existingAadhaar as any)?.userId ?? "").trim();
        if (existingAadhaar && existingUserId && existingUserId !== String(effectiveUserId)) {
          return res.status(409).json({ message: "Aadhaar number already in use" });
        }
      }

      if (panNorm) {
        const existingPan = await storage.getInternOnboardingByPanNumber(panNorm).catch(() => undefined);
        const existingUserId = String((existingPan as any)?.userId ?? "").trim();
        if (existingPan && existingUserId && existingUserId !== String(effectiveUserId)) {
          return res.status(409).json({ message: "PAN number already in use" });
        }
      }

      // Verify the user exists to avoid foreign key violations
      const user = await storage.getUser(effectiveUserId!);
      if (!user) {
        return res.status(400).json({ message: "User not found. Please sign up or provide a valid userId." });
      }

      // Check if onboarding already exists
      const existing = await storage.getInternOnboardingByUserId(effectiveUserId!);

      const maybeNotifyEmployerSavedSearchMatches = async (row: any) => {
        try {
          const skills = Array.isArray(row?.skills) ? row.skills : [];
          const skillsNorm = new Set(
            skills
              .map((s: any) => String(s ?? "").trim().toLowerCase())
              .filter(Boolean),
          );

          const city = String(row?.city ?? "").trim().toLowerCase();
          const hasCity = Boolean(city);

          if (skillsNorm.size === 0 && !hasCity) return;

          const saved = await storage.listAllEmployerSavedSearches().catch(() => [] as any[]);
          const employersToNotify = new Set<string>();

          for (const ss of saved) {
            const employerId = String((ss as any)?.employerId ?? "").trim();
            if (!employerId) continue;

            const ssSkills = Array.isArray((ss as any)?.skills) ? (ss as any).skills : [];
            const ssCities = Array.isArray((ss as any)?.cities) ? (ss as any).cities : [];

            const skillMatch = ssSkills
              .map((s: any) => String(s ?? "").trim().toLowerCase())
              .filter(Boolean)
              .some((s: string) => skillsNorm.has(s));

            const cityMatch = hasCity
              ? ssCities
                .map((c: any) => String(c ?? "").trim().toLowerCase())
                .filter(Boolean)
                .some((c: string) => c === city)
              : false;

            if (skillMatch || cityMatch) employersToNotify.add(employerId);
          }

          if (employersToNotify.size === 0) return;

          const intern = await storage.getUser(effectiveUserId!).catch(() => undefined);
          const internName = intern
            ? `${String((intern as any)?.firstName ?? "").trim()} ${String((intern as any)?.lastName ?? "").trim()}`.trim() || "Candidate"
            : "Candidate";

          const dayKey = new Date().toISOString().slice(0, 10);
          const recipientIds = Array.from(employersToNotify);
          for (const employerId of recipientIds) {
            await storage.createNotificationDeduped({
              recipientType: "employer",
              recipientId: employerId,
              type: "saved_search_match",
              title: "New match alert",
              message: "🚀 New match alert! See the candidate who ticks your boxes.",
              data: {
                internId: effectiveUserId!,
                internName,
                skills: Array.from(skillsNorm).slice(0, 50),
                city: city || null,
              },
              dedupeKey: `saved_search_match:${employerId}:${effectiveUserId!}:${dayKey}`,
              isRead: false,
            } as any);
          }
        } catch (notifyErr) {
          console.error("Saved search match notification error:", notifyErr);
        }
      };

      if (existing) {
        // Update existing
        const prevExtra = ((existing as any)?.extraData ?? {}) as Record<string, any>;
        const nextExtra = (onboardingData as any)?.extraData ?? {};
        const mergedOnboardingData = {
          ...onboardingData,
          extraData: {
            ...prevExtra,
            ...nextExtra,
          },
        };

        const updated = await storage.updateInternOnboarding(effectiveUserId!, mergedOnboardingData as any);

        await maybeNotifyEmployerSavedSearchMatches(updated ?? mergedOnboardingData);
        return res.status(200).json({
          message: "Onboarding updated successfully",
          onboarding: updated,
        });
      } else {
        // Create new
        const created = await storage.createInternOnboarding({
          userId: effectiveUserId!,
          ...onboardingData,
        });

        await maybeNotifyEmployerSavedSearchMatches(created);

        return res.status(201).json({
          message: "Onboarding saved successfully",
          onboarding: created,
        });
      }
    } catch (error) {
      const code = String((error as any)?.code ?? (error as any)?.original?.code ?? "").trim();
      if (code === "23505") {
        return res.status(409).json({ message: "Duplicate value not allowed" });
      }
      console.error("Onboarding save error:", error);
      return res.status(500).json({
        message: "An error occurred while saving onboarding data",
      });
    }
  });

  // Get intern onboarding by user ID
  app.get("/api/onboarding/:userId", async (req, res) => {
    try {
      const [user, onboarding, internDocument] = await Promise.all([
        storage.getUser(req.params.userId),
        storage.getInternOnboardingByUserId(req.params.userId),
        storage.getInternDocumentsByUserId(req.params.userId),
      ]);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!onboarding) {
        return res.status(404).json({ message: "Onboarding data not found" });
      }

      const safeUser = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        countryCode: user.countryCode,
        phoneNumber: user.phoneNumber,
        role: user.role,
      };

      return res.json({
        user: safeUser,
        onboarding,
        intern_document: internDocument ?? null,
      });
    } catch (error) {
      console.error("Onboarding get error:", error);
      return res.status(500).json({
        message: "An error occurred while fetching onboarding data",
      });
    }
  });

  // Get intern user by user ID
  app.get("/api/users/:userId", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const safeUser = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        countryCode: user.countryCode,
        phoneNumber: user.phoneNumber,
        role: user.role,
      };

      return res.json({ user: safeUser });
    } catch (error) {
      console.error("User get error:", error);
      return res.status(500).json({ message: "An error occurred while fetching user data" });
    }
  });

  app.get("/api/users/exists/phone/:phoneNumber", async (req, res) => {
    try {
      const phoneNumber = String(req.params.phoneNumber ?? "").trim();
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const digits = phoneNumber.replace(/\D/g, "");

      const user = await storage.getUserByPhoneNumber(phoneNumber).catch(() => undefined);
      if (user) {
        return res.json({ exists: true, subjectType: "user", subjectId: user?.id ?? null });
      }

      const employer = await storage.getEmployerByPhoneNumber(phoneNumber).catch(() => undefined);
      if (employer) {
        return res.json({ exists: true, subjectType: "employer", subjectId: employer?.id ?? null });
      }

      // Also consider phone numbers stored as contacts inside other records
      const emergencyInUse = await storage.isInternEmergencyContactInUse("+91", digits).catch(() => false);
      if (emergencyInUse) {
        return res.json({ exists: true, subjectType: "intern_emergency", subjectId: null });
      }

      const secondPocInUse = await storage.isInternSecondPocContactInUse("+91", digits).catch(() => false);
      if (secondPocInUse) {
        return res.json({ exists: true, subjectType: "intern_second_poc", subjectId: null });
      }

      const escalationInUse = await storage.isEmployerEscalationContactInUse("+91", digits).catch(() => false);
      if (escalationInUse) {
        return res.json({ exists: true, subjectType: "employer_escalation", subjectId: null });
      }

      return res.json({ exists: false, subjectType: null, subjectId: null });
    } catch (error) {
      console.error("Phone lookup error:", error);
      return res.status(500).json({ message: "An error occurred while checking phone" });
    }
  });

  app.put("/api/users/:userId", async (req, res) => {
    try {
      const userId = String(req.params.userId ?? "").trim();
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updateSchema = z
        .object({
          firstName: z.string().trim().min(1).optional(),
          lastName: z.string().trim().min(1).optional(),
          countryCode: z.string().trim().regex(/^\+\d+$/).optional(),
          phoneNumber: z.string().trim().regex(/^\d{6,15}$/).optional(),
        })
        .strict();

      const payload = updateSchema.parse(req.body);
      const updates: any = {};

      if (payload.firstName) updates.firstName = normalizeName(payload.firstName, user.firstName);
      if (payload.lastName) updates.lastName = normalizeName(payload.lastName, user.lastName);
      if (payload.countryCode) updates.countryCode = payload.countryCode;
      if (payload.phoneNumber) {
        const nextPhone = String(payload.phoneNumber).trim();
        const nextCode = String(payload.countryCode ?? user.countryCode ?? "+91").trim();
        const nextDigits = nextPhone.replace(/\D/g, "");

        if (nextPhone) {
          const existingPhoneUser = await storage.getUserByCountryCodeAndPhoneNumber(nextCode, nextPhone).catch(() => undefined);
          if (existingPhoneUser && String(existingPhoneUser.id) !== userId) {
            return res.status(409).json({ message: "Phone number is already in use" });
          }

          const existingPhoneEmployer = await storage.getEmployerByCountryCodeAndPhoneNumber(nextCode, nextPhone).catch(() => undefined);
          if (existingPhoneEmployer) {
            return res.status(409).json({ message: "Phone number is already in use" });
          }

          const isInternEmergencyInUse = await storage.isInternEmergencyContactInUse(nextCode, nextPhone).catch(() => false);
          if (isInternEmergencyInUse) {
            return res.status(409).json({ message: "Phone number is already in use" });
          }

          const isInternSecondPocInUse = await storage.isInternSecondPocContactInUse(nextCode, nextDigits).catch(() => false);
          if (isInternSecondPocInUse) {
            return res.status(409).json({ message: "Phone number is already in use" });
          }

          const isEmployerEscalationInUse = await storage.isEmployerEscalationContactInUse(nextCode, nextDigits).catch(() => false);
          if (isEmployerEscalationInUse) {
            return res.status(409).json({ message: "Phone number is already in use" });
          }
        }

        updates.phoneNumber = nextPhone;
      }

      const updated = Object.keys(updates).length > 0 ? await storage.updateUser(userId, updates) : user;
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }

      const safeUser = {
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        countryCode: updated.countryCode,
        phoneNumber: updated.phoneNumber,
        role: updated.role,
      };

      return res.json({ user: safeUser });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("User update error:", error);
      return res.status(500).json({ message: "An error occurred while updating user data" });
    }
  });

  const onboardingDocumentsUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        try {
          const dir = getUploadsDir();
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        } catch (e) {
          cb(e as any, "");
        }
      },
      filename: (_req, file, cb) => {
        const rawExt = path.extname(String(file?.originalname ?? ""));
        const ext = rawExt && rawExt.length <= 12 ? rawExt : "";
        cb(null, `${Date.now()}-${uuidv4()}${ext}`);
      },
    }),
    limits: {
      fileSize: 25 * 1024 * 1024,
    },
  });

  app.post(
    "/api/onboarding/documents/upload",
    onboardingDocumentsUpload.fields([
      { name: "profilePhoto", maxCount: 1 },
      { name: "introVideo", maxCount: 1 },
      { name: "aadhaarImage", maxCount: 1 },
      { name: "panImage", maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        const userId = String((req.body as any)?.userId ?? "").trim();
        if (!userId) {
          return res.status(400).json({ message: "User ID is required" });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(400).json({ message: "User not found. Please sign up or provide a valid userId." });
        }

        const files = (req as any).files as
          | {
              profilePhoto?: Express.Multer.File[];
              introVideo?: Express.Multer.File[];
              aadhaarImage?: Express.Multer.File[];
              panImage?: Express.Multer.File[];
            }
          | undefined;

        const profilePhoto = files?.profilePhoto?.[0];
        const introVideo = files?.introVideo?.[0];
        const aadhaarImage = files?.aadhaarImage?.[0];
        const panImage = files?.panImage?.[0];

        if (!profilePhoto && !introVideo && !aadhaarImage && !panImage) {
          return res.status(400).json({ message: "At least one file is required" });
        }

        const update: any = {};

        if (profilePhoto?.filename) {
          update.profilePhotoName = profilePhoto.filename;
          update.profilePhotoType = profilePhoto.mimetype;
          update.profilePhotoSize = profilePhoto.size;
        }

        if (introVideo?.filename) {
          update.introVideoName = introVideo.filename;
          update.introVideoType = introVideo.mimetype;
          update.introVideoSize = introVideo.size;
        }

        if (aadhaarImage?.filename) {
          update.aadhaarImageName = aadhaarImage.filename;
          update.aadhaarImageType = aadhaarImage.mimetype;
          update.aadhaarImageSize = aadhaarImage.size;
        }

        if (panImage?.filename) {
          update.panImageName = panImage.filename;
          update.panImageType = panImage.mimetype;
          update.panImageSize = panImage.size;
        }

        const validated = insertInternDocumentsSchema.partial().parse({
          userId,
          ...update,
        });

        const saved = await storage.upsertInternDocumentsByUserId(userId, validated);
        return res.status(200).json({
          message: "Documents uploaded successfully",
          documents: saved,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Validation failed",
            errors: error.errors,
          });
        }
        console.error("Onboarding documents upload error:", error);
        return res.status(500).json({ message: "An error occurred while uploading documents" });
      }
    },
  );

  const onboardingAcademicsUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        try {
          const dir = path.join(getUploadsDir(), "academics");
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        } catch (e) {
          cb(e as any, "");
        }
      },
      filename: (_req, file, cb) => {
        const rawExt = path.extname(String(file?.originalname ?? ""));
        const ext = rawExt && rawExt.length <= 12 ? rawExt : "";
        cb(null, `${Date.now()}-${uuidv4()}${ext}`);
      },
    }),
    limits: {
      fileSize: 25 * 1024 * 1024,
    },
  });

  app.post(
    "/api/onboarding/academics/upload",
    onboardingAcademicsUpload.array("files", 20),
    async (req, res) => {
      try {
        const userId = String((req.body as any)?.userId ?? "").trim();
        if (!userId) {
          return res.status(400).json({ message: "User ID is required" });
        }

        const user = await storage.getUser(userId).catch(() => null);
        if (!user) {
          return res.status(400).json({ message: "User not found. Please sign up or provide a valid userId." });
        }

        const files = (req as any).files as Express.Multer.File[] | undefined;
        if (!Array.isArray(files) || files.length === 0) {
          return res.status(400).json({ message: "At least one file is required" });
        }

        const uploads = files.map((f) => ({
          name: `/uploads/academics/${encodeURIComponent(f.filename)}`,
          type: f.mimetype,
          size: f.size,
          originalName: f.originalname,
        }));

        return res.status(200).json({
          message: "Files uploaded successfully",
          uploads,
        });
      } catch (error) {
        console.error("Onboarding academics upload error:", error);
        return res.status(500).json({ message: "An error occurred while uploading files" });
      }
    },
  );

  // Get user by email (for recovery if userId is missing from localStorage)
  app.get("/api/auth/user/by-email/:email", async (req, res) => {
    try {
      const user = await storage.getUserByEmail(req.params.email);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...safeUser } = user;
      return res.json({ user: safeUser });
    } catch (error) {
      console.error("Get user by email error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while fetching user" });
    }
  });

  // ---------------------------------------------
  // Proposals: create + list + status update
  // ---------------------------------------------

  const createProposalSchema = z.object({
    internId: z.string().min(1),
    projectId: z.string().min(1),
    interviewId: z.string().optional(),
    flowType: z.enum(["direct", "interview_first"]),
    currency: z.enum(["INR", "USD"]).optional(),
    status: z
      .enum(["draft", "sent", "accepted", "rejected", "expired", "interview_scheduled"])
      .optional(),
    offerDetails: z.record(z.any()).optional(),
    aiRatings: z
      .object({
        communication: z.number().optional(),
        coding: z.number().optional(),
        aptitude: z.number().optional(),
        overall: z.number().optional(),
      })
      .optional(),
    skills: z.array(z.string()).optional(),
  });

  // Employer: create a hiring proposal for an intern
  app.post("/api/employer/:employerId/proposals", async (req, res) => {
    try {
      const employerId = req.params.employerId;

      // Basic existence checks
      const employer = await storage.getEmployer(employerId);
      if (!employer) {
        return res.status(404).json({ message: "Employer not found" });
      }

      const data = createProposalSchema.parse(req.body);

      const intern = await storage.getUser(data.internId);
      if (!intern) {
        return res.status(404).json({ message: "Intern not found" });
      }

      const projects = await storage.getProjectsByEmployerId(employerId);
      const project = projects.find((p) => p.id === data.projectId);
      if (!project) {
        return res
          .status(400)
          .json({ message: "Project does not belong to this employer" });
      }

      const existingProposals = await storage.getProposalsByEmployerId(employerId).catch(() => []);

      const existingForInternAnyProject = (Array.isArray(existingProposals) ? existingProposals : [])
        .filter((p: any) => {
          const internId = String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim();
          if (internId !== String(data.internId)) return false;
          const status = String((p as any)?.status ?? "").trim().toLowerCase();
          return ["draft", "sent", "accepted", "interview_scheduled"].includes(status);
        })
        .sort((a: any, b: any) => {
          const ta = new Date((a as any)?.updatedAt ?? (a as any)?.createdAt ?? 0).getTime();
          const tb = new Date((b as any)?.updatedAt ?? (b as any)?.createdAt ?? 0).getTime();
          return tb - ta;
        });

      const latestExistingForIntern = existingForInternAnyProject[0] as any;
      if (latestExistingForIntern) {
        return res.status(409).json({
          message: "A proposal already exists for this candidate",
          proposalId: String(latestExistingForIntern?.id ?? ""),
          status: String(latestExistingForIntern?.status ?? "").trim().toLowerCase(),
        });
      }

      const fullTimeOfferSentForIntern = (Array.isArray(existingProposals) ? existingProposals : []).some((p: any) => {
        const internId = String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim();
        if (internId !== String(data.internId)) return false;
        const statusLower = String((p as any)?.status ?? "").trim().toLowerCase();
        if (statusLower === "rejected" || statusLower === "expired" || statusLower === "withdrawn") return false;
        const offer = (p as any)?.offerDetails ?? (p as any)?.offer_details ?? {};
        const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
        return !!fullTimeOffer && typeof fullTimeOffer === "object";
      });

      if (fullTimeOfferSentForIntern) {
        const anyOtherProject = (Array.isArray(existingProposals) ? existingProposals : []).some((p: any) => {
          const internId = String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim();
          if (internId !== String(data.internId)) return false;
          const statusLower = String((p as any)?.status ?? "").trim().toLowerCase();
          if (statusLower === "rejected" || statusLower === "expired" || statusLower === "withdrawn") return false;
          const offer = (p as any)?.offerDetails ?? (p as any)?.offer_details ?? {};
          const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
          const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
          if (!hasFullTimeOffer) return false;
          const projectId = String((p as any)?.projectId ?? (p as any)?.project_id ?? "").trim();
          return projectId && projectId !== String(data.projectId);
        });

        if (anyOtherProject) {
          return res.status(409).json({
            message: "Cannot send internship proposal",
            detail: "Candidate already has a full-time offer from another project.",
          });
        }
      }

      const existingForInternProject = (Array.isArray(existingProposals) ? existingProposals : [])
        .filter((p: any) => {
          const internId = String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim();
          const projectId = String((p as any)?.projectId ?? (p as any)?.project_id ?? "").trim();
          const status = String((p as any)?.status ?? "").trim().toLowerCase();
          if (internId !== String(data.internId)) return false;
          if (projectId !== String(data.projectId)) return false;
          return status !== "rejected" && status !== "expired" && status !== "withdrawn";
        })
        .sort((a: any, b: any) => {
          const ta = new Date((a as any)?.updatedAt ?? (a as any)?.createdAt ?? 0).getTime();
          const tb = new Date((b as any)?.updatedAt ?? (b as any)?.createdAt ?? 0).getTime();
          return tb - ta;
        });

      const latestExistingProposal = existingForInternProject[0] as any;
      if (latestExistingProposal) {
        const existingStatus = String(latestExistingProposal?.status ?? "").trim().toLowerCase();
        if (["draft", "sent", "accepted", "interview_scheduled"].includes(existingStatus)) {
          return res.status(409).json({
            message: "A proposal already exists for this candidate and project",
            proposalId: String(latestExistingProposal?.id ?? ""),
            status: existingStatus,
          });
        }
      }

      const onboarding = await storage.getInternOnboardingByUserId(data.internId).catch(() => undefined);
      const findternScoreRaw = (onboarding as any)?.extraData?.findternScore;
      const findternScore = Number(findternScoreRaw ?? 0);
      const safeFindternScore = Number.isFinite(findternScore) ? findternScore : 0;
      if (!safeFindternScore || safeFindternScore <= 0) {
        return res.status(409).json({
          message: "Intern has not completed AI interview",
        });
      }

      const normalizeCurrency = (value: unknown) => {
        const raw = String(value ?? "")
          .trim()
          .toUpperCase();
        if (raw === "INR" || raw === "USD") return raw as "INR" | "USD";
        return "";
      };

      const offerDetails = (data.offerDetails ?? {}) as Record<string, any>;

      const currencyFromBody = normalizeCurrency((data as any).currency);
      const currencyFromOffer = normalizeCurrency((offerDetails as any)?.currency);
      const currencyToStore = currencyFromBody || currencyFromOffer || "INR";
      offerDetails.currency = currencyToStore;

      const normalizeLocationType = (value: unknown) => {
        const v = String(value ?? "").trim().toLowerCase();
        if (v === "remote" || v === "hybrid" || v === "onsite") return v;
        return "";
      };

      const projectMode = String((project as any)?.locationType ?? "")
        .trim()
        .toLowerCase();
      const requestedMode = normalizeLocationType((offerDetails as any)?.mode);
      if (!requestedMode) {
        const fallbackMode = normalizeLocationType(projectMode);
        if (fallbackMode) offerDetails.mode = fallbackMode;
      } else {
        offerDetails.mode = requestedMode;
      }
      const duration = String(offerDetails?.duration ?? "").trim().toLowerCase();
      if (safeFindternScore < 6 && (duration === "3m" || duration === "6m")) {
        return res.status(400).json({
          message: "Duration not allowed for this candidate",
        });
      }

      const startDate = String(offerDetails?.startDate ?? "").trim();
      if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        return res.status(400).json({ message: "Invalid start date" });
      }
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      if (startDate < today) {
        return res.status(400).json({ message: "Back date is not allowed" });
      }

      const latestInterview = await storage.getLatestInterviewForEmployerInternProject(
        employerId,
        data.internId,
        data.projectId,
      );

      if (latestInterview && latestInterview.status === "pending") {
        return res.status(409).json({
          message: "Cannot send a proposal while interview confirmation is pending",
          interview: serializeInterview(latestInterview),
        });
      }

      const proposal = await storage.createProposal({
        employerId,
        internId: data.internId,
        projectId: data.projectId,
        flowType: data.flowType,
        status: data.status ?? "sent",
        currency: currencyToStore,
        offerDetails,
        aiRatings: data.aiRatings ?? {},
        skills: data.skills ?? [],
      } as any);

      try {
        const employerDisplayName = String(employer.companyName || employer.name || "").trim();
        const maskedEmployerName = maskCompanyName(employerDisplayName);
        const msg = formatNotification(
          "⚡ New proposal received from [EmployerName] for [ProjectName]",
          { EmployerName: maskedEmployerName, ProjectName: project.projectName },
        );

        await storage.createNotification({
          recipientType: "intern",
          recipientId: data.internId,
          type: "proposal_received",
          title: "New proposal",
          message: msg,
          data: {
            proposalId: proposal.id,
            internId: data.internId,
            employerId,
            projectName: project.projectName,
            employerName: maskedEmployerName,
          },
          isRead: false,
        } as any);
      } catch (notifyErr) {
        console.error("Create proposal notification error:", notifyErr);
      }

      try {
        const internEmail = String((intern as any)?.email ?? "").trim();
        const statusLower = String((proposal as any)?.status ?? "").trim().toLowerCase();
        const appBaseUrl = getAppBaseUrl(req);
        const proposalUrl = appBaseUrl
          ? `${appBaseUrl}/proposals/${encodeURIComponent(String((proposal as any)?.id ?? ""))}`
          : "";

        if (internEmail && statusLower === "sent" && proposalUrl) {
          const internName = `${String((intern as any)?.firstName ?? "").trim()} ${String((intern as any)?.lastName ?? "").trim()}`.trim();
          const employerName = String(employer.companyName || employer.name || "Employer").trim();
          const roleName = String((offerDetails as any)?.roleTitle ?? project.projectName ?? "").trim();

          await sendProposalReceivedInternEmail({
            to: internEmail,
            internName: internName || "Candidate",
            employerName,
            roleName,
            proposalUrl,
            appBaseUrl,
          });
        }
      } catch (mailErr) {
        console.error("Create proposal email error:", mailErr);
      }

      return res.status(201).json({
        message: "Proposal created",
        proposal,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("Create proposal error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while creating proposal" });
    }
  });

  // Employer: list proposals they have sent
  app.get("/api/employer/:employerId/proposals", async (req, res) => {
    try {
      const employerId = req.params.employerId;
      const employer = await storage.getEmployer(employerId);
      if (!employer) {
        return res.status(404).json({ message: "Employer not found" });
      }

      const queryProjectId = String((req.query as any)?.projectId ?? "").trim();

      const allProposals = await storage.getProposalsByEmployerId(employerId);
      const proposals = queryProjectId
        ? allProposals.filter((p: any) => {
            const projectId = String(p?.projectId ?? p?.project_id ?? "").trim();
            return projectId === queryProjectId;
          })
        : allProposals;
      const projects = await storage.getProjectsByEmployerId(employerId).catch(() => []);
      const projectById = (Array.isArray(projects) ? projects : []).reduce<Record<string, any>>(
        (acc, p) => {
          if (p?.id) acc[String(p.id)] = p;
          return acc;
        },
        {},
      );

      const internIds = Array.from(
        new Set(
          proposals
            .map((p: any) => String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim())
            .filter(Boolean),
        ),
      );

      const internUsers = await Promise.all(
        internIds.map(async (id) => {
          const user = await storage.getUser(id).catch(() => undefined);
          return user ? { id, user } : null;
        }),
      );

      const internDocs = await Promise.all(
        internIds.map(async (id) => {
          const docs = await storage.getInternDocumentsByUserId(id).catch(() => null);
          return { id, docs };
        }),
      );

      const internById = internUsers.reduce<Record<string, any>>((acc, row) => {
        if (row?.id && row.user) acc[row.id] = row.user;
        return acc;
      }, {});

      const internDocsById = internDocs.reduce<Record<string, any | null>>((acc, row) => {
        if (row?.id) acc[row.id] = row.docs ?? null;
        return acc;
      }, {});

      const enriched = proposals.map((p: any) => {
        const internId = String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim();
        const intern = internId ? internById[internId] : undefined;
        const internDocs = internId ? internDocsById[internId] : null;
        const fullName = intern
          ? `${String((intern as any).firstName ?? "").trim()} ${String((intern as any).lastName ?? "").trim()}`.trim()
          : "";

        const projectId = String((p as any)?.projectId ?? (p as any)?.project_id ?? "").trim();
        const project = projectId ? projectById[projectId] : undefined;
        const projectName = String(
          (p as any)?.projectName ?? (p as any)?.project_name ?? project?.projectName ?? "",
        ).trim();

        return {
          ...p,
          internId: (p as any)?.internId ?? (p as any)?.intern_id ?? internId,
          internName: fullName,
          projectId: (p as any)?.projectId ?? (p as any)?.project_id ?? projectId,
          projectName,
          internProfilePhotoName: String(internDocs?.profilePhotoName ?? "") || null,
          intern: intern
            ? {
                id: internId,
                firstName: (intern as any).firstName ?? null,
                lastName: (intern as any).lastName ?? null,
                fullName,
                profilePhotoName: String(internDocs?.profilePhotoName ?? "") || null,
              }
            : null,
        };
      });

      return res.json({ proposals: enriched });
    } catch (error) {
      console.error("List employer proposals error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while fetching proposals" });
    }
  });

  const fullTimeOfferUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        try {
          const dir = path.join(getUploadsDir(), "support");
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        } catch (e) {
          cb(e as any, "");
        }
      },
      filename: (_req, file, cb) => {
        const orig = String(file?.originalname ?? "");
        const ext = path.extname(orig).slice(0, 12) || "";
        cb(null, `${uuidv4()}${ext}`);
      },
    }),
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
    },
  });

  const fullTimeOfferUploadSingle = fullTimeOfferUpload.single("offerLetter");

  app.post("/api/employer/:employerId/full-time-offer", (req, res) => {
    fullTimeOfferUploadSingle(req, res, async (err: any) => {
      const unlinkFile = async (file?: Express.Multer.File) => {
        try {
          const p = String((file as any)?.path ?? "").trim();
          if (!p) return;
          await fs.promises.unlink(p);
        } catch {
          return;
        }
      };

      if (err) {
        const msg =
          err instanceof (multer as any).MulterError && String(err.code) === "LIMIT_FILE_SIZE"
            ? "Offer letter too large. Max 10MB."
            : String(err?.message || "Upload failed");
        return res.status(400).json({ message: msg });
      }

      try {
        const employerId = String(req.params.employerId ?? "").trim();
        if (!employerId) return res.status(400).json({ message: "employerId is required" });

        const employer = await storage.getEmployer(employerId);
        if (!employer) return res.status(404).json({ message: "Employer not found" });

        const file = (req as any).file as Express.Multer.File | undefined;
        if (!file?.filename) {
          return res.status(400).json({ message: "offerLetter attachment is required" });
        }

        const body = z
          .object({
            proposalId: z.string().min(1),
            internId: z.string().min(1),
            jobTitle: z.string().min(1),
            jobMode: z.enum(["remote", "hybrid", "onsite"]),
            jobLocationState: z.string().optional().default(""),
            jobLocationCity: z.string().optional().default(""),
            timezone: z.string().min(1),
            shiftFrom: z.string().min(1),
            shiftTo: z.string().min(1),
            ctcCurrency: z.enum(["INR", "USD"]),
            annualCtc: z.preprocess(
              (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v),
              z.number().positive(),
            ),
          })
          .parse(req.body ?? {});

        const proposal = await storage.getProposal(body.proposalId).catch(() => undefined);
        if (!proposal) {
          await unlinkFile(file);
          return res.status(404).json({ message: "Proposal not found" });
        }

        const proposalEmployerId = String((proposal as any)?.employerId ?? (proposal as any)?.employer_id ?? "").trim();
        if (proposalEmployerId && proposalEmployerId !== employerId) {
          await unlinkFile(file);
          return res.status(403).json({ message: "Not allowed" });
        }

        const baseProjectId = String((proposal as any)?.projectId ?? (proposal as any)?.project_id ?? "").trim();
        const baseFlowType = String((proposal as any)?.flowType ?? (proposal as any)?.flow_type ?? "").trim();

        if (!baseProjectId) {
          await unlinkFile(file);
          return res.status(400).json({ message: "proposal.projectId is missing" });
        }
        if (baseFlowType !== "direct" && baseFlowType !== "interview_first") {
          await unlinkFile(file);
          return res.status(400).json({ message: "proposal.flowType is invalid" });
        }

        const existingInternProposals = await storage.getProposalsByInternId(body.internId).catch(() => [] as any[]);
        const alreadyFullTime = (Array.isArray(existingInternProposals) ? existingInternProposals : []).some((p: any) => {
          const pEmployerId = String((p as any)?.employerId ?? (p as any)?.employer_id ?? "").trim();
          if (pEmployerId && pEmployerId !== employerId) return false;

          const pProjectId = String((p as any)?.projectId ?? (p as any)?.project_id ?? "").trim();
          if (pProjectId && pProjectId !== baseProjectId) return false;

          const statusLower = String((p as any)?.status ?? "").trim().toLowerCase();
          if (statusLower === "rejected" || statusLower === "expired" || statusLower === "withdrawn") return false;

          const offer = (p as any)?.offerDetails ?? (p as any)?.offer_details ?? {};
          const ft = (offer as any)?.fullTimeOffer ?? null;
          return !!ft && typeof ft === "object";
        });
        if (alreadyFullTime) {
          await unlinkFile(file);
          return res.status(409).json({ message: "Full-time offer already sent for this intern" });
        }

        const jobMode = String(body.jobMode).toLowerCase();
        const needsLocation = jobMode === "onsite" || jobMode === "hybrid";
        if (needsLocation) {
          const st = String(body.jobLocationState ?? "").trim();
          const ct = String(body.jobLocationCity ?? "").trim();
          if (!st || !ct) {
            await unlinkFile(file);
            return res.status(400).json({ message: "Job location city/state is required for onsite/hybrid roles" });
          }
        }

        const offerLetterUrl = `/uploads/support/${encodeURIComponent(String(file.filename))}`;
        const intern = await storage.getUser(body.internId).catch(() => undefined);
        const internName = intern
          ? `${String((intern as any)?.firstName ?? "").trim()} ${String((intern as any)?.lastName ?? "").trim()}`.trim()
          : "";

        const newOfferDetails = {
          fullTimeOffer: {
            baseProposalId: body.proposalId,
            jobTitle: body.jobTitle,
            jobMode: body.jobMode,
            jobLocationCity: String(body.jobLocationCity ?? "").trim(),
            jobLocationState: String(body.jobLocationState ?? "").trim(),
            timezone: body.timezone,
            shiftFrom: body.shiftFrom,
            shiftTo: body.shiftTo,
            ctcCurrency: body.ctcCurrency,
            annualCtc: body.annualCtc,
            offerLetterUrl,
            createdAt: new Date().toISOString(),
          },
          currency: body.ctcCurrency,
        } as Record<string, any>;

        const createdProposal = await storage.createProposal({
          employerId,
          internId: body.internId,
          projectId: baseProjectId,
          flowType: baseFlowType,
          status: "sent",
          currency: body.ctcCurrency,
          offerDetails: newOfferDetails,
          aiRatings: ((proposal as any)?.aiRatings ?? (proposal as any)?.ai_ratings ?? {}) as any,
          skills: ((proposal as any)?.skills ?? []) as any,
        } as any);

        try {
          const employerName = String((employer as any)?.companyName ?? (employer as any)?.name ?? "Employer").trim();
          const jobTitle = String(body.jobTitle ?? "").trim() || "a full-time role";

          await storage.createNotificationDeduped({
            recipientType: "intern",
            recipientId: body.internId,
            type: "full_time_offer_received",
            title: "Full-time offer received",
            message: `📩 You’ve received a full-time job offer from ${employerName} for ${jobTitle}. Please review.`,
            data: {
              proposalId: String((createdProposal as any)?.id ?? "").trim(),
              employerId,
              internId: body.internId,
              jobTitle,
              employerName,
              offerLetterUrl,
            },
            dedupeKey: `full_time_offer_received:${String((createdProposal as any)?.id ?? "").trim()}`,
            isRead: false,
          } as any);

          try {
            const internEmail = String((intern as any)?.email ?? "").trim();
            const internNameSafe = internName || "Candidate";
            const appBaseUrl = getAppBaseUrl(req);
            const dashboardUrl = appBaseUrl ? `${appBaseUrl}/dashboard` : "";

            if (internEmail && dashboardUrl) {
              await sendFullTimeOfferReceivedInternEmail({
                to: internEmail,
                internName: internNameSafe,
                employerName,
                roleName: jobTitle,
                dashboardUrl,
                appBaseUrl,
              });
            }
          } catch (mailErr) {
            console.error("Full-time offer intern email error:", mailErr);
          }
        } catch (notifyErr) {
          console.error("Full-time offer intern notification error:", notifyErr);
        }

        const msgParts: string[] = [];
        msgParts.push("Full-time offer proposal");
        msgParts.push(`employerId: ${employerId}`);
        msgParts.push(`employer: ${String((employer as any)?.companyName ?? (employer as any)?.name ?? "").trim()}`);
        msgParts.push(`proposalId: ${body.proposalId}`);
        msgParts.push(`newProposalId: ${String((createdProposal as any)?.id ?? "").trim()}`);
        msgParts.push(`internId: ${body.internId}`);
        if (internName) msgParts.push(`internName: ${internName}`);
        msgParts.push(`jobTitle: ${body.jobTitle}`);
        msgParts.push(`jobMode: ${body.jobMode}`);
        if (needsLocation) msgParts.push(`jobLocation: ${String(body.jobLocationCity)}, ${String(body.jobLocationState)}`);
        msgParts.push(`timezone: ${body.timezone}`);
        msgParts.push(`shift: ${body.shiftFrom} - ${body.shiftTo}`);
        msgParts.push(`annualCtc: ${body.ctcCurrency} ${String(body.annualCtc)}`);
        msgParts.push(`offerLetter: ${offerLetterUrl}`);

        const contact = await storage.createContactMessage({
          firstName: String((employer as any)?.companyName ?? (employer as any)?.name ?? "Employer").trim() || "Employer",
          lastName: String(employerId).slice(0, 36),
          email: String((employer as any)?.companyEmail ?? "employer@findtern.in").trim() || "employer@findtern.in",
          queryType: "hiring",
          subject: `Full-time offer: ${String(body.jobTitle).slice(0, 120)}`,
          message: msgParts.join("\n"),
          isRead: false,
        } as any);

        try {
          await sendSmtpMail({
            to: "admin@findtern.in",
            subject: `PPO - Full-time offer proposal from ${String((employer as any)?.companyName ?? "Employer").trim()}`,
            text: msgParts.join("\n"),
          });
        } catch (mailErr) {
          console.error("Full-time offer admin email error:", mailErr);
        }

        return res.status(201).json({
          message: "Full-time offer proposal received",
          proposalId: String((createdProposal as any)?.id ?? "").trim(),
          offerLetterUrl,
          contact,
        });
      } catch (error) {
        const file = (req as any).file as Express.Multer.File | undefined;
        await unlinkFile(file);
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Validation failed", errors: error.errors });
        }
        console.error("Full-time offer submission error:", error);
        return res.status(500).json({ message: "An error occurred while submitting full-time offer" });
      }
    });
  });

  // Intern: list proposals received
  app.get("/api/intern/:internId/proposals", async (req, res) => {
    try {
      const internId = req.params.internId;
      const intern = await storage.getUser(internId);
      if (!intern) {
        return res.status(404).json({ message: "Intern not found" });
      }

      const onboarding = await storage.getInternOnboardingByUserId(internId).catch(() => undefined);
      const findternScoreRaw = (onboarding as any)?.extraData?.findternScore;
      const findternScoreNum = Number(findternScoreRaw ?? 0);
      const findternScore = Number.isFinite(findternScoreNum) ? findternScoreNum : 0;

      const proposals = await storage.getProposalsByInternId(internId);
      const projectIds = Array.from(
        new Set(
          (proposals ?? [])
            .map((p: any) => String((p as any)?.projectId ?? (p as any)?.project_id ?? "").trim())
            .filter((id: string) => id.length > 0),
        ),
      );
      const projectEntries = await Promise.all(
        projectIds.map(async (id) => {
          const project = await storage.getProject(id).catch(() => undefined);
          return [id, project] as const;
        }),
      );
      const projectById = Object.fromEntries(projectEntries) as Record<string, any | undefined>;
      const employerIds = Array.from(
        new Set(
          (proposals ?? [])
            .map((p: any) => String((p as any)?.employerId ?? (p as any)?.employer_id ?? "").trim())
            .filter((id: string) => id.length > 0),
        ),
      );
      const employerEntries = await Promise.all(
        employerIds.map(async (id) => {
          const employer = await storage.getEmployer(id).catch(() => undefined);
          return [id, employer] as const;
        }),
      );
      const employerById = Object.fromEntries(employerEntries) as Record<string, any | undefined>;

      const masked = (proposals ?? []).map((p: any) => {
        const offer = (p as any)?.offerDetails ?? {};
        const monthlyAmountRaw = (offer as any)?.monthlyAmount;
        const monthlyAmountNum = Number(monthlyAmountRaw ?? 0);
        const safeMonthly = Number.isFinite(monthlyAmountNum) ? monthlyAmountNum : 0;
        const maskedMonthly = safeMonthly > 0 ? Math.max(0, Math.round(safeMonthly / 2)) : safeMonthly;

        const totalPriceRaw = (offer as any)?.totalPrice;
        const totalPriceNum = Number(totalPriceRaw ?? 0);
        const safeTotal = Number.isFinite(totalPriceNum) ? totalPriceNum : 0;
        const maskedTotal = safeTotal > 0 ? Math.max(0, Math.round(safeTotal / 2)) : safeTotal;

        const employerId = String((p as any)?.employerId ?? (p as any)?.employer_id ?? "").trim();
        const employer = employerId ? employerById[employerId] : undefined;
        const employerCompanyName = String((employer as any)?.companyName ?? "").trim();
        const employerName = String((employer as any)?.name ?? "").trim();
        const employerMeta = employer
          ? {
              country: (employer as any)?.country ?? null,
              countryCode: (employer as any)?.countryCode ?? null,
            }
          : null;

        const projectId = String((p as any)?.projectId ?? (p as any)?.project_id ?? "").trim();
        const project = projectId ? projectById[projectId] : undefined;
        const projectName = String(
          (p as any)?.projectName ?? (p as any)?.project_name ?? (project as any)?.projectName ?? (project as any)?.project_name ?? "",
        ).trim();
        const projectUpdatedAt = (project as any)?.updatedAt ?? (project as any)?.updated_at ?? null;
        const projectSkills = Array.isArray(project?.skills) ? project.skills : [];

        return {
          ...p,
          offerDetails: {
            ...offer,
            monthlyAmount: maskedMonthly,
            totalPrice: maskedTotal,
          },
          employer: employerMeta,
          employerCompanyName: employerCompanyName || null,
          employerName: employerName || null,
          projectName,
          projectUpdatedAt,
          projectSkills,
          findternScore,
        };
      });

      return res.json({ proposals: masked });
    } catch (error) {
      console.error("List intern proposals error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while fetching proposals" });
    }
  });

  app.get("/api/intern/:internId/payouts", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      if (!internId) return res.status(400).json({ message: "internId is required" });

      const intern = await storage.getUser(internId);
      if (!intern) return res.status(404).json({ message: "Intern not found" });

      const limitRaw = Number((req.query as any)?.limit ?? 200);
      const limit = Number.isFinite(limitRaw) ? Math.min(1000, Math.max(1, Math.floor(limitRaw))) : 200;

      const rows = await storage.listInternPayoutsByInternId(internId, { limit }).catch(() => []);
      const items = Array.isArray(rows) ? rows : [];

      const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
      const amountMinor = (row: any) => Number(row?.amountMinor ?? row?.amount_minor ?? 0) || 0;

      const monthsFromDuration = (durationRaw: unknown) => {
        const duration = String(durationRaw ?? "").trim().toLowerCase();
        if (duration === "2m") return 2;
        if (duration === "3m") return 3;
        if (duration === "6m") return 6;
        return 1;
      };

      const summary = items.reduce(
        (acc: { paidMinor: number; pendingMinor: number; failedMinor: number; lastPaidAt: string | null }, row: any) => {
          const st = norm(row?.status);
          const amt = Math.max(0, amountMinor(row));
          if (st === "paid") acc.paidMinor += amt;
          else if (st === "pending") acc.pendingMinor += amt;
          else if (st === "failed") acc.failedMinor += amt;

          const paidAt = row?.paidAt ?? row?.paid_at ?? null;
          if (st === "paid" && paidAt) {
            const iso = String(paidAt).slice(0, 19);
            if (!acc.lastPaidAt || iso > acc.lastPaidAt) acc.lastPaidAt = iso;
          }

          return acc;
        },
        { paidMinor: 0, pendingMinor: 0, failedMinor: 0, lastPaidAt: null },
      );

      const payoutsByProposalId = items.reduce<Record<string, { paidMinor: number; pendingMinor: number }>>((acc, row: any) => {
        const raw = (row as any)?.raw ?? {};
        const proposalId = String(raw?.proposalId ?? raw?.proposal_id ?? "").trim();
        if (!proposalId) return acc;
        const st = norm(row?.status);
        const amt = Math.max(0, amountMinor(row));
        const existing = acc[proposalId] ?? { paidMinor: 0, pendingMinor: 0 };
        if (st === "paid") existing.paidMinor += amt;
        else if (st === "pending") existing.pendingMinor += amt;
        acc[proposalId] = existing;
        return acc;
      }, {});

      const proposals = await storage.getProposalsByInternId(internId).catch(() => []);
      const hired = (Array.isArray(proposals) ? proposals : []).filter((p: any) => norm((p as any)?.status) === "hired");

      const derivedPendingMinorByProposalId = hired.reduce<Record<string, number>>((acc, p: any) => {
        const proposalId = String((p as any)?.id ?? "").trim();
        if (!proposalId) return acc;

        const offer = ((p as any)?.offerDetails ?? (p as any)?.offer_details ?? {}) as any;
        const monthlyMajorRaw = Number(offer?.monthlyAmount ?? offer?.monthly_amount ?? 0);
        const monthlyMajor = Number.isFinite(monthlyMajorRaw) ? Math.max(0, monthlyMajorRaw) : 0;
        const currencyRaw = String(offer?.currency ?? (p as any)?.currency ?? "INR").trim().toUpperCase();
        const usdToInrRate = 100;
        const monthlyMajorInInr = currencyRaw === "USD" ? Math.round(monthlyMajor * usdToInrRate) : monthlyMajor;
        const duration = offer?.duration ?? null;
        const months = Math.max(1, monthsFromDuration(duration));

        const monthlyMinor = Math.round(monthlyMajorInInr * 100);
        const internMonthlyMinor = Math.floor(monthlyMinor / 2);
        const internTotalMinor = internMonthlyMinor * months;

        const paidMinor = Math.max(0, Number(payoutsByProposalId[proposalId]?.paidMinor ?? 0) || 0);
        const pendingMinor = Math.max(0, Number(payoutsByProposalId[proposalId]?.pendingMinor ?? 0) || 0);
        const derived = Math.max(0, internTotalMinor - paidMinor - pendingMinor);
        acc[proposalId] = derived;
        return acc;
      }, {});

      const derivedPendingMinor = Object.values(derivedPendingMinorByProposalId).reduce(
        (sum, v) => sum + (Number(v ?? 0) || 0),
        0,
      );

      const derivedSummary = {
        ...summary,
        derivedPendingMinor,
      };

      return res.json({ items, summary: derivedSummary, derivedPendingMinorByProposalId });
    } catch (error) {
      console.error("Intern list payouts error:", error);
      return res.status(500).json({ message: "An error occurred while fetching payout history" });
    }
  });

  app.get("/api/intern/:internId/timesheets", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      if (!internId) return res.status(400).json({ message: "internId is required" });

      const intern = await storage.getUser(internId);
      if (!intern) return res.status(404).json({ message: "Intern not found" });

      const limitRaw = Number((req.query as any)?.limit ?? 200);
      const limit = Number.isFinite(limitRaw) ? Math.min(500, Math.max(1, Math.floor(limitRaw))) : 200;

      const rows = await storage.getTimesheetsByInternId(internId, limit);
      return res.json({ timesheets: rows });
    } catch (error) {
      console.error("List intern timesheets error:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to list timesheets" });
    }
  });

  app.post("/api/intern/:internId/timesheets", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      if (!internId) return res.status(400).json({ message: "internId is required" });

      const intern = await storage.getUser(internId);
      if (!intern) return res.status(404).json({ message: "Intern not found" });

      const payload = internTimesheetCreateSchema.parse(req.body);

      const proposalId = String(payload.proposalId ?? "").trim();
      const proposal = await storage.getProposal(proposalId);
      if (!proposal) return res.status(404).json({ message: "Proposal not found" });

      const employerId = String((proposal as any)?.employerId ?? (proposal as any)?.employer_id ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "Proposal is missing employerId" });

      const proposalInternId = String((proposal as any)?.internId ?? (proposal as any)?.intern_id ?? "").trim();
      if (proposalInternId !== internId) return res.status(403).json({ message: "Proposal does not belong to this intern" });

      const status = String((proposal as any)?.status ?? "").trim().toLowerCase();
      const offer = (proposal as any)?.offerDetails ?? (proposal as any)?.offer_details ?? {};
      const ft = (offer as any)?.fullTimeOffer ?? null;
      const hasFullTimeOffer = !!ft && typeof ft === "object";
      if (hasFullTimeOffer) {
        return res.status(400).json({ message: "Timesheets are not available for full-time offers" });
      }

      const eligible = status === "hired";
      if (!eligible) {
        return res.status(400).json({ message: "Timesheets can be created only for hired proposals" });
      }

      const isoDateOnly = (d: Date) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      };

      const parseIsoLocalDateOnly = (s: string) => {
        const raw = String(s ?? "").trim();
        const iso = raw.length >= 10 ? raw.slice(0, 10) : "";
        if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
        const dt = new Date(`${iso}T00:00:00`);
        if (Number.isNaN(dt.getTime())) return null;
        return dt;
      };

      const buildIsoRangeInclusiveLocal = (start: Date, end: Date) => {
        const out: string[] = [];
        const s = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
        const e = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0);
        if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return out;
        if (e.getTime() < s.getTime()) return out;

        const cur = new Date(s);
        let guard = 0;
        while (guard < 370) {
          out.push(isoDateOnly(cur));
          if (isoDateOnly(cur) === isoDateOnly(e)) break;
          cur.setDate(cur.getDate() + 1);
          guard += 1;
        }
        return out;
      };

      const periodStart = parseIsoLocalDateOnly(payload.periodStart);
      const periodEnd = parseIsoLocalDateOnly(payload.periodEnd);
      if (!periodStart || !periodEnd) return res.status(400).json({ message: "Invalid periodStart/periodEnd" });
      if (periodEnd.getTime() < periodStart.getTime()) {
        return res.status(400).json({ message: "periodEnd must be >= periodStart" });
      }

      const durationRaw = String((offer as any)?.duration ?? "").trim().toLowerCase();
      const durationMatch = durationRaw.match(/^(\d+)\s*m$/i);
      const durationMonths = durationMatch ? Number(durationMatch[1]) : NaN;
      const isOneMonth = Number.isFinite(durationMonths) && durationMonths === 1;

      const existingTimesheets = await storage.getTimesheetsByInternId(internId, 500);
      const existingForProposal = (existingTimesheets ?? []).filter(
        (t: any) => String(t?.proposalId ?? t?.proposal_id ?? "").trim() === proposalId,
      );

      if (isOneMonth && existingForProposal.length > 0) {
        return res.status(400).json({ message: "Only one timesheet can be created for 1 month proposals" });
      }

      const overlaps = existingForProposal.some((t: any) => {
        const s = t?.periodStart instanceof Date ? t.periodStart : new Date(String(t?.periodStart ?? t?.period_start ?? ""));
        const e = t?.periodEnd instanceof Date ? t.periodEnd : new Date(String(t?.periodEnd ?? t?.period_end ?? ""));
        if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return false;
        return s.getTime() <= periodEnd.getTime() && e.getTime() >= periodStart.getTime();
      });
      if (overlaps) {
        return res.status(400).json({ message: "Timesheet already exists for the selected period" });
      }

      const dates = buildIsoRangeInclusiveLocal(periodStart, periodEnd);
      const entries = dates.map((d) => ({ date: d, status: "" }));

      const created = await storage.createTimesheet({
        proposalId,
        employerId,
        internId,
        periodStart,
        periodEnd,
        status: "draft",
        entries,
      } as any);

      return res.status(201).json({ timesheet: created });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Create intern timesheet error:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create timesheet" });
    }
  });

  app.put("/api/intern/:internId/timesheets/:timesheetId", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      const timesheetId = String(req.params.timesheetId ?? "").trim();
      if (!internId || !timesheetId) return res.status(400).json({ message: "Invalid request" });

      const existing = await storage.getTimesheet(timesheetId);
      if (!existing) return res.status(404).json({ message: "Timesheet not found" });

      if (String((existing as any)?.internId ?? "") !== internId) {
        return res.status(403).json({ message: "Timesheet does not belong to this intern" });
      }

      const status = String((existing as any)?.status ?? "draft").toLowerCase();
      if (status !== "draft" && status !== "rejected") {
        return res.status(400).json({ message: "Only draft/rejected timesheets can be edited" });
      }

      const payload = internTimesheetUpdateSchema.parse(req.body);

      const patch: any = {};
      if (payload.entries !== undefined) patch.entries = payload.entries;
      if (payload.internNote !== undefined) {
        const note = payload.internNote === null ? null : String(payload.internNote ?? "").trim();
        patch.internNote = note || null;
      }

      if (status === "rejected") {
        patch.status = "draft";
        patch.rejectedAt = null;
      }

      if (payload.periodStart) {
        const dt = new Date(payload.periodStart);
        if (Number.isNaN(dt.getTime())) return res.status(400).json({ message: "Invalid periodStart" });
        patch.periodStart = dt;
      }
      if (payload.periodEnd) {
        const dt = new Date(payload.periodEnd);
        if (Number.isNaN(dt.getTime())) return res.status(400).json({ message: "Invalid periodEnd" });
        patch.periodEnd = dt;
      }
      if (patch.periodStart && patch.periodEnd && patch.periodEnd.getTime() < patch.periodStart.getTime()) {
        return res.status(400).json({ message: "periodEnd must be >= periodStart" });
      }

      const updated = await storage.updateTimesheet(timesheetId, patch);
      return res.json({ timesheet: updated ?? existing });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Update intern timesheet error:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update timesheet" });
    }
  });

  app.post("/api/intern/:internId/timesheets/:timesheetId/submit", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      const timesheetId = String(req.params.timesheetId ?? "").trim();
      if (!internId || !timesheetId) return res.status(400).json({ message: "Invalid request" });

      const existing = await storage.getTimesheet(timesheetId);
      if (!existing) return res.status(404).json({ message: "Timesheet not found" });

      if (String((existing as any)?.internId ?? "") !== internId) {
        return res.status(403).json({ message: "Timesheet does not belong to this intern" });
      }

      const status = String((existing as any)?.status ?? "draft").toLowerCase();
      if (status !== "draft") {
        return res.status(400).json({ message: "Only draft timesheets can be submitted" });
      }

      const entries = Array.isArray((existing as any)?.entries) ? (existing as any).entries : [];
      if (entries.length === 0) {
        return res.status(400).json({ message: "Please fill the timesheet before submitting" });
      }

      const allowed = new Set(["present", "absent", "fixed off", "holiday"]);
      const byDate = new Map<string, string>();
      for (const it of entries) {
        const d = String(it?.date ?? "").slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
        const st = String(it?.status ?? "").trim();
        const stNorm = st.toLowerCase();
        if (!stNorm || !allowed.has(stNorm)) continue;
        byDate.set(d, st);
      }

      const periodStartIso = String((existing as any)?.periodStart ?? (existing as any)?.period_start ?? "").slice(0, 10);
      const periodEndIso = String((existing as any)?.periodEnd ?? (existing as any)?.period_end ?? "").slice(0, 10);
      const range = buildIsoRangeInclusiveUtc(periodStartIso, periodEndIso);
      if (range.length > 0) {
        const missing = range.filter((d) => !byDate.get(d));
        if (missing.length > 0) {
          return res.status(400).json({
            message: "Please fill all dates in the timesheet before submitting",
            missingDates: missing.slice(0, 62),
          });
        }
      }

      const updated = await storage.updateTimesheet(timesheetId, {
        status: "submitted",
        submittedAt: new Date(),
      } as any);

      const employerId = String((existing as any)?.employerId ?? "").trim();
      const proposalId = String((existing as any)?.proposalId ?? "").trim();

      const internUser = await storage.getUser(internId).catch(() => undefined);
      const internName = internUser
        ? `${String((internUser as any)?.firstName ?? "").trim()} ${String((internUser as any)?.lastName ?? "").trim()}`.trim()
        : "Candidate";

      if (employerId) {
        const submittedAt = (updated as any)?.submittedAt ?? new Date();
        const submittedTs = (() => {
          try {
            const dt = submittedAt instanceof Date ? submittedAt : new Date(String(submittedAt));
            const t = dt.getTime();
            return Number.isFinite(t) ? t : Date.now();
          } catch {
            return Date.now();
          }
        })();
        await storage.createNotificationDeduped({
          recipientType: "employer",
          recipientId: employerId,
          type: "timesheet_submitted",
          title: "Timesheet submitted for approval",
          message: `${internName} submitted a timesheet for approval.`,
          data: { timesheetId, proposalId, internId },
          dedupeKey: `timesheet_submitted:${timesheetId}:${submittedTs}`,
          isRead: false,
        } as any);
      }

      return res.json({ timesheet: updated ?? existing });
    } catch (error) {
      console.error("Submit intern timesheet error:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to submit timesheet" });
    }
  });

  app.delete("/api/intern/:internId/timesheets/:timesheetId", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      const timesheetId = String(req.params.timesheetId ?? "").trim();
      if (!internId || !timesheetId) return res.status(400).json({ message: "Invalid request" });

      const intern = await storage.getUser(internId);
      if (!intern) return res.status(404).json({ message: "Intern not found" });

      const existing = await storage.getTimesheet(timesheetId);
      if (!existing) return res.status(404).json({ message: "Timesheet not found" });

      if (String((existing as any)?.internId ?? "") !== internId) {
        return res.status(403).json({ message: "Timesheet does not belong to this intern" });
      }

      const status = String((existing as any)?.status ?? "draft").trim().toLowerCase();
      if (status === "approved") {
        return res.status(400).json({ message: "Approved timesheets cannot be deleted" });
      }
      if (status !== "draft" && status !== "submitted") {
        return res.status(400).json({ message: "Only draft/submitted timesheets can be deleted" });
      }

      const ok = await storage.deleteTimesheet(timesheetId);
      return res.json({ deleted: Boolean(ok) });
    } catch (error) {
      console.error("Delete intern timesheet error:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to delete timesheet" });
    }
  });

  app.get("/api/employer/:employerId/timesheets", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "employerId is required" });

      const employer = await storage.getEmployer(employerId);
      if (!employer) return res.status(404).json({ message: "Employer not found" });

      const status = String((req.query as any)?.status ?? "").trim().toLowerCase();
      const proposalId = String((req.query as any)?.proposalId ?? "").trim();
      const internId = String((req.query as any)?.internId ?? "").trim();
      const limitRaw = Number((req.query as any)?.limit ?? 500);
      const limit = Number.isFinite(limitRaw) ? Math.min(5000, Math.max(1, Math.floor(limitRaw))) : 500;

      const rows = await storage.listTimesheetsByEmployerId(employerId, {
        status: status || undefined,
        proposalId: proposalId || undefined,
        internId: internId || undefined,
        limit,
      });

      return res.json({ timesheets: rows });
    } catch (error) {
      console.error("Employer list timesheets error:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to list timesheets" });
    }
  });

  app.get("/api/employer/:employerId/timesheets/:timesheetId", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      const timesheetId = String(req.params.timesheetId ?? "").trim();
      if (!employerId || !timesheetId) return res.status(400).json({ message: "Invalid request" });

      const employer = await storage.getEmployer(employerId);
      if (!employer) return res.status(404).json({ message: "Employer not found" });

      const timesheet = await storage.getTimesheet(timesheetId);
      if (!timesheet) return res.status(404).json({ message: "Timesheet not found" });

      if (String((timesheet as any)?.employerId ?? "") !== employerId) {
        return res.status(403).json({ message: "Timesheet does not belong to this employer" });
      }

      const proposalId = String((timesheet as any)?.proposalId ?? "").trim();
      const internId = String((timesheet as any)?.internId ?? "").trim();

      const [proposal, internUser] = await Promise.all([
        proposalId ? storage.getProposal(proposalId).catch(() => undefined) : Promise.resolve(undefined),
        internId ? storage.getUser(internId).catch(() => undefined) : Promise.resolve(undefined),
      ]);

      const projectId = String((proposal as any)?.projectId ?? (proposal as any)?.project_id ?? "").trim();
      const project = projectId ? await storage.getProject(projectId).catch(() => undefined) : undefined;

      const internName = internUser
        ? `${String((internUser as any)?.firstName ?? "").trim()} ${String((internUser as any)?.lastName ?? "").trim()}`.trim()
        : null;
      const projectName = String((project as any)?.projectName ?? "").trim() || null;

      return res.json({
        timesheet: {
          ...(timesheet as any),
          internName,
          projectName,
        },
      });
    } catch (error) {
      console.error("Employer get timesheet error:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch timesheet" });
    }
  });

  app.put("/api/employer/:employerId/timesheets/:timesheetId", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      const timesheetId = String(req.params.timesheetId ?? "").trim();
      if (!employerId || !timesheetId) return res.status(400).json({ message: "Invalid request" });

      const employer = await storage.getEmployer(employerId);
      if (!employer) return res.status(404).json({ message: "Employer not found" });

      const existing = await storage.getTimesheet(timesheetId);
      if (!existing) return res.status(404).json({ message: "Timesheet not found" });

      if (String((existing as any)?.employerId ?? "") !== employerId) {
        return res.status(403).json({ message: "Timesheet does not belong to this employer" });
      }

      const status = String((existing as any)?.status ?? "draft").trim().toLowerCase();
      if (status === "approved") {
        return res.status(400).json({ message: "Approved timesheets cannot be edited" });
      }

      const payload = employerTimesheetUpdateSchema.parse(req.body ?? {});

      const patch: any = {};
      if (payload.entries !== undefined) patch.entries = payload.entries;
      if (payload.managerNote !== undefined) {
        const note = payload.managerNote === null ? null : String(payload.managerNote ?? "").trim();
        patch.managerNote = note || null;
      }
      if (payload.periodStart) {
        const dt = new Date(payload.periodStart);
        if (Number.isNaN(dt.getTime())) return res.status(400).json({ message: "Invalid periodStart" });
        patch.periodStart = dt;
      }
      if (payload.periodEnd) {
        const dt = new Date(payload.periodEnd);
        if (Number.isNaN(dt.getTime())) return res.status(400).json({ message: "Invalid periodEnd" });
        patch.periodEnd = dt;
      }
      if (patch.periodStart && patch.periodEnd && patch.periodEnd.getTime() < patch.periodStart.getTime()) {
        return res.status(400).json({ message: "periodEnd must be >= periodStart" });
      }

      const updated = await storage.updateTimesheet(timesheetId, patch);

      try {
        const internId = String((existing as any)?.internId ?? "").trim();
        if (internId) {
          const dedupeKey = `timesheet_updated_by_employer:${timesheetId}:${new Date().toISOString().slice(0, 10)}`;
          await storage.createNotificationDeduped({
            recipientType: "intern",
            recipientId: internId,
            type: "timesheet_updated_by_employer",
            title: "Timesheet updated",
            message: "📝 Your timesheet has been updated by the employer. Please review the changes.",
            data: { timesheetId, employerId },
            dedupeKey,
            isRead: false,
          } as any);
        }
      } catch (notifyErr) {
        console.error("Employer timesheet update notification error:", notifyErr);
      }

      return res.json({ timesheet: updated ?? existing });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Employer update timesheet error:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update timesheet" });
    }
  });

  app.post("/api/employer/:employerId/timesheets/:timesheetId/approve", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      const timesheetId = String(req.params.timesheetId ?? "").trim();
      if (!employerId || !timesheetId) return res.status(400).json({ message: "Invalid request" });

      const employer = await storage.getEmployer(employerId);
      if (!employer) return res.status(404).json({ message: "Employer not found" });

      const existing = await storage.getTimesheet(timesheetId);
      if (!existing) return res.status(404).json({ message: "Timesheet not found" });

      if (String((existing as any)?.employerId ?? "") !== employerId) {
        return res.status(403).json({ message: "Timesheet does not belong to this employer" });
      }

      const status = String((existing as any)?.status ?? "draft").toLowerCase();
      if (status !== "submitted") {
        return res.status(400).json({ message: "Only submitted timesheets can be approved" });
      }

      const payload = employerTimesheetDecisionSchema.parse(req.body ?? {});
      const managerNote = payload.managerNote === null ? null : String(payload.managerNote ?? "").trim() || null;

      const updated = await storage.updateTimesheet(timesheetId, {
        status: "approved",
        approvedAt: new Date(),
        rejectedAt: null,
        managerNote,
      } as any);

      const internId = String((existing as any)?.internId ?? "").trim();
      if (internId) {
        await storage.createNotificationDeduped({
          recipientType: "intern",
          recipientId: internId,
          type: "timesheet_approved",
          title: "Timesheet approved",
          message: "✅ Your timesheet has been approved by the company.",
          data: { timesheetId },
          dedupeKey: `timesheet_approved:${timesheetId}`,
          isRead: false,
        } as any);
      }

      return res.json({ timesheet: updated ?? existing });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Employer approve timesheet error:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to approve timesheet" });
    }
  });

  app.post("/api/employer/:employerId/timesheets/:timesheetId/reject", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      const timesheetId = String(req.params.timesheetId ?? "").trim();
      if (!employerId || !timesheetId) return res.status(400).json({ message: "Invalid request" });

      const employer = await storage.getEmployer(employerId);
      if (!employer) return res.status(404).json({ message: "Employer not found" });

      const existing = await storage.getTimesheet(timesheetId);
      if (!existing) return res.status(404).json({ message: "Timesheet not found" });

      if (String((existing as any)?.employerId ?? "") !== employerId) {
        return res.status(403).json({ message: "Timesheet does not belong to this employer" });
      }

      const status = String((existing as any)?.status ?? "draft").toLowerCase();
      if (status !== "submitted") {
        return res.status(400).json({ message: "Only submitted timesheets can be rejected" });
      }

      const payload = employerTimesheetDecisionSchema.parse(req.body ?? {});
      const managerNote = payload.managerNote === null ? null : String(payload.managerNote ?? "").trim() || null;

      const updated = await storage.updateTimesheet(timesheetId, {
        status: "rejected",
        rejectedAt: new Date(),
        approvedAt: null,
        managerNote,
      } as any);

      const internId = String((existing as any)?.internId ?? "").trim();
      if (internId) {
        await storage.createNotificationDeduped({
          recipientType: "intern",
          recipientId: internId,
          type: "timesheet_rejected",
          title: "Timesheet needs changes",
          message: "❌ Your timesheet was rejected. Please review and resubmit.",
          data: { timesheetId },
          dedupeKey: `timesheet_rejected:${timesheetId}`,
          isRead: false,
        } as any);
      }

      return res.json({ timesheet: updated ?? existing });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Employer reject timesheet error:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to reject timesheet" });
    }
  });

  // Intern: get single proposal by ID (masked)
  app.get("/api/intern/:internId/proposals/:proposalId", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      const proposalId = String(req.params.proposalId ?? "").trim();
      if (!internId || !proposalId) {
        return res.status(400).json({ message: "Invalid request" });
      }

      const intern = await storage.getUser(internId);
      if (!intern) {
        return res.status(404).json({ message: "Intern not found" });
      }

      const proposal = await storage.getProposal(proposalId);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      const proposalInternId = String((proposal as any)?.internId ?? (proposal as any)?.intern_id ?? "").trim();
      if (proposalInternId !== internId) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      const offer = (proposal as any)?.offerDetails ?? {};

      const statusLower = String((proposal as any)?.status ?? "sent").trim().toLowerCase();
      const isHired = statusLower === "hired";
      const hasFullTimeOffer = !!((offer as any)?.fullTimeOffer) && typeof (offer as any)?.fullTimeOffer === "object";

      const companyDetailsUnlocked =
        hasFullTimeOffer ||
        isHired ||
        Boolean(
          (proposal as any)?.companyDetailsUnlocked ??
            (offer as any)?.companyDetailsUnlocked ??
            (offer as any)?.companyPaid ??
            (offer as any)?.isPaid,
        );
      const monthlyAmountRaw = (offer as any)?.monthlyAmount;
      const monthlyAmountNum = Number(monthlyAmountRaw ?? 0);
      const safeMonthly = Number.isFinite(monthlyAmountNum) ? monthlyAmountNum : 0;
      const maskedMonthly = safeMonthly > 0 ? Math.max(0, Math.round(safeMonthly / 2)) : safeMonthly;

      const totalPriceRaw = (offer as any)?.totalPrice;
      const totalPriceNum = Number(totalPriceRaw ?? 0);
      const safeTotal = Number.isFinite(totalPriceNum) ? totalPriceNum : 0;
      const maskedTotal = safeTotal > 0 ? Math.max(0, Math.round(safeTotal / 2)) : safeTotal;

      const employerId = String((proposal as any)?.employerId ?? (proposal as any)?.employer_id ?? "").trim();
      const employer = employerId ? await storage.getEmployer(employerId).catch(() => undefined) : undefined;
      const employerMeta = (() => {
        if (!employer) return null;
        if (!companyDetailsUnlocked) {
          return {
            companySize: (employer as any)?.companySize ?? (employer as any)?.company_size ?? null,
            country: (employer as any)?.country ?? null,
            countryCode: (employer as any)?.countryCode ?? null,
          };
        }

        return {
          companyName: (employer as any)?.companyName ?? (employer as any)?.company_name ?? null,
          companySize: (employer as any)?.companySize ?? (employer as any)?.company_size ?? null,
          city: (employer as any)?.city ?? null,
          state: (employer as any)?.state ?? null,
          country: (employer as any)?.country ?? null,
          countryCode: (employer as any)?.countryCode ?? null,
          primaryContactName: (employer as any)?.primaryContactName ?? (employer as any)?.primary_contact_name ?? null,
          phoneNumber: (employer as any)?.phoneNumber ?? (employer as any)?.phone_number ?? null,
        };
      })();

      const projectId = String((proposal as any)?.projectId ?? (proposal as any)?.project_id ?? "").trim();
      const project = projectId ? await storage.getProject(projectId).catch(() => undefined) : undefined;
      const projectUpdatedAt = (project as any)?.updatedAt ?? (project as any)?.updated_at ?? null;
      const projectSkills = Array.isArray(project?.skills) ? project.skills : [];
      const projectName = String(project?.projectName ?? project?.project_name ?? "").trim();
      const projectScopeOfWork = String(project?.scopeOfWork ?? project?.scope_of_work ?? "").trim();

      const maskedProposal = {
        ...proposal,
        offerDetails: {
          ...offer,
          monthlyAmount: maskedMonthly,
          totalPrice: maskedTotal,
        },
        employer: employerMeta,
        projectUpdatedAt,
        projectSkills,
        projectName,
        projectScopeOfWork,
      };

      return res.json({ proposal: maskedProposal });
    } catch (error) {
      console.error("Get intern proposal error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while fetching proposal" });
    }
  });

  // Get single proposal by ID
  app.get("/api/proposals/:id", async (req, res) => {
    try {
      const proposal = await storage.getProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      const project = await storage.getProject(proposal.projectId).catch(() => undefined);
      const projectSkills = Array.isArray(project?.skills) ? project.skills : [];
      const projectName = String(project?.projectName ?? project?.project_name ?? "").trim();
      const projectScopeOfWork = String(project?.scopeOfWork ?? project?.scope_of_work ?? "").trim();

      const internOnboarding = proposal.internId
        ? await storage.getInternOnboardingByUserId(proposal.internId).catch(() => undefined)
        : undefined;

      return res.json({
        proposal: {
          ...proposal,
          projectSkills,
          projectName,
          projectScopeOfWork,
        },
        internOnboarding: internOnboarding
          ? { hasLaptop: internOnboarding.hasLaptop ?? null }
          : null,
      });
    } catch (error) {
      console.error("Get proposal error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while fetching proposal" });
    }
  });

  // Employer: update proposal fields (offer details, skills, ratings, status)
  app.put("/api/proposals/:id", async (req, res) => {
    try {
      const updateSchema = createProposalSchema
        .partial()
        .extend({
          status: z
            .enum(["draft", "sent", "accepted", "rejected", "expired", "interview_scheduled", "withdrawn"])
            .optional(),
        });

      const data = updateSchema.parse(req.body);

      const existing = await storage.getProposal(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      const incomingProjectId = data.projectId != null ? String(data.projectId) : "";
      const existingProjectId = String((existing as any)?.projectId ?? (existing as any)?.project_id ?? "");
      if (incomingProjectId && existingProjectId && incomingProjectId !== existingProjectId) {
        return res.status(400).json({ message: "projectId cannot be changed" });
      }

      const incomingInternId = data.internId != null ? String(data.internId) : "";
      const existingInternId = String((existing as any)?.internId ?? (existing as any)?.intern_id ?? "");
      if (incomingInternId && existingInternId && incomingInternId !== existingInternId) {
        return res.status(400).json({ message: "internId cannot be changed" });
      }

      const incomingEmployerId = (data as any).employerId != null ? String((data as any).employerId) : "";
      const existingEmployerId = String((existing as any)?.employerId ?? (existing as any)?.employer_id ?? "");
      if (incomingEmployerId && existingEmployerId && incomingEmployerId !== existingEmployerId) {
        return res.status(400).json({ message: "employerId cannot be changed" });
      }

      const normalizeLocationType = (value: unknown) => {
        const v = String(value ?? "").trim().toLowerCase();
        if (v === "remote" || v === "hybrid" || v === "onsite") return v;
        return "";
      };

      const project = existingProjectId
        ? await storage.getProject(existingProjectId).catch(() => undefined)
        : undefined;
      const enforcedMode = normalizeLocationType((project as any)?.locationType ?? (project as any)?.location_type);

      const normalizeCurrency = (value: unknown) => {
        const raw = String(value ?? "")
          .trim()
          .toUpperCase();
        if (raw === "INR" || raw === "USD") return raw as "INR" | "USD";
        return "";
      };

      const updatePayload: any = { ...data };
      if (data.offerDetails !== undefined) {
        const nextOffer = { ...(data.offerDetails ?? {}) } as Record<string, any>;
        const incomingMode = normalizeLocationType((nextOffer as any)?.mode);
        if (!incomingMode && enforcedMode) nextOffer.mode = enforcedMode;
        if (incomingMode) nextOffer.mode = incomingMode;
        updatePayload.offerDetails = nextOffer;
      }

      const incomingCurrency =
        normalizeCurrency((data as any).currency) || normalizeCurrency((data.offerDetails as any)?.currency);
      if (incomingCurrency) {
        updatePayload.currency = incomingCurrency;
        const existingOffer = ((existing as any)?.offerDetails ?? {}) as Record<string, any>;
        if (updatePayload.offerDetails !== undefined) {
          updatePayload.offerDetails = {
            ...(updatePayload.offerDetails ?? {}),
            currency: incomingCurrency,
          };
        } else {
          updatePayload.offerDetails = {
            ...existingOffer,
            currency: incomingCurrency,
          };
        }
      }

      delete updatePayload.projectId;
      delete updatePayload.internId;
      delete updatePayload.employerId;

      try {
        const incomingOffer = (updatePayload.offerDetails ?? data.offerDetails ?? {}) as any;
        const incomingDuration = String(incomingOffer?.duration ?? "").trim().toLowerCase();
        const isMonthlyDuration = incomingDuration === "3m" || incomingDuration === "6m";
        if (isMonthlyDuration) {
          const internId = String((existing as any)?.internId ?? (existing as any)?.intern_id ?? "").trim();
          if (internId) {
            const onboarding = await storage.getInternOnboardingByUserId(internId).catch(() => undefined);
            const scoreRaw = (onboarding as any)?.extraData?.findternScore;
            const score = Number(scoreRaw ?? 0);
            if (Number.isFinite(score) && score > 0 && score < 6) {
              return res.status(400).json({
                message: "Monthly payment is not allowed for ratings below 6",
              });
            }
          }
        }
      } catch (scoreErr) {
        console.error("Update proposal duration validation error:", scoreErr);
      }

      const updated = await storage.updateProposal(req.params.id, updatePayload as any);
      if (!updated) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      try {
        const internId = String((updated as any)?.internId ?? (updated as any)?.intern_id ?? "").trim();
        const employerId = String((updated as any)?.employerId ?? (updated as any)?.employer_id ?? "").trim();
        const projectId = String((updated as any)?.projectId ?? (updated as any)?.project_id ?? "").trim();
        if (internId) {
          await storage.createNotification({
            recipientType: "intern",
            recipientId: internId,
            type: "proposal_updated",
            title: "Proposal updated",
            message: "The proposal has been updated, please review.",
            data: {
              proposalId: String((updated as any)?.id ?? req.params.id),
              internId,
              employerId,
              projectId,
            },
            isRead: false,
          } as any);
        }
      } catch (notifyErr) {
        console.error("Create proposal updated notification error:", notifyErr);
      }

      return res.json({
        message: "Proposal updated",
        proposal: updated,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("Update proposal error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while updating proposal" });
    }
  });

  // Intern: update proposal status (accept / reject etc.)
  app.patch("/api/proposals/:id/status", async (req, res) => {
    try {
      const statusSchema = z.enum([
        "draft",
        "sent",
        "accepted",
        "rejected",
        "expired",
        "interview_scheduled",
      ]);
      const status = statusSchema.parse(req.body.status);

      const existing = await storage.getProposal(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      const updated = await storage.updateProposalStatus(req.params.id, status);
      if (!updated) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      try {
        const statusLower = String(status).trim().toLowerCase();
        if (statusLower === "accepted") {
          const employerId = String((updated as any)?.employerId ?? (updated as any)?.employer_id ?? "").trim();
          const internId = String((updated as any)?.internId ?? (updated as any)?.intern_id ?? "").trim();
          const acceptedId = String((updated as any)?.id ?? req.params.id).trim();

          if (employerId && internId) {
            const allForIntern = await storage.getProposalsByInternId(internId).catch(() => [] as any[]);
            const toExpire = (Array.isArray(allForIntern) ? allForIntern : []).filter((p: any) => {
              const pid = String((p as any)?.id ?? "").trim();
              if (!pid || pid === acceptedId) return false;
              const pEmployerId = String((p as any)?.employerId ?? (p as any)?.employer_id ?? "").trim();
              if (pEmployerId !== employerId) return false;
              const s = String((p as any)?.status ?? "").trim().toLowerCase();
              return s === "sent" || s === "draft" || s === "interview_scheduled";
            });

            if (toExpire.length > 0) {
              await Promise.all(
                toExpire.map(async (p: any) => {
                  const pid = String((p as any)?.id ?? "").trim();
                  if (!pid) return;
                  await storage.updateProposalStatus(pid, "expired");

                  try {
                    const projectId = String((p as any)?.projectId ?? (p as any)?.project_id ?? "").trim();
                    if (projectId) {
                      await Promise.all([
                        storage.removeEmployerCartItem(employerId, projectId, "cart", internId),
                        storage.removeEmployerCartItem(employerId, projectId, "checkout", internId),
                      ]);
                    }
                  } catch {
                    return;
                  }
                }),
              );
            }
          }
        }
      } catch (expireErr) {
        console.error("Auto-expire other proposals error:", expireErr);
      }

      try {
        const statusLower = String(status).trim().toLowerCase();
        if (statusLower === "rejected" || statusLower === "expired") {
          const employerId = String((updated as any)?.employerId ?? (updated as any)?.employer_id ?? "").trim();
          const projectId = String((updated as any)?.projectId ?? (updated as any)?.project_id ?? "").trim();
          const internId = String((updated as any)?.internId ?? (updated as any)?.intern_id ?? "").trim();

          if (employerId && projectId && internId) {
            await Promise.all([
              storage.removeEmployerCartItem(employerId, projectId, "cart", internId),
              storage.removeEmployerCartItem(employerId, projectId, "checkout", internId),
            ]);
          }
        }
      } catch (cartErr) {
        console.error("Remove rejected proposal from employer cart error:", cartErr);
      }

      try {
        const employer = await storage.getEmployer(updated.employerId).catch(() => undefined);
        const intern = await storage.getUser(updated.internId).catch(() => undefined);
        const internName = intern
          ? `${intern.firstName ?? ""} ${intern.lastName ?? ""}`.trim() || "Intern"
          : "Intern";
        const employerName = employer?.companyName || employer?.name || "Employer";

        const statusLower = String(status).trim().toLowerCase();
        const isFullTime = hasFullTimeOffer(updated);

        const msg = (() => {
          if (isFullTime && (statusLower === "accepted" || statusLower === "rejected")) {
            return statusLower === "accepted"
              ? `🎉 ${internName} has accepted your full-time job offer.`
              : `ℹ️ ${internName} has declined your full-time job offer.`;
          }
          return formatNotification("⚡ Quick heads-up — candidate responded to your proposal.", { Name: internName });
        })();

        const notificationType = isFullTime
          ? "full_time_offer_status"
          : "proposal_status";

        const notificationTitle = isFullTime
          ? "Full-time offer update"
          : "Proposal update";

        const statusDedupKey = `${notificationType}:${String(updated.id ?? "").trim()}:${String(updated.status ?? "")
          .trim()
          .toLowerCase()}`;

        await storage.createNotificationDeduped({
          recipientType: "employer",
          recipientId: updated.employerId,
          type: notificationType,
          title: notificationTitle,
          message: msg,
          data: {
            proposalId: updated.id,
            status: updated.status,
            internId: updated.internId,
            employerId: updated.employerId,
            internName,
            employerName,
            isFullTimeOffer: isFullTime,
          },
          dedupeKey: statusDedupKey,
          isRead: false,
        } as any);

        try {
          const statusLowerInner = String(status).trim().toLowerCase();
          if (isFullTime && statusLowerInner === "accepted") {
            await storage.createNotificationDeduped({
              recipientType: "intern",
              recipientId: updated.internId,
              type: "full_time_hired",
              title: "Full-time hired",
              message: `🏆 Congratulations! You’re officially hired as a full-time employee for "${employerName}".`,
              data: {
                proposalId: updated.id,
                employerId: updated.employerId,
                employerName,
              },
              dedupeKey: `full_time_hired:${String(updated.id ?? "").trim()}:${String(updated.internId ?? "").trim()}`,
              isRead: false,
            } as any);
          }
        } catch (internNotifyErr) {
          console.error("Create full-time hired intern notification error:", internNotifyErr);
        }

      } catch (notifyErr) {
        console.error("Create proposal status notification error:", notifyErr);
      }

      try {
        const statusLower = String(status).trim().toLowerCase();
        if (statusLower === "accepted" || statusLower === "rejected") {
          const employer = await storage.getEmployer(updated.employerId).catch(() => undefined);
          const intern = await storage.getUser(updated.internId).catch(() => undefined);
          const projectId = String((updated as any)?.projectId ?? (updated as any)?.project_id ?? "").trim();
          const project = projectId ? await storage.getProject(projectId).catch(() => undefined) : undefined;

          const isFullTimeOffer = hasFullTimeOffer(updated);

          const employerEmail = String((employer as any)?.companyEmail ?? (employer as any)?.email ?? "").trim();
          const employerName = String((employer as any)?.companyName ?? (employer as any)?.name ?? "Employer").trim();
          const internName = intern
            ? `${String((intern as any)?.firstName ?? "").trim()} ${String((intern as any)?.lastName ?? "").trim()}`.trim() || "Candidate"
            : "Candidate";
          const offerDetails = ((existing as any)?.offerDetails ?? {}) as Record<string, any>;
          const roleName = String(offerDetails?.roleTitle ?? (project as any)?.projectName ?? "").trim() || "the role";

          const appBaseUrl = getAppBaseUrl(req);
          const proposalUrl = appBaseUrl
            ? `${appBaseUrl}/employer/proposals/${encodeURIComponent(String(updated.id ?? req.params.id))}`
            : "";

          if (employerEmail && proposalUrl) {
            if (isFullTimeOffer) {
              await sendProposalStatusUpdatedEmployerEmail({
                to: employerEmail,
                employerName,
                internName,
                roleName,
                status: statusLower as "accepted" | "rejected",
                proposalUrl,
                appBaseUrl,
              });
            } else {
              await sendInternshipProposalStatusUpdatedEmployerEmail({
                to: employerEmail,
                employerName,
                roleName,
                dashboardUrl: proposalUrl,
                appBaseUrl,
              });
            }
          }
        }
      } catch (mailErr) {
        console.error("Proposal status email error:", mailErr);
      }

      return res.json({
        message: "Proposal status updated",
        proposal: updated,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("Update proposal status error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while updating proposal status" });
    }
  });

  // ---------------------------------------------
  // Notifications: list + mark read
  // ---------------------------------------------

  app.get("/api/intern/:internId/notifications", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      if (!internId) return res.status(400).json({ message: "internId is required" });
      const items = await storage.listNotificationsForRecipient("intern", internId, 50);
      return res.json({ notifications: items });
    } catch (error) {
      console.error("List intern notifications error:", error);
      return res.status(500).json({ message: "An error occurred while fetching notifications" });
    }
  });

  app.get("/api/employer/:employerId/notifications", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "employerId is required" });
      const items = await storage.listNotificationsForRecipient("employer", employerId, 50);
      return res.json({ notifications: items });
    } catch (error) {
      console.error("List employer notifications error:", error);
      return res.status(500).json({ message: "An error occurred while fetching notifications" });
    }
  });

  app.post("/api/intern/:internId/notifications/read-all", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      if (!internId) return res.status(400).json({ message: "internId is required" });
      const count = await storage.markAllNotificationsReadForRecipient("intern", internId);
      return res.json({ updatedCount: count });
    } catch (error) {
      console.error("Mark all intern notifications read error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while marking all notifications read" });
    }
  });

  app.post("/api/employer/:employerId/notifications/read-all", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "employerId is required" });
      const count = await storage.markAllNotificationsReadForRecipient("employer", employerId);
      return res.json({ updatedCount: count });
    } catch (error) {
      console.error("Mark all employer notifications read error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while marking all notifications read" });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      const id = String(req.params.id ?? "").trim();
      if (!id) return res.status(400).json({ message: "Notification id is required" });
      const updated = await storage.markNotificationRead(id);
      if (!updated) return res.status(404).json({ message: "Notification not found" });
      return res.json({ notification: updated });
    } catch (error) {
      console.error("Mark notification read error:", error);
      return res.status(500).json({ message: "An error occurred while marking notification read" });
    }
  });
app.get("/api/interns", async (_req, res) => {
    try {
      const onboardingList = await storage.getAllInternOnboarding();
      const userIds = Array.from(new Set(onboardingList.map((i) => i.userId)));

      const usersById: Record<string, any> = {};
      const docsByUserId: Record<string, any | null> = {};
      const latestInterviewByUserId: Record<string, any | null> = {};

      for (const id of userIds) {
        const user = await storage.getUser(id);
        if (user) {
          const { password, ...safeUser } = user as any;
          usersById[id] = safeUser;
        }

        const docs = await storage.getInternDocumentsByUserId(id);
        docsByUserId[id] = docs ?? null;

        try {
          const interviews = await storage.getInterviewsByInternId(id);
          const latest = Array.isArray(interviews) && interviews.length > 0 ? interviews[0] : null;
          latestInterviewByUserId[id] = latest ? serializeInterview(latest) : null;
        } catch {
          latestInterviewByUserId[id] = null;
        }
      }

      const enriched = onboardingList.map((onboarding) => ({
        user: usersById[onboarding.userId] ?? null,
        onboarding,
        documents: docsByUserId[onboarding.userId] ?? null,
        latestInterview: latestInterviewByUserId[onboarding.userId] ?? null,
      })).filter((row) => Boolean(row.user));

      return res.json({ interns: enriched });
    } catch (error) {
      console.error("Interns list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching interns" });
    }
  });
app.get("/api/intern/:internId/payment-status", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      if (!internId) return res.status(400).json({ message: "internId is required" });

      const onboarding = await storage.getInternOnboardingByUserId(internId);
      const isPaid = Boolean((onboarding as any)?.extraData?.payment?.isPaid);
      return res.json({ isPaid });
    } catch (error) {
      console.error("Get intern payment status error:", error);
      return res.status(500).json({ message: "An error occurred while fetching payment status" });
    }
  });

  app.post("/api/intern/:internId/payment/razorpay/order", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      if (!internId) return res.status(400).json({ message: "internId is required" });

      const onboarding = await storage.getInternOnboardingByUserId(internId);
      if (!onboarding) {
        return res.status(404).json({ message: "Onboarding data not found" });
      }

      const alreadyPaid = Boolean((onboarding as any)?.extraData?.payment?.isPaid);
      if (alreadyPaid) {
        return res.status(409).json({ message: "Payment already completed" });
      }

      const { keyId, currency, amountMinor } = getRazorpayConfig();

      const receipt = `intern_${internId.slice(0, 8)}_${Date.now().toString(36)}`;
      const order = await createRazorpayOrder({
        amountMinor,
        currency,
        receipt,
        notes: {
          internId,
          purpose: "intern_account_activation",
        },
      });

      return res.json({
        keyId,
        orderId: order?.id,
        amountMinor: order?.amount,
        currency: order?.currency,
      });
    } catch (error) {
      console.error("Create intern Razorpay order error:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create order" });
    }
  });

  app.post("/api/intern/:internId/payment/razorpay/verify", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      if (!internId) return res.status(400).json({ message: "internId is required" });

      const body = (req.body ?? {}) as any;
      const orderId = String(body?.razorpay_order_id ?? body?.orderId ?? "").trim();
      const paymentId = String(body?.razorpay_payment_id ?? body?.paymentId ?? "").trim();
      const signature = String(body?.razorpay_signature ?? body?.signature ?? "").trim();

      if (!orderId || !paymentId || !signature) {
        return res.status(400).json({ message: "Missing razorpay_order_id / razorpay_payment_id / razorpay_signature" });
      }

      const paymentRow = await storage.getInternPaymentByOrderId(orderId).catch(() => undefined);
      const shouldSendActivationEmail = String((paymentRow as any)?.status ?? "").trim().toLowerCase() !== "paid";

      const order = await fetchRazorpayOrder(orderId);
      const notes = (order as any)?.notes ?? {};
      const orderInternId = String((notes as any)?.internId ?? "").trim();
      if (orderInternId && orderInternId !== internId) {
        return res.status(403).json({ message: "Payment order does not belong to this user" });
      }

      const { keySecret } = getRazorpayConfig();
      const expected = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expected);
      const valid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
      if (!valid) {
        return res.status(400).json({ message: "Invalid payment signature" });
      }

      const amountMinorDb = Number((order as any)?.amount ?? 0);
      const currencyDb = String((order as any)?.currency ?? "INR").toUpperCase();
      const rawDb = {
        ...(paymentRow ? ((paymentRow as any)?.raw ?? {}) : {}),
        order,
        verification: body,
      };

      if (paymentRow) {
        await storage.updateInternPaymentByOrderId(orderId, {
          status: "paid",
          paymentId,
          signature,
          paidAt: new Date(),
          raw: rawDb,
        } as any);
      } else {
        await storage.createInternPayment({
          internId,
          gateway: "razorpay",
          orderId,
          paymentId,
          signature,
          amountMinor: Number.isFinite(amountMinorDb) && amountMinorDb > 0 ? amountMinorDb : 0,
          currency: currencyDb || "INR",
          status: "paid",
          paidAt: new Date(),
          raw: rawDb,
        } as any);
      }

      const onboarding = await storage.getInternOnboardingByUserId(internId);
      if (!onboarding) {
        return res.status(404).json({ message: "Onboarding data not found" });
      }

      const nextExtra = {
        ...((onboarding as any).extraData ?? {}),
        payment: {
          ...(((onboarding as any).extraData as any)?.payment ?? {}),
          isPaid: true,
          paidAt: new Date().toISOString(),
          gateway: "razorpay",
          orderId,
          paymentId,
        },
      };

      await storage.updateInternOnboarding(internId, { extraData: nextExtra } as any);

      try {
        const user = await storage.getUser(internId).catch(() => undefined);
        const internName = user
          ? `${String((user as any)?.firstName ?? "").trim()} ${String((user as any)?.lastName ?? "").trim()}`.trim() || "Candidate"
          : "Candidate";

        await storage.createNotificationDeduped({
          recipientType: "intern",
          recipientId: internId,
          type: "go_live_fee_paid",
          title: "Payment received",
          message: formatNotification(
            "🎉 Payment received successfully. You can now explore endless opportunities on FindIntern!",
            { Name: internName },
          ),
          data: {
            orderId,
            paymentId,
            amountMinor: Number.isFinite(amountMinorDb) && amountMinorDb > 0 ? amountMinorDb : null,
            currency: currencyDb || null,
          },
          dedupeKey: `go_live_fee_paid:${orderId}:${internId}`,
          isRead: false,
        } as any);
      } catch (notifyErr) {
        console.error("Intern activation payment notification error:", notifyErr);
      }

      try {
        if (shouldSendActivationEmail) {
          const user = await storage.getUser(internId);
          const internEmail = String((user as any)?.email ?? "").trim();
          const internName = `${String((user as any)?.firstName ?? "").trim()} ${String((user as any)?.lastName ?? "").trim()}`.trim();
          const appBaseUrl = getAppBaseUrl(req);
          const dashboardUrl = appBaseUrl ? `${appBaseUrl}/dashboard` : "";

          if (internEmail) {
            await sendInternActivationPaymentSuccessEmail({
              to: internEmail,
              internName: internName || "Candidate",
              appBaseUrl,
              dashboardUrl,
              amountMinor: Number.isFinite(amountMinorDb) && amountMinorDb > 0 ? amountMinorDb : undefined,
              currency: currencyDb || "INR",
            });
          }
        }
      } catch (mailErr) {
        console.error("Intern activation payment email error:", mailErr);
      }

      return res.json({ message: "Payment verified", isPaid: true });
    } catch (error) {
      console.error("Verify intern Razorpay payment error:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to verify payment" });
    }
  });
  
  app.post("/api/employer/:employerId/payment/razorpay/order", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "employerId is required" });

      const employer = await storage.getEmployer(employerId);
      if (!employer) return res.status(404).json({ message: "Employer not found" });

      const body = (req.body ?? {}) as any;
      const currency = String(body?.currency ?? "INR").trim().toUpperCase();
      const proposalIds = Array.isArray(body?.proposalIds) ? body.proposalIds.map((v: any) => String(v)) : [];
      const paymentModeRaw = String(body?.paymentMode ?? "").trim().toLowerCase();
      const paymentMode = paymentModeRaw === "monthly" || paymentModeRaw === "total" ? paymentModeRaw : "total";

      const clientAmountMinor = Number(body?.amountMinor ?? 0);

      if (currency !== "INR" && currency !== "USD") {
        return res.status(400).json({ message: "Unsupported currency" });
      }
      if (!Array.isArray(proposalIds) || proposalIds.length === 0) {
        return res.status(400).json({ message: "proposalIds is required" });
      }

      const normalizeCurrency = (value: unknown) => {
        const raw = String(value ?? "")
          .trim()
          .toUpperCase();
        if (raw === "INR" || raw === "USD") return raw as "INR" | "USD";
        return "";
      };

      const monthsFromDuration = (duration: unknown) => {
        switch (String(duration ?? "").trim().toLowerCase()) {
          case "2m":
            return 2;
          case "3m":
            return 3;
          case "6m":
            return 6;
          default:
            return 1;
        }
      };

      const perHireChargeAmount = (score: number, curr: "INR" | "USD") => {
        if (!Number.isFinite(score)) return 0;
        if (score >= 6) return 0;
        return curr === "INR" ? 5000 : 50;
      };

      const proposals = await storage.getProposalsByIds(proposalIds);
      const proposalById = (Array.isArray(proposals) ? proposals : []).reduce<Record<string, any>>((acc, p: any) => {
        const id = String(p?.id ?? "").trim();
        if (id) acc[id] = p;
        return acc;
      }, {});

      const missingIds = proposalIds.filter((id: string) => !proposalById[String(id ?? "").trim()]);
      if (missingIds.length) {
        return res.status(404).json({ message: "Proposal not found", missingIds });
      }

      for (const id of proposalIds) {
        const p = proposalById[String(id ?? "").trim()];
        if (String(p?.employerId ?? p?.employer_id ?? "").trim() !== employerId) {
          return res.status(403).json({ message: "Proposal does not belong to this employer" });
        }
        const status = String(p?.status ?? "").trim().toLowerCase();
        if (status !== "accepted") {
          return res.status(400).json({ message: "Only accepted proposals can be paid" });
        }

        const proposalCurrency =
          normalizeCurrency(p?.currency) || normalizeCurrency((p?.offerDetails ?? (p as any)?.offer_details ?? {})?.currency);
        if (proposalCurrency && proposalCurrency !== currency) {
          return res.status(400).json({ message: "Select same currency", expectedCurrency: currency });
        }
      }

      const internIds = Array.from(
        new Set(
          proposalIds
            .map((id: string) => String((proposalById[String(id ?? "").trim()] as any)?.internId ?? "").trim())
            .filter(Boolean),
        ),
      );
      const onboardingRows = await Promise.all(
        internIds.map(async (internId) => ({
          internId,
          onboarding: await storage.getInternOnboardingByUserId(internId).catch(() => undefined),
        })),
      );
      const scoreByInternId = onboardingRows.reduce<Record<string, number>>((acc, row) => {
        const raw = (row.onboarding as any)?.extraData?.findternScore;
        const n = Number(raw ?? 0);
        acc[row.internId] = Number.isFinite(n) ? n : 0;
        return acc;
      }, {});

      const computeDiscountedTotalMajor = (offer: any, score: number) => {
        const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
        const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
        if (hasFullTimeOffer) {
          const annualCtc = Number((fullTimeOffer as any)?.annualCtc ?? 0);
          if (!Number.isFinite(annualCtc) || annualCtc <= 0) return 0;
          return Math.max(0, Math.round((annualCtc * 8.33) / 100));
        }

        const months = monthsFromDuration(offer?.duration);
        const monthly = Number(offer?.monthlyAmount ?? 0);
        const safeMonthly = Number.isFinite(monthly) ? monthly : 0;
        const totalFromOffer = Number(offer?.totalPrice ?? 0);
        const safeTotalFromOffer = Number.isFinite(totalFromOffer) ? totalFromOffer : 0;
        const perHire = perHireChargeAmount(score, currency as any);

        const baseTotal = safeTotalFromOffer > 0 ? safeTotalFromOffer : safeMonthly * months + perHire;
        if (score < 6) return Math.max(0, Math.round(baseTotal));
        if (months <= 1) return Math.max(0, Math.round(baseTotal));
        return Math.max(0, Math.round(baseTotal * 0.9));
      };

      const computeMonthlyPayableMajor = (offer: any, score: number) => {
        const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
        const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
        if (hasFullTimeOffer) {
          return 0;
        }

        const monthly = Number(offer?.monthlyAmount ?? 0);
        const safeMonthly = Number.isFinite(monthly) ? monthly : 0;
        const perHire = perHireChargeAmount(score, currency as any);
        return Math.max(0, Math.round(safeMonthly + perHire));
      };

      if (paymentMode === "monthly") {
        const hasFullTime = proposalIds.some((id: string) => {
          const p = proposalById[String(id ?? "").trim()];
          const offer = (p?.offerDetails ?? (p as any)?.offer_details ?? {}) as any;
          const fto = (offer as any)?.fullTimeOffer ?? null;
          return !!fto && typeof fto === "object";
        });
        if (hasFullTime) {
          return res.status(400).json({ message: "Monthly payment is not allowed for full-time offers" });
        }

        const restricted = proposalIds.some((id: string) => {
          const p = proposalById[String(id ?? "").trim()];
          const internId = String(p?.internId ?? p?.intern_id ?? "").trim();
          const score = Number(scoreByInternId[internId] ?? 0);
          return Number.isFinite(score) && score < 6;
        });
        if (restricted) {
          return res.status(400).json({ message: "Monthly payment is not allowed for ratings below 6" });
        }
      }

      const expectedAmountMajor = proposalIds.reduce((sum: number, id: string) => {
        const p = proposalById[String(id ?? "").trim()];
        const offer = (p?.offerDetails ?? (p as any)?.offer_details ?? {}) as any;
        const internId = String(p?.internId ?? p?.intern_id ?? "").trim();
        const score = Number(scoreByInternId[internId] ?? 0);
        if (paymentMode === "monthly") {
          return sum + computeMonthlyPayableMajor(offer, score);
        }
        return sum + computeDiscountedTotalMajor(offer, score);
      }, 0);

      const expectedAmountMinor = Math.round(expectedAmountMajor * 100);
      if (!Number.isFinite(expectedAmountMinor) || expectedAmountMinor <= 0) {
        return res.status(400).json({ message: "Invalid computed amount" });
      }

      const { keyId } = getRazorpayKeys();
      const receipt = `employer_${employerId.slice(0, 8)}_${Date.now().toString(36)}`;

      if (Number.isFinite(clientAmountMinor) && clientAmountMinor > 0 && clientAmountMinor !== expectedAmountMinor) {
        console.warn("Employer payment amount mismatch", {
          employerId,
          proposalIds,
          paymentMode,
          currency,
          clientAmountMinor,
          expectedAmountMinor,
        });
      }

      const order = await createRazorpayOrder({
        amountMinor: expectedAmountMinor,
        currency,
        receipt,
        notes: {
          employerId,
          purpose: "employer_checkout",
          proposalIds,
          paymentMode,
          computedAmountMinor: expectedAmountMinor,
        },
      });

      const orderId = String(order?.id ?? "").trim();
      if (!orderId) {
        throw new Error("Failed to create payment order");
      }

      return res.json({
        status: "pending",
        keyId,
        orderId,
        amountMinor: order?.amount,
        currency: order?.currency,
      });
    } catch (error) {
      console.error("Create employer Razorpay order error:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create order" });
    }
  });

  app.post("/api/employer/:employerId/payment/razorpay/monthly-order", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "employerId is required" });

      const employer = await storage.getEmployer(employerId);
      if (!employer) return res.status(404).json({ message: "Employer not found" });

      const body = (req.body ?? {}) as any;
      const proposalId = String(body?.proposalId ?? "").trim();
      if (!proposalId) return res.status(400).json({ message: "proposalId is required" });

      const proposal = await storage.getProposal(proposalId);
      if (!proposal) return res.status(404).json({ message: "Proposal not found" });

      if (String((proposal as any)?.employerId ?? (proposal as any)?.employer_id ?? "").trim() !== employerId) {
        return res.status(403).json({ message: "Proposal does not belong to this employer" });
      }

      const status = String((proposal as any)?.status ?? "").trim().toLowerCase();
      if (status !== "hired") {
        return res.status(400).json({ message: "Monthly payments are allowed only for hired proposals" });
      }

      const offer = ((proposal as any)?.offerDetails ?? (proposal as any)?.offer_details ?? {}) as any;
      const currencyRaw = String(offer?.currency ?? (proposal as any)?.currency ?? "INR").trim().toUpperCase();
      const currency = currencyRaw === "USD" ? "USD" : "INR";

      const monthlyMajorRaw = Number(offer?.monthlyAmount ?? offer?.monthly_amount ?? 0);
      const monthlyMajor = Number.isFinite(monthlyMajorRaw) ? Math.max(0, monthlyMajorRaw) : 0;
      const amountMinor = Math.round(monthlyMajor * 100);
      if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
        return res.status(400).json({ message: "Monthly amount is not configured for this proposal" });
      }

      const { keyId } = getRazorpayKeys();
      const receipt = `employer_monthly_${employerId.slice(0, 8)}_${Date.now().toString(36)}`;

      const order = await createRazorpayOrder({
        amountMinor,
        currency,
        receipt,
        notes: {
          employerId,
          purpose: "employer_monthly_payment",
          proposalIds: [proposalId],
          paymentMode: "monthly",
          computedAmountMinor: amountMinor,
        },
      });

      const orderId = String(order?.id ?? "").trim();
      if (!orderId) throw new Error("Failed to create payment order");

      return res.json({
        status: "pending",
        keyId,
        orderId,
        amountMinor: order?.amount,
        currency: order?.currency,
      });
    } catch (error) {
      console.error("Create employer monthly Razorpay order error:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create order" });
    }
  });

  app.post("/api/employer/:employerId/payment/razorpay/monthly-verify", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "employerId is required" });

      const employer = await storage.getEmployer(employerId);
      if (!employer) return res.status(404).json({ message: "Employer not found" });

      const body = (req.body ?? {}) as any;
      const orderId = String(body?.razorpay_order_id ?? body?.orderId ?? "").trim();
      const paymentId = String(body?.razorpay_payment_id ?? body?.paymentId ?? "").trim();
      const signature = String(body?.razorpay_signature ?? body?.signature ?? "").trim();

      if (!orderId || !paymentId || !signature) {
        return res.status(400).json({ message: "Missing razorpay_order_id / razorpay_payment_id / razorpay_signature" });
      }

      const paymentRow = await storage.getEmployerPaymentByOrderId(orderId);

      const { keySecret } = getRazorpayKeys();
      const expected = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expected);
      const valid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
      if (!valid) {
        if (paymentRow) {
          await storage.updateEmployerPaymentByOrderId(orderId, {
            status: "failed",
            paymentId,
            signature,
            raw: { ...(paymentRow as any)?.raw, verification: { ...body, expected } },
          } as any);
        }
        return res.status(400).json({ status: "failed", message: "Invalid payment signature" });
      }

      const order = await fetchRazorpayOrder(orderId);
      const notes = (order as any)?.notes ?? {};
      const orderEmployerId = String((notes as any)?.employerId ?? "").trim();
      if (orderEmployerId && orderEmployerId !== employerId) {
        return res.status(403).json({ status: "failed", message: "Payment order does not belong to this employer" });
      }

      const purpose = String((notes as any)?.purpose ?? "").trim().toLowerCase();
      if (purpose && purpose !== "employer_monthly_payment") {
        return res.status(400).json({ status: "failed", message: "Invalid payment purpose" });
      }

      const proposalIds = (() => {
        const ids = (notes as any)?.proposalIds ?? (notes as any)?.proposal_ids ?? [];
        return Array.isArray(ids) ? ids.map((v: any) => String(v ?? "").trim()).filter(Boolean) : [];
      })();

      const amountMinorDb = Number((order as any)?.amount ?? 0);
      const currencyDb = String((order as any)?.currency ?? "INR").toUpperCase();
      const rawDb = {
        ...(paymentRow ? ((paymentRow as any)?.raw ?? {}) : {}),
        order,
        verification: body,
      };

      if (paymentRow) {
        await storage.updateEmployerPaymentByOrderId(orderId, {
          status: "paid",
          paymentId,
          signature,
          paidAt: new Date(),
          raw: rawDb,
        } as any);
      } else {
        await storage.createEmployerPayment({
          employerId,
          gateway: "razorpay",
          orderId,
          paymentId,
          signature,
          amountMinor: Number.isFinite(amountMinorDb) && amountMinorDb > 0 ? amountMinorDb : 0,
          currency: currencyDb || "INR",
          status: "paid",
          paidAt: new Date(),
          raw: rawDb,
        } as any);
      }

      return res.json({ status: "success", message: "Payment verified", proposalIds, orderId });
    } catch (error) {
      console.error("Verify employer monthly Razorpay payment error:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to verify payment" });
    }
  });

  app.post("/api/employer/:employerId/payment/razorpay/verify", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "employerId is required" });

      const employer = await storage.getEmployer(employerId);
      if (!employer) return res.status(404).json({ message: "Employer not found" });

      const body = (req.body ?? {}) as any;
      const orderId = String(body?.razorpay_order_id ?? body?.orderId ?? "").trim();
      const paymentId = String(body?.razorpay_payment_id ?? body?.paymentId ?? "").trim();
      const signature = String(body?.razorpay_signature ?? body?.signature ?? "").trim();

      if (!orderId || !paymentId || !signature) {
        return res.status(400).json({ message: "Missing razorpay_order_id / razorpay_payment_id / razorpay_signature" });
      }

      const paymentRow = await storage.getEmployerPaymentByOrderId(orderId);
      const shouldSendPaymentEmail = String((paymentRow as any)?.status ?? "").trim().toLowerCase() !== "paid";

      const { keySecret } = getRazorpayKeys();
      const expected = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expected);
      const valid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
      if (!valid) {
        if (paymentRow) {
          await storage.updateEmployerPaymentByOrderId(orderId, {
            status: "failed",
            paymentId,
            signature,
            raw: { ...(paymentRow as any)?.raw, verification: { ...body, expected } },
          } as any);
        }
        return res.status(400).json({ status: "failed", message: "Invalid payment signature" });
      }

      const order = await fetchRazorpayOrder(orderId);
      const notes = (order as any)?.notes ?? {};
      const orderEmployerId = String((notes as any)?.employerId ?? "").trim();
      if (orderEmployerId && orderEmployerId !== employerId) {
        return res.status(403).json({ status: "failed", message: "Payment order does not belong to this employer" });
      }

      const proposalIds = (() => {
        const ids = (notes as any)?.proposalIds ?? (notes as any)?.proposal_ids ?? [];
        return Array.isArray(ids) ? ids.map((v: any) => String(v ?? "").trim()).filter(Boolean) : [];
      })();

      const amountMinorDb = Number((order as any)?.amount ?? 0);
      const currencyDb = String((order as any)?.currency ?? "INR").toUpperCase();
      const rawDb = {
        ...(paymentRow ? ((paymentRow as any)?.raw ?? {}) : {}),
        order,
        verification: body,
      };

      if (paymentRow) {
        await storage.updateEmployerPaymentByOrderId(orderId, {
          status: "paid",
          paymentId,
          signature,
          paidAt: new Date(),
          raw: rawDb,
        } as any);
      } else {
        await storage.createEmployerPayment({
          employerId,
          gateway: "razorpay",
          orderId,
          paymentId,
          signature,
          amountMinor: Number.isFinite(amountMinorDb) && amountMinorDb > 0 ? amountMinorDb : 0,
          currency: currencyDb || "INR",
          status: "paid",
          paidAt: new Date(),
          raw: rawDb,
        } as any);
      }

      const updatedProposalIds: string[] = [];
      const paidInternIds = new Set<string>();
      const roleNameByInternId = new Map<string, string>();
      if (proposalIds.length > 0) {
        const rows = await storage.getProposalsByIds(proposalIds);
        for (const p of rows) {
          if (String((p as any)?.employerId ?? "") !== employerId) continue;
          if (String((p as any)?.status ?? "").toLowerCase() !== "accepted") continue;

          const internId = String((p as any)?.internId ?? "").trim();
          if (internId) paidInternIds.add(internId);

          if (internId && !roleNameByInternId.has(internId)) {
            const roleTitle = String((p as any)?.offerDetails?.roleTitle ?? "").trim();
            roleNameByInternId.set(internId, roleTitle || "the role");
          }

          const next = await storage.updateProposalStatus(String((p as any)?.id ?? ""), "hired");
          if (next) {
            updatedProposalIds.push(String((next as any)?.id ?? "").trim());
          }
        }
      }

      try {
        if (paidInternIds.size > 0) {
          await Promise.all(
            Array.from(paidInternIds).map((internId) => storage.removeEmployerCartItemsByIntern(employerId, internId)),
          );
        }
      } catch (cartErr) {
        console.error("Remove hired intern from employer cart error:", cartErr);
      }

      if (paidInternIds.size > 0) {
        await Promise.all(
          Array.from(paidInternIds).map(async (internId) => {
            try {
              const onboarding = await storage.getInternOnboardingByUserId(internId).catch(() => undefined);
              if (!onboarding) return;
              const prevExtra = ((onboarding as any)?.extraData ?? {}) as Record<string, any>;
              await storage.updateInternOnboarding(internId, {
                extraData: {
                  ...prevExtra,
                  onboardingStatus: "Onboarded",
                  isOnboarded: true,
                },
              } as any);
            } catch {
              return;
            }
          }),
        );
      }

      try {
        await storage.createNotificationDeduped({
          recipientType: "employer",
          recipientId: employerId,
          type: "payment_completed",
          title: "Payment completed",
          message:
            "Thanks for making the payment, your candidate is ready to get onboarded. You will receive an email with candidate's details shortly.",
          data: {
            orderId,
            proposalIds,
            updatedProposalIds,
          },
          dedupeKey: `employer_payment_completed:${orderId}`,
        } as any);

        const internMessage =
          "Congratulation: Your proposal payment has been completed. We will reach out to you shortly for client onboarding process.";

        const internIds = Array.from(paidInternIds);
        const chunkSize = 50;
        for (let i = 0; i < internIds.length; i += chunkSize) {
          const chunk = internIds.slice(i, i + chunkSize);
          await Promise.all(
            chunk.map((internId) =>
              storage.createNotificationDeduped({
                recipientType: "intern",
                recipientId: internId,
                type: "payment_completed",
                title: "Payment completed",
                message: internMessage,
                data: {
                  employerId,
                  orderId,
                },
                dedupeKey: `intern_payment_completed:${orderId}:${internId}`,
              } as any),
            ),
          );
        }
      } catch (notifyErr) {
        console.error("Employer payment completion notification error:", notifyErr);
      }

      try {
        if (shouldSendPaymentEmail) {
          const appBaseUrl = getAppBaseUrl(req);
          const dashboardUrl = appBaseUrl ? `${appBaseUrl}/dashboard` : "";
          const companyName = String((employer as any)?.companyName ?? (employer as any)?.name ?? "Company").trim();
          const internIds = Array.from(paidInternIds);

          const chunkSize = 25;
          for (let i = 0; i < internIds.length; i += chunkSize) {
            const chunk = internIds.slice(i, i + chunkSize);
            await Promise.all(
              chunk.map(async (internId) => {
                const user = await storage.getUser(internId).catch(() => undefined);
                const internEmail = String((user as any)?.email ?? "").trim();
                const internName = `${String((user as any)?.firstName ?? "").trim()} ${String((user as any)?.lastName ?? "").trim()}`.trim();
                const roleName = roleNameByInternId.get(internId) || "the role";

                if (!internEmail) return;
                await sendInternHireConfirmedEmail({
                  to: internEmail,
                  internName: internName || "Candidate",
                  companyName,
                  roleName,
                  appBaseUrl,
                  dashboardUrl,
                });
              }),
            );
          }
        }
      } catch (mailErr) {
        console.error("Intern hire confirmation email error:", mailErr);
      }

      try {
        if (shouldSendPaymentEmail) {
          const employerEmail = String((employer as any)?.companyEmail ?? "").trim();
          const appBaseUrl = getAppBaseUrl(req);
          const ordersUrl = appBaseUrl ? `${appBaseUrl}/employer/orders` : "";

          try {
            if (employerEmail && ordersUrl && proposalIds.length > 0) {
              const proposals = await storage.getProposalsByIds(proposalIds).catch(() => [] as any[]);
              const fullTimeProposals = (Array.isArray(proposals) ? proposals : []).filter((p: any) => {
                const offer = (p as any)?.offerDetails ?? (p as any)?.offer_details ?? {};
                const fto = (offer as any)?.fullTimeOffer ?? null;
                return !!fto && typeof fto === "object";
              });

              if (fullTimeProposals.length > 0) {
                for (const p of fullTimeProposals.slice(0, 10)) {
                  const offer = (p as any)?.offerDetails ?? (p as any)?.offer_details ?? {};
                  const fto = (offer as any)?.fullTimeOffer ?? {};

                  const internId = String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim();
                  const intern = internId ? await storage.getUser(internId).catch(() => undefined) : undefined;
                  const candidateName = intern
                    ? `${String((intern as any)?.firstName ?? "").trim()} ${String((intern as any)?.lastName ?? "").trim()}`.trim() || "Candidate"
                    : "Candidate";

                  const roleName =
                    String((fto as any)?.roleName ?? (fto as any)?.roleTitle ?? (offer as any)?.roleTitle ?? "").trim() ||
                    "the role";

                  const annualCtc = Number((fto as any)?.annualCtc ?? 0);
                  const annualCtcLabel = Number.isFinite(annualCtc) && annualCtc > 0 ? `₹${Math.round(annualCtc).toLocaleString("en-IN")}` : "";

                  const amountMajor = Number((order as any)?.amount ?? 0) / 100;
                  const amountPaidLabel = Number.isFinite(amountMajor) && amountMajor > 0 ? `₹${Math.round(amountMajor).toLocaleString("en-IN")}` : "";

                  await sendFullTimeHiringFeePaymentEmployerEmail({
                    to: employerEmail,
                    employerName: String((employer as any)?.companyName ?? (employer as any)?.name ?? "Employer").trim(),
                    candidateName,
                    roleName,
                    annualCtcLabel,
                    amountPaidLabel,
                    ordersUrl,
                    appBaseUrl,
                  });
                }
              }
            }
          } catch (mailErr) {
            console.error("Full-time hiring fee payment email error:", mailErr);
          }

          const roleLabel = await (async () => {
            if (!proposalIds.length) return "your order";
            const proposals = await storage.getProposalsByIds(proposalIds).catch(() => []);
            const roleTitles = (Array.isArray(proposals) ? proposals : [])
              .map((p: any) => String((p as any)?.offerDetails?.roleTitle ?? "").trim())
              .filter(Boolean);

            if (roleTitles.length > 0) {
              const unique = Array.from(new Set(roleTitles));
              if (unique.length === 1) return unique[0];
              if (unique.length === 2) return `${unique[0]} & ${unique[1]}`;
              return `${unique[0]} + ${unique.length - 1} more`;
            }

            const projectIds = Array.from(
              new Set(
                (Array.isArray(proposals) ? proposals : [])
                  .map((p: any) => String((p as any)?.projectId ?? (p as any)?.project_id ?? "").trim())
                  .filter(Boolean),
              ),
            );
            if (projectIds.length === 0) return "your order";

            const projectRows = await Promise.all(projectIds.map((id) => storage.getProject(id).catch(() => undefined)));
            const names = projectRows
              .map((p: any) => String(p?.projectName ?? "").trim())
              .filter(Boolean);
            const uniqueNames = Array.from(new Set(names));
            if (uniqueNames.length === 1) return uniqueNames[0];
            if (uniqueNames.length === 2) return `${uniqueNames[0]} & ${uniqueNames[1]}`;
            if (uniqueNames.length > 2) return `${uniqueNames[0]} + ${uniqueNames.length - 1} more`;
            return "your order";
          })();

          if (employerEmail && ordersUrl) {
            await sendEmployerPaymentReceivedEmail({
              to: employerEmail,
              employerName: String((employer as any)?.companyName ?? (employer as any)?.name ?? "Employer").trim(),
              roleName: roleLabel,
              ordersUrl,
              appBaseUrl,
            });
          }
        }
      } catch (mailErr) {
        console.error("Employer payment email error:", mailErr);
      }

      return res.json({ status: "success", message: "Payment verified", proposalIds, updatedProposalIds, orderId });
    } catch (error) {
      console.error("Verify employer Razorpay payment error:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to verify payment" });
    }
  });

  app.get("/api/employer/:employerId/orders", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "employerId is required" });

      const employer = await storage.getEmployer(employerId);
      if (!employer) return res.status(404).json({ message: "Employer not found" });

      const status = String((req.query as any)?.status ?? "").trim();
      const currency = String((req.query as any)?.currency ?? "").trim();
      const limitRaw = Number((req.query as any)?.limit ?? 50);
      const q = String((req.query as any)?.q ?? "").trim();
      const fromRaw = String((req.query as any)?.from ?? "").trim();
      const toRaw = String((req.query as any)?.to ?? "").trim();

      const parseDate = (value: string) => {
        if (!value) return undefined;
        const dt = new Date(value);
        if (Number.isNaN(dt.getTime())) return undefined;
        return dt;
      };

      const from = parseDate(fromRaw);
      const to = (() => {
        const dt = parseDate(toRaw);
        if (!dt) return undefined;
        if (/^\d{4}-\d{2}-\d{2}$/.test(toRaw)) {
          dt.setHours(23, 59, 59, 999);
        }
        return dt;
      })();

      const rows = await storage.listEmployerPaymentsByEmployerId(employerId, {
        status: status || undefined,
        currency: currency || undefined,
        limit: Number.isFinite(limitRaw) ? limitRaw : 50,
        q: q || undefined,
        from,
        to,
      });

      const proposalIds = Array.from(
        new Set(
          (Array.isArray(rows) ? rows : [])
            .flatMap((r: any) => {
              const raw = r?.raw ?? {};
              const notes = raw?.notes ?? raw?.order?.notes ?? {};
              const ids = (notes as any)?.proposalIds ?? (notes as any)?.proposal_ids ?? [];
              return Array.isArray(ids) ? ids.map((v: any) => String(v ?? "").trim()).filter(Boolean) : [];
            })
            .filter(Boolean),
        ),
      );

      const proposals = proposalIds.length ? await storage.getProposalsByIds(proposalIds).catch(() => []) : [];
      const proposalById = (Array.isArray(proposals) ? proposals : []).reduce<Record<string, any>>((acc, p: any) => {
        const id = String((p as any)?.id ?? "").trim();
        if (id) acc[id] = p;
        return acc;
      }, {});

      const projectIds = Array.from(
        new Set(
          (Array.isArray(proposals) ? proposals : [])
            .map((p: any) => String((p as any)?.projectId ?? (p as any)?.project_id ?? "").trim())
            .filter(Boolean),
        ),
      );
      const internIds = Array.from(
        new Set(
          (Array.isArray(proposals) ? proposals : [])
            .map((p: any) => String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim())
            .filter(Boolean),
        ),
      );

      const projectRows = await Promise.all(projectIds.map((id) => storage.getProject(id).catch(() => undefined)));
      const projectById: Record<string, any> = {};
      for (let i = 0; i < projectIds.length; i += 1) {
        const pid = projectIds[i];
        const row = projectRows[i];
        if (pid && row) projectById[pid] = row as any;
      }

      const internUsers = await Promise.all(internIds.map((id) => storage.getUser(id).catch(() => undefined)));
      const internNameById: Record<string, string> = {};
      for (let i = 0; i < internIds.length; i += 1) {
        const iid = internIds[i];
        const u = internUsers[i] as any;
        const name = `${String(u?.firstName ?? "")} ${String(u?.lastName ?? "")}`.trim();
        if (iid && name) internNameById[iid] = name;
      }

      const enriched = (Array.isArray(rows) ? rows : []).map((r: any) => {
        const raw = r?.raw ?? {};
        const notes = raw?.notes ?? raw?.order?.notes ?? {};
        const idsRaw = (notes as any)?.proposalIds ?? (notes as any)?.proposal_ids ?? [];
        const ids = Array.isArray(idsRaw) ? idsRaw.map((v: any) => String(v ?? "").trim()).filter(Boolean) : [];

        if (ids.length !== 1) {
          return {
            ...r,
            proposalIds: ids,
            internName: ids.length > 1 ? "Multiple" : null,
            projectName: ids.length > 1 ? "Multiple" : null,
          };
        }

        const pid = ids[0];
        const p = pid ? proposalById[pid] : undefined;
        const projectId = String((p as any)?.projectId ?? (p as any)?.project_id ?? "").trim();
        const internId = String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim();
        const project = projectId ? projectById[projectId] : undefined;
        const projectName = String(
          (p as any)?.projectName ?? (p as any)?.project_name ?? (project as any)?.projectName ?? (project as any)?.project_name ?? "",
        ).trim();
        const internName = String(internNameById[internId] ?? "").trim();

        return {
          ...r,
          proposalIds: ids,
          proposalId: pid,
          internId,
          internName: internName || null,
          projectId,
          projectName: projectName || null,
        };
      });

      return res.json({ orders: enriched });
    } catch (error) {
      console.error("Employer orders list error:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch orders" });
    }
  });

  app.get("/api/admin/employers/:employerId/orders", async (req, res) => {
    try {
      if (!(req as any)?.session?.admin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const employerId = String(req.params.employerId ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "employerId is required" });

      const employer = await storage.getEmployer(employerId);
      if (!employer) return res.status(404).json({ message: "Employer not found" });

      const status = String((req.query as any)?.status ?? "").trim();
      const currency = String((req.query as any)?.currency ?? "").trim();
      const limitRaw = Number((req.query as any)?.limit ?? 50);
      const q = String((req.query as any)?.q ?? "").trim();
      const fromRaw = String((req.query as any)?.from ?? "").trim();
      const toRaw = String((req.query as any)?.to ?? "").trim();

      const parseDate = (value: string) => {
        if (!value) return undefined;
        const dt = new Date(value);
        if (Number.isNaN(dt.getTime())) return undefined;
        return dt;
      };

      const from = parseDate(fromRaw);
      const to = (() => {
        const dt = parseDate(toRaw);
        if (!dt) return undefined;
        if (/^\d{4}-\d{2}-\d{2}$/.test(toRaw)) {
          dt.setHours(23, 59, 59, 999);
        }
        return dt;
      })();

      const rows = await storage.listEmployerPaymentsByEmployerId(employerId, {
        status: status || undefined,
        currency: currency || undefined,
        limit: Number.isFinite(limitRaw) ? limitRaw : 50,
        q: q || undefined,
        from,
        to,
      });

      const proposalIds = Array.from(
        new Set(
          (Array.isArray(rows) ? rows : [])
            .flatMap((r: any) => {
              const raw = r?.raw ?? {};
              const notes = raw?.notes ?? raw?.order?.notes ?? {};
              const ids = (notes as any)?.proposalIds ?? (notes as any)?.proposal_ids ?? [];
              return Array.isArray(ids) ? ids.map((v: any) => String(v ?? "").trim()).filter(Boolean) : [];
            })
            .filter(Boolean),
        ),
      );

      const proposals = proposalIds.length ? await storage.getProposalsByIds(proposalIds).catch(() => []) : [];
      const proposalById = (Array.isArray(proposals) ? proposals : []).reduce<Record<string, any>>((acc, p: any) => {
        const id = String((p as any)?.id ?? "").trim();
        if (id) acc[id] = p;
        return acc;
      }, {});

      const projectIds = Array.from(
        new Set(
          (Array.isArray(proposals) ? proposals : [])
            .map((p: any) => String((p as any)?.projectId ?? (p as any)?.project_id ?? "").trim())
            .filter(Boolean),
        ),
      );
      const internIds = Array.from(
        new Set(
          (Array.isArray(proposals) ? proposals : [])
            .map((p: any) => String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim())
            .filter(Boolean),
        ),
      );

      const projectRows = await Promise.all(projectIds.map((id) => storage.getProject(id).catch(() => undefined)));
      const projectById: Record<string, any> = {};
      for (let i = 0; i < projectIds.length; i += 1) {
        const pid = projectIds[i];
        const row = projectRows[i];
        if (pid && row) projectById[pid] = row as any;
      }

      const internUsers = await Promise.all(internIds.map((id) => storage.getUser(id).catch(() => undefined)));
      const internNameById: Record<string, string> = {};
      for (let i = 0; i < internIds.length; i += 1) {
        const iid = internIds[i];
        const u = internUsers[i] as any;
        const name = `${String(u?.firstName ?? "")} ${String(u?.lastName ?? "")}`.trim();
        if (iid && name) internNameById[iid] = name;
      }

      const enriched = (Array.isArray(rows) ? rows : []).map((r: any) => {
        const raw = r?.raw ?? {};
        const notes = raw?.notes ?? raw?.order?.notes ?? {};
        const idsRaw = (notes as any)?.proposalIds ?? (notes as any)?.proposal_ids ?? [];
        const ids = Array.isArray(idsRaw) ? idsRaw.map((v: any) => String(v ?? "").trim()).filter(Boolean) : [];

        if (ids.length !== 1) {
          return {
            ...r,
            proposalIds: ids,
            internName: ids.length > 1 ? "Multiple" : null,
            projectName: ids.length > 1 ? "Multiple" : null,
          };
        }

        const pid = ids[0];
        const p = pid ? proposalById[pid] : undefined;
        const projectId = String((p as any)?.projectId ?? (p as any)?.project_id ?? "").trim();
        const internId = String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim();
        const project = projectId ? projectById[projectId] : undefined;
        const projectName = String(
          (p as any)?.projectName ?? (p as any)?.project_name ?? (project as any)?.projectName ?? (project as any)?.project_name ?? "",
        ).trim();
        const internName = String(internNameById[internId] ?? "").trim();

        return {
          ...r,
          proposalIds: ids,
          proposalId: pid,
          internId,
          internName: internName || null,
          projectId,
          projectName: projectName || null,
        };
      });

      return res.json({ orders: enriched });
    } catch (error) {
      console.error("Admin employer orders list error:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch orders" });
    }
  });

  app.get("/api/admin/employers/:employerId/payment-summary", async (req, res) => {
    try {
      if (!(req as any)?.session?.admin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const employerId = String(req.params.employerId ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "employerId is required" });

      const employer = await storage.getEmployer(employerId);
      if (!employer) return res.status(404).json({ message: "Employer not found" });

      const payments = await storage.listEmployerPaymentsByEmployerId(employerId, { limit: 5000 }).catch(() => []);
      const proposals = await storage.getProposalsByEmployerId(employerId).catch(() => []);
      const projects = await Promise.all(proposals.map((p: any) => storage.getProject(p?.projectId ?? p?.project_id ?? "").catch(() => undefined)));
      const users = await Promise.all(proposals.map((p: any) => storage.getUser(p?.internId ?? p?.intern_id ?? "").catch(() => undefined)));

      const projectById = new Map<string, any>();
      for (const p of projects) {
        if (p) projectById.set(String((p as any)?.id ?? ""), p);
      }

      const userById = new Map<string, any>();
      for (const u of users) {
        if (u) userById.set(String((u as any)?.id ?? ""), u);
      }

      const hiredProposals = (proposals as any[]).filter((p: any) => {
        const status = String(p?.status ?? "").trim().toLowerCase();
        return status === "hired";
      });

      const monthsFromDuration = (duration: unknown) => {
        switch (String(duration ?? "").trim().toLowerCase()) {
          case "2m": return 2;
          case "3m": return 3;
          case "6m": return 6;
          default: return 1;
        }
      };

      const getInternName = (p: any) => {
        const internId = String(p?.internId ?? p?.intern_id ?? "").trim();
        const u = userById.get(internId);
        return u ? `${String(u.firstName ?? "")} ${String(u.lastName ?? "")}`.trim() || null : null;
      };

      const getProjectName = (p: any) => {
        const projectId = String(p?.projectId ?? p?.project_id ?? "").trim();
        const proj = projectById.get(projectId);
        return proj ? String(proj?.projectName ?? proj?.project_name ?? "") || null : null;
      };

      const getStartDate = (p: any) => {
        const startDate = p?.startDate ?? p?.start_date ?? p?.createdAt ?? p?.created_at ?? null;
        if (!startDate) return null;
        const d = new Date(startDate);
        if (Number.isNaN(d.getTime())) return null;
        return d.toISOString().slice(0, 10);
      };

      const getDuration = (p: any) => {
        const offer = p?.offerDetails ?? p?.offer_details ?? {};
        const duration = String(offer?.duration ?? offer?.internshipDuration ?? "").trim();
        const months = monthsFromDuration(duration);
        return months;
      };

      const totalPaidMinor = payments
        .filter((p: any) => String(p?.status ?? "").trim().toLowerCase() === "paid")
        .reduce((acc: number, p: any) => acc + (Number(p?.amountMinor ?? 0) || 0), 0);

      const totalBilledMinor = payments
        .filter((p: any) => {
          const s = String(p?.status ?? "").trim().toLowerCase();
          return s === "paid" || s === "pending" || s === "created";
        })
        .reduce((acc: number, p: any) => acc + (Number(p?.amountMinor ?? 0) || 0), 0);

      const upcomingPayments = payments
        .filter((p: any) => {
          const s = String(p?.status ?? "").trim().toLowerCase();
          return s === "pending" || s === "created" || (!s && String(p?.orderId ?? "").trim());
        })
        .map((p: any) => {
          const raw = p?.raw ?? {};
          const notes = raw?.notes ?? raw?.order?.notes ?? {};
          const proposalIds = notes?.proposalIds ?? notes?.proposal_ids ?? [];
          const pid = Array.isArray(proposalIds) && proposalIds.length === 1 ? proposalIds[0] : null;
          const proposal = pid ? (proposals as any[]).find((pr: any) => String(pr?.id ?? "") === pid) : null;
          
          return {
            id: p?.orderId ?? p?.id ?? "",
            amountMinor: Number(p?.amountMinor ?? 0) || 0,
            currency: String(p?.currency ?? "INR").toUpperCase(),
            dueDate: p?.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : null,
            candidateName: proposal ? getInternName(proposal) : "Multiple",
            projectName: proposal ? getProjectName(proposal) : "Multiple",
            startDate: proposal ? getStartDate(proposal) : null,
            duration: proposal ? getDuration(proposal) : 0,
            status: String(p?.status ?? "pending"),
          };
        })
        .filter((p: any) => p.amountMinor > 0);

      const nextUpcoming = upcomingPayments.length > 0 ? upcomingPayments[0] : null;
      const totalUpcomingMinor = upcomingPayments.reduce((acc: number, p: any) => acc + p.amountMinor, 0);

      const internIds = Array.from(new Set(hiredProposals.map((p: any) => String(p?.internId ?? p?.intern_id ?? "").trim()).filter(Boolean)));
      const internEmployerDues = [];

      for (const internId of internIds) {
        try {
          const duesRes = await fetch(`${req.protocol}://${req.get("host")}/api/admin/interns/${internId}/employer-dues`, {
            headers: { Cookie: req.get("Cookie") || "" },
          });
          if (duesRes.ok) {
            const duesData = await duesRes.json();
            const dues = Array.isArray(duesData.employerDues) ? duesData.employerDues : [];
            for (const d of dues) {
              if (String(d?.employerId ?? "") === employerId) {
                internEmployerDues.push({
                  ...d,
                  internId,
                  internName: getInternName(hiredProposals.find((p: any) => String(p?.internId ?? p?.intern_id ?? "") === internId)),
                });
              }
            }
          }
        } catch {}
      }

      return res.json({
        summary: {
          totalBilledMinor,
          totalPaidMinor,
          remainingMinor: totalBilledMinor - totalPaidMinor,
          upcomingPaymentMinor: totalUpcomingMinor,
          nextUpcomingDate: nextUpcoming?.dueDate ?? null,
        },
        upcomingPayments,
        internEmployerDues,
      });
    } catch (error) {
      console.error("Admin employer payment summary error:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch payment summary" });
    }
  });

  app.get("/api/employer/:employerId/orders/:orderId/invoice", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      const orderId = String(req.params.orderId ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "employerId is required" });
      if (!orderId) return res.status(400).json({ message: "orderId is required" });

      const employer = await storage.getEmployer(employerId);
      if (!employer) return res.status(404).json({ message: "Employer not found" });

      const payment = await storage.getEmployerPaymentByOrderId(orderId);
      if (!payment) return res.status(404).json({ message: "Order not found" });
      if (String((payment as any)?.employerId ?? "") !== employerId) {
        return res.status(403).json({ message: "Order does not belong to this employer" });
      }

      const invoiceNumber = await (async () => {
        const rawPaidAt = (payment as any)?.paidAt ?? (payment as any)?.paid_at ?? (payment as any)?.createdAt ?? (payment as any)?.created_at;
        const dt = rawPaidAt ? new Date(rawPaidAt) : null;
        if (!dt || Number.isNaN(dt.getTime())) return "";

        const dayStart = new Date(dt);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dt);
        dayEnd.setHours(23, 59, 59, 999);

        const statusLower = String((payment as any)?.status ?? "").trim().toLowerCase();
        if (statusLower !== "paid") {
          const dd = String(dt.getDate()).padStart(2, "0");
          const mm = String(dt.getMonth() + 1).padStart(2, "0");
          const yy = String(dt.getFullYear() % 100).padStart(2, "0");
          return `${dd}${mm}${yy}-01`;
        }

        const sameDayPaid = await storage
          .listAllEmployerPayments({
            status: "paid",
            paidFrom: dayStart,
            paidTo: dayEnd,
            limit: 20000,
          })
          .catch(() => []);

        const sorted = (Array.isArray(sameDayPaid) ? sameDayPaid : [])
          .filter((p: any) => {
            const paidAtRaw = p?.paidAt ?? p?.paid_at;
            const d = paidAtRaw ? new Date(paidAtRaw) : null;
            return d && !Number.isNaN(d.getTime());
          })
          .sort((a: any, b: any) => {
            const aDt = new Date(a.paidAt ?? a.paid_at).getTime();
            const bDt = new Date(b.paidAt ?? b.paid_at).getTime();
            if (aDt !== bDt) return aDt - bDt;
            const aOrder = String(a?.orderId ?? "");
            const bOrder = String(b?.orderId ?? "");
            return aOrder.localeCompare(bOrder);
          });

        const idx = sorted.findIndex((p: any) => String(p?.orderId ?? "") === String((payment as any)?.orderId ?? ""));
        const seq = String((idx >= 0 ? idx + 1 : sorted.length + 1) ?? 1).padStart(2, "0");
        const dd = String(dt.getDate()).padStart(2, "0");
        const mm = String(dt.getMonth() + 1).padStart(2, "0");
        const yy = String(dt.getFullYear() % 100).padStart(2, "0");
        return `${dd}${mm}${yy}-${seq}`;
      })();

      const proposalIds = (() => {
        const raw = (payment as any)?.raw;
        const notes = raw?.notes ?? raw?.order?.notes ?? {};
        const ids = (notes as any)?.proposalIds ?? (notes as any)?.proposal_ids ?? [];
        return Array.isArray(ids) ? ids.map((v: any) => String(v ?? "").trim()).filter(Boolean) : [];
      })();

      const proposals = proposalIds.length ? await storage.getProposalsByIds(proposalIds) : [];

      const projectIds = Array.from(
        new Set(
          proposals
            .map((p) => String((p as any)?.projectId ?? "").trim())
            .filter(Boolean),
        ),
      );
      const internIds = Array.from(
        new Set(
          proposals
            .map((p) => String((p as any)?.internId ?? "").trim())
            .filter(Boolean),
        ),
      );

      const projectRows = await Promise.all(projectIds.map((id) => storage.getProject(id).catch(() => undefined)));
      const projectById: Record<string, any> = {};
      for (let i = 0; i < projectIds.length; i += 1) {
        const pid = projectIds[i];
        const row = projectRows[i];
        if (pid && row) projectById[pid] = row as any;
      }

      const internUserRows = await Promise.all(internIds.map((id) => storage.getUser(id).catch(() => undefined)));
      const internNameById: Record<string, string> = {};
      for (let i = 0; i < internIds.length; i += 1) {
        const iid = internIds[i];
        const u = internUserRows[i] as any;
        const name = `${String(u?.firstName ?? "")} ${String(u?.lastName ?? "")}`.trim();
        if (iid && name) internNameById[iid] = name;
      }

      const items = proposals
        .filter((p) => String((p as any)?.employerId ?? "") === employerId)
        .map((p) => {
          const offer = (p as any)?.offerDetails ?? {};

          const projectId = String((p as any)?.projectId ?? "");
          const internId = String((p as any)?.internId ?? "");
          const project = projectId ? projectById[projectId] : undefined;
          const projectName = String(
            (project as any)?.projectName ?? (project as any)?.name ?? (project as any)?.title ?? "",
          ).trim();
          const internName = String(internNameById[internId] ?? "").trim();

          return {
            proposalId: String((p as any)?.id ?? ""),
            internId,
            internName,
            projectId,
            projectName,
            status: String((p as any)?.status ?? ""),
            currency: String((p as any)?.currency ?? offer?.currency ?? (payment as any)?.currency ?? "INR"),
            monthlyAmount: typeof offer?.monthlyAmount === "number" ? offer.monthlyAmount : 0,
            totalPrice: typeof offer?.totalPrice === "number" ? offer.totalPrice : 0,
            offerDetails: offer,
          };
        });

      return res.json({
        employer: {
          id: (employer as any)?.id,
          companyName: (employer as any)?.companyName,
          companyEmail: (employer as any)?.companyEmail,
        },
        payment,
        items,
        invoiceNumber,
      });
    } catch (error) {
      console.error("Employer invoice fetch error:", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch invoice" });
    }
  });

  app.post("/api/admin/employers/:employerId/orders/:orderId/mark-received", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      const orderId = String(req.params.orderId ?? "").trim();
      if (!employerId) return res.status(400).json({ message: "employerId is required" });
      if (!orderId) return res.status(400).json({ message: "orderId is required" });

      const payment = await storage.getEmployerPaymentByOrderId(orderId);
      if (!payment) return res.status(404).json({ message: "Order not found" });
      if (String((payment as any)?.employerId ?? "") !== employerId) {
        return res.status(403).json({ message: "Order does not belong to this employer" });
      }

      const raw = ((payment as any)?.raw ?? {}) as any;
      const nextRaw = {
        ...(raw ?? {}),
        receivedAt: new Date().toISOString(),
      };

      const updated = await storage.updateEmployerPaymentByOrderId(orderId, {
        raw: nextRaw,
      } as any);

      return res.json({ message: "Marked received", payment: updated ?? null });
    } catch (error) {
      console.error("Admin mark employer order received error:", error);
      return res.status(500).json({ message: "Failed to mark received" });
    }
  });

  app.get("/api/admin/interns/:internId/employer-dues", async (req, res) => {
    try {
      if (!(req as any)?.session?.admin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const internId = String(req.params.internId ?? "").trim();
      if (!internId) return res.status(400).json({ message: "internId is required" });

      const onboarding = await storage.getInternOnboardingByUserId(internId).catch(() => undefined);
      const findternScoreRaw = (onboarding as any)?.extraData?.findternScore;
      const findternScoreNum = Number(findternScoreRaw ?? 0);
      const findternScore = Number.isFinite(findternScoreNum) ? findternScoreNum : 0;
      const isLowScore = findternScore > 0 && findternScore < 6;

      const monthsFromDuration = (duration: unknown) => {
        switch (String(duration ?? "").trim().toLowerCase()) {
          case "2m":
            return 2;
          case "3m":
            return 3;
          case "6m":
            return 6;
          default:
            return 1;
        }
      };

      const addMonthsToIso = (iso: string, months: number) => {
        const s = String(iso ?? "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
        const [yy, mm, dd] = s.split("-").map((v) => Number(v));
        const base = new Date(yy, mm - 1, dd);
        if (Number.isNaN(base.getTime())) return "";
        const d = new Date(base);
        d.setMonth(d.getMonth() + Math.max(0, months));
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      };

      const norm = (v: any) => String(v ?? "").trim().toLowerCase();
      const orderPurpose = (row: any) => {
        const raw = row?.raw ?? {};
        const notes = raw?.notes ?? raw?.order?.notes ?? {};
        return norm((notes as any)?.purpose ?? "");
      };

      const orderPaymentMode = (row: any) => {
        const raw = row?.raw ?? {};
        const notes = raw?.notes ?? raw?.order?.notes ?? {};
        return norm((notes as any)?.paymentMode ?? (notes as any)?.payment_mode ?? "");
      };

      const orderProposalIds = (row: any) => {
        const raw = row?.raw ?? {};
        const notes = raw?.notes ?? raw?.order?.notes ?? {};
        const idsRaw =
          (notes as any)?.proposalIds ??
          (notes as any)?.proposal_ids ??
          (raw as any)?.proposalIds ??
          (raw as any)?.proposal_ids ??
          (row as any)?.proposalIds ??
          (row as any)?.proposal_ids ??
          (notes as any)?.proposalId ??
          (notes as any)?.proposal_id ??
          [];

        const normalizeList = (val: any): string[] => {
          if (!val) return [];
          if (Array.isArray(val)) return val.map((v) => String(v ?? "").trim()).filter(Boolean);

          const s = String(val ?? "").trim();
          if (!s) return [];

          if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
            try {
              const parsed = JSON.parse(s);
              if (Array.isArray(parsed)) return parsed.map((v) => String(v ?? "").trim()).filter(Boolean);
              if (parsed && typeof parsed === "object") {
                const inner = (parsed as any)?.proposalIds ?? (parsed as any)?.proposal_ids ?? (parsed as any)?.proposalId ?? (parsed as any)?.proposal_id;
                return normalizeList(inner);
              }
            } catch {
              // ignore
            }
          }

          if (s.includes(",")) return s.split(",").map((v) => String(v ?? "").trim()).filter(Boolean);
          return [s];
        };

        return normalizeList(idsRaw);
      };

      const isSingleProposalPayment = (row: any, proposalId: string) => {
        const pid = String(proposalId ?? "").trim();
        if (!pid) return false;
        const ids = orderProposalIds(row);
        if (ids.length > 0) return ids.length === 1 && ids[0] === pid;
        return String((row as any)?.proposalId ?? (row as any)?.proposal_id ?? "").trim() === pid;
      };

      const proposals = await storage.getProposalsByInternId(internId).catch(() => []);
      const hired = (Array.isArray(proposals) ? proposals : []).filter((p: any) => {
        const status = norm(p?.status ?? "");
        if (status === "hired") return true;
        const offer = (p as any)?.offerDetails ?? (p as any)?.offer_details ?? {};
        const ft = (offer as any)?.fullTimeOffer ?? null;
        const hasFullTimeOffer = !!ft && typeof ft === "object";
        return hasFullTimeOffer;
      });

      const internPayouts = await storage.listInternPayoutsByInternId(internId, { limit: 2000 }).catch(() => []);
      const paidPayouts = (Array.isArray(internPayouts) ? internPayouts : []).filter(
        (row: any) => norm(row?.status ?? "") === "paid",
      );

      const internPaidMonthsByProposalId = paidPayouts.reduce<Record<string, number>>((acc, row: any) => {
        const raw = (row as any)?.raw ?? {};
        const proposalId = String(raw?.proposalId ?? raw?.proposal_id ?? "").trim();
        if (!proposalId) return acc;
        acc[proposalId] = (acc[proposalId] ?? 0) + 1;
        return acc;
      }, {});

      const paidPayoutsWithoutProposal = paidPayouts
        .map((row: any) => {
          const raw = (row as any)?.raw ?? {};
          const scheduledFor = String(raw?.scheduledFor ?? raw?.scheduled_for ?? "").trim();
          const paidAt = (row as any)?.paidAt ?? (row as any)?.paid_at ?? null;
          const paidAtIso = paidAt ? String(paidAt).slice(0, 10) : "";
          const createdAt = (row as any)?.createdAt ?? (row as any)?.created_at ?? null;
          const createdAtIso = createdAt ? String(createdAt).slice(0, 10) : "";
          const dateKey = scheduledFor || paidAtIso || createdAtIso;
          const proposalId = String(raw?.proposalId ?? raw?.proposal_id ?? "").trim();
          const cur = String((row as any)?.currency ?? "INR").trim().toUpperCase();
          const amt = Number((row as any)?.amountMinor ?? (row as any)?.amount_minor ?? 0) || 0;
          const inrAmt = cur === "USD" ? Math.round(amt * 100) : amt;
          return {
            id: String((row as any)?.id ?? ""),
            proposalId,
            amountMinor: inrAmt,
            dateKey,
          };
        })
        .filter((x) => !x.proposalId && x.amountMinor > 0 && x.dateKey);

      const projectIds = Array.from(
        new Set(
          hired
            .map((p: any) => String(p?.projectId ?? p?.project_id ?? "").trim())
            .filter(Boolean),
        ),
      );
      const projectRows = await Promise.all(projectIds.map((id) => storage.getProject(id).catch(() => undefined)));
      const projectById: Record<string, any> = {};
      for (let i = 0; i < projectIds.length; i += 1) {
        const pid = projectIds[i];
        const row = projectRows[i];
        if (pid && row) projectById[pid] = row as any;
      }

      const employerIds = Array.from(
        new Set(
          hired
            .map((p: any) => String(p?.employerId ?? p?.employer_id ?? "").trim())
            .filter(Boolean),
        ),
      );

      const employers = await Promise.all(employerIds.map((id) => storage.getEmployer(id).catch(() => undefined)));
      const employerById: Record<string, any> = {};
      for (let i = 0; i < employerIds.length; i += 1) {
        const id = employerIds[i];
        const e = employers[i];
        if (id && e) employerById[id] = e;
      }

      const paymentsByEmployerId: Record<string, any[]> = {};
      for (const eid of employerIds) {
        const rows = await storage
          .listEmployerPaymentsByEmployerId(eid, { status: "paid", limit: 1000 })
          .catch(() => []);
        paymentsByEmployerId[eid] = Array.isArray(rows) ? rows : [];
      }

      const items = hired.map((p: any) => {
        const proposalId = String(p?.id ?? "").trim();
        const employerId = String(p?.employerId ?? p?.employer_id ?? "").trim();
        const offer = (p?.offerDetails ?? p?.offer_details ?? {}) as any;
        const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
        const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
        const startDate = String(offer?.startDate ?? offer?.start_date ?? "").trim();
        const duration = hasFullTimeOffer ? "full-time" : String(offer?.duration ?? "").trim();
        const totalMonths = hasFullTimeOffer ? 1 : Math.max(1, monthsFromDuration(duration));

        const currencyRaw = String(
          (hasFullTimeOffer ? (fullTimeOffer as any)?.ctcCurrency : offer?.currency) ?? p?.currency ?? "INR",
        )
          .trim()
          .toUpperCase();
        const currency = currencyRaw === "USD" ? "USD" : "INR";

        const annualCtc = Number((fullTimeOffer as any)?.annualCtc ?? 0);
        const fullTimeFeeMajor =
          hasFullTimeOffer && Number.isFinite(annualCtc) && annualCtc > 0
            ? Math.max(0, Math.round((annualCtc * 8.33) / 100))
            : 0;

        const monthlyMajorRaw = Number(offer?.monthlyAmount ?? offer?.monthly_amount ?? 0);
        const monthlyMajor = Number.isFinite(monthlyMajorRaw) ? Math.max(0, monthlyMajorRaw) : 0;

        const totalPriceMajorRaw = Number(offer?.totalPrice ?? offer?.total_price ?? 0);
        const totalPriceMajor = Number.isFinite(totalPriceMajorRaw) ? Math.max(0, totalPriceMajorRaw) : 0;

        const effectiveMonthlyMajor =
          monthlyMajor > 0
            ? monthlyMajor
            : totalPriceMajor > 0
              ? totalPriceMajor / Math.max(1, totalMonths)
              : 0;

        let monthlyAmountMinor = hasFullTimeOffer ? 0 : Math.round(Math.max(0, effectiveMonthlyMajor) * 100);
        let totalAmountMinorRaw = hasFullTimeOffer
          ? Math.round(fullTimeFeeMajor * 100)
          : totalPriceMajor > 0
            ? Math.round(Math.max(0, totalPriceMajor) * 100)
            : monthlyAmountMinor * totalMonths;

        // Convert to INR paise if the offer is in USD
        if (currency === "USD") {
          monthlyAmountMinor = Math.round(monthlyAmountMinor * 100);
          totalAmountMinorRaw = Math.round(totalAmountMinorRaw * 100);
        }

        const internMonthlyAmountMinorBase = Math.floor(monthlyAmountMinor / 2);
        const internMonthlyAmountMinor = isLowScore ? 0 : internMonthlyAmountMinorBase;
        const internTotalAmountMinor = internMonthlyAmountMinor * totalMonths;

        const employerPaidPayments = (paymentsByEmployerId[employerId] ?? []).filter((o: any) => {
          if (norm(o?.status ?? "") !== "paid") return false;
          const purpose = orderPurpose(o);
          if (purpose !== "employer_monthly_payment" && purpose !== "employer_checkout") return false;

          // Both checkout and monthly orders encode proposal linkage inside Razorpay order notes.
          // Do NOT rely on a top-level proposalId column which may not exist in DB rows.
          if (purpose === "employer_checkout") return isSingleProposalPayment(o, proposalId);
          if (purpose === "employer_monthly_payment") return orderProposalIds(o).includes(proposalId);

          return false;
        });

        const hasTotalCheckoutPaid = employerPaidPayments.some((o: any) => {
          if (orderPurpose(o) !== "employer_checkout") return false;
          return orderPaymentMode(o) === "total";
        });

        const paidAmountMinor = employerPaidPayments.reduce((sum: number, o: any) => {
          const purpose = orderPurpose(o);
          if (hasFullTimeOffer) {
            if (purpose !== "employer_checkout") return sum;
          }
          const amt = Number((o as any)?.amountMinor ?? (o as any)?.amount_minor ?? 0);
          const payCur = String((o as any)?.currency ?? "INR").trim().toUpperCase();
          const inrAmt = payCur === "USD" ? Math.round(amt * 100) : amt;
          return sum + (Number.isFinite(inrAmt) ? Math.max(0, inrAmt) : 0);
        }, 0);

        const paidMonths = hasFullTimeOffer
          ? paidAmountMinor >= totalAmountMinorRaw && totalAmountMinorRaw > 0
            ? 1
            : 0
          : hasTotalCheckoutPaid
            ? totalMonths
            : employerPaidPayments.reduce((count: number, o: any) => {
                const purpose = orderPurpose(o);
                if (purpose === "employer_monthly_payment") return count + 1;
                if (purpose === "employer_checkout" && orderPaymentMode(o) === "monthly") return count + 1;
                return count;
              }, 0);

        const remainingMonths = hasFullTimeOffer
          ? paidMonths >= 1
            ? 0
            : 1
          : hasTotalCheckoutPaid
            ? 0
            : Math.max(0, totalMonths - Math.max(0, paidMonths));

        const totalAmountMinor = (() => {
          if (hasFullTimeOffer) return totalAmountMinorRaw;
          if (hasTotalCheckoutPaid && totalMonths > 1) {
            return Math.max(0, Math.round(totalAmountMinorRaw * 0.9));
          }
          return totalAmountMinorRaw;
        })();

        const dueAmountMinor = hasFullTimeOffer
          ? Math.max(0, totalAmountMinor - paidAmountMinor)
          : hasTotalCheckoutPaid
            ? 0
            : monthlyAmountMinor * remainingMonths;

        const internPaidMonths = Math.max(0, Number(internPaidMonthsByProposalId[proposalId] ?? 0) || 0);
        const expectedKeys = (() => {
          const out: string[] = [];
          if (!startDate) return out;
          for (let i = 1; i <= totalMonths; i += 1) {
            const k = addMonthsToIso(startDate, i);
            if (k) out.push(k);
          }
          return out;
        })();

        const heuristicPaidMonths = (() => {
          if (!expectedKeys.length) return 0;
          const needAmount = internMonthlyAmountMinor;
          if (!needAmount) return 0;

          const matched = paidPayoutsWithoutProposal.filter(
            (x) => x.amountMinor === needAmount && expectedKeys.includes(x.dateKey),
          );
          return matched.length;
        })();

        const internPaidMonthsTotal = Math.min(totalMonths, internPaidMonths + heuristicPaidMonths);
        const internRemainingMonths = Math.max(0, totalMonths - internPaidMonthsTotal);
        const internDueAmountMinor = isLowScore ? 0 : internMonthlyAmountMinor * internRemainingMonths;

        const nextMonthIndex = Math.max(1, Math.max(paidMonths, internPaidMonthsTotal) + 1);
        const upcomingPaymentDate =
          hasFullTimeOffer ? "" : dueAmountMinor <= 0 ? "" : startDate ? addMonthsToIso(startDate, nextMonthIndex) : "";

        const employer = employerById[employerId] ?? null;
        const employerCompanyName = String((employer as any)?.companyName ?? (employer as any)?.name ?? "").trim() || null;

        const projectId = String(p?.projectId ?? p?.project_id ?? "").trim();
        const proj = projectId ? projectById[projectId] : null;
        const projectName = String(
          p?.projectName ??
            p?.project_name ??
            (proj as any)?.projectName ??
            (proj as any)?.project_name ??
            (proj as any)?.name ??
            offer?.roleTitle ??
            "",
        ).trim() || null;

        return {
          proposalId,
          employerId,
          employerCompanyName,
          projectId: projectId || null,
          projectName,
          startDate: startDate || null,
          duration: duration || null,
          totalMonths,
          paidMonths,
          remainingMonths,
          internPaidMonths: internPaidMonthsTotal,
          internRemainingMonths,
          upcomingPaymentDate: upcomingPaymentDate || null,
          currency,
          monthlyAmountMinor,
          totalAmountMinor,
          dueAmountMinor,
          internMonthlyAmountMinor,
          internTotalAmountMinor,
          internDueAmountMinor,
        };
      });

      return res.json({ employerDues: items });
    } catch (error) {
      console.error("Admin intern employer dues error:", error);
      return res.status(500).json({ message: "Failed to compute employer dues" });
    }
  });

  app.get("/api/employer/:employerId/interns", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      if (!employerId) {
        return res.status(400).json({ message: "employerId is required" });
      }

      const employer = await storage.getEmployer(employerId);
      if (!employer) {
        return res.status(404).json({ message: "Employer not found" });
      }

      const projectId = String((req.query as any)?.projectId ?? "").trim();
      if (projectId) {
        const project = await storage.getProject(projectId).catch(() => undefined);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
        if (String((project as any)?.employerId ?? "") !== employerId) {
          return res.status(403).json({ message: "Project does not belong to this employer" });
        }
      }

      const onboardingList = await storage.getAllInternOnboarding();
      const userIds = Array.from(new Set(onboardingList.map((i) => i.userId)));

      const usersById: Record<string, any> = {};
      const docsByUserId: Record<string, any | null> = {};

      for (const id of userIds) {
        const user = await storage.getUser(id);
        if (user) {
          const { password, ...safeUser } = user as any;
          usersById[id] = safeUser;
        }

        const docs = await storage.getInternDocumentsByUserId(id);
        docsByUserId[id] = docs ?? null;
      }

      const employerInterviewList = await storage.getInterviewsByEmployerId(employerId);
      const filteredInterviews = projectId
        ? (employerInterviewList ?? []).filter((i: any) => String(i?.projectId ?? "") === projectId)
        : (employerInterviewList ?? []);

      const latestInterviewByUserId: Record<string, any | null> = {};
      for (const interview of filteredInterviews) {
        const iid = String((interview as any)?.internId ?? "").trim();
        if (!iid) continue;
        if (latestInterviewByUserId[iid]) continue;
        latestInterviewByUserId[iid] = serializeInterview(interview);
      }

      const enriched = onboardingList
        .map((onboarding) => ({
          user: usersById[onboarding.userId] ?? null,
          onboarding,
          documents: docsByUserId[onboarding.userId] ?? null,
          latestInterview: latestInterviewByUserId[onboarding.userId] ?? null,
        }))
        .filter((row) => Boolean(row.user))
        .filter((row) => {
          const extra = (row as any)?.onboarding?.extraData ?? {};
          const openToWork = (extra as any)?.openToWork;
          return openToWork !== false;
        });

      return res.json({ interns: enriched });
    } catch (error) {
      console.error("Employer interns list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching interns" });
    }
  });

  // List all interns with user + onboarding + documents (for employer dashboard)
  app.get("/api/interns", async (_req, res) => {
    try {
      const onboardingList = await storage.getAllInternOnboarding();
      const userIds = Array.from(new Set(onboardingList.map((i) => i.userId)));

      const usersById: Record<string, any> = {};
      const docsByUserId: Record<string, any | null> = {};
      const latestInterviewByUserId: Record<string, any | null> = {};

      for (const id of userIds) {
        const user = await storage.getUser(id);
        if (user) {
          const { password, ...safeUser } = user as any;
          usersById[id] = safeUser;
        }

        const docs = await storage.getInternDocumentsByUserId(id);
        docsByUserId[id] = docs ?? null;

        try {
          const interviews = await storage.getInterviewsByInternId(id);
          const latest = Array.isArray(interviews) && interviews.length > 0 ? interviews[0] : null;
          latestInterviewByUserId[id] = latest ? serializeInterview(latest) : null;
        } catch {
          latestInterviewByUserId[id] = null;
        }
      }

      const enriched = onboardingList.map((onboarding) => ({
        user: usersById[onboarding.userId] ?? null,
        onboarding,
        documents: docsByUserId[onboarding.userId] ?? null,
        latestInterview: latestInterviewByUserId[onboarding.userId] ?? null,
      })).filter((row) => Boolean(row.user));

      return res.json({ interns: enriched });
    } catch (error) {
      console.error("Interns list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching interns" });
    }
  });
  // Update intern Open-to-Work preference without overwriting onboarding payload
  app.put("/api/onboarding/:userId/open-to-work", async (req, res) => {
    try {
      const userId = String(req.params.userId ?? "").trim();
      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }

      const raw = (req.body as any)?.openToWork;
      if (typeof raw !== "boolean") {
        return res.status(400).json({ message: "openToWork (boolean) is required" });
      }

      const existing = await storage.getInternOnboardingByUserId(userId);
      if (!existing) {
        return res.status(404).json({ message: "Onboarding data not found" });
      }

      const prevExtra = ((existing as any)?.extraData ?? {}) as Record<string, any>;
      const nextExtra = {
        ...prevExtra,
        openToWork: raw,
      };

      const updated = await storage.updateInternOnboarding(userId, {
        extraData: nextExtra,
      } as any);

      return res.json({ message: "Open to Work updated", onboarding: updated });
    } catch (error) {
      console.error("Open to work update error:", error);
      return res.status(500).json({ message: "An error occurred while updating open to work" });
    }
  });
  app.post("/api/intern/:internId/payment/mark-paid", async (req, res) => {
    try {
      const internId = String(req.params.internId ?? "").trim();
      if (!internId) return res.status(400).json({ message: "internId is required" });

      if (!(req as any)?.session?.admin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const existing = await storage.getInternOnboardingByUserId(internId);
      if (!existing) {
        return res.status(404).json({ message: "Onboarding data not found" });
      }

      const nextExtra = {
        ...((existing as any).extraData ?? {}),
        payment: {
          ...(((existing as any).extraData as any)?.payment ?? {}),
          isPaid: true,
          paidAt: new Date().toISOString(),
        },
      };

      const updated = await storage.updateInternOnboarding(internId, { extraData: nextExtra } as any);

      try {
        const user = await storage.getUser(internId).catch(() => undefined);
        const internName = user
          ? `${String((user as any)?.firstName ?? "").trim()} ${String((user as any)?.lastName ?? "").trim()}`.trim() || "Candidate"
          : "Candidate";

        await storage.createNotificationDeduped({
          recipientType: "intern",
          recipientId: internId,
          type: "go_live_fee_paid",
          title: "Payment received",
          message: formatNotification(
            "🎉 Payment received successfully. You can now explore endless opportunities on FindIntern!",
            { Name: internName },
          ),
          data: {
            source: "admin_mark_paid",
          },
          dedupeKey: `go_live_fee_paid:admin_mark_paid:${internId}`,
          isRead: false,
        } as any);
      } catch (notifyErr) {
        console.error("Mark intern paid notification error:", notifyErr);
      }

      return res.json({ message: "Payment marked as completed", isPaid: true, onboarding: updated });
    } catch (error) {
      console.error("Mark intern paid error:", error);
      return res.status(500).json({ message: "An error occurred while updating payment status" });
    }
  });

  const createSavedSearchSchema = z.object({
    skills: z.array(z.string()).optional(),
    cities: z.array(z.string()).optional(),
  });

  // Employer -> Intern: record profile view
  app.post("/api/employer/:employerId/intern/:internId/profile-view", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      const internId = String(req.params.internId ?? "").trim();
      if (!employerId || !internId) {
        return res.status(400).json({ message: "employerId and internId are required" });
      }

      await storage.recordProfileView({ employerId, internId } as any);

      const intern = await storage.getUser(internId).catch(() => undefined);
      const internName = `${(intern as any)?.firstName ?? ""} ${(intern as any)?.lastName ?? ""}`.trim();

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthViews = await storage.countProfileViewsForIntern(internId, monthStart, now);

      const dedupeKey = `profile_view:${internId}:${employerId}:${now.toISOString().slice(0, 10)}`;
      await storage.createNotificationDeduped({
        recipientType: "intern",
        recipientId: internId,
        type: "profile_view",
        title: "Profile viewed",
        message: formatNotification(
          "🚀 Spotlight’s on you, [Name] — [Number] profile views and counting!",
          { Name: internName || "", Number: monthViews },
        ),
        data: { employerId, monthViews },
        dedupeKey,
      } as any);

      return res.json({ message: "Profile view recorded" });
    } catch (error) {
      console.error("Record profile view error:", error);
      return res.status(500).json({ message: "An error occurred while recording profile view" });
    }
  });

  // Employer: saved searches ("mark missing")
  app.post("/api/employer/:employerId/saved-searches", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      if (!employerId) {
        return res.status(400).json({ message: "employerId is required" });
      }

      const payload = createSavedSearchSchema.parse(req.body);
      const skills = Array.isArray(payload.skills) ? payload.skills : [];
      const cities = Array.isArray(payload.cities) ? payload.cities : [];

      const created = await storage.createEmployerSavedSearch({
        employerId,
        skills,
        cities,
      } as any);

      return res.status(201).json({ message: "Saved search created", savedSearch: created });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Create saved search error:", error);
      return res.status(500).json({ message: "An error occurred while creating saved search" });
    }
  });

  app.get("/api/employer/:employerId/saved-searches", async (req, res) => {
    try {
      const employerId = String(req.params.employerId ?? "").trim();
      if (!employerId) {
        return res.status(400).json({ message: "employerId is required" });
      }

      const savedSearches = await storage.listEmployerSavedSearches(employerId);
      return res.json({ savedSearches });
    } catch (error) {
      console.error("List saved searches error:", error);
      return res.status(500).json({ message: "An error occurred while fetching saved searches" });
    }
  });

  app.get("/api/website/home", async (_req, res) => {
    try {
      // NOTE: Some installations may not have all CMS tables (e.g. website_slider).
      // Partners is required for Home. Other sections are optional.
      const partnersAll = await storage.listWebsitePartners();
      const partners = (partnersAll ?? []).filter((s: any) => s?.isActive);

      let skillsAll: any[] = [];
      try {
        skillsAll = await storage.listWebsiteFeaturedSkills();
      } catch (e: any) {
        if (String(e?.code ?? "") !== "42P01") throw e;
      }
      const skills = (skillsAll ?? []).filter((s: any) => s?.isActive);

      return res.json({
        slider: [],
        blogs: [],
        skills,
        faces: [],
        partners,
        plans: [],
        faq: [],
      });
    } catch (error) {
      console.error("Website home content error:", error);
      return res.status(500).json({ message: "An error occurred while fetching website content" });
    }
  });

  app.get("/api/website/slider", async (_req, res) => {
    try {
      const items = await storage.listWebsiteSlider();
      return res.json({ items: (items ?? []).filter((s: any) => s?.isActive) });
    } catch (error) {
      console.error("Website slider list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching slider" });
    }
  });

  app.get("/api/website/blogs", async (_req, res) => {
    try {
      const posts = await storage.listWebsiteBlogPosts();
      return res.json({
        posts: (posts ?? []).filter((p: any) => String(p?.status ?? "").toLowerCase() === "published"),
      });
    } catch (error) {
      console.error("Website blogs list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching blogs" });
    }
  });

  app.get("/api/website/blogs/:slug", async (req, res) => {
    try {
      const slug = String(req.params.slug ?? "").trim();
      if (!slug) {
        return res.status(400).json({ message: "slug is required" });
      }

      const posts = await storage.listWebsiteBlogPosts();
      const post = (posts ?? []).find((p: any) => String(p?.slug ?? "") === slug);
      if (!post || String(post?.status ?? "").toLowerCase() !== "published") {
        return res.status(404).json({ message: "Blog post not found" });
      }
      return res.json({ post });
    } catch (error) {
      console.error("Website blog detail error:", error);
      return res.status(500).json({ message: "An error occurred while fetching blog" });
    }
  });

  app.get("/api/website/skills", async (_req, res) => {
    try {
      const items = await storage.listWebsiteFeaturedSkills();
      return res.json({ items: (items ?? []).filter((s: any) => s?.isActive) });
    } catch (error) {
      console.error("Website skills list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching skills" });
    }
  });

  app.get("/api/website/faces", async (_req, res) => {
    try {
      const items = await storage.listWebsiteHappyFaces();
      return res.json({ items: (items ?? []).filter((s: any) => s?.isActive) });
    } catch (error) {
      console.error("Website faces list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching happy faces" });
    }
  });

  app.get("/api/website/partners", async (_req, res) => {
    try {
      const items = await storage.listWebsitePartners();
      return res.json({ items: (items ?? []).filter((s: any) => s?.isActive) });
    } catch (error) {
      console.error("Website partners list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching partners" });
    }
  });

  app.get("/api/website/plans", async (_req, res) => {
    try {
      const items = await storage.listWebsitePlans();
      return res.json({ items: (items ?? []).filter((s: any) => s?.isActive) });
    } catch (error) {
      console.error("Website plans list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching plans" });
    }
  });

  app.get("/api/website/faq", async (_req, res) => {
    try {
      let items: any[] = [];
      try {
        items = await storage.listWebsiteFaqs();
      } catch (e: any) {
        if (String(e?.code ?? "") !== "42P01") throw e;
      }
      return res.json({ items: (items ?? []).filter((s: any) => s?.isActive) });
    } catch (error) {
      console.error("Website FAQ list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching FAQ" });
    }
  });

  app.get("/api/website/terms", async (_req, res) => {
    try {
      let terms: any = null;
      try {
        terms = await storage.getWebsiteTerms();
      } catch (e: any) {
        if (String(e?.code ?? "") !== "42P01") throw e;
      }
      return res.json({ terms: terms ?? null });
    } catch (error) {
      console.error("Website terms get error:", error);
      return res.status(500).json({ message: "An error occurred while fetching terms" });
    }
  });

  app.get("/api/website/intern-terms", async (_req, res) => {
    try {
      let terms: any = null;
      try {
        terms = await storage.getInternTerms();
      } catch (e: any) {
        if (String(e?.code ?? "") !== "42P01") throw e;
      }
      return res.json({ terms: terms ?? null });
    } catch (error) {
      console.error("Website intern terms get error:", error);
      return res.status(500).json({ message: "An error occurred while fetching terms" });
    }
  });

  app.get("/api/website/employer-terms", async (_req, res) => {
    try {
      let terms: any = null;
      try {
        terms = await storage.getEmployerTerms();
      } catch (e: any) {
        if (String(e?.code ?? "") !== "42P01") throw e;
      }
      return res.json({ terms: terms ?? null });
    } catch (error) {
      console.error("Website employer terms get error:", error);
      return res.status(500).json({ message: "An error occurred while fetching terms" });
    }
  });

  const contactSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    countryCode: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    queryType: z.enum(['intern', 'general', 'hiring']).optional().default('general'),
    subject: z.string().optional().nullable(),
    message: z.string().min(1),
  });

  app.post("/api/website/contact", async (req, res) => {
    try {
      const payload = contactSchema.parse(req.body);
      const contact = await storage.createContactMessage({
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        countryCode: payload.countryCode ?? null,
        phone: payload.phone ?? null,
        queryType: payload.queryType ?? 'general',
        subject: payload.subject ?? null,
        message: payload.message,
        isRead: false,
      } as any);
      return res.status(201).json({ message: "Message received", contact });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Contact submit error:", error);
      return res.status(500).json({ message: "An error occurred while sending message" });
    }
  });

  const supportUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        try {
          const dir = path.join(getUploadsDir(), "support");
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        } catch (e) {
          cb(e as any, "");
        }
      },
      filename: (_req, file, cb) => {
        const orig = String(file?.originalname ?? "");
        const ext = path.extname(orig).slice(0, 12) || "";
        cb(null, `${uuidv4()}${ext}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      const field = String((file as any)?.fieldname ?? "");
      const mt = String((file as any)?.mimetype ?? "");

      if (field === "video") {
        if (!mt.toLowerCase().startsWith("video/")) return cb(new Error("Only video files are allowed"));
      }

      if (field === "attachments") {
        if (!mt.toLowerCase().startsWith("image/")) return cb(new Error("Only image attachments are allowed"));
      }

      return cb(null, true);
    },
    limits: {
      fileSize: 2 * 1024 * 1024,
      files: 6,
    },
  });

  const supportUploadFields = supportUpload.fields([
    { name: "video", maxCount: 1 },
    { name: "attachments", maxCount: 5 },
  ]);

  app.post("/api/support/feedback", (req, res) => {
    supportUploadFields(req, res, async (err: any) => {
      const unlinkFile = async (file?: Express.Multer.File) => {
        try {
          const p = String((file as any)?.path ?? "").trim();
          if (!p) return;
          await fs.promises.unlink(p);
        } catch {
          return;
        }
      };

      const cleanupFiles = async () => {
        const files = (req as any).files as
          | {
              video?: Express.Multer.File[];
              attachments?: Express.Multer.File[];
            }
          | undefined;
        const uploadedVideo = files?.video?.[0];
        const attachments = Array.isArray(files?.attachments) ? files?.attachments : [];
        await unlinkFile(uploadedVideo);
        for (const f of attachments) await unlinkFile(f);
      };

      if (err) {
        await cleanupFiles();
        const msg =
          err instanceof (multer as any).MulterError && String(err.code) === "LIMIT_FILE_SIZE"
            ? "File too large. Video max 2MB and each image max 100KB."
            : String(err?.message || "Upload failed");
        return res.status(400).json({ message: msg });
      }

      try {
        const body = z
          .object({
            kind: z.enum(["feedback", "report"]).optional().default("feedback"),
            userType: z.enum(["intern", "employer"]).optional().default("intern"),
            userId: z.string().optional().nullable(),
            message: z.string().optional().nullable(),
            pageUrl: z.string().optional().nullable(),
          })
          .parse(req.body ?? {});

        const files = (req as any).files as
          | {
              video?: Express.Multer.File[];
              attachments?: Express.Multer.File[];
            }
          | undefined;

        const uploadedVideo = files?.video?.[0];
        const attachments = Array.isArray(files?.attachments) ? files?.attachments : [];

        const videoMax = 2 * 1024 * 1024;
        const imageMax = 100 * 1024;

        if (uploadedVideo && Number(uploadedVideo.size || 0) > videoMax) {
          await cleanupFiles();
          return res.status(400).json({ message: "Video too large. Max 2MB." });
        }

        const tooLargeAttachment = attachments.find((f) => Number(f?.size || 0) > imageMax);
        if (tooLargeAttachment) {
          await cleanupFiles();
          return res.status(400).json({ message: "Image too large. Each attachment max 100KB." });
        }

        const videoUrl = uploadedVideo?.filename ? `/uploads/support/${uploadedVideo.filename}` : null;
        const attachmentUrls = attachments
          .map((f) => (f?.filename ? `/uploads/support/${f.filename}` : null))
          .filter((x): x is string => Boolean(x));

        const msgParts: string[] = [];
        msgParts.push(`kind: ${body.kind}`);
        msgParts.push(`userType: ${body.userType}`);
        if (body.userId) msgParts.push(`userId: ${body.userId}`);
        if (body.pageUrl) msgParts.push(`pageUrl: ${body.pageUrl}`);
        if (body.message) {
          msgParts.push("message:");
          msgParts.push(String(body.message));
        }
        if (videoUrl) msgParts.push(`video: ${videoUrl}`);
        if (attachmentUrls.length) msgParts.push(`attachments: ${attachmentUrls.join(", ")}`);

        const placeholderEmail = body.userType === "employer" ? "employer@findtern.support" : "intern@findtern.support";
        const placeholderFirst = body.userType === "employer" ? "Employer" : "Intern";
        const placeholderLast = body.userId ? String(body.userId) : "Anonymous";
        const queryType = body.userType === "employer" ? "hiring" : "intern";

        const contact = await storage.createContactMessage({
          firstName: placeholderFirst,
          lastName: placeholderLast,
          email: placeholderEmail,
          queryType,
          subject: `Support ${body.kind}`,
          message: msgParts.join("\n"),
          isRead: false,
        } as any);

        return res.status(201).json({
          message: "Support request received",
          uploaded: {
            videoUrl,
            attachmentUrls,
          },
          contact,
        });
      } catch (error) {
        await cleanupFiles();
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Validation failed", errors: error.errors });
        }
        console.error("Support feedback upload error:", error);
        return res.status(500).json({ message: "An error occurred while submitting support request" });
      }
    });
  });

  // Public pricing API: returns region-specific plans when available (e.g., country=IN)
  app.get("/api/pricing", async (req, res) => {
    try {
      const country = (String(req.query.country || req.headers["cf-ipcountry"] || "") || "").toUpperCase();
      const items = await storage.listPricingPlans(country || null);
      return res.json({ items: (items ?? []).filter((s: any) => s?.isActive) });
    } catch (error) {
      console.error("Pricing list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching pricing" });
    }
  });

  // Admin: pricing management
  const pricingSchema = z.object({
    slug: z.string().min(1),
    displayName: z.string().min(1),
    region: z.string().optional().nullable(),
    currency: z.string().min(1).default("INR"),
    priceHourlyMinor: z.preprocess((v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v), z.number().int().nonnegative()).optional().default(0),
    perHireChargeMinor: z.preprocess((v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v), z.number().int().nonnegative()).optional().default(0),
    internshipDuration: z.string().optional().nullable(),
    features: z.array(z.string()).optional().default([]),
    gstApplicable: z.boolean().optional().default(false),
    sortOrder: z.preprocess((v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v), z.number().int()).optional().default(0),
    isActive: z.boolean().optional().default(true),
  });

  app.get("/api/admin/website/pricing", async (_req, res) => {
    try {
      const items = await storage.listPricingPlans();
      return res.json({ items: items ?? [] });
    } catch (error) {
      console.error("Admin pricing list error:", error);
      return res.status(500).json({ message: "An error occurred while fetching pricing" });
    }
  });

  app.post("/api/admin/website/pricing", async (req, res) => {
    try {
      const payload = pricingSchema.parse(req.body);
      const item = await storage.createPricingPlan(payload as any);
      return res.status(201).json({ item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin pricing create error:", error);
      return res.status(500).json({ message: "An error occurred while creating pricing" });
    }
  });

  app.put("/api/admin/website/pricing/:id", async (req, res) => {
    try {
      const payload = pricingSchema.partial().parse(req.body);
      const item = await storage.updatePricingPlan(req.params.id, payload as any);
      if (!item) return res.status(404).json({ message: "Pricing not found" });
      return res.json({ item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Admin pricing update error:", error);
      return res.status(500).json({ message: "An error occurred while updating pricing" });
    }
  });

  app.delete("/api/admin/website/pricing/:id", async (req, res) => {
    try {
      await storage.deletePricingPlan(req.params.id);
      return res.status(204).send();
    } catch (error) {
      console.error("Admin pricing delete error:", error);
      return res.status(500).json({ message: "An error occurred while deleting pricing" });
    }
  });
  return httpServer;
}

