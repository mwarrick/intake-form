"""Made-up referral packets for make_packets.py --random.

Each packet is a new patient (name, hospital, diagnosis, dates around today), a random kind (form only,
complete, or missing 4 to 6 of the 7 checklist documents; complete and partial packets may add a hospital face sheet), and 2 to 4 random mistakes on the form, sometimes
with an answer circled, scribbled out and re-circled. The same seed always gives the same packets.
"""
import random
import re
from datetime import date, datetime, timedelta

from make_documents import (
    authorization, culture, demographics, hand_auth, hand_mobility, hand_vitals, hp, meds, meds_corrected, progress, therapy, vitals,
)
from make_packets import CHECKLIST, patient
from make_samples import CIRCLE_WIDGETS

FIRST = {
    "M": ["Gilbert", "Luis", "Marcus", "David", "Anthony", "Robert", "Hector", "Kevin", "Thomas", "Andre", "Minh", "Samuel", "Victor", "Raymond"],
    "F": ["Maria", "Linda", "Teresa", "Jennifer", "Lisa", "Gloria", "Angela", "Kimberly", "Sandra", "Lan", "Denise", "Carmen", "Brenda", "Yolanda"],
}
LAST = ["Garcia", "Nguyen", "Johnson", "Martinez", "Tran", "Williams", "Lopez", "Brown", "Hernandez", "Pham", "Davis", "Gonzalez",
        "Wilson", "Ramirez", "Le", "Taylor", "Flores", "Anderson", "Torres", "Thomas", "Rivera", "Moore", "Castillo", "Jackson"]
LANGUAGES = [("English", 6), ("Spanish", 3), ("Vietnamese", 1), ("Korean", 1)]
ETHNICITY = ["Hispanic", "White", "Black", "Asian", "Vietnamese", "Hispanic", "White"]

HOSPITALS = [
    {"form": "Orange Coast Regional", "full": "Orange Coast Regional Medical Center", "mrn": "OC{n:07d}", "area": "714",
     "floors": ["Med-Surg 4W", "Tele 2", "5 East"], "referrers": [("Dana Whitfield, MSW", "dwhitfield@ocregional.test"), ("J. Ortiz RN CM", "jortiz@ocregional.test")]},
    {"form": "St. Jude Medical Ctr", "full": "St. Jude Medical Center", "mrn": "SJ-{n:07d}", "area": "714",
     "floors": ["3 North", "4 South", "ICU stepdown"], "referrers": [("K. Nguyen RN CM", "knguyen@stjude.test"), ("Beth Lowry, LCSW", "blowry@stjude.test")]},
    {"form": "Mission Hospital", "full": "Mission Hospital", "mrn": "MH-{n:07d}", "area": "949",
     "floors": ["5 West", "Ortho 6", "Med 3"], "referrers": [("Carla Benton, MSW", "cbenton@missionhosp.test"), ("T. Ahmed RN", "tahmed@missionhosp.test")]},
    {"form": "Hoag Newport", "full": "Hoag Hospital Newport Beach", "mrn": "HB-{n:07d}", "area": "949",
     "floors": ["Tele 3", "Med 5", "Surg 2"], "referrers": [("R. Hall RN CM", "rhall@hoag.test"), ("Nina Vo, MSW", "nvo@hoag.test")]},
    {"form": "Fountain Valley Hosp.", "full": "Fountain Valley Regional Hospital", "mrn": "FV{n:07d}", "area": "714",
     "floors": ["3 East", "Med-Surg 2", "PCU"], "referrers": [("Alex Romero LCSW", "aromero@fvrh.test"), ("S. Patel RN CM", "spatel@fvrh.test")]},
]

