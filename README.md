# LOBBY — Campus visitor management

A complete local web application built from the 18 supplied planning, SRS, prioritization, design, and test-case files. It includes a browser interface, authenticated API, persistent SQLite database, notification worker, automated tests, and contributor-aligned implementation folders.

## Start on Windows

Node.js 24 or newer is required. This workspace has been installed and tested with Node 25.2.0. Use `npm.cmd` in PowerShell if execution policy blocks `npm.ps1`.

Double-click **[Start-Lobby.cmd](Start-Lobby.cmd)**, or run:

```powershell
cd C:\Users\DHEERAJ\OneDrive\Desktop\SE
npm.cmd ci
npm.cmd run setup
npm.cmd start
```

Open **http://127.0.0.1:3000**. Keep the terminal running; press Ctrl+C to stop. There is no separate frontend build or database server to install. `npm run setup` is idempotent: existing accounts and data are preserved.

The setup creates four demonstration accounts and four synthetic visitor records:

| Role | Email | Initial password |
|---|---|---|
| Administrator | `admin@lobby.local` | `Lobby@2026!` |
| Security | `security@lobby.local` | `Lobby@2026!` |
| Faculty | `faculty@lobby.local` | `Lobby@2026!` |
| Student | `student@lobby.local` | `Lobby@2026!` |

Change demonstration passwords using **My account** before entering real campus data. Admin can create new accounts, change roles, reset passwords, and disable users. Disabled users retain their historical records.

## What is implemented

- Role-specific dashboards and server-enforced permissions for students, faculty, Admin, and Security.
- Visitor requests with host selection, relationship, ID reference, purpose, date/time, confirmation, approval/rejection, remarks, and notifications.
- Gate identity verification, approved visitor entry, walk-in registration, exit, visiting-time extensions, overdue flags, and no-show states.
- CSV and Excel group imports with a downloadable template, row-level validation, editable review, and atomic approval.
- Unique temporary codes created by Admin or students/faculty; validity checks, revocation, and multiple separately recorded visits.
- Fifteen-minute visitor email reminders, expiry notifications, Security/Admin alerts, and one-hour Admin escalation.
- Search by name, phone, host, date/time range, and status; scoped visitor history and record details.
- Reports, source breakdowns, CSV export, and browser printing.
- User management, password changes, notification read status, audit logs, and delivery status/retry controls.
- Persistent records, versioned schema upgrades, transactional state changes, backup command, and startup recovery for interrupted mail deliveries.

The supplied documents explicitly exclude biometrics, facial recognition, RFID, automatic barriers, and multi-campus operation. These are not simulated or presented as available.

## How to demonstrate the complete workflow

1. Sign in as Student or Faculty. Select **New visitor request**, enter details and a current visiting window, then confirm submission.
2. Sign in as Admin. Open **Visitor requests**, review the visitor, and approve or reject with optional remarks.
3. Sign in as Security. Open **Gate operations**, find the approved visitor, verify their identity, and record entry. Later extend the time or record exit.
4. Open **Visitor history** to see the record and timestamps. Admin can inspect **Reports & analytics** and export the complete matching dataset.
5. For a group, use **Group imports → Import visitors**. Correct row errors, save, and approve. Each group member appears at the gate.
6. For a repeat visitor, create a **Temporary code** as Faculty, Student, or Admin. Security verifies it and assigns the end time for each individual visit.

Use a visiting end time within the next 15 minutes to demonstrate a reminder. Keep the server running; the worker runs on startup and every 30 seconds. Outbox messages and in-app alerts persist across restarts.

## Email configuration

`.env` is created from `.env.example` during setup. The default is `MAIL_MODE=outbox`: messages are recorded in Admin’s **Email outbox**, marked `local`, and are **not delivered externally**.

