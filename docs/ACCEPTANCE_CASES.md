# Supplied acceptance test map

Generated from the executable acceptance-test titles. All 50 cases passed in the recorded verification; see [TEST_REPORT.md](TEST_REPORT.md).

## Dheeraj_Bommakanti_240439

Source: [Visitor_Management_Test_Cases.docx](sources/Visitor_Management_Test_Cases.docx). Executable file: [acceptance.test.js](../tests/Dheeraj_Bommakanti_240439/acceptance.test.js).

| Test ID | Verified behavior |
|---|---|
| Dheeraj-TC01 | entry of approved visitor records time and Inside Campus |
| Dheeraj-TC02 | pending or rejected visitor cannot enter |
| Dheeraj-TC03 | exit records timestamp and Exited status |
| Dheeraj-TC04 | exit without entry is rejected |
| Dheeraj-TC05 | duplicate entry is prevented |
| Dheeraj-TC06 | late exit is recorded and overstay flagged |
| Dheeraj-TC07 | valid direct visitor registration succeeds |
| Dheeraj-TC08 | direct registration requires mandatory details |
| Dheeraj-TC09 | direct registration rejects invalid phone |
| Dheeraj-TC10 | valid permitted visiting time is assigned |
| Dheeraj-TC11 | end before start is rejected |
| Dheeraj-TC12 | past permitted date is rejected |
| Dheeraj-TC13 | visiting time can be extended |
| Dheeraj-TC14 | extension cannot reduce permitted time |
| Dheeraj-TC15 | extending unknown visitor is rejected |
| Dheeraj-TC16 | exited visitor cannot be extended |
| Dheeraj-TC17 | repeated extensions retain the latest end |
| Dheeraj-TC18 | empty extension input is rejected |

## Harshit_Yadav_240471

Source: [TestCases_Harshit Yadav_240471.docx](sources/TestCases_Harshit%20Yadav_240471.docx). Executable file: [acceptance.test.js](../tests/Harshit_Yadav_240471/acceptance.test.js).

| Test ID | Verified behavior |
|---|---|
| R11-TC01 | valid CSV is imported for admin review |
| R11-TC02 | unsupported import formats are rejected |
| R11-TC03 | missing phone column rejects entire import |
| R11-TC04 | approval exposes complete group to Security |
| R12-TC01 | valid temporary code is generated and stored |
| R12-TC02 | code end before start is rejected |
| R12-TC03 | empty faculty or mandatory details are rejected |
| R12-TC04 | generated codes are unique |
| R13-TC01 | active code shows visitor details and permits entry workflow |
| R13-TC02 | expired code is rejected |
| R13-TC03 | nonexistent code is rejected |
| R13-TC04 | empty code is rejected |

## Sri_Charan_240660

Source: [TestCases_Sri_Charan_240660.pdf](sources/TestCases_Sri_Charan_240660.pdf). Executable file: [acceptance.test.js](../tests/Sri_Charan_240660/acceptance.test.js).

| Test ID | Verified behavior |
|---|---|
| R2-TC01 | valid visitor request is Pending |
| R2-TC02 | empty mandatory fields are rejected |
| R2-TC03 | past date is rejected |
| R2-TC04 | invalid phone is rejected |
| R3-TC01 | admin sees all pending requests |
| R3-TC02 | approval makes request visible to Security |
| R3-TC03 | rejected request is not visible to Security |
| R3-TC04 | no pending requests returns empty result for empty-state UI |
| R18-TC01 | alert before expiry is delivered through the mail adapter |
| R18-TC02 | expired visitor receives expiry alert |
| R18-TC03 | no alerts are sent after visitor exit |
| R18-TC04 | repeated checks do not duplicate a reminder |

## Sri_Surya_240495

Source: [TestCases_Sri_Surya_240495.pdf](sources/TestCases_Sri_Surya_240495.pdf). Executable file: [acceptance.test.js](../tests/Sri_Surya_240495/acceptance.test.js).

| Test ID | Verified behavior |
|---|---|
| R7-TC01 | search by visitor name returns match |
| R7-TC02 | search by phone returns match |
| R7-TC03 | search date and time range returns only matching visits |
| R7-TC04 | unmatched search returns no records |
| R17-TC01 | available data yields correct report counts |
| R17-TC02 | period with no data has zero counts |
| R17-TC03 | inverted report date range is rejected |
| R17-TC04 | report totals equal stored records |
