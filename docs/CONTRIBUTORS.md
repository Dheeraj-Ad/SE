# Contributor module map

The requested folder names combine each supplied name and roll number. Assignments are based on the test documents, not on invented commit authorship. All implementation in this delivery was generated for the project; review and credit it according to your course’s rules.

| Contributor folder | Document evidence | Implementation | Test file |
|---|---|---|---|
| `Dheeraj_Bommakanti_240439` | `Visitor_Management_Test_Cases.docx`, headed Dheeraj Bommakanti – 240439 | `gate.js`: R4, R5, R14 | `acceptance.test.js`: TC01–TC18 |
| `Harshit_Yadav_240471` | `TestCases_Harshit Yadav_240471.docx` | `imports.js`, `codes.js`: R11–R13 | `acceptance.test.js`: R11/R12/R13-TC01–04 |
| `Sri_Charan_240660` | `TestCases_Sri_Charan_240660.pdf` | `requests.js`, `notifications.js`: R2, R3, R18, related R15 monitoring | `acceptance.test.js`: R2/R3/R18-TC01–04 |
| `Sri_Surya_240495` | `TestCases_Sri_Surya_240495.pdf` | `records.js`: R7, R17, related history/dashboard read models | `acceptance.test.js`: R7/R17-TC01–04 |

Implementation folders are under `server/modules/`; matching acceptance folders are under `tests/`.

`server/shared/`, `public/`, `server/app.js`, startup scripts, integration tests, and design documentation are shared project work. R1, R6, R8–R10, R16, and cross-module invariants have shared coverage. The UI calls the same server services through HTTP; there are no disconnected per-person applications or copied databases.
