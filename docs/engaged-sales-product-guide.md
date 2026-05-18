# Engaged Sales — Product guide

**Audience:** Field staff, supervisors, brand or agency contacts, and administrators — no technical background required.

**Purpose:** This document explains what Engaged Sales is, how the product is organized, who sees which screens, and how to use it day to day. Share it as onboarding material or a reference for your organization.

**Your app address:** Your team should give you the exact web link (URL) for your environment. An example deployment may look like `https://engaged-sales-app-web.vercel.app/` — always use the address your administrator provides.

---

## 1. What Engaged Sales is

Engaged Sales is a **mobile-first web application** for **sales and field operations**. Teams use it to:

- Run **campaigns in the field** (called **activations** in the product).
- Record **where people were** when they start work (**check-ins**), using **work areas on a map** when your organization requires it.
- Log **sales**, **outlet visits**, and **stock-related** activity from phones and tablets.
- Let **head office** configure **users**, **territories**, **outlets**, **work areas**, **reporting**, and **attendance** views.

The same product connects **people on the ground** with **people in the office**. Field users capture activity; operations users maintain the structure that activity belongs to and review performance.

The app can be **installed on your home screen** (like an app) from supported browsers; it is designed to work well on **small screens** as well as laptops.

---

## 2. Two workspaces after you sign in

After a successful sign-in, you land in one of two main areas. You do not choose them from a menu in the same way you choose “Field” vs “Ops” — the product **sends you to the right place** based on your **role**.

| Workspace      | What you call it in the app                     | Who uses it                                    | What it is for                                                                                   |
| -------------- | ----------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Field**      | The header may show **“Field”** or **“Client”** | **Promoters** and **Client (read-only)** users | Day-to-day execution: activations, check-in, visits, stock, history (depending on role).         |
| **Operations** | The header shows **“Ops”**                      | **Supervisors** and **Admins**                 | Configuration and oversight: users, regions, activations, maps, reporting, attendance, tracking. |

**Promoters** and **supervisors/admins** never share the same default home screen: supervisors and admins are taken to **Operations**; promoters (and clients) are taken to **Field**.

---

## 3. Roles — who can do what

| Role                   | Field app                                                                   | Operations console                                                                   | In plain language                                                                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Promoter**           | Full **Field** tools (Home, Activations, Check-in, Outlets, Stock, History) | **No access** — if you open an Ops link, you are sent back to Field                  | You execute the work: check in, visit outlets, record sales and stock as your process allows.                                                                               |
| **Client (read-only)** | **Limited Field** — only **Home** and **Activations**                       | **No access**                                                                        | You follow assigned campaigns and read-only insights (for example team sales or exports your org enables). You do **not** enter data on check-in, outlets, stock, or sales. |
| **Supervisor**         | You are **redirected to Ops** (not Field)                                   | **Full Ops** menu for your permissions                                               | You run day-to-day operations: people, territories, campaigns, tracking, reporting.                                                                                         |
| **Admin**              | Same as supervisor — **Ops**                                                | **Ops**, often with **extra visibility** on the Overview (for example system health) | Full operational control aligned with your deployment.                                                                                                                      |

**Critical habit:** On the sign-in screen you must pick the **role that matches how your account was set up**. If you pick the wrong role, sign-in will usually **fail** even if your phone number and code are correct.

**Location (GPS):** **Promoters** may be asked to **allow location** in the browser so check-ins can be checked against **work areas**. Supervisors, admins, and clients often sign in **without** needing to be inside a geofence — your organization’s policy still applies.

---

## 4. Getting started (everyone)

### 4.1 Open the app

Use a **modern browser**: Chrome, Safari, Edge, or Firefox — on a phone, tablet, or computer. Open the **URL your administrator gave you**.

### 4.2 Sign in

1. Open **Sign in** (from the marketing home page, or from a direct link such as `/auth/sign-in` on your server).
2. Enter:
   - **Phone number** — as registered by your administrator.
   - **Unique code** — your personal code (often shown like `P-…` or similar).
   - **Role** — **Promoter**, **Client (read-only)**, **Supervisor**, or **Admin**.