# Each diagnosis carries everything the form and documents need to agree with each other.
DIAGNOSES = [
    {"cc_form": "CHF exacerbation, stable on PO diuretics", "cc": "Shortness of breath and leg swelling x 5 days.",
     "hpi": "{age}{sex} with heart failure, off diuretics while unhoused, presented with dyspnea and edema. Diuresed with IV furosemide, now on oral regimen.",
     "pmh": ["Heart failure with reduced ejection fraction", "Hypertension"], "exam": "Trace edema bilateral ankles. Lungs clear.",
     "ap": ["Heart failure exacerbation — resolved; furosemide 40 mg PO daily", "Low-sodium diet education"],
     "meds": [["Furosemide", "40 mg", "PO", "Daily"], ["Carvedilol", "12.5 mg", "PO", "Twice daily"], ["Lisinopril", "10 mg", "PO", "Daily"]],
     "stay": (4, 8), "wound": None, "diabetes": False, "device": "None", "feet": 300, "infection": None},
    {"cc_form": "CAP, finishing PO antibiotics", "cc": "Fever and productive cough x 3 days.",
     "hpi": "{age}{sex} presenting with right lower lobe pneumonia. Improved on IV ceftriaxone and azithromycin, now on oral amoxicillin-clavulanate.",
     "pmh": ["Tobacco use", "Hypertension"], "exam": "Faint crackles right base. No respiratory distress.",
     "ap": ["Community-acquired pneumonia — amoxicillin-clavulanate to complete 7 days", "Tobacco cessation counseling"],
     "meds": [["Amoxicillin-clavulanate", "875 mg", "PO", "Twice daily x 4 more days"], ["Amlodipine", "5 mg", "PO", "Daily"], ["Nicotine patch", "14 mg", "Transdermal", "Daily"]],
     "stay": (3, 6), "wound": None, "diabetes": False, "device": "None", "feet": 250,
     "infection": ("Blood, peripheral x2", "No growth at 5 days.", [], "Final report. No organisms isolated.")},
    {"cc_form": "LLE cellulitis s/p I&D, wound packed", "cc": "Painful swollen left leg.",
     "hpi": "{age}{sex} with type 2 diabetes presenting with left lower leg cellulitis and abscess. Underwent I&D. Improving on oral antibiotics.",
     "pmh": ["Type 2 diabetes mellitus, insulin requiring", "Hypertension"], "exam": "Left lower leg 3x2 cm wound, packed, erythema improving.",
     "ap": ["LLE cellulitis s/p I&D — doxycycline, daily packing", "DM2 — insulin glargine, metformin"],
     "meds": [["Doxycycline", "100 mg", "PO", "Twice daily x 7 days"], ["Insulin glargine", "16 units", "SC", "Nightly"], ["Metformin", "1000 mg", "PO", "Twice daily"]],
     "stay": (4, 9), "wound": "1 wound L lower leg 3x2cm, packed daily", "wound_independent": "No", "diabetes": True, "insulin": True, "oral_dm": True,
     "device": "None", "feet": 200,
     "infection": ("Wound, left lower leg", "Methicillin-susceptible Staphylococcus aureus (MSSA).",
                   [["Oxacillin", "0.5", "S"], ["Doxycycline", "<=0.5", "S"], ["Clindamycin", "0.25", "S"]], "Final report.")},
    {"cc_form": "L hip fx s/p ORIF, WBAT w/ walker", "cc": "Fall with left hip pain, unable to bear weight.",
     "hpi": "{age}{sex}, unhoused, fell on a curb. Left intertrochanteric fracture repaired with ORIF without complication.",
     "pmh": ["Osteopenia", "Hypertension"], "exam": "Left hip incision clean and dry, staples intact.",
     "ap": ["Hip fracture s/p ORIF — weight bearing as tolerated with walker", "Staples out in 10 days", "Enoxaparin x 28 days"],
     "meds": [["Acetaminophen", "1000 mg", "PO", "Every 8 hours"], ["Oxycodone", "5 mg", "PO", "Every 6 hours PRN"], ["Enoxaparin", "40 mg", "SC", "Daily x 28 days"]],
     "stay": (5, 9), "wound": "Surgical incision L hip, staples, clean/dry", "wound_independent": "Yes", "diabetes": False,
     "device": "Walker", "feet": 150, "infection": None},
    {"cc_form": "COPD exacerbation, back to baseline", "cc": "Worsening shortness of breath and cough x 4 days.",
     "hpi": "{age}{sex} with COPD, not on home oxygen, treated with nebulizers, steroids and azithromycin. Weaned to room air.",
     "pmh": ["COPD", "Tobacco use (1 ppd)"], "exam": "Scattered wheezes, improving. SpO2 94% on room air.",
     "ap": ["COPD exacerbation — prednisone taper, inhalers", "Tobacco cessation counseling"],
     "meds": [["Prednisone", "40 mg", "PO", "Daily x 3 more days"], ["Tiotropium", "18 mcg", "Inhaled", "Daily"], ["Albuterol HFA", "2 puffs", "Inhaled", "Every 4 hours PRN"]],
     "stay": (3, 6), "wound": None, "diabetes": False, "device": "Cane", "feet": 200, "infection": None},
    {"cc_form": "Pyelonephritis, on PO cipro", "cc": "Fever, flank pain and vomiting.",
     "hpi": "{age}{sex} with type 2 diabetes presenting with pyelonephritis. Improved on IV ceftriaxone, switched to oral ciprofloxacin.",
     "pmh": ["Type 2 diabetes mellitus", "Obesity"], "exam": "Mild right CVA tenderness. Tolerating diet.",
     "ap": ["Pyelonephritis — ciprofloxacin to complete 7 days", "DM2 — metformin"],
     "meds": [["Ciprofloxacin", "500 mg", "PO", "Twice daily x 4 more days"], ["Metformin", "500 mg", "PO", "Twice daily"]],
     "stay": (3, 5), "wound": None, "diabetes": True, "insulin": False, "oral_dm": True, "device": "None", "feet": 300,
     "infection": ("Urine, clean catch", "Escherichia coli >100,000 CFU/mL.", [["Ciprofloxacin", "<=0.25", "S"], ["Ceftriaxone", "<=1", "S"], ["Ampicillin", ">16", "R"]], "Final report.")},
    {"cc_form": "R foot diabetic ulcer, osteo ruled out", "cc": "Draining wound on the right foot.",
     "hpi": "{age}{sex} with poorly controlled diabetes presenting with a right plantar ulcer. MRI negative for osteomyelitis. Debrided at bedside.",
     "pmh": ["Type 2 diabetes mellitus, insulin requiring", "Peripheral neuropathy"], "exam": "Right plantar ulcer 2x2 cm, clean base, no probe to bone.",
     "ap": ["Diabetic foot ulcer — daily dressing, offloading shoe", "DM2 — insulin glargine and lispro"],
     "meds": [["Insulin glargine", "20 units", "SC", "Nightly"], ["Insulin lispro", "Sliding scale", "SC", "With meals"], ["Gabapentin", "300 mg", "PO", "Three times daily"]],
     "stay": (4, 8), "wound": "R plantar ulcer 2x2cm, dressing daily", "wound_independent": "Yes", "diabetes": True, "insulin": True, "oral_dm": False,
     "device": "Cane", "feet": 150, "infection": None},
    {"cc_form": "Upper GI bleed s/p EGD, Hgb stable", "cc": "Black stools and lightheadedness.",
     "hpi": "{age}{sex} with alcohol use disorder, in remission, presented with melena. EGD showed a gastric ulcer, treated. Hemoglobin stable after 2 units.",
     "pmh": ["Gastric ulcer", "Alcohol use disorder, in remission"], "exam": "Abdomen soft, non-tender. Conjunctivae slightly pale.",
     "ap": ["Gastric ulcer — pantoprazole twice daily x 8 weeks", "Repeat CBC in 1 week"],
     "meds": [["Pantoprazole", "40 mg", "PO", "Twice daily"], ["Ferrous sulfate", "325 mg", "PO", "Daily"], ["Thiamine", "100 mg", "PO", "Daily"]],
     "stay": (3, 6), "wound": None, "diabetes": False, "device": "None", "feet": 300, "infection": None},
]

