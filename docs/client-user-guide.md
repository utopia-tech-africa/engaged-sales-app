# Engaged Sales — User guide

This guide explains how **Engaged Sales** is organized, who can do what, and how to use it day to day. Share it with anyone who will sign in to the product (field staff, supervisors, brand or agency contacts, and administrators).

**App URL:** [https://engaged-sales-app-web.vercel.app/](https://engaged-sales-app-web.vercel.app/)

---

## What Engaged Sales is

Engaged Sales is a **mobile-first web application** for running field campaigns: people on the ground record activity (check-ins, sales, stock, outlet visits), while supervisors and admins configure **regions**, **work areas (geofences)**, **campaigns (activations)**, **users**, and **reporting**.

The product splits into two main areas after sign-in:

| Area           | Typical URL prefix | Who uses it                                |
| -------------- | ------------------ | ------------------------------------------ |
| **Field**      | `/dashboard`       | Promoters and **Client (read-only)** users |
| **Operations** | `/ops`             | Supervisors and **Admins** only            |

The app signs you into the correct area based on your **role** (see below).

---

## Roles at a glance

| Role           | Field app (`/dashboard`)                          | Ops console (`/ops`)                       | Typical purpose                                                                       |
| -------------- | ------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| **Promoter**   | Full field tools                                  | No access (redirected to Field)            | Execute visits, check-ins, sales, stock in the field                                  |
| **Client**     | **Read-only** portal: Home + **Activations** only | No access                                  | View assigned campaigns, team performance, exports — no data entry                    |
| **Supervisor** | Redirected to Ops                                 | Yes                                        | Run day-to-day operations: users, regions, activations, tracking, reporting           |
| **Admin**      | Redirected to Ops                                 | Yes (includes platform health on Overview) | Full operational control like supervisors, plus visibility suited to technical owners |

**Important**

- Choose the correct **role** on the sign-in screen. It must match how your account was created, or sign-in will fail.
- **Promoters** may be asked for **device location** when the organization uses active work areas (geofences), so the system can validate check-ins.
- **Supervisors, admins, and clients** can usually sign in **without** location, from anywhere (subject to your organization’s policy).

---

## Getting started (all roles)

### Step 1 — Open the app

Open [https://engaged-sales-app-web.vercel.app/](https://engaged-sales-app-web.vercel.app/) in a modern browser (Chrome, Safari, Edge, or Firefox) on a phone, tablet, or computer.

### Step 2 — Sign in or create an account

1. Tap **Sign in** on the home page, or go directly to [https://engaged-sales-app-web.vercel.app/auth/sign-in](https://engaged-sales-app-web.vercel.app/auth/sign-in).
2. Enter:
   - **Phone number** (as given by your administrator).
   - **Unique code** (your personal code, often like `P-…`).
   - **Role** — pick **Promoter**, **Client (read-only)**, **Supervisor**, or **Admin**.
3. Submit the form. If you are a **promoter** and the org uses geofences, allow **location** when the browser asks.
4. If your organization allows self-registration, use **Create account** on the sign-in page, or open [https://engaged-sales-app-web.vercel.app/auth/sign-up](https://engaged-sales-app-web.vercel.app/auth/sign-up), and follow the prompts; otherwise an admin or supervisor creates your user for you.

### Step 3 — Land in the right workspace

- **Supervisor** or **Admin** → you are taken to **Operations** (`/ops`).
- **Promoter** or **Client** → you are taken to **Field** (`/dashboard`).

### Step 4 — Sign out when finished

Use **Sign out** in the sidebar (or bottom navigation on small screens). This ends your session on that device.

---

## Field app — step by step (Promoter)

Use this flow when your role is **Promoter** and you see **“Field”** in the app chrome.

1. **Home (`/dashboard`)**
   - See shortcuts to the main tools.
   - Review **Recent sales** (last few records) and open **Activations** for more detail.

2. **Activations (`/dashboard/activations`)**
   - See campaigns you are assigned to.
   - Open an activation to view details and **record a sale** where your process allows it.

3. **Check-in (`/dashboard/check-in`)**
   - Clock in/out or validate presence according to your organization’s work areas.
   - Location may be required when geofences are active.

4. **Outlets (`/dashboard/outlet-visits`)**
   - Log or review **outlet visits** tied to your territory and campaigns.

5. **Stock (`/dashboard/stock`)**
   - Record **stock pickups** or related stock events as defined for your activations.

6. **History (`/dashboard/history`)**
   - Review your past sales and activity in one place.

7. **Support**
   - Use any **Support** link your build exposes (for example from the home area) if your team configured it.

If you open a bookmark to the wrong area, the app will still send **promoters** to Field routes appropriate to your role.

---

## Field app — step by step (Client / read-only)

When your role is **Client (read-only)**, the app shows **“Client”** instead of “Field” and only two main destinations:

1. **Home (`/dashboard`)**
   - Profile and session context.
   - Shortcuts are limited to what you are allowed to see (essentially **Home** and **Activations**).

2. **Activations (`/dashboard/activations`)**
   - Open campaigns **your account is rostered on**.
   - View **team sales** and **download Excel (or other) reports** your organization exposes for those campaigns.

You **cannot** use check-in, outlet visits, stock, sales entry, or full history paths; those are blocked and the app will steer you back to **Activations** if you try to open them via an old link.

---

## Operations console — step by step (Supervisor and Admin)

Both roles use the **Operations** layout (`/ops`) with a grouped sidebar. Sections can be **collapsed**; your browser remembers section open/closed state on that device.

### Overview (`/ops`)

- Snapshot of users, regions, work areas, outlets, sessions, and (for **admin**) API health where enabled.

### Reporting and performance

- **Reporting (`/ops/reporting`)** — Run a reporting **dashboard** for a date range; filter by activation and/or region; **export** (for example Excel or PDF) depending on what your deployment enables.
- **Reporting settings (`/ops/reporting/settings`)** — Configure **scheduled** report delivery (timezone, cron-style schedules, recipient emails) if your organization uses automated sends.
- **Stock (`/ops/stock`)** — Operational view of stock across the program.
- **Targets (`/ops/targets`)** — Targets and performance views as configured for your workspace.

### Structure and people

- **Users (`/ops/users`)** — Create, edit, and deactivate accounts; assign roles and regions as your permissions allow.
- **Regions (`/ops/regions`)** — Territories (areas) used to organize people and campaigns.
- **Subwholesales (`/ops/subwholesales`)** — Sub-nodes under regions (for example distributor hubs).
- **Activations (`/ops/activations`)** — Create and manage campaigns, rosters, and related setup. In the sidebar this item appears for **supervisors and admins** only (not for **Client** users, who never enter Operations and instead use **Activations** under Field to view assigned campaigns).

### Field operations

- **Work areas (`/ops/geofences`)** — Define circular **geofences** where check-in validation applies.
- **Outlets (`/ops/outlets`)** — Master outlet list used across the program.
- **Attendance (`/ops/attendance`)** — **Supervisors and admins**: review attendance-style signals for the field.
- **Live tracking (`/ops/tracking`)** — **Supervisors and admins**: operational map / tracking views as implemented for your tenant.

### Account

- **Organization (`/ops/organization`)** — Organization-level information you are allowed to edit or view.
- **Account (`/ops/account`)** — Your profile, sessions, and security-related self-service.

**Note:** If a **promoter** somehow opens `/ops`, they are redirected to **Field**. **Client** users are also kept on **Field** only.

---

## Practical tips for your client organization

1. **One person, one role** — Do not share unique codes. Each person should use their own phone and code.
2. **Bookmarks** — Bookmarks to `/dashboard/...` or `/ops/...` are fine; the app redirects by role.
3. **Idle browser** — If you have been away a long time, you may need to sign in again when the session expires; follow the same steps as above.
4. **Naming** — In the product, **“Activations”** are your campaigns; **“Work areas”** are geofences; **“Regions”** are territories. Your training materials can align language to these terms.

---

## Who to contact when something breaks

- **Wrong role or cannot sign in** — Contact your **Engaged Sales administrator** or supervisor to confirm phone, unique code, and assigned role.
- **Missing activation or wrong region** — Supervisor/admin: check **Activations** roster and user **Region** assignment.
- **Promoter location errors** — Ensure GPS/location is on and the promoter is inside an active work area if your rules require it.

---

## Document version

This guide matches the **Engaged Sales** application structure (Field vs Operations, four roles, and main routes). If your deployment adds custom steps or disables features, your implementation partner should append a short **“Addendum for [your company]”** section with URLs and policy.