3. Submit. If you are a **promoter** and your org uses map-based work areas, **allow location** when the browser asks.
4. **Creating an account:** Some organizations allow **self sign-up** from the sign-in page. Others only allow accounts created by a supervisor or admin. Follow what your administrator tells you.

### 4.3 First screen

- **Supervisor** or **Admin** → **Operations** (`/ops`).
- **Promoter** or **Client** → **Field** (`/dashboard`).

### 4.4 Sign out

Use **Sign out** in the **sidebar** (wide screens) or **bottom navigation** (phones). That ends the session **on that device**. If you share a device, always sign out when finished.

---

## 5. Daily clock-in (promoters only)

Many organizations require promoters to **complete a daily check-in** before the rest of the Field app is available.

**What you will notice**

- After sign-in, you may be taken straight to **Check-in** until today’s clock-in is satisfied.
- Until then, the **main navigation may be hidden** so you complete check-in first.
- Once the system confirms you are done for the gate, you can use **Home**, **Activations**, **Outlets**, **Stock**, and **History** as normal.

**Why it exists:** So attendance and presence rules are respected before sales or visit data is recorded.

If you are stuck on check-in, see **Section 10 — Troubleshooting**.

---

## 6. Field app — promoters (step by step)

When the app shows **“Field”** in the chrome, use the **sidebar** (or bottom nav on a phone) to move between sections.

### 6.1 Home

- Shortcuts to the main tools.
- **Profile** and **sessions** (where shown).
- **Recent sales** — a short list of your latest sale records so you can confirm what went through.

### 6.2 Activations

- Lists **campaigns (activations)** you are assigned to and can work on.
- Open an activation to see **details**, **products**, and (where your process allows) **record a sale**.
- Some deployments also expose **downloads** or summaries per activation.

### 6.3 Check-in

- **Daily clock-in / presence** according to your organization’s rules.
- May use **map** or **list** flows depending on configuration.
- **Location** may be required when **work areas (geofences)** are active.

### 6.4 Outlets (outlet visits)

- **Submit** outlet visit reports (execution notes, visibility, and similar fields your org uses).
- Open **history** of your visits from the outlet area when your build links to it.

### 6.5 Stock

- Field **stock** workflows (for example summaries or pickups) as defined for your program.

### 6.6 History

- Your **check-in / location history** (recent field check-ins), not necessarily every type of business event — use Activations or Outlets for campaign- and visit-specific history where applicable.

### 6.7 Connectivity and “pending” work

On some screens the app shows when you are **offline** or when **data is waiting to upload** (a small outbox or connectivity strip). If you were offline when you submitted something, **wait until you are back online** and give the app a moment to finish syncing before closing the browser.

---

## 7. Field app — client (read-only)

When the app shows **“Client”** instead of “Field”, you have a **read-only portal**.

**You get**

- **Home** — profile and context.
- **Activations** — campaigns **your account is rostered on**. You can open an activation to view **read-only** information such as **team sales** or **exports** (Excel or other formats) if your organization exposes them.

**You do not get**

- Check-in, outlet visits, stock entry, full history, or **recording sales** as a promoter would.

If you open an old bookmark to a path you are not allowed to use, the app will **steer you back** to allowed areas (typically **Activations**).

---

## 8. Operations console — supervisors and admins

When the app shows **“Ops”**, you use the **Operations** layout. The **left sidebar** groups links into sections. Sections can be **collapsed**; the app can **remember** open/closed state on that device.

### 8.1 Overview

- High-level **snapshot**: users, regions, work areas, outlets, sessions, and related signals.
- **Admins** may also see **platform or API health** indicators where enabled.

### 8.2 Reporting and performance