REQUIRED_LABELS = {"mrn": "MRN", "referrer_name": "Referrer name", "chief_complaint": "Chief complaint", "admit_date": "Admit date",
                   "dob": "Date of birth", "referring_hospital": "Referring hospital"}
DEVICE_FORM = {"Cane": "cane", "Walker": "front wheel walker", "Wheelchair": "wheelchair"}
WORDS = {14: "two weeks", 21: "three weeks", 30: "one month"}
CIRCLE_FIELDS = sorted({f for f, _ in CIRCLE_WIDGETS})


def written_date(d: date, rng, year_digits=None):
    yy = year_digits or rng.choice([2, 4])
    return f"{d.month:02d}/{d.day:02d}/{d.year % 100:02d}" if yy == 2 else f"{d.month}/{d.day}/{d.year}"


def written_phone(area, rng):
    n = f"555-01{rng.randint(0, 99):02d}"
    return rng.choice([f"{area}-{n}", f"({area}) {n}", f"{area} {n.replace('-', ' ')}"])


def normalize(fid, v):
    """What the reader should return for what was written: phones and dates normalized when they are valid."""
    if not isinstance(v, str):
        return v
    if fid.endswith("phone"):
        digits = re.sub(r"\D", "", v)
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}" if len(digits) == 10 else v
    if fid in ("dob", "admit_date", "tb_test_date"):
        m = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{2}|\d{4})", v)
        if not m:
            return v
        mo, d, y = int(m[1]), int(m[2]), int(m[3])
        y += 2000 if y < 100 else 0
        try:
            return date(y, mo, d).isoformat()
        except ValueError:
            return v
    if fid == "los_authorized_days":
        return int(v) if v.isdigit() else v
    return v


