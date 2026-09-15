import "server-only";

import { getRuntimeEnv, type D1DatabaseLike } from "./runtime-env";

type Recipient = {
  email: string;
  name?: string;
  phone?: string;
};

type Delivery = {
  email: { attempted: number; sent: number; skipped: number };
  sms: { attempted: number; sent: number; skipped: number };
};

const emptyDelivery = (): Delivery => ({
  email: { attempted: 0, sent: 0, skipped: 0 },
  sms: { attempted: 0, sent: 0, skipped: 0 },
});

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function normalizePhone(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `+52${digits}` : digits.startsWith("52") ? `+${digits}` : `+${digits}`;
}

function configuredAdminRecipients() {
  const env = getRuntimeEnv();
  const configured = env.FGDLL_NOTIFICATION_EMAIL || env.FGDLL_ADMIN_EMAILS ||
    "admin@fgdll.org,jaguarcortazar@gmail.com,laurcortazar@gmail.com,yoltyp@gmail.com";
  return configured.split(",").map((email) => ({ email: email.trim().toLowerCase() })).filter((item) => item.email);
}

async function sendEmail(to: string, subject: string, html: string) {
  const env = getRuntimeEnv();
  if (!env.RESEND_API_KEY) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.FGDLL_EMAIL_FROM || "Portal FGDLL <notificaciones@fgdll.org>",
      to,
      subject,
      html,
    }),
  });
  return response.ok;
}

async function sendSms(to: string, body: string) {
  const env = getRuntimeEnv();
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || (!env.TWILIO_MESSAGING_SERVICE_SID && !env.TWILIO_FROM_PHONE)) {
    return false;
  }
  const params = new URLSearchParams({ To: to, Body: body.slice(0, 1500) });
  if (env.TWILIO_MESSAGING_SERVICE_SID) params.set("MessagingServiceSid", env.TWILIO_MESSAGING_SERVICE_SID);
  else if (env.TWILIO_FROM_PHONE) params.set("From", env.TWILIO_FROM_PHONE);
  const credentials = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: { authorization: `Basic ${credentials}`, "content-type": "application/x-www-form-urlencoded" },
    body: params,
  });
  return response.ok;
}

export function announcementHtml(title: string, summary: string, body: string) {
  return `<h2>${escapeHtml(title)}</h2>${summary ? `<p><strong>${escapeHtml(summary)}</strong></p>` : ""}<p>${escapeHtml(body).replace(/\n/g, "<br>")}</p><p><a href="https://fgdll.org/portal#avisos">Abrir Portal FGDLL</a></p>`;
}

export async function notifyRecipients(
  recipients: Recipient[],
  subject: string,
  html: string,
  smsText: string,
) {
  const delivery = emptyDelivery();
  const unique = new Map<string, Recipient>();
  for (const recipient of recipients) {
    const email = clean(recipient.email, 254).toLowerCase();
    if (!email) continue;
    unique.set(email, { ...recipient, email, phone: normalizePhone(recipient.phone) });
  }
  for (const recipient of unique.values()) {
    delivery.email.attempted += 1;
    if (await sendEmail(recipient.email, subject, html)) delivery.email.sent += 1;
    else delivery.email.skipped += 1;

    if (recipient.phone) {
      delivery.sms.attempted += 1;
      if (await sendSms(recipient.phone, smsText)) delivery.sms.sent += 1;
      else delivery.sms.skipped += 1;
    }
  }
  return delivery;
}

export async function notifyAdmins(subject: string, html: string, smsText = "") {
  return notifyRecipients(configuredAdminRecipients(), subject, html, smsText || subject);
}

export async function activePortalRecipients(database: D1DatabaseLike, audience = "all") {
  const result = audience === "all"
    ? await database.prepare("SELECT email, name, phone FROM portal_users WHERE active = 1 AND email != ''").all<Record<string, unknown>>()
    : await database.prepare("SELECT email, name, phone FROM portal_users WHERE active = 1 AND role = ? AND email != ''").bind(audience).all<Record<string, unknown>>();
  return (result.results ?? []).map((row) => ({
    email: String(row.email ?? ""),
    name: String(row.name ?? ""),
    phone: String(row.phone ?? ""),
  }));
}
