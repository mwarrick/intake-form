# Requirements: Recuperative Care Referral Intake

Prototype for Illumination Health + Home's Recuperative Care referrals (form RC0725-SH). Hackathon project, fake patient data only.

**Status key:** ✅ built and deployed · 🔄 built, in an open pull request · 📋 planned for the prototype · ⏸ deferred past the prototype

## 1. Goal

Referrals arrive mostly as faxed, hand-filled paper forms with supporting medical records, and Illumination promises a decision within two hours. The app should:

1. **Read faxed and scanned referrals** (the priority) so coordinators check answers instead of retyping them.
2. **Take referrals online** through a portal for hospital staff.
3. **Check every referral** against the admission criteria and its supporting documents, so problems surface before a decision.

## 2. Users

| User | Needs |
|---|---|
| **Referrer:** hospital social worker, case manager or nurse | Submit a referral quickly, online or by fax, with supporting documents |
| **Referral coordinator:** Illumination staff | One queue of all referrals; correct what was read against the scan; see eligibility problems; record the decision within two hours |

## 3. Requirements

### 3.1 Referral form definition

| ID | Requirement | Status |
|---|---|---|
| F-1 | One field list (`schema/referral-form.json`) defines every field on page 2 of RC0725-SH: type, options, required and conditional rules ("required when", "shown when"), sections holding patient data, and staff-only fields. The reader, the online form, the review screen and validation all use it. | ✅ |
| F-2 | Admission criteria from page 1 are encoded on the fields they relate to (e.g. Ambulatory must be Yes; Cognitive Impairment and Registered Sex Offender are exclusions). | ✅ |
| F-3 | The 30-day supply of medications is a Yes/No question on the online form (it must be Yes), not a document upload. It isn't on the paper form, so the scan reader skips it. | ✅ |

### 3.2 Reading faxed and scanned referrals

| ID | Requirement | Status |
|---|---|---|
| R-1 | Coordinators upload a fax or scan (PDF of any length, JPEG or PNG). The browser renders pages to images and uploads them straight to storage, avoiding Vercel's 4.5 MB request limit. Fax-compressed images (CCITT, JBIG2) are decoded with pdf.js's WebAssembly decoders, shipped in `public/pdfjs-wasm/`. | ✅ |
| R-2 | Reading runs in steps, each with its own model set by an environment variable: (1) label every page of the packet, (2) read every form field with what was written and a confidence score, (3) give an independent second reading by a stronger model to low-confidence fields, answers that were crossed out or changed, and, always, patient name, MRN and date of birth. | ✅ |
| R-3 | The step 1 classifier also labels supporting-document pages in the packet (H&P, medication list, culture…) so they can be read. | ✅ |
| R-4 | When the two readings agree, confidence goes up. When they disagree, the field is flagged and shows both readings. | ✅ |
| R-5 | Dates are normalized to ISO, and any date that could be read month/day or day/month is flagged. The form itself prints "dd/mm/yyy" while US hospitals write mm/dd. | ✅ |
| R-6 | Coordinators get a readable error if reading fails, with **Try again** and **Delete and upload again**. | ✅ |
| R-7 | A crossed-out, scribbled-over or struck-through mark is treated as cancelled even if it was also circled; the reader reports any field with a crossed-out or changed answer, it gets the second reading, and the review screen always highlights it. | ✅ |
| R-8 | While a scan is read, a modal on the upload page shows each step live (preparing pages, uploading, finding the form page, reading fields, double-checking N fields) with a timer, then opens the review screen once the form is read. Supporting documents keep loading there. A referral still being read shows the same steps on its review screen. | ✅ |
| R-9 | A single uploaded file can hold the form and its supporting documents (a whole fax packet): pages are labelled one by one, consecutive pages of the same document are grouped, and each document is read and cross-checked. One patient per upload. | ✅ |

### 3.3 Online referral portal

| ID | Requirement | Status |
|---|---|---|
| P-1 | The same form on the web. Follow-up questions appear only when triggered (e.g. wound details when Wounds = Yes). Required fields and formats are checked before submitting. | ✅ |
| P-2 | Answers that don't meet the admission criteria show a notice, but submission is still allowed, since the coordinator decides. | ✅ |
| P-3 | Supporting documents attach to their checklist items. | ✅ |
| P-4 | A referrer who already filled out the paper form can upload a scan to pre-fill the online form. Answers that were hard to read, disputed or ambiguous are highlighted. Nothing the referrer already typed is overwritten. They must confirm they checked the answers before submitting. | ✅ |
| P-5 | Until it's submitted, a pre-fill upload is a draft and stays out of the coordinator queue. A failed read still lets the referrer type the form in, with the scan attached. | ✅ |
| P-6 | Confirmation page with a reference number. | ✅ |
| P-7 | The online form works at phone width. | ✅ |

### 3.4 Supporting documents