# ---- Mistakes: each changes what was written and says what it did, or returns None when it doesn't apply ----

def m_blank_required(w, c, rng):
    fid = rng.choice([f for f in REQUIRED_LABELS if f not in c["touched"]])
    c["touched"].add(fid)
    w[fid] = None
    return f"{REQUIRED_LABELS[fid]} left blank (required)."


def m_short_phone(w, c, rng):
    w["referrer_phone"] = w["referrer_phone"][:-1]
    return f"Referrer phone is missing a digit: {w['referrer_phone']}."


def m_bad_email(w, c, rng):
    if not w.get("referrer_email"):
        return None
    w["referrer_email"] = w["referrer_email"].replace("@", ".")
    return f"Referrer email has no @: {w['referrer_email']}."


def m_admit_wrong_year(w, c, rng):
    if "admit_date" in c["touched"]:
        return None
    c["touched"].add("admit_date")
    a = c["admit"]
    w["admit_date"] = f"{a.month:02d}/{a.day:02d}/{(a.year - 1) % 100:02d}"
    return f"Admit date written as {w['admit_date']}, a year too early."


def m_dob_day_first(w, c, rng):
    d = c["dob"]
    if d.day <= 12 or "dob" in c["touched"]:
        return None
    c["touched"].add("dob")
    w["dob"] = f"{d.day:02d}/{d.month:02d}/{d.year}"
    return f"Date of birth written day-first as {w['dob']} (there is no month {d.day})."


def m_dob_year_off(w, c, rng):
    if "dob" in c["touched"]:
        return None
    c["touched"].add("dob")
    d = c["dob"]
    wrong = d.replace(year=d.year + rng.choice([-1, 1]))
    w["dob"] = f"{wrong.month:02d}/{wrong.day:02d}/{wrong.year}"
    return f"Date of birth written as {w['dob']}; the hospital record says {d.month:02d}/{d.day:02d}/{d.year}."


def m_misspelled_name(w, c, rng):
    last = c["last"]
    i = rng.randint(1, len(last) - 2)
    wrong = last[:i] + last[i + 1] + last[i] + last[i + 2:]
    if wrong == last:
        wrong = last[:-1] + ("z" if last[-1] != "z" else "s")
    w["patient_name"] = f"{c['first']} {wrong}"
    return f"Patient name misspelled {w['patient_name']}; the hospital record says {c['first']} {last}."


def m_ssn_digits(w, c, rng):
    w["ssn_last4"] = w["ssn_last4"] + str(rng.randint(0, 9))
    return f"SSN last 4 has five digits: {w['ssn_last4']}."


def m_insulin_without_diabetes(w, c, rng):
    if w.get("diabetes") != "No":
        return None
    w["insulin"] = "Yes"
    return "Diabetes circled No, but Insulin circled Yes."


def m_wound_no_detail(w, c, rng):
    w["wounds"] = "Yes"
    w["wounds_detail"] = None
    return "Wounds ticked Yes, but the wound description is blank."


def m_tb_no_date(w, c, rng):
    w["tb_test_done"] = "Yes"
    w["tb_test_date"] = w["tb_test_results"] = None
    return "TB test marked Yes with no date or result."


def m_los_words(w, c, rng):
    w["los_authorized_days"] = WORDS[c["requested"]]
    return f"Length of stay written in words ({w['los_authorized_days']}) instead of a number of days."


def m_los_mismatch(w, c, rng):
    if "authorization" not in c["docs"] or c["requested"] == 14:
        return None
    c["approved"] = 14
    return f"Length of stay written as {c['requested']} days; the authorization approves 14."


def m_gender_blank(w, c, rng):
    w["gender"] = None
    return "Gender not ticked."


