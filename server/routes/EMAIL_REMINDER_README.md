# Email Auto-Send Notification — Appointment Reminders

> Documentation for how the automated appointment reminder email system works,
> including timezone behavior, database relationships, and the cron schedule.

---

## What is this? (Plain-language summary)

**Every day at 4:00 PM Philippine Time**, the system automatically checks if any patients have appointments scheduled for **tomorrow**. If they do, it sends them an **email reminder** so they don't forget.

**In short:**

- **When does it run?** Every day at **4:00 PM PHT** (automatically).
- **Who gets an email?** Patients with appointments **tomorrow** that are either "Confirmed" or "Pending."
- **Who does NOT get an email?** Patients whose appointments are cancelled, denied, or already completed — and patients who don't have an email linked to their account.
- **What's in the email?** The appointment date/time, the reason for the visit, the assigned staff/doctor, and reminders to arrive early and bring documents.
- **Can we send it manually?** Yes — see [Can I trigger the cron manually?](#q-can-i-trigger-the-cron-manually) below.

---

## Table of Contents

1. [Overview](#overview)
2. [Database Table Relationships](#database-table-relationships)
3. [Timezone Behavior](#timezone-behavior)
4. [Cron Job Details](#cron-job-details)
5. [Email Delivery Flow](#email-delivery-flow)
6. [FAQ & Edge Cases](#faq--edge-cases)
7. [Troubleshooting Checklist](#troubleshooting-checklist)

---

## Overview

The system sends **automated email reminders** to patients who have appointments scheduled for **the next PHT calendar day**. It is triggered by a **Vercel Cron Job** that runs once daily at **4:00 PM Philippine Time (8:00 AM UTC)**.

**Key files involved:**

| File                                 | Purpose                                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| `server/routes/cron.js`              | Cron endpoint — calculates "tomorrow", fetches appointments, loops and sends emails |
| `server/services/emailService.js`    | Builds the HTML/text email and sends via Nodemailer (Gmail App Password)            |
| `server/services/supabaseService.js` | `getAppointmentsByDateRange()` — Supabase query with joins to resolve patient email |
| `vercel.json`                        | Defines the cron schedule (`0 8 * * *` UTC)                                         |

---

## Database Table Relationships

The email system chains through **3 tables** to get the patient's email address:

```
Appointment                     Patients                       Users
┌──────────────────┐           ┌──────────────────┐           ┌──────────────────┐
│ AppointmentID PK │           │ PatientID    PK  │           │ UserID       PK  │
│ PatientID     FK ├──────────►│ UserID       FK  ├──────────►│ Email        ✉   │
│ ScheduledBy   FK │           │ FirstName        │           │ fullName         │
│ DateTime         │           │ Surname          │           │ RoleName         │
│ EndDateTime      │           │ ContactNumber    │           └──────────────────┘
│ Status           │           └──────────────────┘
│ Reason           │
│ Notes            │           Staff
│ CreatedAt        │           ┌──────────────────┐
│ UpdatedAt        │           │ StaffID      PK  │
│                  │           │ FirstName        │
│ ScheduledBy   FK ├──────────►│ Surname          │
└──────────────────┘           │ Specialization   │
                               └──────────────────┘
```

### Join chain used in the Supabase query

```
Appointment
  → Patients  (FK: fk_appointment_patientid)
      → Users (FK: Patients_UserID_fkey)   ← gets Email, fullName
  → Staff     (FK: fk_appointment_scheduledby)  ← gets staff name, specialization
```

> **Important:** The `Patients` table does **NOT** have an Email column.
> The email is retrieved by joining `Patients.UserID → Users.UserID → Users.Email`.
> If a patient's `UserID` is `NULL` (i.e., no linked user account), the reminder **cannot be sent** and will be skipped.

---

## Timezone Behavior

### How DateTime is stored in the Appointment table

| Aspect                           | Detail                                                                                                   |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Column type**                  | `TIMESTAMPTZ` (timestamp with time zone)                                                                 |
| **What the user selects**        | A `datetime-local` HTML input (e.g., `2026-02-28T14:30`)                                                 |
| **Timezone conversion on save?** | **Yes.** The app appends `+08:00` (PHT) to the raw string before saving.                                 |
| **How PostgreSQL interprets it** | PostgreSQL reads `2026-02-28T14:30:00+08:00` and stores the UTC equivalent: `2026-02-28T06:30:00+00:00`. |
| **What gets stored**             | `2026-02-28T06:30:00+00:00` (UTC equivalent of 2:30 PM PHT)                                              |

### Example: User in Philippine Time (UTC+8)

If a user in the Philippines selects `2:30 PM, Feb 28` in the form:

1. The browser emits `"2026-02-28T14:30"` (no offset attached)
2. The app appends `+08:00` → `"2026-02-28T14:30:00+08:00"`
3. PostgreSQL stores it as `2026-02-28T06:30:00+00:00` (UTC)
4. When displayed back, it converts to `2:30 PM PHT` — matching what the user intended

**The time the user picks is stored correctly as Philippine Time.**

> **Where the fix is applied:**
>
> - `src/composables/useSupabase.js` — `createAppointment()` and `updateAppointment()`
> - `server/routes/appointments.js` — POST and PUT routes via `ensurePHT()` helper
> - The offset is only appended if the DateTime string has no existing offset (safe for idempotent calls)

### How DateTime is displayed in the reminder email

The email template converts the stored UTC DateTime to **Asia/Manila** for display:

```js
new Date(appointment.DateTime).toLocaleString("en-US", {
  timeZone: "Asia/Manila",
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
```

So the stored UTC value is correctly rendered in Philippine Time in the email body.

---

## Cron Job Details

### Schedule

Defined in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 8 * * *"
    }
  ]
}
```

| Setting      | Value                                                 |
| ------------ | ----------------------------------------------------- |
| **Schedule** | `0 8 * * *`                                           |
| **Timezone** | **UTC** (Vercel Cron always uses UTC)                 |
| **Runs at**  | 8:00 AM UTC daily = **4:00 PM Philippine Time (PHT)** |

### What "tomorrow" means in the cron logic

The cron calculates "tomorrow" based on **Philippine Time (PHT = UTC+8)**:

```js
// Current time in PHT
const PHT_OFFSET_MS = 8 * 60 * 60 * 1000;
const nowPHT = new Date(now.getTime() + PHT_OFFSET_MS);

// Tomorrow 00:00:00 PHT (expressed as UTC for the query)
const tomorrowStart = new Date(
  Date.UTC(year, month, day + 1, 0, 0, 0) - PHT_OFFSET_MS,
);
// Day-after-tomorrow 00:00:00 PHT
const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);
```

> **Note:** The boundaries are midnight-to-midnight **PHT**, converted to UTC for the database query.
> This ensures the cron window aligns with the Filipino user's calendar day.

### Query filter (example for Feb 10 cron run)

```sql
-- Tomorrow in PHT = Feb 11, 00:00 PHT to Feb 12, 00:00 PHT
-- In UTC:         Feb 10, 16:00 UTC to Feb 11, 16:00 UTC
WHERE "DateTime" >= '2026-02-10T16:00:00Z'
  AND "DateTime" <  '2026-02-11T16:00:00Z'
```

This fetches all appointments whose `DateTime` falls within the **next PHT calendar day**.

### Appointment statuses

| Status      | Action           |
| ----------- | ---------------- |
| `Confirmed` | ✅ Reminder sent |
| `Pending`   | ✅ Reminder sent |
| `Cancelled` | ⏭ Skipped       |
| `Denied`    | ⏭ Skipped       |
| `Completed` | ⏭ Skipped       |

---

## Email Delivery Flow

```
Vercel Cron (0 8 * * * UTC)
  │
  ▼
GET /api/cron/reminders
  │
  ├─ Calculate tomorrow (PHT midnight to midnight)
  │
  ├─ Query Supabase: Appointment + Patients + Users + Staff
  │   (using supabaseAdmin with service_role key to bypass RLS)
  │
  ├─ For each appointment:
  │   ├─ Skip if status = cancelled / denied / completed
  │   ├─ Extract email from Patients → Users → Email
  │   ├─ Skip if no email (patient has no linked user account)
  │   └─ Send email via Gmail App Password (Nodemailer)
  │
  └─ Return results summary { total, sent, failed, skipped }
```

### Email configuration used

| Priority | Method                  | Env Vars                              |
| -------- | ----------------------- | ------------------------------------- |
| 1st      | SMTP server             | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` |
| 2nd      | **Gmail App Password**  | `GMAIL_USER`, `GMAIL_APP_PASSWORD`    |
| 3rd      | Ethereal (dev fallback) | None (auto-generated test account)    |

Currently using **Gmail App Password** (`GMAIL_USER` + `GMAIL_APP_PASSWORD`).

### Email content

The reminder email includes:

- Appointment ID
- Date & Time (displayed in **Asia/Manila** timezone)
- End time (if set)
- Status (with color badge: green=Confirmed, yellow=Pending)
- Reason / Purpose
- Attending Staff name & specialization (if assigned)
- Additional notes (if any)
- Practical reminders (arrive early, bring documents, reschedule instructions)

---

## FAQ & Edge Cases

### Q: An appointment is 28 hours away. Will the patient still get a reminder?

**It depends on when the appointment falls relative to the "tomorrow PHT" window.**

The cron runs at **08:00 UTC (4:00 PM PHT)** and checks for appointments between **tomorrow 00:00 PHT** and **tomorrow 23:59:59 PHT**.

**Example — Cron runs on Feb 10 at 08:00 UTC (4:00 PM PHT):**

| Appointment DateTime (stored UTC) | PHT equivalent       | Hours from cron | In "tomorrow PHT" window?  | Reminder sent? |
| --------------------------------- | -------------------- | --------------- | -------------------------- | -------------- |
| `2026-02-10T16:00:00Z`            | Feb 11, 00:00 PHT    | 8h away         | ✅ Yes                     | ✅ Yes         |
| `2026-02-11T02:30:00Z`            | Feb 11, 10:30 AM PHT | ~18h away       | ✅ Yes                     | ✅ Yes         |
| `2026-02-11T06:30:00Z`            | Feb 11, 2:30 PM PHT  | ~22h away       | ✅ Yes                     | ✅ Yes         |
| `2026-02-11T12:00:00Z`            | Feb 11, 8:00 PM PHT  | 28h away        | ✅ Yes                     | ✅ Yes         |
| `2026-02-11T15:59:00Z`            | Feb 11, 11:59 PM PHT | ~32h away       | ✅ Yes                     | ✅ Yes         |
| `2026-02-11T16:00:00Z`            | Feb 12, 00:00 AM PHT | 32h away        | ❌ No (day after tomorrow) | ❌ No          |
| `2026-02-10T15:00:00Z`            | Feb 10, 11:00 PM PHT | 7h away         | ❌ No (today in PHT)       | ❌ No          |

**Yes, a 28-hour-away appointment WILL get a reminder**, as long as it falls on the next PHT calendar day.

But an appointment **today PHT** (even if 12+ hours away) will **NOT** get a reminder — the cron only checks "tomorrow PHT."

### Q: Does the saved DateTime adjust for the user's timezone?

**Yes.** The app appends `+08:00` (PHT) to every `DateTime` value from the `datetime-local` input before saving. PostgreSQL receives `"2026-02-28T14:30:00+08:00"` and correctly stores the UTC equivalent `"2026-02-28T06:30:00+00:00"`.

This means the time the user selects in the form is accurately preserved as Philippine Time.

### Q: What if a patient has no user account linked?

The reminder is **skipped** with a warning log:

```
⚠️ No email found for patient [Name] (PatientID: xxx). Check that the patient has a linked Users record with an Email.
```

### Q: What if the email fails to send?

The error is caught per-appointment. The cron continues processing remaining appointments and reports the failure in the results:

```json
{ "total": 5, "sent": 3, "failed": 1, "skipped": 1 }
```

### Q: Can I trigger the cron manually?

Yes. Make a GET request to:

```
GET /api/cron/reminders
```

**Locally** (requires the Express dev server, not the Vite dev server):

```bash
# Start the backend server first (port 3000 by default)
node server/index.js

# Then open in browser or use curl:
curl http://localhost:3000/api/cron/reminders
```

> **⚠️ Use `http://`, NOT `https://`.** The local server does not use SSL.
> Using `https://localhost:3000` will give an SSL error.
>
> Also: `http://localhost:5173` is the **Vite frontend** dev server — it does not serve API routes.
> Use `http://localhost:3000` (the **Express backend** server) instead.

**On Vercel (deployed):**

```
https://your-vercel-domain.vercel.app/api/cron/reminders
```

---

## Troubleshooting Checklist

| Check                                | How to verify                                                          |
| ------------------------------------ | ---------------------------------------------------------------------- |
| **Gmail credentials set?**           | `.env` has `GMAIL_USER` and `GMAIL_APP_PASSWORD`                       |
| **Patient has a user account?**      | `Patients.UserID` is not NULL for the target patient                   |
| **User record has email?**           | `Users.Email` is set for the linked `UserID`                           |
| **Appointment status is valid?**     | Status is `Confirmed` or `Pending` (not cancelled/denied/completed)    |
| **Appointment is "tomorrow" (PHT)?** | The `DateTime` value falls between tomorrow 00:00 and 23:59 PHT        |
| **Cron is registered?**              | `vercel.json` → `crons` array has the `/api/cron/reminders` entry      |
| **Cron route is accessible?**        | Test manually: `GET /api/cron/reminders`                               |
| **Supabase admin key works?**        | `SUPABASE_SECRET_KEY` is set (cron uses `supabaseAdmin` to bypass RLS) |

---

_Last updated: February 2026_