- **Reporting** — Run dashboards for a **date range**; filter by **activation** and/or **region**; **export** (for example Excel or PDF) depending on deployment.
- **Reporting settings** — **Scheduled** report delivery (time zone, schedules, recipient emails) if your organization uses it.
- **Stock** — Operational view of stock across the program.
- **Targets** — Targets and performance views as configured.

### 8.3 Structure and people

- **Users** — Create, edit, deactivate accounts; assign **roles** and **regions** as permitted.
- **Regions** — Territories used to organize people and campaigns.
- **Subwholesales** — Finer structure under regions (for example distributor or sub-territory nodes).
- **Activations** — Create and manage **campaigns**, **rosters**, products, and related setup. (In the sidebar this appears for **supervisors and admins**; it is not the same screen as the promoter’s Field “Activations” list, though both relate to campaigns.)

### 8.4 Field operations

- **Work areas** — Define **geofences** (map zones) where check-in rules apply.
- **Outlets** — **Master outlet list** used across visits and reporting.
- **Attendance** — **Supervisors and admins**: daily roll-up style views for field attendance (depends on org configuration).
- **Live tracking** — **Supervisors and admins**: map-oriented views for operational follow-up.

### 8.5 Account

- **Organization** — Organization-level information you may view or edit.
- **Account** — Your own **profile**, **sessions**, and sign-out.

**Access rule:** **Promoters** (and **clients**) who open `/ops` are **redirected to Field**. They are not meant to use Operations.

---

## 9. Language cheat sheet (glossary)

| Term in the app          | Plain English                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| **Activation**           | A **campaign** or job window: dates, regions, roster, products, sometimes sales rules.   |
| **Region**               | A **territory** or branch used to group users and campaigns.                             |
| **Work area / geofence** | A **map zone** where location-based check-in rules apply.                                |
| **Outlet**               | A **store or location** in the master list; field users file **visits** against outlets. |
| **Check-in**             | **Starting** (or confirming) your work day in the field, often with **location**.        |
| **Roster**               | People **assigned** to an activation for execution or reporting.                         |
| **Ops**                  | **Operations** — the back-office console.                                                |
| **Field**                | The **mobile execution** side for promoters (and read-only subset for clients).          |

---

## 10. Troubleshooting

| Problem                                  | What to try                                                                                                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Cannot sign in**                       | Confirm **phone**, **unique code**, and **role** with your administrator. Wrong role is a common mistake.                                                                                                          |
| **Stuck on check-in (promoter)**         | Turn on **location**, move to an allowed **work area** if your org requires it, wait for **GPS** to settle, retry. If the problem persists, contact your supervisor with **date, time, and approximate location**. |
| **“Wrong” or empty activations**         | Supervisor: check **Activations** roster and each user’s **region** assignment.                                                                                                                                    |
| **Blank or slow screens**                | Check **internet** signal; **refresh** the page; wait a few seconds after going back online for **pending uploads**.                                                                                               |
| **Session expired**                      | Sign in again — long idle periods can end the session for security.                                                                                                                                                |
| **I am a client and opened an old link** | Use **Home** or **Activations** from the menu; the app will block paths that are not read-only for you.                                                                                                            |

---

## 11. Practical tips for organizations rolling out Engaged Sales

1. **One person, one code** — Do not share personal unique codes; each person should use their own device where possible.
2. **Train on vocabulary** — Align internal training decks with **Activation**, **Region**, and **Work area** so helpdesk questions map to the product.
3. **Bookmarks** — Bookmarks to `/dashboard/...` or `/ops/...` are fine; **role-based redirects** still apply.
4. **Add your own addendum** — If your deployment uses custom URLs, disabled features, or extra SOPs, append a short **“Addendum for [company name]”** with your links and who to call.

---

## 12. Document maintenance

This guide describes the **Engaged Sales** application structure: Field vs Operations, the four roles above, daily promoter check-in gating where enabled, and the main menu areas. Features may be **tuned per deployment**; your implementation partner should confirm anything marked “where enabled” or “depending on configuration” for your tenant.