def m_housing_blank(w, c, rng):
    w["housing_situation"] = []
    return "Housing situation left blank."


def m_device_not_marked(w, c, rng):
    if c["dx"]["device"] == "None" or not ({"therapy_notes", "history_physical"} & set(c["docs"])):
        return None
    w["assistive_device"] = "No"
    w["assistive_device_explain"] = None
    return f"Assistive device circled No, but the documents say {DEVICE_FORM[c['dx']['device']]}."


def m_hospice_yes(w, c, rng):
    w["hospice"] = "Yes"
    return "Hospice circled Yes with no explanation; nothing in the record supports it (likely meant No)."


MISTAKES = [m_blank_required, m_short_phone, m_bad_email, m_admit_wrong_year, m_dob_day_first, m_dob_year_off, m_misspelled_name,
            m_ssn_digits, m_insulin_without_diabetes, m_wound_no_detail, m_tb_no_date, m_los_words, m_los_mismatch, m_gender_blank,
            m_housing_blank, m_device_not_marked, m_hospice_yes]


# ---- Documents ----

def build_documents(c, rng):
    dx, today, admit = c["dx"], c["today"], c["admit"]
    yesterday = today - timedelta(days=1)
    md = lambda d: f"{d.month}/{d.day}"
    full = lambda d: d.strftime("%m/%d/%Y")
    member_id = f"C{rng.randint(10000000, 49999999)}"
    attending = f"{rng.choice('ABDJKLMRS')}. {rng.choice(['Patel', 'Okafor', 'Chen', 'Rossi', 'Feldman', 'Kim', 'Haddad'])}, MD"
    therapist = f"{rng.choice('ACDJLMPT')}. {rng.choice(['Kim', 'Alvarez', 'Ross', 'Tran', 'Moore'])}, {rng.choice(['PT', 'DPT'])}"
    nurse = f"{rng.choice('ABLPT')}. {rng.choice(['Sanchez', 'Brooks', 'Tran', 'Moore', 'Lee'])} RN"
    age, sex = c["age"], c["sex"]
    temps = [round(rng.uniform(97.8, 99.2), 1) for _ in range(3)]
    vit_rows = [(f"{md(yesterday)} 20:00", yesterday), (f"{md(today)} 04:00", today), (f"{md(today)} 08:00", today)]
    vit = [[t, f"{rng.randint(112, 142)}/{rng.randint(68, 88)}", str(rng.randint(70, 96)), f"{temps[i]}", str(rng.choice([16, 16, 18])),
            f"{rng.randint(94, 99)}%"] for i, (t, _) in enumerate(vit_rows)]
    device, feet = dx["device"], dx["feet"]
    mobility = [f"Ambulated {feet} ft " + ("independently, no assistive device" if device == "None" else f"with {DEVICE_FORM[device]}, supervision"),
                "Transfers independently" + ("" if device == "None" else f" with {DEVICE_FORM[device]}")]
    approved = c["approved"]
    start, end = today, today + timedelta(days=approved)
    auth_no = f"RC-{today.year}-{rng.randint(120000, 129999)}"
    pt_name = f"{c['first']} {c['last']}"

    makers = {
        "demographics": lambda p, f, r: demographics(p, {
            "address": rng.choice(["Homeless", "None (homeless)", "No fixed address"]), "phone": rng.choice(["None", f"({c['area']}) 555-01{rng.randint(0, 99):02d}"]),
            "language": c["language"], "insurance": "CalOptima Health (Medi-Cal)", "member_id": member_id,
            "contact": rng.choice(["None listed", f"{rng.choice(FIRST['F'])} {c['last']} (sister) ({c['area']}) 555-01{rng.randint(0, 99):02d}"])}),
        "authorization": (lambda p, f, r: hand_auth(p, {
            "request": {"Member name": pt_name, "Member DOB": full(c["dob"]), "Member ID": member_id, "Requesting facility": c["hospital"]["form"],
                        "Requested by / phone": f"{c['referrer'][0].split(',')[0]} {c['phone']}", "Primary diagnosis": dx["cc_form"].split(",")[0],
                        "Days requested": str(c["requested"])},
            "status": "Approved", "number": auth_no, "days": str(approved), "dates": f"{start:%m/%d/%y} - {end:%m/%d/%y}", "reviewer": "K. Lam RN, UM"}, f, r))
        if rng.random() < 0.5 else
        (lambda p, f, r: authorization(p, {"member_id": member_id, "number": auth_no, "status": "Approved", "days": approved,
                                           "start": full(start), "end": full(end), "note": f"Approved for {approved} days of recuperative care."})),
        "history_physical": lambda p, f, r: hp(p, {
            "date": full(admit), "attending": attending, "cc": dx["cc"], "hpi": dx["hpi"].format(age=age, sex=sex),
            "pmh": dx["pmh"], "allergies": rng.choice(["No known drug allergies", "Penicillin (rash)", "Sulfa (hives)"]),
            "social": rng.choice(["Unhoused, staying in a shelter. No alcohol or drug use.", "Unhoused, sleeps in a car. Denies drug use.",
                                  "Unhoused 3 years, staying in a park. No alcohol use."]),
            "exam": "Alert and oriented x4. " + dx["exam"] + ("" if device == "None" else f" Uses a {DEVICE_FORM[device]}."),
            "ap": dx["ap"] + ["Medically stable for discharge to recuperative care"]}),
        "progress_notes": lambda p, f, r: progress(p, {
            "when": f"{full(today)} 07:{rng.randint(10, 55)}", "author": attending, "subjective": "Feels well. Ready to leave.",
            "objective": "Afebrile, vitals stable on room air.", "assessment": "Improving. A&Ox4. Medically stable for discharge.",
            "plan": "Discharge to recuperative care today. Follow-up with primary care in 1 week."}),
        "vitals": (lambda p, f, r: hand_vitals(p, vit, "RA", f, r)) if rng.random() < 0.5 else
                  (lambda p, f, r: vitals(p, [[f"{full(d)} {t.split()[1]}", *row[1:]] for (t, d), row in zip(vit_rows, vit)], "Room air")),
        "medications": (lambda p, f, r: meds_corrected(p, dx["meds"], "NKDA", [(len(dx["meds"]) - 1, 3, "d/c'd")],
                                                       ["Acetaminophen 650 mg PO q6h PRN pain"], f, r,
                                                       signoff=f"reviewed w/ pt {md(today)} - RN"))
                       if rng.random() < 0.3 else (lambda p, f, r: meds(p, dx["meds"], "NKDA")),
        "therapy_notes": (lambda p, f, r: hand_mobility(p, {
            "when": f"{yesterday:%m/%d/%y} 1400", "who": nurse, "feet": str(feet), "device": device, "transfers": "Independent",
            "adl": "Independent", "comments": [mobility[0].replace("Ambulated", "Amb") + ".", "Indep w/ ADLs.", ""]}, f, r))
        if rng.random() < 0.5 else
        (lambda p, f, r: therapy(p, {"discipline": "Physical Therapy", "when": f"{full(yesterday)} 13:30", "who": therapist, "mobility": mobility,
                                     "adl": "Independent with all ADLs.", "rec": "Safe for recuperative care."})),
        "culture": lambda p, f, r: culture(p, dict(zip(["specimen", "result", "sus", "comment"], dx["infection"] or (
            "Blood, peripheral x2", "No growth at 5 days.", [], "Final report. No organisms isolated.")),
            collected=full(admit), final=full(admit + timedelta(days=3)))),
    }
    return [(d, makers[d]) for d in c["docs"]]


