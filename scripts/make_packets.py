#!/usr/bin/env python3
"""Generate more faxed referral packets, each with the RC0725-SH form filled out by hand.

Seven fictional patients, in three kinds of packet:
  - form only: the recuperative care form and nothing else
  - complete: the form plus every checklist document (authorization, H&P, progress note, vitals,
    medication list, PT/OT or nursing notes, culture) and a hospital face sheet
  - partial: the form plus some documents, with 4 to 6 of the 7 checklist documents missing
The checklist's "Client's Demographic Page" is the form itself, so it is never missing.

The handwriting is neat, but every form has deliberate mistakes (blank required fields, impossible
dates, answers that contradict each other or the documents). Each packet gets an answer key listing
what was written, what is in the packet, what is missing, and the mistakes.

    npm run packets                  # writes samples/synthetic/packets/packet-*.pdf and .json
    npm run packets:random 5         # five made-up patients in samples/synthetic/packets/random/, e.g. maria-garcia.pdf
    npm run packets:random -- 5 --seed 42   # the same five again (as maria-garcia-2.pdf etc.; nothing is overwritten)

Random packets are new every run unless --seed is given (the seed is printed and saved in each answer key).
"""
import argparse
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_documents import (  # noqa: E402
    authorization, culture, demographics, hand_auth, hand_mobility, hand_vitals, hp, meds, meds_corrected, progress, therapy, vitals,
)
from make_samples import blank_answers, ensure_fonts, fax_effect, fax_header, fill_form, render_page  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "samples" / "synthetic" / "packets"
# The referral checklist's documents. Its "Client's Demographic Page" is the form itself; a hospital face sheet
# ("demographics") is an extra that some packets include.
CHECKLIST = ["authorization", "history_physical", "progress_notes", "vitals", "medications", "therapy_notes", "culture"]
FAX_DATE = "OCT-14-2026"
PRINTED = "10/14/2026 09:12"


def patient(name, mrn, dob, sex, hospital, printed=PRINTED):
    y, m, d = dob.split("-")
    return {"name": name, "mrn": mrn, "dob": dob, "dob_print": f"{m}/{d}/{y}", "sex": sex, "hospital": hospital, "printed": printed}