| ID | Requirement | Status |
|---|---|---|
| D-1 | Each checklist document has its own field list (`lib/documents.ts`): face sheet, CalOptima authorization, H&P, progress notes, vitals, medication list, PT/OT/nursing notes, culture. | ✅ |
| D-2 | Documents are read whether attached online or found in a faxed packet. PDFs go to the model as files; images as images. | ✅ |
| D-3 | Documents are checked against the form and the admission criteria in plain code (`lib/crosscheck.ts`), with no model involved:<br>• same patient (name, DOB including day/month swaps, MRN)<br>• active infection not cleared (e.g. MRSA on a culture while the form says none)<br>• cognitive impairment and not alert and oriented x4<br>• not medically stable<br>• walking distance under 100 ft, can't transfer independently, not independent with ADLs<br>• assistive device, oxygen or insulin contradicting the form<br>• IV medications<br>• vitals older than 24 hours, judged by the newest set when updated vitals arrive later<br>• authorization not approved, missing number, fewer days than requested, or expired<br>• required checklist documents missing; "if needed" items (progress notes, culture) listed as not received, and a culture counts as missing when the form reports an active infection or wound | ✅ |
| D-4 | A conflict appears on the review screen under the form field it contradicts, and in a Documents panel that shows what was read from each document. The queue shows a conflict count. | ✅ |
| D-5 | Staff add supporting documents that arrive separately to an existing referral (**Add documents** in the Documents panel), one or several files at a time. Each file is identified automatically by the cheapest model unless a checklist item is chosen, then read and cross-checked; the panel updates as each finishes. | ✅ |
| D-6 | **Remove** on a supporting document deletes what was read from it, and the uploaded file if it was added separately (fax pages stay with the scan). Checks re-run afterwards. | ✅ |

### 3.5 Coordinator queue and review

