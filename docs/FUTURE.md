# Future development

Use cases and requirements found while looking at how Illumination's roles would use the intake system, collected for planning. Nothing here is built. What is built is in [REQUIREMENTS.md](REQUIREMENTS.md); its section 4 (X-1 to X-8: HIPAA, audit log, login hardening, notifications, automatic fax intake, export, bulk upload, other form types) is still deferred and isn't repeated here.

**Where these came from:** Illumination job postings for the Medical Coordinator (LVN), Care Coordinator (Permanent Supportive Housing), Housing Case Manager and Sr. Director of Services and Care Transitions, compared against what the app captures.

**Priority key:** **P1** next, small, and it unblocks a role · **P2** valuable, needs a decision or more work · **P3** later, or outside the app's purpose.

## 1. Scope: where the app should stop

The app's job is the **handoff between roles**: referral → admitting nurse → Care Coordinator → Housing Case Manager. Each handoff is a page built from what the last role recorded (admission summary, housing summary, housing search packet).

Ongoing case management belongs in the systems Illumination already runs: **KIPU** (the EHR) and **HMIS** / **Coordinated Entry**. That covers daily nursing notes, the contact log, unit application tracking, and service plan progress. Building those here would duplicate those systems and split the record. Several items below are marked *outside the app* for that reason. The better path for them is export or integration (section 7).

Decision needed: **confirm this boundary with Illumination** before building any tracking features.

## 2. Admission (Medical Coordinator, LVN)

| ID | Priority | Item | Notes |
|---|---|---|---|
| F-ADM-1 | P1 | **Record the arrival:** arrival date and time, admitting nurse, arrival checklist ticked in the app, and an **Admitted** status after Approved. | The checklist is paper only today (REQUIREMENTS H-5). Admissions would then sort on real status rather than the planned admission date. |
| F-ADM-2 | P1 | **Discharge summary / discharge orders document type:** follow-up appointments (provider, specialty, date, phone), PCP, specialists, diet, activity, wound care and home health orders. | Fills the empty "Follow-up appointments and care team" section of the admission summary (H-4). Same pattern as the other documents in `lib/documents.ts`. |
| F-ADM-3 | P1 | **Emergency contact and code status** on the admission summary. | The face sheet already reads an emergency contact; the form has neither. Code status would need the H&P or discharge orders. |
| F-ADM-4 | P2 | **Insurance eligibility check recorded:** who verified, when, result. | The app captures the authorization but not that eligibility was checked. |
| F-ADM-5 | P2 | **Medication count at arrival** saved in the app: received quantity per medication, missing items, a 30-day-supply shortfall. | The Received column is paper today. Weigh against doing reconciliation in KIPU. |
| F-ADM-6 | P2 | **Authorization end and extension workflow:** warnings at 7 and 3 days, extension requested / approved / denied, and the new end date replacing the old one. | Admissions shows days left; nothing warns anyone, and the extension fields on the form aren't tied to the authorization dates. |
| F-ADM-7 | P2 | **Pre-filled admission compliance forms** from the referral. | Need copies of the forms handed out at admission. |
| F-ADM-8 | P2 | **Spanish-speaking staff flag** when the preferred language is Spanish. | Bilingual staff is a preferred qualification in all three postings. |
| F-ADM-9 | P3 | **Exit / discharge from recuperative care:** exit date, where they went, total length of stay. | Form fields exist (exit date, total LOS) but nothing uses them. Needed for program reporting. |
| F-ADM-10 | *Outside the app* | Daily checks (morning, afternoon, evening), incident reports, care plan progress, supplies and med room inventory. | KIPU. |

## 3. Housing (Care Coordinator and Housing Case Manager)

