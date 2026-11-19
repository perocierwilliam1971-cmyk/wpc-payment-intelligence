# WPC Lead CRM — Setup

The CRM lives at **`/crm/`** on your Netlify site (e.g. `https://your-site.netlify.app/crm/`).
It deploys with the rest of the site; data is stored in Netlify Blobs (no database to manage).

## What it does

| Feature | How |
|---|---|
| Leads, colored by stage | **New = blue**, **Warm = orange**, **Sale = green**. Drag cards between columns or use the buttons in the lead panel. |
| Website leads flow in | Every `merchant-leads` form submission becomes a **New** lead; an `analysis-results` submission makes it **Warm**. |
| Open tracking | An invisible image in each email. Opens within 2 minutes of sending are labeled "possibly automatic" (security scanners, Apple Mail). |
| Click tracking | Links in your emails go through `/t/c/...` and are logged. Clicks are a stronger signal than opens. |
| Reply detection + Gmail log | Checks your inbox (IMAP) every 15 minutes for replies, and your Sent folder for emails you wrote to leads directly in Gmail (logged as "not tracked"), and/or accepts an inbound-email webhook. A reply moves a New lead to Warm and stops its sequence. Out-of-office replies are ignored. |
| Email sequences | A series of emails, days apart, sent automatically every 15 minutes. Stops on reply, unsubscribe, or Sale. |
| Unsubscribe | Every email has an unsubscribe link plus one-click unsubscribe headers (needed for Gmail/Yahoo). |

## Netlify environment variables

Netlify → Project configuration → Environment variables. Redeploy after changing them.

**Required**

| Variable | Value |
|---|---|
| `CRM_ADMIN_TOKEN` | A long random password. You type it once on each device to open the CRM. |
| `RESEND_API_KEY` | Already used by the site. |
| `CRM_FROM_EMAIL` | e.g. `William at WPC <william@send.yourdomain.com>` — must be on a domain verified in Resend. Falls back to `WPC_FROM_EMAIL`. |
| `CRM_REPLY_TO` | The mailbox you actually read. Replies go here. |
| `CRM_MAILING_ADDRESS` | Your business postal address (CAN-SPAM requires it in sales email). |

**Reply detection — pick one or both**

| Variable | Value |
|---|---|
| `CRM_IMAP_HOST` | Google Workspace: `imap.gmail.com`. Outlook/Microsoft 365: see note below. |
| `CRM_IMAP_USER` | The mailbox from `CRM_REPLY_TO`. |
| `CRM_IMAP_PASS` | Google: an **App Password** (needs 2-Step Verification), not your normal password. |
| `CRM_IMAP_PORT` / `CRM_IMAP_MAILBOX` | Optional, default `993` / `INBOX`. |
| `CRM_IMAP_SENT_MAILBOX` | Optional. Found automatically (Gmail: `[Gmail]/Sent Mail`). |
| `CRM_INBOUND_SECRET` | For webhooks: POST JSON `{ "from": "...", "subject": "..." }` to `https://your-site/api/crm/inbound?key=<secret>`. Works with Resend Inbound, Zapier ("New Email in Gmail/Outlook" → Webhook POST) or Make. |

> **Microsoft 365:** Microsoft has turned off password login for IMAP. Use the webhook route (Zapier/Make "new email" → POST) instead.

**Optional**

| Variable | Value |
|---|---|
| `CRM_SENDER_NAME` | Used in `{{sender_name}}` and the footer. Default "WPC Merchant Advantage". |
| `CRM_TRACKING_SECRET` | Signs tracking links. Defaults to `CRM_ADMIN_TOKEN` (changing either breaks links in already-sent emails). |
| `CRM_PUBLIC_URL` | Only if tracking links should use a custom domain; Netlify's `URL` is used otherwise. |
| `CRM_EMAIL_DRY_RUN` | `1` = record emails in the CRM but don't really send. Good for a first test. |

The **Setup** tab in the CRM shows which of these are working.

## Before you send to real prospects

1. Send to yourself first (add yourself as a lead), check it lands in Inbox, not Spam.
2. Use a **subdomain** for sending (e.g. `send.yourdomain.com`) with SPF, DKIM and DMARC set up in Resend, so cold email can't hurt your main domain's reputation.
3. Start slowly — a few dozen emails a day — and only email businesses you have a reason to contact.

## Development

`npm test` runs the CRM tests locally (uses a temp folder instead of Netlify Blobs and never sends email).
