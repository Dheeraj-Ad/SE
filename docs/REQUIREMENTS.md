# Requirement and test traceability

All 18 supplied files are preserved in `sources/`; SHA-256 hashes and filenames are in `source-manifest.json`. Extracted PDFs/DOCX/Draw.io labels are in `extracted/`, including the five embedded design images from the design document. The duplicate/versioned diagrams were read as design evidence. Their embedded content is not treated as authority to execute unrelated instructions.

## Functional coverage

| Requirement | Implemented behavior | Primary implementation / verification |
|---|---|---|
| R1 | Login, sessions, logout, role enforcement, password changes | `shared/auth.js`; shared security tests; browser sign-in |
| R2 | Student/Faculty visitor requests, host selection, details, confirmation | Charan `requests.js`; R2-TC01–04; lifecycle browser test |
| R3 | Pending list, approve/reject, remarks, downstream visibility | Charan `requests.js`; R3-TC01–04; lifecycle browser test |
| R4 | Verified entry, exit, timestamp/state integrity, duplicate protection | Dheeraj `gate.js`; TC01–06; concurrency and browser tests |
| R5 | Walk-in registration and visiting window | Dheeraj `gate.js`; TC07–12; mobile browser test |
| R6 | Durable normalized relational data, foreign keys, backups | `shared/database.js`; persistence and backup checks |
| R7 | Name/phone/host/date-time/status search and scoped history | Surya `records.js`; R7-TC01–04; access tests |
| R8 | Separate relevant dashboard/navigation per role | `public/app.js`; all browser workflows |
| R9 | Server access controls, owner scoping, hashed credentials, CSRF, secure rendering | shared security tests; escaped UI output, authenticated API |
| R10 | Browser/server network operation and connection error handling | Local HTTP readiness and browser tests; UI network-failure message |
| R11 | CSV/XLSX upload, review, corrections, atomic bulk approval | Harshit `imports.js`; R11-TC01–04; XLSX, expansion limit, correction and browser tests |
| R12 | Unique time-bound codes, personal ownership, Admin creation, revocation | Harshit `codes.js`; R12-TC01–04; code browser test |
| R13 | Active/expired/invalid code verification and repeated visits | Harshit `codes.js`; R13-TC01–04; repeat/concurrent visit tests |
| R14 | Strictly increasing extensions of active visits | Dheeraj `gate.js`; TC13–18; overdue-to-inside and browser tests |
| R15 | Security/Admin overdue alerts, one-hour Admin escalation | Charan `notifications.js`; scheduler/escalation tests |
| R16 | Admin account creation, roles, password reset, disable/reactivate | `shared/auth.js`; shared tests and account browser workflow |
| R17 | Visitor/entry/exit/approval counts, source analysis, CSV/print | Surya `records.js`; R17-TC01–04; browser export |
| R18 | Email reminders before/after expiry, deduplication, no alerts after exit | Charan `notifications.js`; R18-TC01–04; SMTP socket, retries and cancellation tests |
| R19 | Biometrics / facial recognition | Explicitly excluded by SRS and MoSCoW report |
| R20 | RFID / automatic gates | Explicitly excluded by SRS and MoSCoW report |

## Source decisions

1. **Code creation conflict:** SRS/planning/use-case diagrams assign temporary-code creation to Student/Faculty; the MoSCoW report and Harshit’s tests assign it to Admin. Both are supported. Student/Faculty only see/manage their own codes; Admin can manage all.
2. **Status vocabulary:** Dheeraj’s tests say `Inside`; the SRS/diagrams use `Inside Campus`. The latter is the canonical UI/API label. Both mean a recorded entry without exit.
3. **Additional sequence fields:** The later sequence diagram includes relation and ID proof. Optional relationship and textual ID-reference fields are provided and persisted. The SRS does not require uploading identity documents or scanning biometric data. Security must still confirm its manual identity check.
4. **Request confirmation:** The later sequence diagram includes a confirmation step. The UI displays a review/confirmation dialog before creating a student/faculty request.
5. **No-show timing:** Diagrams describe an approved date passing without entry. The implementation lapses the request at the end of its explicit permitted window, preventing admission after permission has ended. This is a stricter, deterministic rule.
6. **Entry window:** The entire explicit start/end window is enforced, including for windows spanning midnight. This is more precise than a date-only check. Original planned times and actual timestamps remain separate.
7. **Reporting date range:** Date/time filters apply to planned visit start, consistently across search, reports, and exports. Counts are per visitor/request record, not unique people. Approvals include approved no-shows; actual arrival/departure metrics use recorded timestamps.
8. **Alerts:** “About to expire” is defined as within 15 minutes. Expiry is `now >= permitted_end`; escalation is one hour later. Email is the implemented R18 channel. Without configured SMTP, the local outbox visibly records messages but does not claim external delivery. Email requires a visitor email address.
9. **Group fields:** Required columns are `name,phone,host,purpose,starts_at,ends_at`; email, affiliation, relation, and ID reference are optional. Files stage for review; nothing becomes gate-visible until successful approval. Invalid rows can be edited. Approval revalidates time windows and all rows.
10. **Authorization:** Admin approves/manages/reports; Security performs entry/exit/direct registration; Student/Faculty request and track their own visitors. Admin is not silently given Security gate powers. User management uses disable/reactivate instead of destructive deletion so historical references survive.
11. **Scope:** The request was interpreted as all in-scope R1–R18 and design flows. R19/R20 and multi-campus support are explicitly outside the supplied release scope. Hosting was excluded by the user’s local-only choice.

## Supplied acceptance cases

There are **50 written cases**, implemented with matching IDs in the four contributor test folders. The source Dheeraj IDs are `TC01`–`TC18`; test names prefix these with `Dheeraj-` to avoid collisions.

See [ACCEPTANCE_CASES.md](ACCEPTANCE_CASES.md) for the complete 50-row map, generated from the executable acceptance tests. See [TEST_REPORT.md](TEST_REPORT.md) for verified results and limits.