| ID | Priority | Item | Notes |
|---|---|---|---|
| F-HSG-1 | P2 | **HMIS-style questions on the online referral form:** prior living situation, how long homeless, veteran status, income. | Starts the assessment earlier. The paper RC0725-SH can't change, so these would be online only, like the 30-day-supply question. |
| F-HSG-2 | P2 | **Recuperative care discharge summary** for whoever takes the client after the stay: what was done, open health needs, where they're going. | The Care Coordinator's posting is about Permanent Supportive Housing, so the client may move from recuperative care to a different team. |
| F-HSG-3 | P2 | **Living skills goals tracked with milestones** (at least three per plan, per the Housing Case Manager posting). | The packet suggests goals with blank milestones. Tracking progress is likely KIPU's job (see section 1). |
| F-HSG-4 | P3 | **Weekly care-team meeting page:** per client, open goals, actions due, days left in the stay, contacts this month. | The Housing Case Manager attends weekly care-team meetings. |
| F-HSG-5 | *Outside the app, unless decided otherwise* | **Contact log** checked against the standard: weekly contact, 4 service days a month, 3 contact methods, monthly in person, notes within 24–48 hours. | The packet has a paper log. In-app tracking would be a contacts table with a monthly compliance check. |
| F-HSG-6 | *Outside the app, unless decided otherwise* | **Unit search tracking:** applications (property, date, fee, status), viewings, housing quality inspection result, move-in costs, W-9 and lease received, move-in date. | The packet has blank tables. |
| F-HSG-7 | *Outside the app, unless decided otherwise* | **Landlord and property directory** shared across clients. | |

## 4. Leadership and outcomes (Sr. Director of Services and Care Transitions)

The program dashboard covers referral flow, the two-hour promise, referral quality, denials, acuity, capacity and housing progress (REQUIREMENTS L-1 to L-4). What a care-transitions leader still can't see:

| ID | Priority | Item | Notes |
|---|---|---|---|
| F-LEAD-1 | P1 | **Arrivals and no-shows:** approved patients who never arrived, and how long from approval to arrival. | Needs F-ADM-1 (recording the arrival). Today capacity counts every approved patient from their planned admission date. |
| F-LEAD-2 | P1 | **Exit outcomes:** exit date, where the person went (permanent housing, interim housing, shelter, family, back to hospital, left early, died), actual vs authorized length of stay. | The core care-transitions outcome. Needs F-ADM-9. Use HMIS destination categories so the same answer serves both. |
| F-LEAD-3 | P1 | **Hospital returns:** ER visits and readmissions during the stay and within 30 days after exit. | What payers and hospital partners ask first. Could be recorded by the nurse during the stay; post-exit returns need payer or hospital data. |
| F-LEAD-4 | P2 | **ECM and CalAIM:** whether the client is enrolled in Enhanced Care Management, who their ECM care manager is, and Community Supports authorizations by type. | The role oversees ECM, and recuperative care is itself a CalAIM Community Support. |
| F-LEAD-5 | P2 | **Caseload and acuity per staff member:** clients per Care Coordinator and Housing Case Manager, weighted by acuity. | Needs a caseload owner (F-ROLE-2). The posting asks for "caseload efficiency" and "service prioritization". |
| F-LEAD-6 | P2 | **Acuity score** instead of separate flags, for staffing ratios and placement across the 13+ facilities. | Needs a clinical definition from the nursing lead. |
| F-LEAD-7 | P2 | **Facility / site** on each admission, so capacity and outcomes can be compared by site. | The app has no idea which facility a patient goes to. |
| F-LEAD-8 | P2 | **Reading quality over time:** fields coordinators corrected, low-confidence rate, cost per referral, by fax vs online. | The data is stored per referral (confidence, token use); not summarized yet. |
| F-LEAD-9 | P3 | **Scheduled reports** (weekly email or PDF to leadership and payers) and CSV download of the dashboard tables. | Overlaps with export (X-6). |
| F-LEAD-10 | P3 | **Targets set in the app** (e.g. 90% within two hours) instead of fixed in code, and alerts when a measure slips. | The dashboard's on-target thresholds are fixed at 90% and 75%. |
| F-LEAD-11 | P3 | **Dashboard denominators reviewed** with leadership: what counts as a referral (duplicates, re-sends), when the two-hour clock starts for faxes received after hours. | The clock starts at upload today, not at fax receipt. |

## 5. Access and roles