| ID | Requirement | Status |
|---|---|---|
| Q-1 | One queue for fax and online referrals, newest first, with status, flag counts, and an "over 2 h" warning on undecided referrals. | ✅ |
| Q-2 | The review screen shows the scan (page tabs, zoom in and out from 50% to 400%, link to the original) beside the fields. Clicking any field on a referral with a scan (faxed, or online pre-filled from the paper form) jumps to the form page, zooms in and outlines where that field is on the form (positions from `schema/field-regions.json`). Each field shows its confidence, what was written, and its flags. A filter shows only the fields that need checking. | ✅ |
| Q-3 | Coordinators save corrections and confirm the fields. Confirming clears the confidence warnings. After confirming there's a single **Save changes** button, and saving keeps the referral confirmed. | ✅ |
| Q-4 | For a pre-filled online referral, the coordinator sees the scan and which fields the referrer corrected. | ✅ |
| Q-5 | The Illumination Staff Only section records the decision (approved/denied, auth #, denial reason, admission and extension details) and sets the status. | ✅ |
| Q-6 | **Delete referral** on the review screen deletes a referral and every file uploaded for it (e.g. the wrong file or an unreadable scan) so it can be uploaded again. Approved or denied referrals can only be deleted by an admin. | ✅ |

### 3.6 Staff accounts and sign-in

| ID | Requirement | Status |
|---|---|---|
| A-1 | Staff accounts live in the `ILLINTAKE_users` table, not Supabase Auth. Fields: first name, last name, email (unique, case-insensitive), role (user or admin), active/inactive. | ✅ |
| A-2 | Passwords are stored only as salted scrypt hashes, which are one-way: they can't be decrypted even with database access. Minimum 8 characters. | ✅ |
| A-3 | Signing in creates a 12-hour session: a random token in an HTTP-only cookie, with only its SHA-256 hash stored (`ILLINTAKE_sessions`). Every request re-checks that the user is still active. | ✅ |
| A-4 | Sign-in is required for the referral queue, review screens, fax upload, My account and user admin, and for their server actions and APIs. The online referral form stays public for hospital referrers; its pre-fill and submit steps only touch the referrer's own draft. | ✅ |
| A-5 | Admins add users, edit name, email, role and active status, and reset or clear passwords. Deactivating a user or changing their password signs them out everywhere. Admins can't demote or deactivate themselves. Admins import many users from a CSV or pasted rows (`firstname, lastname, email`, role optional) with a preview first; a blank email becomes firstname+lastname@illuminationhealthhome.org, and existing emails are skipped. Imported or cleared accounts have no password: the person signs in with just their email and chooses one (honor system until email verification exists). Anyone without a password of their own, or on an admin-set temporary one, must choose their own at the next sign-in before using the app. | ✅ |
| A-6 | Users change their own password on My account. For a forgotten password an admin clears it (back to email-only first sign-in) or sets a temporary one. | ✅ |
| A-7 | When no users exist, the login page offers to create the first admin account. | ✅ |
| A-8 | The staff decision's "Reviewed by" defaults to the signed-in user. Expired sessions are removed by the daily cleanup. | ✅ |

### 3.7 Storage and data

| ID | Requirement | Status |
|---|---|---|
| S-1 | Supabase (project supabase-cobalt-saddle). Every table is prefixed `ILLINTAKE_`: `referrals`, `documents`, `supporting_docs`, `users` and `sessions`. Migrations live in `supabase/migrations/` (0001–0005, all applied). | ✅ |
| S-2 | Files are stored in the private bucket `illintake-files`, one folder per referral. The app opens them with signed links that expire after an hour. | ✅ |
| S-3 | Uploads not attached to an intake record (unsubmitted pre-fill drafts, orphaned folders) are deleted daily once they're a day old. Fax scans and submitted referrals are never deleted. | ✅ |
| S-4 | Only server code reads or writes data, using the service-role key. Row-level security blocks the public key. | ✅ |

### 3.8 AI models and cost

| ID | Requirement | Status |
|---|---|---|
| M-1 | OpenAI, with the model for each step set by an environment variable: `OPENAI_MODEL_CLASSIFY`, `OPENAI_MODEL_EXTRACT`, `OPENAI_MODEL_REREAD`, `OPENAI_MODEL_DOCS`. Defaults are cheap models for sorting pages and reading, and a stronger one only for re-reading uncertain fields and, always, patient name, MRN and date of birth. Answers crossed out or changed on the paper are re-read and always highlighted. | ✅ |
| M-2 | Token use and time are recorded for every read and shown on the review screen. | ✅ |
| M-3 | Eligibility rules and checks are plain code, not a model, so they behave the same way every time. | ✅ |

### 3.9 Testing

| ID | Requirement | Status |
|---|---|---|
| T-1 | Fake hand-filled faxed forms with answer keys (`scripts/make_samples.py`): a clean single page, messy writing with a crossed-out answer and an ambiguous DOB, and a three-page ineligible packet. | ✅ |
| T-2 | Fake supporting documents for the same patients, with answer keys and the flags they should raise (`scripts/make_documents.py`). Typed printouts of all eight types, plus handwritten versions of the ones that often arrive filled in by hand: bedside vitals flowsheet, nursing mobility assessment, CalOptima authorization request, and a medication list with handwritten dose corrections and additions. | ✅ |
| T-3 | Unit tests: validation (including crossed-out answers), conditional fields, strict-mode validity of the AI schemas, cleanup safety, the document checks against the answer keys (including "if needed" items and newest vitals), field positions on the form, passwords, and the staff list import. | ✅ |
| T-4 | `npm run eval` scores the real models against the answer keys, including wrong answers the model was confident about, and saves the misses to `samples/eval-*.json`. It reads `OPENAI_API_KEY` from `.env.local` and needs `pdftoppm` (poppler). Latest run: form page found in all 3 samples, 146/147 fields correct, none confidently wrong (the one miss, sample 1's MRN, is highlighted for review); every expected document flag raised. | ✅ |
| T-5 | Sample 2 as a single 10-page faxed packet (`samples/synthetic/packets/sample-2-messy-packet.pdf`) and as separate files, the form alone plus one file per document (`samples/synthetic/packets/sample-2-messy-separate/`), for trying the whole flow and **Add documents**. | ✅ |

## 4. Deferred past the prototype

| ID | Item |
|---|---|
| X-1 | ⏸ **HIPAA compliance:** BAAs with every service that touches patient data, the plan tiers they require, and OpenAI zero data retention. |
| X-2 | ⏸ **Audit log** of who viewed or changed each referral. |
| X-3 | ⏸ **Login hardening:** email verification before an account without a password can be claimed (first sign-in is on the honor system today), rate limiting failed sign-ins, password reset by email, multi-factor sign-in. |
| X-7 | ⏸ **Bulk referral upload:** drop many PDFs at once, each becoming its own referral (e.g. a backlog of past faxes). |
| X-8 | ⏸ **Other form types** besides RC0725-SH; each would need its own field list and field positions. |
| X-4 | ⏸ **Email notifications** to referrers on receipt and on decision. Coordinators contact referrers themselves for now. |
| X-5 | ⏸ **Automatic fax/email intake** from RECUP@ or a fax-to-email service, instead of manual upload. |
| X-6 | ⏸ **Export** of approved referrals (CSV, EHR, CalOptima paperwork). |

## 5. Open items

- **Live use so far:** sample referrals have been uploaded to the live app and read. Real handwriting from actual faxes is still untested.
- **Known reading weak spot:** handwriting that runs into printed text (e.g. a digit touching a label) can be misread with high confidence; patient identity fields are always re-read and highlighted when the two readings disagree, but other fields aren't.
- **Test accounts:** 20 mock staff accounts (from `MOCK_DATA.csv`) exist in production with no password, so anyone who enters one of those emails can sign in. Remove or deactivate them before real referrals arrive.
- **Real staff list:** import current staff from Illumination's HR or email admin rather than LinkedIn, and confirm the firstname+lastname email format matches their real addresses.
- **Fillable PDF bug** to report to the form's owner: all 52 Yes/No boxes on page 2 are one field (`Check Box1`), so ticking one ticks all of them in a PDF reader.