def make_random_packet(rng: random.Random, seed: int, n: int, today: date):
    sex = rng.choice(["M", "F"])
    first, last = rng.choice(FIRST[sex]), rng.choice(LAST)
    age = rng.randint(35, 76)
    dob = date(today.year - age, rng.randint(1, 12), rng.randint(1, 28))
    h = rng.choice(HOSPITALS)
    referrer = rng.choice(h["referrers"])
    dx = rng.choice(DIAGNOSES)
    admit = today - timedelta(days=rng.randint(*dx["stay"]))
    mrn = h["mrn"].format(n=rng.randint(1000000, 9999999))
    language = rng.choices([l for l, _ in LANGUAGES], [w for _, w in LANGUAGES])[0]
    kind = rng.choice(["form only", "complete", "partial"])
    kept = rng.sample(CHECKLIST, len(CHECKLIST) - rng.randint(4, 6))
    docs = [] if kind == "form only" else CHECKLIST[:] if kind == "complete" else [d for d in CHECKLIST if d in kept]
    if docs and rng.random() < (0.8 if kind == "complete" else 0.4):
        docs.insert(0, "demographics")
    requested = rng.choice([14, 14, 21, 30])
    phone = written_phone(h["area"], rng)
    device = dx["device"]

    w = {
        "referring_hospital": h["form"], "dept_floor": rng.choice(h["floors"]),
        "referrer_name": referrer[0], "referrer_phone": phone, "referrer_email": referrer[1] if rng.random() < 0.8 else None,
        "patient_name": f"{first} {last}", "mrn": mrn, "dob": written_date(dob, rng, 4),
        "gender": {"M": "Male", "F": "Female"}[sex], "ethnicity": rng.choice(ETHNICITY), "ssn_last4": f"{rng.randint(0, 9999):04d}",
        "insurance": rng.choice(["CalOptima", "Medi-Cal"]), "preferred_language": language,
        "housing_situation": ["Currently Unhoused"] + (["4+ episodes of homelessness in the past 3 years"] if rng.random() < 0.4 else []),
        "chief_complaint": dx["cc_form"], "admit_date": written_date(admit, rng),
        "wounds": "Yes" if dx["wound"] else "No",
        "tb_test_done": "Yes", "tb_test_date": written_date(admit + timedelta(days=1), rng),
        "tb_test_results": rng.choice(["CXR neg", "PPD neg", "QuantiFERON neg", "neg"]),
        "o2": "No", "self_admin_meds": "Yes", "continent": "Yes", "ostomy": "No", "foley": "No",
        "diabetes": "Yes" if dx["diabetes"] else "No",
        "active_infection": "No", "ambulatory": "Yes", "assistive_device": "No" if device == "None" else "Yes",
        "hospice": "No", "car": rng.choice(["No", "No", "Yes"]), "service_animal": "No", "has_limitations": "No",
        "los_authorized_days": str(requested),
    }
    if dx["wound"]:
        w.update({"wounds_detail": dx["wound"], "independent_wound_care": dx["wound_independent"],
                  "home_health_ordered": "Yes" if dx["wound_independent"] == "No" else "No"})
    if dx["diabetes"]:
        w.update({"insulin": "Yes" if dx["insulin"] else "No", "diabetes_oral_meds": "Yes" if dx["oral_dm"] else "No"})
    if device != "None":
        w["assistive_device_explain"] = DEVICE_FORM[device]

    c = {"today": today, "admit": admit, "dob": dob, "first": first, "last": last, "age": age, "sex": sex, "dx": dx, "docs": docs,
         "requested": requested, "approved": requested, "hospital": h, "referrer": referrer, "phone": phone, "area": h["area"],
         "language": language, "touched": set()}

    mistakes, target = [], rng.randint(2, 4)
    for m in rng.sample(MISTAKES, len(MISTAKES)):
        if len(mistakes) >= target:
            break
        said = m(w, c, rng)
        if said:
            mistakes.append(said)
    crossed_out = {}
    if rng.random() < 0.5:
        fid = rng.choice([f for f in CIRCLE_FIELDS if w.get(f) in ("Yes", "No")])
        crossed_out[fid] = "No" if w[fid] == "Yes" else "Yes"
        mistakes.append(f"{fid.replace('_', ' ').capitalize()}: {crossed_out[fid]} circled first, scribbled out, then {w[fid]} circled.")

    p = patient(f"{last.upper()}, {first.upper()}", mrn, dob.isoformat(), sex, h["full"], printed=f"{today:%m/%d/%Y} 09:{rng.randint(0, 59):02d}")
    return {
        "name": f"{first.lower()}-{last.lower()}",
        "seed": seed,
        "kind": kind,
        "font": rng.choice([0, 1]),
        "info_page": rng.random() < 0.4,
        "fax_date": today.strftime("%b-%d-%Y").upper(),
        "received_at": datetime.combine(today, datetime.min.time()).replace(hour=14, minute=20).isoformat(timespec="minutes"),
        "patient": p,
        "written": w,
        "expected_overrides": {k: normalize(k, v) for k, v in w.items()},
        "crossed_out": crossed_out,
        "mistakes": mistakes,
        "documents": build_documents(c, rng),
    }


def make_random_packets(count: int, seed: int, today: date | None = None):
    rng = random.Random(seed)
    today = today or date.today()
    return [make_random_packet(rng, seed, n, today) for n in range(1, count + 1)]