| ID | Priority | Item | Notes |
|---|---|---|---|
| F-ROLE-1 | P1 | **Restrict pages by role** (only the dashboard is restricted so far, to admins; it may need its own Leadership role): for example, Clinical sees Admissions and admission summaries; housing staff see assessments and packets; referral coordinators see the queue. | Deliberately left open so far. Decide on a role per job (Referral Coordinator, Clinical, Care Coordinator, Housing Case Manager, Admin) or a combined role. |
| F-ROLE-2 | P2 | **Separate Care Coordinator and Housing Case Manager roles** (both are "User" today), and assigning clients to a caseload owner. | Caseloads are 30–35+ per person in both postings. |
| F-ROLE-3 | P2 | **Who did what:** record the signed-in user on assessments and arrivals, not just a typed name. | Overlaps with the audit log (X-2). |

## 6. Clinical safety logic

The alerts are plain-code rules written for the demo. Before clinical use:

| ID | Priority | Item | Notes |
|---|---|---|---|
| F-SAFE-1 | P1 | **Drug data from a real source** (e.g. RxNorm) for allergy classes, cross-reactivity, controlled substances and storage. | Today these are short regex lists in `lib/handoff.ts`. Penicillin–cephalosporin cross-reactivity isn't covered, and any drug not on the lists is missed. |
| F-SAFE-2 | P1 | **Clinical review** of every alert and its wording by Illumination's nursing lead. | Includes which alerts are "high". |
| F-SAFE-3 | P2 | **Chronic homelessness, full HUD rules:** breaks of 7+ nights, institutional stays under 90 days, documentation standards. | `chronicStatus` in `lib/housing.ts` is simplified and only says "Yes / No / can't tell". |
| F-SAFE-4 | P2 | **Service plan rules reviewed by housing staff:** which needs are due before the move, and the goal and first-step wording. | Fixed rules in `lib/housing.ts`. |

## 7. Integration

| ID | Priority | Item | Notes |
|---|---|---|---|
| F-INT-1 | P2 | **KIPU export** of the admission: demographics, diagnoses, allergies, medications, vitals. | Without it, the nurse retypes what the app already read; it's the largest remaining gap for the LVN. Ask whether KIPU takes an import API, CCD or HL7; failing that, a printout or CSV. Extends X-6. |
| F-INT-2 | P2 | **HMIS export** of the assessment's universal data elements. | Find out which HMIS vendor Orange County uses and its import format. |
| F-INT-3 | P3 | **Coordinated Entry status** pulled in instead of typed. | Depends on the CES system's access. |

## 8. Engineering

| ID | Priority | Item | Notes |
|---|---|---|---|
| F-ENG-1 | P2 | **Time zone for "today":** fixed on Admissions and the dashboard (Pacific time). The admission summary, housing summary and packet still count "days left" with the server's clock (UTC on Vercel). | Use `localDate` from `lib/metrics.ts` there too. |
| F-ENG-2 | P1 | **Staging database / local development:** all mock data and migrations go to the one production project, and local development has no database keys. | A Supabase branch or second project, with `npm run mock` loaded there. |
| F-ENG-3 | P2 | **Re-run the cross-checks** when supporting documents change after approval, and show what changed since the decision on the admission summary. | |
| F-ENG-4 | P3 | **Print layout tested on paper:** page breaks, and black-and-white printing of the red/amber alerts. | Checked on screen only. |

## 9. Before real patient data

These are not features but must happen first. They're also tracked in REQUIREMENTS section 5 and X-1 to X-3.

- Remove the **5 mock patients** (`a1000000-…` ids), the **120 history referrals** (`b2000000-…` ids; deleting a referral removes its documents and assessments) and the **20 mock staff accounts**.
- HIPAA: BAAs and plan tiers for every service that touches patient data (X-1), the audit log (X-2) and login hardening (X-3).
- Test on real faxed handwriting.

## 10. Questions for Illumination

1. Is the boundary in section 1 right: handoff pages here, case management in KIPU and HMIS?
2. Does the LVN also review referrals at some sites, or is that always a separate coordinator?
3. Does KIPU have an import API, or accept CCD / HL7? Which HMIS does Orange County use?
4. Which compliance forms are given out at admission?
5. Who receives a client after recuperative care: the PSH Care Coordinator, a Housing Case Manager, or both? Do the two roles overlap?
6. Who should review the clinical alerts and the housing rules (section 6)?
7. Which measures does leadership report to CalOptima and hospital partners today, and how are they defined? The dashboard should match them.
