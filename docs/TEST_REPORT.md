# Verification report

Verified during 27–28 October 2026 (Asia/Calcutta client dates).

## Results

| Check | Verified result |
|---|---|
| `npm.cmd run check` | Syntax checks passed for all 26 application, script, and test JavaScript files |
| `npm.cmd test` | **83 passed, 0 failed, 0 skipped**, 24.223 seconds |
| Supplied acceptance subset | **50 passed**: Dheeraj 18, Harshit 12, Sri Charan 12, Sri Surya 8 |
| Additional automated server checks | **33 passed** |
| `npm.cmd run test:e2e` | **4 passed**, 11.8 seconds; headless Microsoft Edge |
| Production dependency audit | **0 known vulnerabilities**, `npm audit --omit=dev` after patched dependencies installed |
| 300-person group benchmark | Import + transactional approval + search: **248 ms**, excluding fixture setup |
| Local startup and setup | Persistent demo database created; repeated setup preserves existing records |
| Backup | SQLite online backup completed successfully |
| HTTP startup smoke check | Main page 200; health `ok`; Admin login/dashboard/logout succeeded against the persistent database; four sample records retained |

## Browser workflows verified

1. Student request → confirmation → Admin approval → Security identity check/entry → extension → exit → Admin reporting and CSV download. Checks the “No pending requests” UI and no unhandled browser errors during this flow.
2. Admin group upload → invalid-phone feedback → row correction → group approval; temporary-code creation → Security verification → entry.
3. Mobile 390 × 844 viewport: walk-in validation, registration, identity check/entry, responsive dashboard, navigation, and no horizontal page overflow.
4. Admin user creation → role assignment → new user sign-in → password change → return to sign-in.

The test report is available after running the suite at `playwright-report/index.html`. Captured desktop/mobile screenshots are copied to `docs/screenshots/` for the delivery.

## Additional server coverage

Password hashing; active account checks; session expiry; login throttling; role restrictions; requester data isolation; session revocation on user changes; admin self-protection; case-insensitive unique emails; identity confirmation; permitted time guards; duplicate and terminal gate operations; no-show transitions; overdue extensions; staff escalation; deduplicated notifications; failed-delivery retries; honest local-delivery status; cancellation after exit; Excel imports; row correction and atomic approval; duplicate rows; corrupt/oversized expanded workbooks; repeat-use and concurrent code visits; code ownership/revocation/validity limits; literal parameterized search; CSV formula neutralization; persistence after close/reopen; HTTP authentication/CSRF/origin enforcement; complete HTTP lifecycle; concurrent entry requests; upload permissions; calendar validation; relationship/ID-reference persistence; and a local SMTP socket integration.

## Evidence boundaries

- The original files contain manual test specifications. The 50 automated acceptance tests implement their stated inputs and outcomes; there was no pre-existing executable test suite to run unchanged.
- R18 behavior is verified with deterministic clocks, delivery adapters, and an actual SMTP conversation with a local receiver. No external campus email account was configured or contacted. Default application mode is the clearly labeled local outbox.
- Browser tests ran in Edge on this Windows machine. Firefox/Safari, assistive-technology certification, and real mobile hardware have not been claimed as tested.
- The performance result measures a 300-row local import. It does not establish throughput for a large campus, many independent processes, or a production network.
- Dependency audit results are time-specific and do not prove absence of every vulnerability. The locked production dependency tree was clean at the recorded check.
- Exactly-once external SMTP delivery across a crash cannot be guaranteed. Normal periodic checks do not duplicate events; see the design’s documented outbox semantics.

## Reproduce

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd test
npm.cmd run test:e2e
```

Tests use isolated databases and synthetic data. The browser test server starts and stops within Playwright’s global setup/teardown, avoiding orphaned Windows shell-server processes.