# Each packet: the patient as the hospital records them, what was written on the form, the deliberate
# mistakes, and the documents included (doc_type, how to draw it).
PACKETS = [
    {
        "name": "packet-4-form-only-blank-mrn",
        "kind": "form only",
        "font": 0,
        "info_page": False,
        "patient": patient("JIMENEZ, ROSA", "MH-3381920", "1963-08-17", "F", "Mission Hospital"),
        "written": {
            "referring_hospital": "Mission Hospital", "dept_floor": "5 West",
            "referrer_name": "Carla Benton, MSW", "referrer_phone": "949-555-018",
            "referrer_email": "cbenton@missionhosp.test",
            "patient_name": "Rosa Jimenez", "dob": "08/17/1963",
            "gender": "Female", "ethnicity": "Hispanic", "ssn_last4": "5532", "insurance": "CalOptima",
            "preferred_language": "Spanish", "housing_situation": ["Currently Unhoused"],
            "chief_complaint": "Pneumonia, finishing PO antibiotics",
            "admit_date": "10/09/26", "wounds": "No", "tb_test_done": "Yes", "tb_test_date": "10/10/26", "tb_test_results": "CXR neg",
            "o2": "No", "self_admin_meds": "Yes", "continent": "Yes", "ostomy": "No", "foley": "No",
            "diabetes": "No", "insulin": "Yes",
            "active_infection": "No", "ambulatory": "Yes", "assistive_device": "No", "hospice": "No", "car": "No",
            "service_animal": "No", "has_limitations": "No", "los_authorized_days": "14",
        },
        "expected_overrides": {"dob": "1963-08-17", "admit_date": "2026-10-09", "tb_test_date": "2026-10-10", "los_authorized_days": 14},
        "crossed_out": {},
        "mistakes": [
            "MRN left blank (required).",
            "Referrer phone has only 9 digits: 949-555-018.",
            "Diabetes circled No, but Insulin circled Yes.",
        ],
        "documents": [],
    },
    {
        "name": "packet-5-form-only-wrong-year",
        "kind": "form only",
        "font": 1,
        "info_page": True,
        "patient": patient("OKORO, DANIEL", "HB-1029944", "1971-01-30", "M", "Hoag Hospital Newport Beach"),
        "written": {
            "referring_hospital": "Hoag Newport", "dept_floor": "Tele 3",
            "referrer_name": "R. Hall RN CM", "referrer_phone": "(949) 555-0131", "referrer_email": "rhall.hoag.test",
            "authorized_by": "Dr. Feldman", "authorized_by_phone": "949-555-0102",
            "patient_name": "Daniel Okoro", "mrn": "HB-1029944", "dob": "1/30/1971",
            "gender": "Male", "ethnicity": "Black", "ssn_last4": "2280", "insurance": "Medi-Cal",
            "preferred_language": "English", "housing_situation": ["Currently Unhoused", "4+ episodes of homelessness in the past 3 years"],
            "chief_complaint": "R foot diabetic ulcer, osteo ruled out",
            "admit_date": "10/08/25", "wounds": "Yes", "independent_wound_care": "Yes", "home_health_ordered": "No",
            "tb_test_done": "Yes",
            "o2": "No", "self_admin_meds": "Yes", "continent": "Yes", "ostomy": "No", "foley": "No",
            "diabetes": "Yes", "insulin": "No", "diabetes_oral_meds": "Yes",
            "active_infection": "No", "ambulatory": "Yes", "assistive_device": "Yes", "assistive_device_explain": "cane",
            "hospice": "No", "car": "No", "service_animal": "No", "has_limitations": "No", "los_authorized_days": "21",
        },
        "expected_overrides": {"referrer_phone": "(949) 555-0131", "authorized_by_phone": "(949) 555-0102", "dob": "1971-01-30",
                               "admit_date": "2025-10-08", "los_authorized_days": 21},
        "crossed_out": {"self_admin_meds": "No"},
        "mistakes": [
            "Admit date written as 10/08/25, a year too early (should be 10/08/26).",
            "Wounds ticked Yes, but the wound description is blank.",
            "Self-administers meds: No was circled first, scribbled out, then Yes circled.",
            "TB test circled Yes with no date or result.",
            "Referrer email has no @: rhall.hoag.test.",
        ],
        "documents": [],
    },
    {
        "name": "packet-6-complete-dob-mismatch",
        "kind": "complete",
        "font": 0,
        "info_page": True,
        "patient": patient("PARK, LINDA", "OC5520187", "1958-03-08", "F", "Orange Coast Regional Medical Center"),
        "written": {
            "referring_hospital": "Orange Coast Regional", "dept_floor": "Med-Surg 4W",
            "referrer_name": "Dana Whitfield, MSW", "referrer_phone": "714-555-0142", "referrer_email": "dwhitfield@ocregional.test",
            "nursing_station_phone": "714-555-0190", "authorized_by": "Dr. R. Patel", "authorized_by_phone": "714-555-0177",
            "patient_name": "Linda Park", "mrn": "OC5520187", "dob": "03/08/1959",
            "gender": "Female", "ethnicity": "Korean", "ssn_last4": "6104", "insurance": "CalOptima",
            "preferred_language": "Korean", "housing_situation": ["Currently Unhoused"],
            "chief_complaint": "L hip fx s/p ORIF, WBAT with walker",
            "admit_date": "10/05/26", "wounds": "Yes", "wounds_detail": "Surgical incision L hip, staples, clean/dry",
            "independent_wound_care": "Yes", "home_health_ordered": "No",
            "tb_test_done": "Yes", "tb_test_date": "10/6/26", "tb_test_results": "QuantiFERON neg",
            "o2": "No", "self_admin_meds": "Yes", "continent": "Yes", "ostomy": "No", "foley": "No", "diabetes": "No",
            "active_infection": "No", "ambulatory": "Yes", "assistive_device": "Yes", "assistive_device_explain": "front wheel walker",
            "hospice": "No", "car": "No", "service_animal": "No", "has_limitations": "No", "los_authorized_days": "30",
        },
        "expected_overrides": {"referrer_phone": "(714) 555-0142", "nursing_station_phone": "(714) 555-0190",
                               "authorized_by_phone": "(714) 555-0177", "dob": "1959-03-08", "admit_date": "2026-10-05",
                               "tb_test_date": "2026-10-06", "los_authorized_days": 30},
        "crossed_out": {"o2": "Yes"},
        "mistakes": [
            "DOB written 03/08/1959; the face sheet, H&P and authorization say 03/08/1958.",
            "Length of stay written as 30 days; CalOptima approved 21.",
            "O2 circled Yes, scribbled out, then No circled.",
        ],
        "documents": [
            ("demographics", lambda p, f, r: demographics(p, {"address": "Homeless", "phone": "(714) 555-0164", "language": "Korean",
                                                              "insurance": "CalOptima Health (Medi-Cal)", "member_id": "C22018734",
                                                              "contact": "Grace Park (daughter) (714) 555-0105"})),
            ("authorization", lambda p, f, r: hand_auth(p, {
                "request": {"Member name": "Linda Park", "Member DOB": "03/08/1958", "Member ID": "C22018734",
                            "Requesting facility": "Orange Coast Regional", "Requested by / phone": "D. Whitfield MSW 714-555-0142",
                            "Primary diagnosis": "L hip fx s/p ORIF", "Days requested": "30"},
                "status": "Approved", "number": "RC-2026-120415", "days": "21", "dates": "10/14/26 - 11/4/26", "reviewer": "K. Lam RN, UM"}, f, r)),
            ("history_physical", lambda p, f, r: hp(p, {
                "date": "10/05/2026", "attending": "M. Rossi, MD", "cc": "Fall with left hip pain, unable to bear weight.",
                "hpi": "68F, unhoused, tripped on a curb. X-ray showed left intertrochanteric fracture. ORIF 10/06 without complication.",
                "pmh": ["Hypertension", "Osteopenia"], "allergies": "No known drug allergies",
                "social": "Unhoused 2 years, staying in a shelter. No tobacco, alcohol or drug use.",
                "exam": "Alert and oriented x4. Left hip incision clean, dry, staples intact.",
                "ap": ["L hip fracture s/p ORIF — weight bearing as tolerated with walker", "Staples out 10/20",
                       "Medically stable for discharge to recuperative care"]})),
            ("progress_notes", lambda p, f, r: progress(p, {
                "when": "10/14/2026 07:30", "author": "M. Rossi, MD", "subjective": "Pain controlled on oral meds. Slept well.",
                "objective": "Afebrile, vitals stable on room air. Incision clean.", "assessment": "Post-op day 8, recovering well. A&Ox4. Medically stable for discharge.",
                "plan": "Discharge to recuperative care today. Ortho follow-up 10/20 for staple removal."})),
            ("vitals", lambda p, f, r: hand_vitals(p, [["10/13 20:00", "128/76", "80", "98.4", "16", "98%"],
                                                      ["10/14 04:00", "122/74", "76", "98.2", "16", "97%"],
                                                      ["10/14 08:00", "126/78", "78", "98.1", "16", "98%"]], "RA", f, r)),
            ("medications", lambda p, f, r: meds_corrected(p, [["Acetaminophen", "1000 mg", "PO", "Every 8 hours"], ["Oxycodone", "5 mg", "PO", "Every 6 hours PRN"],
                                                              ["Enoxaparin", "40 mg", "SC", "Daily x 28 days"], ["Amlodipine", "5 mg", "PO", "Daily"]],
                                                           "NKDA", [(1, 1, "2.5 mg")], ["Docusate 100 mg PO twice daily"], f, r,
                                                           signoff="reviewed w/ pt 10/14 - RN")),
            ("therapy_notes", lambda p, f, r: therapy(p, {
                "discipline": "Physical Therapy", "when": "10/13/2026 13:45", "who": "J. Kim, DPT",
                "mobility": ["Ambulated 200 ft with front-wheeled walker, supervision", "Transfers independently with walker", "Stairs: not attempted"],
                "adl": "Independent with ADLs except lower-body dressing (uses reacher).", "rec": "Continue walker. Safe for recuperative care."})),
            ("culture", lambda p, f, r: culture(p, {
                "specimen": "Blood, peripheral x2", "collected": "10/07/2026", "final": "10/12/2026", "result": "No growth at 5 days.",
                "sus": [], "comment": "Final report. No organisms isolated."})),
        ],
    },
    {
        "name": "packet-7-complete-cane-not-marked",
        "kind": "complete",
        "font": 1,
        "info_page": False,
        "patient": patient("REYES, TOMAS", "SJ-0101452", "1966-12-02", "M", "St. Jude Medical Center"),
        "written": {
            "referring_hospital": "St. Jude Medical Ctr", "dept_floor": "4 South",
            "referrer_name": "K. Nguyen RN CM", "referrer_phone": "(714) 555-0118 x204", "referrer_email": "knguyen@stjude.test",
            "patient_name": "Tomas Reyez", "mrn": "SJ-0101452", "dob": "12/02/1966",
            "gender": "Male", "ethnicity": "Hispanic", "ssn_last4": "8817", "insurance": "Medi-Cal",
            "preferred_language": "Spanish", "housing_situation": ["Currently Unhoused"],
            "chief_complaint": "COPD exacerbation, back to baseline",
            "admit_date": "10/10/26", "wounds": "No", "tb_test_done": "Yes", "tb_test_date": "10/11/26", "tb_test_results": "PPD neg",
            "o2": "No", "self_admin_meds": "Yes", "continent": "Yes", "ostomy": "No", "foley": "No", "diabetes": "No",
            "active_infection": "No", "ambulatory": "Yes", "assistive_device": "No",
            "hospice": "No", "car": "No", "service_animal": "No",
            "has_limitations": "Yes", "behavioral_flags": ["Non-compliant"], "behavioral_explain": "Left AMA x1 in 2025, now engaged",
            "los_authorized_days": "14",
        },
        "expected_overrides": {"referrer_phone": "(714) 555-0118 x204", "dob": "1966-12-02", "admit_date": "2026-10-10",
                               "tb_test_date": "2026-10-11", "los_authorized_days": 14},
        "crossed_out": {},
        "mistakes": [
            "Patient name misspelled Tomas Reyez; every document says REYES.",
            "Assistive device circled No, but the PT note and nursing assessment both say he uses a cane.",
            "O2 circled No while the vitals flowsheet shows 2L nasal cannula overnight, weaned to room air this morning.",
        ],
        "documents": [
            ("demographics", lambda p, f, r: demographics(p, {"address": "None (homeless)", "phone": "(657) 555-0147", "language": "Spanish",
                                                              "insurance": "CalOptima Health (Medi-Cal)", "member_id": "C19944026", "contact": "None listed"})),
            ("authorization", lambda p, f, r: authorization(p, {"member_id": "C19944026", "number": "RC-2026-120502", "status": "Approved", "days": 14,
                                                               "start": "10/14/2026", "end": "10/28/2026",
                                                               "note": "Approved for 14 days of recuperative care."})),
            ("history_physical", lambda p, f, r: hp(p, {
                "date": "10/10/2026", "attending": "S. Okafor, MD", "cc": "Worsening shortness of breath and cough x 4 days.",
                "hpi": "59M with COPD, not on home oxygen, presented in respiratory distress. Treated with nebulizers, steroids and azithromycin.",
                "pmh": ["COPD", "Tobacco use (1 ppd)", "Alcohol use disorder, in early remission"], "allergies": "No known drug allergies",
                "social": "Unhoused, sleeps at a bus station. Quit alcohol 6 months ago. Smokes 1 ppd.",
                "exam": "Alert and oriented x4. Diffuse wheezes, improving. Walks with a cane.",
                "ap": ["COPD exacerbation — prednisone taper, inhalers", "Tobacco cessation counseling", "Medically stable for discharge"]})),
            ("progress_notes", lambda p, f, r: progress(p, {
                "when": "10/14/2026 08:05", "author": "S. Okafor, MD", "subjective": "Breathing at baseline. Wants to go.",
                "objective": "SpO2 95% on room air after weaning off 2L overnight.", "assessment": "COPD exacerbation resolved. A&Ox4. Medically stable for discharge.",
                "plan": "Discharge to recuperative care. Pulmonology follow-up in 2 weeks."})),
            ("vitals", lambda p, f, r: hand_vitals(p, [["10/13 20:00", "136/82", "92", "98.6", "20", "93%"],
                                                      ["10/14 00:00", "132/80", "88", "98.4", "18", "94%"],
                                                      ["10/14 08:00", "130/78", "84", "98.2", "18", "95%"]], "2L, then RA", f, r)),
            ("medications", lambda p, f, r: meds(p, [["Prednisone", "40 mg", "PO", "Daily x 3 more days"], ["Tiotropium", "18 mcg", "Inhaled", "Daily"],
                                                     ["Albuterol HFA", "2 puffs", "Inhaled", "Every 4 hours PRN"], ["Nicotine patch", "21 mg", "Transdermal", "Daily"]], "NKDA")),
            ("therapy_notes", lambda p, f, r: hand_mobility(p, {"when": "10/13/26 1500", "who": "L. Tran RN", "feet": "250", "device": "Cane",
                                                                "transfers": "Independent", "adl": "Independent",
                                                                "comments": ["Amb w/ single point cane, steady.", "SOB w/ exertion, recovers w/ rest.", ""]}, f, r)),
            ("culture", lambda p, f, r: culture(p, {
                "specimen": "Sputum", "collected": "10/10/2026", "final": "10/12/2026", "result": "Normal respiratory flora. No pathogens isolated.",
                "sus": [], "comment": "Final report."})),
        ],
    },
    {
        "name": "packet-8-partial-missing-4",
        "kind": "partial",
        "font": 0,
        "info_page": False,
        "patient": patient("RUIZ, ANGELA", "FV2301876", "1974-06-21", "F", "Fountain Valley Regional Hospital"),
        "written": {
            "referring_hospital": "Fountain Valley Hosp.", "dept_floor": "3 East",
            "referrer_name": "Alex Romero LCSW", "referrer_phone": "714 555 0163",
            "patient_name": "Angela Ruiz", "mrn": "FV2301876", "dob": "6/21/1974",
            "gender": "Female", "ethnicity": "Hispanic", "ssn_last4": "40927", "insurance": "CalOptima",
            "preferred_language": "English",
            "chief_complaint": "Pyelonephritis, on PO cipro",
            "admit_date": "10/11/26", "wounds": "No", "tb_test_done": "No",
            "o2": "No", "self_admin_meds": "Yes", "continent": "Yes", "ostomy": "No", "foley": "No",
            "diabetes": "Yes", "insulin": "No", "diabetes_oral_meds": "Yes",
            "active_infection": "No", "ambulatory": "Yes", "assistive_device": "No",
            "hospice": "Yes", "car": "Yes", "service_animal": "No", "has_limitations": "No", "los_authorized_days": "14",
        },
        "expected_overrides": {"referrer_phone": "(714) 555-0163", "dob": "1974-06-21", "admit_date": "2026-10-11", "los_authorized_days": 14},
        "crossed_out": {},
        "mistakes": [
            "SSN last 4 has five digits: 40927.",
            "Hospice circled Yes with no explanation; nothing in the H&P supports it (likely meant No).",
            "Housing situation left blank.",
            "TB test circled No.",
        ],
        "documents": [
            ("demographics", lambda p, f, r: demographics(p, {"address": "Homeless", "phone": "(714) 555-0126", "language": "English",
                                                              "insurance": "CalOptima Health (Medi-Cal)", "member_id": "C30117452", "contact": "None listed"})),
            ("history_physical", lambda p, f, r: hp(p, {
                "date": "10/11/2026", "attending": "L. Chen, MD", "cc": "Fever, flank pain and vomiting.",
                "hpi": "52F with type 2 diabetes presenting with right pyelonephritis. Improved on IV ceftriaxone, switched to oral ciprofloxacin.",
                "pmh": ["Type 2 diabetes mellitus", "Obesity"], "allergies": "No known drug allergies",
                "social": "Lives in her car. No tobacco, alcohol or drug use.",
                "exam": "Alert and oriented x4. Mild right CVA tenderness.",
                "ap": ["Pyelonephritis — ciprofloxacin to complete 7 days", "DM2 — metformin", "Medically stable for discharge"]})),
            ("vitals", lambda p, f, r: vitals(p, [["10/13/2026 22:00", "122/80", "88", "99.1", "16", "98%"],
                                                       ["10/14/2026 06:00", "118/76", "82", "98.6", "16", "98%"]], "Room air")),
            ("medications", lambda p, f, r: meds(p, [["Ciprofloxacin", "500 mg", "PO", "Twice daily x 4 more days"], ["Metformin", "500 mg", "PO", "Twice daily"],
                                                     ["Ondansetron", "4 mg", "PO", "Every 8 hours PRN nausea"]], "NKDA")),
        ],
    },
    {
        "name": "packet-9-partial-missing-5",
        "kind": "partial",
        "font": 1,
        "info_page": True,
        "patient": patient("CHEN, WILLIAM", "MH-3390145", "1970-06-23", "M", "Mission Hospital"),
        "written": {
            "referring_hospital": "Mission Hospital", "dept_floor": "Ortho 6",
            "referrer_name": "Carla Benton, MSW", "referrer_phone": "949-555-0181", "referrer_email": "cbenton@missionhosp.test",
            "patient_name": "William Chen", "mrn": "MH-3390145", "dob": "23/06/1970",
            "gender": "Male", "ssn_last4": "1186", "insurance": "CalOptima",
            "preferred_language": "Cantonese", "housing_situation": ["Currently Unhoused"],
            "chief_complaint": "R tib/fib fx, non weight bearing",
            "admit_date": "10/07/26", "wounds": "Yes", "wounds_detail": "R leg incision, steri-strips",
            "independent_wound_care": "Yes", "home_health_ordered": "No",
            "tb_test_done": "Yes", "tb_test_date": "10/8/26", "tb_test_results": "neg",
            "o2": "No", "self_admin_meds": "Yes", "continent": "Yes", "ostomy": "No", "foley": "No", "diabetes": "No",
            "active_infection": "No", "ambulatory": "Yes", "assistive_device": "Yes", "assistive_device_explain": "wheelchair + crutches",
            "hospice": "No", "car": "No", "service_animal": "No", "has_limitations": "No", "los_authorized_days": "21",
        },
        "expected_overrides": {"referrer_phone": "(949) 555-0181", "dob": "1970-06-23", "admit_date": "2026-10-07",
                               "tb_test_date": "2026-10-08", "los_authorized_days": 21},
        "crossed_out": {"ambulatory": "No"},
        "mistakes": [
            "DOB written day-first as 23/06/1970 (there is no month 23).",
            "Ambulatory circled Yes (No scribbled out), but he is non-weight-bearing and the nursing assessment says wheelchair with max assist.",
            "Approved days on the authorization (14) don't match the 21 written on the form.",
        ],
        "documents": [
            ("authorization", lambda p, f, r: hand_auth(p, {
                "request": {"Member name": "William Chen", "Member DOB": "06/23/1970", "Member ID": "C27750318",
                            "Requesting facility": "Mission Hospital", "Requested by / phone": "C. Benton MSW 949-555-0181",
                            "Primary diagnosis": "R tib/fib fracture", "Days requested": "21"},
                "status": "Approved", "number": "RC-2026-120388", "days": "14", "dates": "10/14/26 - 10/28/26", "reviewer": "K. Lam RN, UM"}, f, r)),
            ("therapy_notes", lambda p, f, r: hand_mobility(p, {"when": "10/13/26 1030", "who": "P. Sanchez RN", "feet": "15", "device": "Wheelchair",
                                                                "transfers": "Max assist", "adl": "Needs some help",
                                                                "comments": ["NWB RLE. Crutches 15 ft only, unsteady.", "W/c for all distances.", "Needs help w/ shower."]}, f, r)),
        ],
    },
    {
        "name": "packet-10-partial-missing-6",
        "kind": "partial",
        "font": 0,
        "info_page": False,
        "patient": patient("NOLAN, PATRICIA", "HB-1033870", "1981-09-14", "F", "Hoag Hospital Newport Beach"),
        "written": {
            "referring_hospital": "Hoag Newport", "dept_floor": "Med 5",
            "referrer_phone": "(949) 555-0131", "referrer_email": "rhall@hoag.test",
            "patient_name": "Patricia Nolan", "mrn": "HB-1033870", "dob": "09/14/1981",
            "ethnicity": "White", "ssn_last4": "3349", "insurance": "Medi-Cal",
            "preferred_language": "English", "housing_situation": ["Currently Unhoused"],
            "admit_date": "10/12/26", "wounds": "No", "tb_test_done": "Yes", "tb_test_date": "10/13/26", "tb_test_results": "CXR clear",
            "o2": "No", "self_admin_meds": "Yes", "continent": "Yes", "ostomy": "No", "foley": "No", "diabetes": "No",
            "active_infection": "No", "ambulatory": "Yes", "assistive_device": "No", "hospice": "No", "car": "No",
            "service_animal": "No", "has_limitations": "Yes", "behavioral_flags": ["Mental Health DX"],
            "mental_health_dx_type": "Bipolar d/o, on lithium", "los_authorized_days": "two weeks",
        },
        "expected_overrides": {"referrer_phone": "(949) 555-0131", "dob": "1981-09-14", "admit_date": "2026-10-12", "tb_test_date": "2026-10-13"},
        "crossed_out": {},
        "mistakes": [
            "Referrer name left blank (required); only the phone and email are filled in.",
            "Chief complaint left blank (required).",
            "Gender not ticked.",
            "Length of stay written in words (two weeks) instead of a number of days.",
        ],
        "documents": [
            ("demographics", lambda p, f, r: demographics(p, {"address": "No fixed address", "phone": "None", "language": "English",
                                                              "insurance": "CalOptima Health (Medi-Cal)", "member_id": "C41820095",
                                                              "contact": "Mark Nolan (brother) (949) 555-0144"})),
            ("history_physical", lambda p, f, r: hp(p, {
                "date": "10/12/2026", "attending": "D. Feldman, MD", "cc": "Lithium toxicity with tremor and confusion.",
                "hpi": "45F with bipolar disorder presented with coarse tremor and vomiting; lithium level 2.1. Treated with IV fluids. Now level 0.8, mental status at baseline.",
                "pmh": ["Bipolar I disorder", "Hypothyroidism"], "allergies": "Haloperidol (dystonia)",
                "social": "Unhoused, staying in a park. No alcohol or drug use.",
                "exam": "Alert and oriented x4. Fine tremor only.",
                "ap": ["Lithium toxicity — resolved; lithium resumed at lower dose", "Psychiatry follow-up arranged", "Medically stable for discharge"]})),
        ],
    },
]