To use your institution’s mail server, set `MAIL_MODE=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `MAIL_FROM`, then restart. Port 465 normally uses `SMTP_SECURE=true`; 587 normally uses `false` with STARTTLS negotiation. Use the settings your mail administrator supplies. The app retries failed queued sends up to five attempts; Admin can retry failed items. Existing `local` messages are not automatically resent when switching modes.

SMTP transport is verified by an automated test against a local SMTP receiver. Delivery through an actual campus provider needs that provider’s credentials and has not been claimed as verified. SMS is not implemented; the requirement allows email **or** a message.

## Run checks

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run test:e2e
```

- **83 server tests passed**, including all **50 supplied acceptance cases** and 33 security, persistence, concurrency, import, and integration checks.
- **4 browser workflows passed** in headless Microsoft Edge, including mobile layout and complete role-to-role workflows.
- Production dependency audit: **0 known vulnerabilities** at the recorded check.
- A 300-visitor CSV import, approval, and search completed in **248 ms** in the recorded local service test. This is a small-campus baseline, not a production capacity certification.

Browser tests use an isolated in-memory database on port 3100 and do not change your application data. They use installed Edge by default. Set `$env:PLAYWRIGHT_CHANNEL='chrome'` to use installed Chrome. Test artifacts appear in `test-results/` and `playwright-report/`.

See [test evidence](docs/TEST_REPORT.md) and the [requirement/test map](docs/REQUIREMENTS.md). The source documents contain written cases, not executable tests; their assertions have been implemented in the named acceptance tests.

## Folder map and contributor assignments

```text
SE/
├── public/                       Browser UI, styling, shared UI helpers
├── server/
│   ├── app.js                    HTTP routes, authentication boundary, request handling
│   ├── index.js                  Server lifecycle and notification worker
│   ├── shared/                   Database, migrations, authentication, validation
│   └── modules/
│       ├── Dheeraj_Bommakanti_240439/  Gate registration, entry, exit, extension
│       ├── Harshit_Yadav_240471/       Group import and temporary codes
│       ├── Sri_Charan_240660/         Requests, approvals, alerts
│       └── Sri_Surya_240495/          Search, history, reports
├── tests/
│   ├── [same four contributor folders]/  Original acceptance-case mappings
│   ├── shared/                   Security, API, persistence, SMTP, load checks
│   └── browser/                  End-to-end desktop/mobile workflows
├── scripts/                      Setup, backup, syntax checks, test server
├── docs/
│   ├── sources/                  Unmodified copies of all 18 supplied files
│   ├── extracted/                Extracted text and embedded design images
│   └── source-manifest.json      Source filenames, sizes, SHA-256 hashes
├── tools/                        Reproducible PDF extraction tooling
├── data/                         Local SQLite database (ignored)
├── backups/                      Database backups (ignored)
└── Start-Lobby.cmd                Windows launcher
```

These folders represent the **module assignments inferred from each person’s test document**, not a claim that those people authored the generated code. Shared infrastructure and the integrated UI remain shared to avoid duplicate implementations. See [CONTRIBUTORS.md](docs/CONTRIBUTORS.md).

## Data, backup, and configuration

The database defaults to `data/lobby.sqlite`. `DATABASE_PATH` can select another location. WAL mode and foreign keys are enabled. Times are stored as UTC instants; displays use `CAMPUS_TIMEZONE=Asia/Kolkata`. Datetime form controls use the browser’s device timezone, which is stated beside the form. Reports filter by the planned visit start.

```powershell
npm.cmd run backup
```

The backup uses SQLite’s online backup API and includes consistent committed data even while the app is running. To restore, stop the app, preserve the current `data` directory, and copy a chosen backup to the configured database path in a fresh data directory. Do not mix a restored database with old `-wal` or `-shm` files.

The default server binds to this computer only. For campus deployment, configure the host/network and an HTTPS reverse proxy, then set `SECURE_COOKIES=true`. Run a single server process for the local SQLite/worker design. SQLite stores personal data on disk; use campus-managed OS access controls, encrypted storage, backups, and an agreed retention policy for real operation.

Further documentation: [system design](docs/SYSTEM_DESIGN.md), [API reference](docs/API.md), [source decisions](docs/REQUIREMENTS.md#source-decisions).