def write_packet(pk, out, fonts):
    """Draw, fax and save one packet, with its answer key."""
    rng = random.Random(f"{pk['name']}-pen")
    font = fonts[pk["font"]]
    p = pk["patient"]
    pages, contents = [], []
    if pk["info_page"]:
        pages.append(render_page(1)); contents.append("info")
    pages.append(fill_form(pk["written"], font, rng, pk["crossed_out"])); contents.append("form")
    for doc_type, draw in pk["documents"]:
        pages.append(draw(p, font, rng).img); contents.append(doc_type)

    fax_rng = random.Random(pk["name"])
    sender = (pk["written"].get("referring_hospital") or p["hospital"]).upper()[:22]
    faxed = []
    for n, page in enumerate(pages, 1):
        img = fax_effect(page, fax_rng)
        fax_header(img, n, len(pages), sender, pk.get("fax_date", FAX_DATE))
        faxed.append(img)
    pdf = out / f"{pk['name']}.pdf"
    faxed[0].save(pdf, save_all=True, append_images=faxed[1:], resolution=200)

    expected = blank_answers()
    expected.update(pk["written"])
    expected.update(pk["expected_overrides"])
    included = [d for d, _ in pk["documents"]]
    key = {"kind": pk["kind"]}
    if "seed" in pk:
        key["seed"] = pk["seed"]
    key.update({
        "received_at": pk.get("received_at", "2026-10-14T14:20"),
        "pages": [{"page": n, "contents": c} for n, c in enumerate(contents, 1)],
        "form_pages": [n for n, c in enumerate(contents, 1) if c == "form"],
        "documents_included": included,
        "documents_missing": [d for d in CHECKLIST if d not in included],
        "face_sheet_included": "demographics" in included,
        "mistakes": pk["mistakes"],
        "expected": expected,
    })
    (out / f"{pk['name']}.json").write_text(json.dumps(key, indent=2, ensure_ascii=False) + "\n")
    missing = len([d for d in CHECKLIST if d not in included])
    print(f"wrote {pdf.relative_to(ROOT)}: {pk['kind']}, {len(pages)} pages, {len(included)} documents, {missing} missing, {len(pk['mistakes'])} mistakes")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--random", type=int, metavar="N", nargs="?", const=3,
                    help="make N new made-up packets (default 3) instead of the fixed ones")
    ap.add_argument("--seed", type=int, help="repeat an earlier random run")
    args = ap.parse_args()
    fonts = ensure_fonts()
    if args.random:
        from random_packets import make_random_packets
        seed = args.seed if args.seed is not None else random.randrange(100000, 999999)
        out = OUT / "random"
        out.mkdir(parents=True, exist_ok=True)
        print(f"seed {seed}")
        for pk in make_random_packets(args.random, seed):
            # Named after the patient; never overwrite an earlier packet with the same name.
            base, n = pk["name"], 2
            while (out / f"{pk['name']}.pdf").exists() or (out / f"{pk['name']}.json").exists():
                pk["name"], n = f"{base}-{n}", n + 1
            write_packet(pk, out, fonts)
        return
    OUT.mkdir(parents=True, exist_ok=True)
    for pk in PACKETS:
        write_packet(pk, OUT, fonts)


if __name__ == "__main__":
    sys.exit(main())
