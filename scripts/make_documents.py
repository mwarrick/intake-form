#!/usr/bin/env python3
"""Generate fake supporting documents (the referral checklist) for the three sample patients.

Each patient gets typed, hospital-style printouts plus handwritten versions of the documents that often
arrive filled in by hand (bedside vitals flowsheet, nursing mobility assessment, authorization request,
and a medication list with handwritten corrections). All go through a light fax effect and are saved as PDFs,
with an answer key of the values the reader should find and the cross-check flags the app should raise.
Some documents deliberately contradict the patient's referral form (see samples/synthetic/*.json).

    python3 scripts/make_documents.py      # writes samples/synthetic/documents/
"""
import json
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_samples import DPI, Pen, ensure_fonts, fax_effect, fax_header  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "samples" / "synthetic" / "documents"
W, H = int(8.5 * DPI), int(11 * DPI)


def font(size, bold=False, mono=False):
    name = "DejaVuSansMono.ttf" if mono else ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf")
    try:
        return ImageFont.truetype(name, size)
    except OSError:
        return ImageFont.load_default()


class Page:
    """A minimal EHR printout: hospital header, patient banner, titled sections."""

    def __init__(self, hospital, title, patient):
        self.img = Image.new("L", (W, H), 255)
        self.d = ImageDraw.Draw(self.img)
        self.y = 110
        self.d.text((120, self.y), hospital.upper(), font=font(30, bold=True), fill=0)
        self.d.text((W - 120, self.y + 4), "Printed 10/10/2026 13:58", font=font(20), fill=60, anchor="ra")
        self.y += 52
        self.d.text((120, self.y), title, font=font(40, bold=True), fill=0)
        self.y += 66
        self.d.rectangle([120, self.y, W - 120, self.y + 70], outline=0, width=2)
        banner = f"{patient['name']}    MRN: {patient['mrn']}    DOB: {patient['dob_print']}    Sex: {patient['sex']}"
        self.d.text((140, self.y + 20), banner, font=font(24, bold=True), fill=0)
        self.y += 100

    def heading(self, text):
        self.y += 14
        self.d.text((120, self.y), text.upper(), font=font(24, bold=True), fill=0)
        self.y += 34
        self.d.line([120, self.y, W - 120, self.y], fill=120, width=1)
        self.y += 10

    def line(self, text, indent=0, bold=False):
        f = font(23, bold=bold)
        words, cur = text.split(), ""
        for w in words:
            trial = f"{cur} {w}".strip()
            if f.getlength(trial) > W - 260 - indent:
                self.d.text((130 + indent, self.y), cur, font=f, fill=0)
                self.y += 33
                cur = w
            else:
                cur = trial
        self.d.text((130 + indent, self.y), cur, font=f, fill=0)
        self.y += 33

    def fields(self, pairs):
        for k, v in pairs:
            self.d.text((130, self.y), f"{k}:", font=font(23, bold=True), fill=0)
            self.d.text((560, self.y), str(v), font=font(23), fill=0)
            self.y += 33

    def table(self, header, rows, widths, row_h=30):
        x = 130
        for h, w in zip(header, widths):
            self.d.text((x, self.y), h, font=font(21, bold=True), fill=0)
            x += w
        self.y += 32
        self.row_ys = []
        for r in rows:
            self.row_ys.append(self.y)
            x = 130
            for cell, w in zip(r, widths):
                self.d.text((x, self.y), cell, font=font(21, mono=False), fill=0)
                x += w
            self.y += row_h
        self.y += 6

    def signed(self, who):
        self.y += 30
        self.d.text((130, self.y), f"Electronically signed by {who}", font=font(21), fill=60)


PATIENTS = {
    "sample-1-clean": {
        "name": "DELGADO, MARCUS", "mrn": "OC4471209", "dob": "1968-11-23", "dob_print": "11/23/1968", "sex": "M",
        "hospital": "Orange Coast Regional Medical Center",
    },
    "sample-2-messy": {
        "name": "ELLIS, TAMARA", "mrn": "SJ-0093381", "dob": "1965-04-07", "dob_print": "04/07/1965", "sex": "F",
        "hospital": "St. Jude Medical Center",
    },
    "sample-3-ineligible": {
        # The MRN on every page here is a transposition of the form's FV2290114.
        "name": "PIKE, GERALD", "mrn": "FV2290141", "dob": "1952-02-14", "dob_print": "02/14/1952", "sex": "M",
        "hospital": "Fountain Valley Regional Hospital",
    },
}


def demographics(p, extra):
    pg = Page(p["hospital"], "Patient Face Sheet", p)
    pg.heading("Patient")
    pg.fields([("Name", p["name"]), ("Date of birth", p["dob_print"]), ("Sex", p["sex"]), ("MRN", p["mrn"]),
               ("Address", extra["address"]), ("Phone", extra["phone"]), ("Preferred language", extra["language"])])
    pg.heading("Insurance")
    pg.fields([("Primary", extra["insurance"]), ("Member ID", extra["member_id"])])
    pg.heading("Emergency contact")
    pg.fields([("Contact", extra["contact"])])
    return pg


def authorization(p, a):
    pg = Page("CalOptima Health", "Authorization Determination — Recuperative Care", p)
    pg.fields([("Member", p["name"]), ("Member DOB", p["dob_print"]), ("Member ID", a["member_id"]),
               ("Authorization #", a["number"] or "—"), ("Requesting facility", p["hospital"]),
               ("Service", "Recuperative Care (Community Support)"), ("Status", a["status"]),
               ("Approved days", a["days"] if a["days"] is not None else "—"),
               ("Start date", a["start"] or "—"), ("End date", a["end"] or "—")])
    pg.heading("Notes")
    pg.line(a["note"])
    pg.signed("Utilization Management, CalOptima Health")
    return pg


def hp(p, h):
    pg = Page(p["hospital"], "History and Physical", p)
    pg.fields([("Date of service", h["date"]), ("Attending", h["attending"])])
    pg.heading("Chief complaint"); pg.line(h["cc"])
    pg.heading("History of present illness"); pg.line(h["hpi"])
    pg.heading("Past medical history")
    for x in h["pmh"]:
        pg.line(f"• {x}", 10)
    pg.heading("Allergies"); pg.line(h["allergies"])
    pg.heading("Social history"); pg.line(h["social"])
    pg.heading("Exam"); pg.line(h["exam"])
    pg.heading("Assessment and plan")
    for x in h["ap"]:
        pg.line(f"• {x}", 10)
    pg.signed(h["attending"])
    return pg


def progress(p, n):
    pg = Page(p["hospital"], "Hospitalist Progress Note", p)
    pg.fields([("Date/time", n["when"]), ("Author", n["author"])])
    for k in ("Subjective", "Objective", "Assessment", "Plan"):
        pg.heading(k); pg.line(n[k.lower()])
    pg.signed(n["author"])
    return pg


def vitals(p, rows, o2):
    pg = Page(p["hospital"], "Vital Signs Flowsheet", p)
    pg.table(["Date/time", "BP", "HR", "Temp °F", "RR", "SpO2", "O2"],
             [r + [o2] for r in rows], [330, 170, 100, 150, 90, 120, 260])
    return pg


def meds(p, rows, allergies, row_h=30, sign=True):
    pg = Page(p["hospital"], "Discharge Medication Reconciliation", p)
    pg.fields([("Allergies", allergies)])
    pg.heading("Medications")
    pg.table(["Medication", "Dose", "Route", "Frequency"], rows, [560, 260, 160, 400], row_h)
    if sign:
        pg.signed("Pharmacy, " + p["hospital"])
    return pg


def therapy(p, t):
    pg = Page(p["hospital"], f"{t['discipline']} Evaluation", p)
    pg.fields([("Date/time", t["when"]), ("Therapist", t["who"])])
    pg.heading("Functional mobility")
    for x in t["mobility"]:
        pg.line(f"• {x}", 10)
    pg.heading("Activities of daily living"); pg.line(t["adl"])
    pg.heading("Recommendations"); pg.line(t["rec"])
    pg.signed(t["who"])
    return pg


def culture(p, c):
    pg = Page(p["hospital"] + " Laboratory", "Microbiology Report", p)
    pg.fields([("Specimen", c["specimen"]), ("Collected", c["collected"]), ("Final report", c["final"])])
    pg.heading("Result"); pg.line(c["result"], bold=True)
    pg.heading("Susceptibilities")
    pg.table(["Antibiotic", "MIC", "Interp."], c["sus"], [500, 200, 200])
    pg.heading("Comment"); pg.line(c["comment"])
    return pg


def build():
    docs = {}

    # ---- 1. Marcus Delgado: everything consistent with the form ----
    p = PATIENTS["sample-1-clean"]
    docs["sample-1-clean"] = {
        "demographics": (demographics(p, {"address": "Homeless — no fixed address", "phone": "(714) 555-0199", "language": "Spanish",
                                          "insurance": "CalOptima Health (Medi-Cal)", "member_id": "C93820411", "contact": "Rosa Delgado (sister) (714) 555-0123"}),
                         {"patient_name": "DELGADO, MARCUS", "dob": "1968-11-23", "mrn": "OC4471209", "insurance": "CalOptima"}),
        "authorization": (authorization(p, {"member_id": "C93820411", "number": "RC-2026-118842", "status": "Approved", "days": 14,
                                            "start": "10/10/2026", "end": "10/24/2026", "note": "Approved for 14 days of recuperative care. Extension requires updated clinicals."}),
                          {"authorization_number": "RC-2026-118842", "approved_days": 14, "status": "Approved", "end_date": "2026-10-24"}),
        "history_physical": (hp(p, {"date": "10/06/2026", "attending": "R. Patel, MD", "cc": "Shortness of breath and leg swelling x 5 days.",
                                     "hpi": "57M with HFrEF (EF 30%), non-adherent to diuretics while unhoused, presented with dyspnea and 3+ bilateral edema. Diuresed with IV furosemide, now euvolemic on oral regimen.",
                                     "pmh": ["Heart failure with reduced ejection fraction", "Hypertension", "Tobacco use"], "allergies": "No known drug allergies",
                                     "social": "Currently unhoused, sleeps in vehicle. Smokes 1/2 ppd. Denies alcohol or drug use.",
                                     "exam": "Alert and oriented x4. Lungs clear. Trace edema bilateral ankles. Ambulating in hallway without assistance.",
                                     "ap": ["Acute on chronic HFrEF — resolved; continue furosemide 40 mg PO daily", "No signs of infection", "Medically stable for discharge to recuperative care"]}),
                             {"cognitive_impairment": False, "oriented_x4": True, "infections": []}),
        "progress_notes": (progress(p, {"when": "10/10/2026 07:40", "author": "R. Patel, MD", "subjective": "Feels well, no dyspnea.",
                                        "objective": "Vitals stable on room air. Weight down 6 kg from admission.", "assessment": "HFrEF exacerbation resolved. Medically stable for discharge. A&Ox4.",
                                        "plan": "Discharge to recuperative care today with cardiology follow-up in 1 week."}),
                           {"medically_stable": True, "oriented_x4": True}),
        "vitals": (vitals(p, [["10/09/2026 20:00", "124/78", "82", "98.1", "16", "97%"], ["10/10/2026 08:00", "118/76", "78", "98.0", "16", "98%"]], "Room air"),
                   {"taken_at": "2026-10-10T08:00", "oxygen": "Room air"}),
        "medications": (meds(p, [["Furosemide", "40 mg", "PO", "Daily"], ["Carvedilol", "12.5 mg", "PO", "Twice daily"],
                                 ["Lisinopril", "10 mg", "PO", "Daily"], ["Nicotine patch", "14 mg", "Transdermal", "Daily"]], "NKDA"),
                        {"medications": 4}),
        "therapy_notes": (therapy(p, {"discipline": "Physical Therapy", "when": "10/09/2026 14:10", "who": "J. Kim, DPT",
                                      "mobility": ["Ambulated 300 ft independently, no assistive device", "Transfers sit to stand independently", "Stairs: 12 steps with rail"],
                                      "adl": "Independent with all ADLs.", "rec": "No PT needs at discharge. Safe for recuperative care."}),
                          {"ambulation_distance_ft": 300, "transfers_independent": True, "adls_independent": True}),
    }
    expected_flags = {"sample-1-clean": []}

    # ---- 2. Tamara Ellis: MRSA culture contradicts "no active infection"; auth is short; vitals are stale ----
    p = PATIENTS["sample-2-messy"]
    docs["sample-2-messy"] = {
        "demographics": (demographics(p, {"address": "None (homeless)", "phone": "(657) 555-0172", "language": "English",
                                          "insurance": "CalOptima Health (Medi-Cal)", "member_id": "C11873502", "contact": "None listed"}),
                         {"patient_name": "ELLIS, TAMARA", "dob": "1965-04-07", "mrn": "SJ-0093381"}),
        "authorization": (authorization(p, {"member_id": "C11873502", "number": "RC-2026-119207", "status": "Approved", "days": 14,
                                            "start": "10/10/2026", "end": "10/24/2026", "note": "14 days approved. Request for 21 days partially approved; resubmit with wound care progress for extension."}),
                          {"authorization_number": "RC-2026-119207", "approved_days": 14, "status": "Approved"}),
        "history_physical": (hp(p, {"date": "10/02/2026", "attending": "S. Okafor, MD", "cc": "Painful swollen left lower leg.",
                                     "hpi": "61F with poorly controlled type 2 diabetes presenting with LLE cellulitis and abscess. Underwent I&D 10/02. Wound culture sent.",
                                     "pmh": ["Type 2 diabetes mellitus, insulin requiring", "Major depressive disorder", "Hypertension"], "allergies": "Sulfa? (patient unsure) — tolerated TMP-SMX this admission",
                                     "social": "Unhoused 4+ years, staying in shelter intermittently. No alcohol or drug use.",
                                     "exam": "A&Ox4. Left lower leg 4x3 cm open wound, packed, surrounding erythema improving.",
                                     "ap": ["LLE cellulitis with abscess s/p I&D — follow wound culture", "DM2 — insulin glargine, metformin", "Depression — continue sertraline"]}),
                             {"cognitive_impairment": False, "oriented_x4": True}),
        "vitals": (vitals(p, [["10/08/2026 22:00", "138/84", "88", "99.0", "18", "97%"], ["10/09/2026 06:00", "132/80", "84", "98.6", "16", "98%"]], "Room air"),
                   {"taken_at": "2026-10-09T06:00"}),
        "medications": (meds(p, [["Insulin glargine", "18 units", "SC", "Nightly"], ["Metformin", "1000 mg", "PO", "Twice daily"],
                                 ["Trimethoprim-sulfamethoxazole DS", "1 tab", "PO", "Twice daily x 7 days"], ["Sertraline", "100 mg", "PO", "Daily"]], "Sulfa (questionable)"),
                        {"medications": 4}),
        "therapy_notes": (therapy(p, {"discipline": "Physical Therapy", "when": "10/08/2026 11:30", "who": "M. Alvarez, PT",
                                      "mobility": ["Ambulated 150 ft with front-wheeled walker, supervision only", "Transfers independently with walker"],
                                      "adl": "Independent with ADLs; needs set-up for lower-body dressing.", "rec": "Continue front-wheeled walker. Home health wound care."}),
                          {"ambulation_distance_ft": 150, "transfers_independent": True}),
        "culture": (culture(p, {"specimen": "Wound, left lower leg (abscess)", "collected": "10/02/2026", "final": "10/05/2026",
                                "result": "POSITIVE: Staphylococcus aureus, methicillin-resistant (MRSA). Heavy growth.",
                                "sus": [["Oxacillin", ">2", "R"], ["Trimethoprim/Sulfa", "<=0.5", "S"], ["Vancomycin", "1", "S"], ["Clindamycin", ">4", "R"]],
                                "comment": "Contact precautions. Not yet cleared by ID."}),
                    {"result": "positive", "mrsa": True}),
    }
    expected_flags["sample-2-messy"] = [
        ("conflict", "active_infection"),        # MRSA culture vs. form's "No"
        ("conflict", "los_authorized_days"),     # 14 approved vs. 21 requested
        ("document", "Vitals are"),              # 32 hours old
        ("eligibility", "Active infection"),
    ]

    # ---- 3. Gerald Pike: ineligible on several counts; MRN typo; auth still pending ----
    p = PATIENTS["sample-3-ineligible"]
    docs["sample-3-ineligible"] = {
        "demographics": (demographics(p, {"address": "Homeless", "phone": "None", "language": "English",
                                          "insurance": "Medicare Part A/B", "member_id": "1EG4-TE5-MK72", "contact": "None"}),
                         {"patient_name": "PIKE, GERALD", "mrn": "FV2290141"}),
        "authorization": (authorization(p, {"member_id": "1EG4-TE5-MK72", "number": None, "status": "Pending clinical review", "days": None,
                                            "start": None, "end": None, "note": "Pending: additional clinicals requested (ID clearance, PT evaluation)."}),
                          {"status": "Pending clinical review"}),
        "history_physical": (hp(p, {"date": "09/29/2026", "attending": "L. Chen, MD", "cc": "Fever, productive cough, confusion.",
                                     "hpi": "74M with history of dementia presenting with right lower lobe pneumonia. Sputum culture grew MRSA. On IV vancomycin via PICC.",
                                     "pmh": ["Dementia, mild-moderate (per neurology 2025)", "COPD on home O2 2L", "BPH"], "allergies": "Penicillin (rash)",
                                     "social": "Unhoused. Limited history due to confusion.",
                                     "exam": "Alert, oriented to person only. Coarse breath sounds RLL. Uses wheelchair for distances.",
                                     "ap": ["MRSA pneumonia — IV vancomycin, ID following, infection active", "Dementia with nighttime delirium", "COPD — 2L nasal cannula"]}),
                             {"cognitive_impairment": True, "oriented_x4": False, "infections": [{"organism": "MRSA", "status": "active"}]}),
        "vitals": (vitals(p, [["10/10/2026 04:00", "142/88", "96", "99.8", "22", "92%"], ["10/10/2026 10:00", "138/86", "92", "99.4", "20", "93%"]], "2L NC"),
                   {"taken_at": "2026-10-10T10:00", "oxygen": "2L NC"}),
        "medications": (meds(p, [["Vancomycin", "1.25 g", "IV (PICC)", "Every 12 hours"], ["Furosemide", "20 mg", "PO", "Daily"],
                                 ["Donepezil", "5 mg", "PO", "Nightly"], ["Heparin", "5,000 units", "SC", "Every 8 hours"]], "Penicillin (rash)"),
                        {"medications": 4}),
        "therapy_notes": (therapy(p, {"discipline": "Physical Therapy", "when": "10/09/2026 15:00", "who": "D. Ross, PT",
                                      "mobility": ["Ambulated 40 ft with rolling walker, moderate assist x1", "Sit-to-stand requires moderate assistance", "Wheelchair for longer distances"],
                                      "adl": "Requires assistance with bathing, dressing and toileting.", "rec": "Recommend skilled nursing facility. Not safe for independent living."}),
                          {"ambulation_distance_ft": 40, "transfers_independent": False, "adls_independent": False}),
        "culture": (culture(p, {"specimen": "Sputum", "collected": "09/29/2026", "final": "10/01/2026",
                                "result": "POSITIVE: Staphylococcus aureus, methicillin-resistant (MRSA).",
                                "sus": [["Oxacillin", ">2", "R"], ["Vancomycin", "1", "S"], ["Linezolid", "2", "S"]],
                                "comment": "Contact precautions."}),
                    {"result": "positive", "mrsa": True}),
    }
    expected_flags["sample-3-ineligible"] = [
        ("conflict", "mrn"),
        ("document", "Authorization status"),
        ("eligibility", "IV medication"),
        ("eligibility", "walks 40 ft"),
        ("eligibility", "cognitive impairment"),
        ("eligibility", "Active infection"),
    ]
    return docs, expected_flags



# ---------- Handwritten versions: paper forms filled in by hand ----------

class PaperForm(Page):
    """A printed blank form; returns pixel boxes where the writing goes."""

    def blank(self, label, width=None, x=130):
        f = font(23, bold=True)
        self.d.text((x, self.y), f"{label}:", font=f, fill=0)
        x0 = x + int(f.getlength(f"{label}:")) + 14
        x1 = x0 + width if width else W - 130
        base = self.y + 30
        self.d.line([x0, base, x1, base], fill=0, width=1)
        self.y += 46
        return (x0, base - 34, x1, base)

    def boxes(self, label, options):
        """A row of printed checkboxes; returns option -> box."""
        f = font(23, bold=True)
        self.d.text((130, self.y), f"{label}:", font=f, fill=0)
        x = 130 + int(f.getlength(f"{label}:")) + 24
        out = {}
        for opt in options:
            box = (x, self.y + 4, x + 24, self.y + 28)
            self.d.rectangle(box, outline=0, width=2)
            self.d.text((x + 32, self.y), opt, font=font(22), fill=0)
            out[opt] = box
            x += 32 + int(font(22).getlength(opt)) + 34
        self.y += 46
        return out

    def grid(self, header, widths, rows):
        """A ruled table with empty cells; returns cell boxes [row][col]."""
        x = 130
        for h, w in zip(header, widths):
            self.d.text((x + 6, self.y), h, font=font(20, bold=True), fill=0)
            x += w
        self.y += 30
        top, row_h = self.y, 58
        cells = []
        for r in range(rows):
            y0 = top + r * row_h
            x = 130
            row = []
            for w in widths:
                row.append((x + 6, y0 + 10, x + w - 6, y0 + row_h - 8))
                x += w
            cells.append(row)
        right = 130 + sum(widths)
        for r in range(rows + 1):
            self.d.line([130, top + r * row_h, right, top + r * row_h], fill=0, width=1)
        x = 130
        for w in [0, *widths]:
            x += w
            self.d.line([x, top, x, top + rows * row_h], fill=0, width=1)
        self.d.line([130, top, 130, top + rows * row_h], fill=0, width=1)
        self.y = top + rows * row_h + 20
        return cells


def hand_vitals(p, rows, o2, pen_font, rng):
    pg = PaperForm(p["hospital"], "Vital Signs Flowsheet (bedside)", p)
    pg.line("Record every 4 hours and as needed. Initial each entry.")
    cells = pg.grid(["Date / time", "BP", "HR", "Temp °F", "RR", "SpO2", "O2", "Init."], [300, 170, 100, 140, 90, 120, 180, 100], 6)
    pen = Pen(pg.img, pen_font, rng, 1.0)
    for r, values in enumerate(rows):
        for c, v in enumerate([*values, o2, rng.choice(["MT", "JL", "RN"])]):
            pen.text(cells[r][c], v)
    return pg


def hand_mobility(p, m, pen_font, rng):
    pg = PaperForm(p["hospital"], "Nursing Mobility & ADL Assessment", p)
    when = pg.blank("Date / time", 420)
    nurse = pg.blank("Assessed by", 520)
    pg.heading("Mobility")
    dist = pg.blank("Ambulation distance (ft)", 220)
    device = pg.boxes("Assistive device", ["None", "Cane", "Walker", "Wheelchair", "Other"])
    transfers = pg.boxes("Transfers", ["Independent", "Supervision", "Min assist", "Mod assist", "Max assist"])
    pg.heading("Activities of daily living")
    adl = pg.boxes("ADLs", ["Independent", "Needs some help", "Dependent"])
    pg.heading("Comments")
    notes = [pg.blank("", None) for _ in range(3)]
    pen = Pen(pg.img, pen_font, rng, 1.25)
    pen.text(when, m["when"])
    pen.text(nurse, m["who"])
    pen.text(dist, m["feet"])
    pen.tick(device[m["device"]])
    pen.tick(transfers[m["transfers"]])
    pen.tick(adl[m["adl"]])
    for box, text in zip(notes, m["comments"]):
        pen.text(box, text)
    return pg


def hand_auth(p, a, pen_font, rng):
    pg = PaperForm("CalOptima Health", "Recuperative Care Authorization Request", p)
    fields = {k: pg.blank(k, 700) for k in ["Member name", "Member DOB", "Member ID", "Requesting facility", "Requested by / phone",
                                           "Primary diagnosis", "Days requested"]}
    pg.heading("For CalOptima use only")
    status = pg.boxes("Determination", ["Approved", "Denied", "Pending"])
    auth_no = pg.blank("Authorization #", 520)
    days = pg.blank("Approved days", 200)
    dates = pg.blank("Approved dates", 640)
    reviewer = pg.blank("Reviewer", 520)
    pen = Pen(pg.img, pen_font, rng, 1.25)
    for k, v in a["request"].items():
        pen.text(fields[k], v)
    reviewer_pen = Pen(pg.img, pen_font, random.Random(rng.random()), 1.15)
    reviewer_pen.tick(status[a["status"]], style="x")
    for box, v in [(auth_no, a["number"]), (days, a["days"]), (dates, a["dates"]), (reviewer, a["reviewer"])]:
        if v:
            reviewer_pen.text(box, v)
    return pg


def meds_corrected(p, rows, allergies, corrections, added, pen_font, rng):
    """The typed list (printed with room between rows), then a nurse's pen: strike-throughs with the
    new value written underneath, added medications, and a sign-off."""
    pg = meds(p, rows, allergies, row_h=70, sign=False)
    pen = Pen(pg.img, pen_font, rng, 1.15)
    cols = [130, 690, 950, 1110]
    for row_index, col, new in corrections:
        y = pg.row_ys[row_index]
        x0 = cols[col]
        pen.draw.line([x0 - 4, y + 13, x0 + 150, y + 13 + rng.uniform(-2, 2)], fill=pen.ink, width=3)
        pen.text((x0 - 10, y + 22, x0 + 240, y + 62), new)
    y = pg.row_ys[-1] + 80
    for med in added:
        pen.text((120, y, W - 140, y + 44), med)
        y += 60
    pen.text((W - 560, y + 20, W - 140, y + 64), "reviewed w/ pt 10/10 - RN")
    pg.y = y + 90
    pg.signed("Pharmacy, " + p["hospital"])
    return pg


HAND = {
    "sample-1-clean": {
        "vitals_expect": {"taken_at": "2026-10-10T08:00", "oxygen": "RA"},
        "vitals": [["10/9 20:00", "124/78", "82", "98.1", "16", "97%"], ["10/10 08:00", "118/76", "78", "98.0", "16", "98%"]],
        "o2": "RA",
        "mobility": {"when": "10/10/26 0915", "who": "T. Moore RN", "feet": "300", "device": "None", "transfers": "Independent", "adl": "Independent",
                     "comments": ["Walked hallway x2 w/o assist, steady gait.", "Indep. w/ shower + dressing.", ""]},
        "mobility_expect": {"ambulation_distance_ft": 300, "transfers_independent": True, "adls_independent": True},
        "auth": {"request": {"Member name": "Marcus Delgado", "Member DOB": "11/23/1968", "Member ID": "C93820411", "Requesting facility": "Orange Coast Regional",
                             "Requested by / phone": "D. Whitfield MSW 714-555-0142", "Primary diagnosis": "CHF exacerbation", "Days requested": "14"},
                 "status": "Approved", "number": "RC-2026-118842", "days": "14", "dates": "10/10/26 - 10/24/26", "reviewer": "K. Lam RN, UM"},
        "auth_expect": {"authorization_number": "RC-2026-118842", "approved_days": 14, "status": "Approved"},
        "meds": [["Furosemide", "40 mg", "PO", "Daily"], ["Carvedilol", "12.5 mg", "PO", "Twice daily"], ["Lisinopril", "10 mg", "PO", "Daily"]],
        "corrections": [(2, 1, "5 mg")],
        "added": ["Nicotine patch 14 mg transdermal daily"],
        "meds_expect": {"medications": 4, "dose:Lisinopril": "5 mg"},
    },
    "sample-2-messy": {
        "vitals_expect": {"taken_at": "2026-10-09T06:00", "oxygen": "RA"},
        "vitals": [["10/8 22:00", "138/84", "88", "99.0", "18", "97%"], ["10/9 06:00", "132/80", "84", "98.6", "16", "98%"]],
        "o2": "RA",
        "mobility": {"when": "10/9/26 1400", "who": "P. Sanchez RN", "feet": "150", "device": "Walker", "transfers": "Independent", "adl": "Needs some help",
                     "comments": ["FWW, supervision only. No LOB.", "Needs set-up for LE dressing (wound).", "Dressing change done by RN daily."]},
        "mobility_expect": {"ambulation_distance_ft": 150, "transfers_independent": True},
        "auth": {"request": {"Member name": "Tamara Ellis", "Member DOB": "04/07/1965", "Member ID": "C11873502", "Requesting facility": "St. Jude Medical Ctr",
                             "Requested by / phone": "K. Nguyen RN CM x204", "Primary diagnosis": "LLE cellulitis s/p I&D", "Days requested": "21"},
                 "status": "Approved", "number": "RC-2026-119207", "days": "14", "dates": "10/10/26 - 10/24/26", "reviewer": "K. Lam RN, UM"},
        "auth_expect": {"authorization_number": "RC-2026-119207", "approved_days": 14, "status": "Approved"},
        "meds": [["Insulin glargine", "18 units", "SC", "Nightly"], ["Metformin", "1000 mg", "PO", "Twice daily"],
                 ["Trimethoprim-sulfamethoxazole DS", "1 tab", "PO", "Twice daily x 7 days"], ["Sertraline", "100 mg", "PO", "Daily"]],
        "corrections": [(0, 1, "22 units")],
        "added": ["Acetaminophen 650 mg PO q6h PRN pain"],
        "meds_expect": {"medications": 5, "dose:Insulin glargine": "22 units"},
    },
    "sample-3-ineligible": {
        "vitals_expect": {"taken_at": "2026-10-10T10:00", "oxygen": "2L NC"},
        "vitals": [["10/10 04:00", "142/88", "96", "99.8", "22", "92%"], ["10/10 10:00", "138/86", "92", "99.4", "20", "93%"]],
        "o2": "2L NC",
        "mobility": {"when": "10/10/26 0800", "who": "A. Brooks RN", "feet": "40", "device": "Wheelchair", "transfers": "Mod assist", "adl": "Dependent",
                     "comments": ["Amb 40 ft w/ RW + mod A, then w/c.", "Confused at night, pulled at PICC x1.", "Needs assist bathing/toileting."]},
        "mobility_expect": {"ambulation_distance_ft": 40, "transfers_independent": False, "adls_independent": False},
        "auth": {"request": {"Member name": "Gerald Pike", "Member DOB": "02/14/1952", "Member ID": "1EG4-TE5-MK72", "Requesting facility": "Fountain Valley Hosp.",
                             "Requested by / phone": "A. Romero LCSW 714-555-0163", "Primary diagnosis": "Pneumonia (MRSA)", "Days requested": "14"},
                 "status": "Pending", "number": None, "days": None, "dates": None, "reviewer": "Need ID clearance + PT eval"},
        "auth_expect": {"status": "Pending"},
        "meds": [["Vancomycin", "1.25 g", "IV (PICC)", "Every 12 hours"], ["Furosemide", "20 mg", "PO", "Daily"],
                 ["Donepezil", "5 mg", "PO", "Nightly"], ["Heparin", "5,000 units", "SC", "Every 8 hours"]],
        "corrections": [(2, 1, "10 mg")],
        "added": [],
        "meds_expect": {"medications": 4, "dose:Donepezil": "10 mg"},
    },
}


def handwritten(sample, pen_font, rng):
    p, h = PATIENTS[sample], HAND[sample]
    return [
        ("vitals", "vitals-handwritten", hand_vitals(p, h["vitals"], h["o2"], pen_font, rng), h["vitals_expect"]),
        ("therapy_notes", "nursing-mobility-handwritten", hand_mobility(p, h["mobility"], pen_font, rng), h["mobility_expect"]),
        ("authorization", "authorization-request-handwritten", hand_auth(p, h["auth"], pen_font, rng), h["auth_expect"]),
        ("medications", "medications-corrected-handwritten", meds_corrected(p, h["meds"], "see chart", h["corrections"], h["added"], pen_font, rng), h["meds_expect"]),
    ]


def main():
    docs, expected_flags = build()
    fonts = ensure_fonts()
    for i, (sample, items) in enumerate(docs.items()):
        items = [(doc_id, doc_id, page, expect) for doc_id, (page, expect) in items.items()]
        items += handwritten(sample, fonts[i % len(fonts)], random.Random(f"{sample}-pen"))
        out = OUT / sample
        out.mkdir(parents=True, exist_ok=True)
        rng = random.Random(sample)
        key = {"received_at": "2026-10-10T14:20", "documents": [], "expected_flags": expected_flags[sample]}
        sender = PATIENTS[sample]["hospital"].upper()[:22]
        for doc_type, stem, page, expect in items:
            img = fax_effect(page.img, rng)
            fax_header(img, 1, 1, sender)
            path = out / f"{stem}.pdf"
            img.save(path, resolution=DPI)
            key["documents"].append({"doc_type": doc_type, "file": path.name, "handwritten": stem.endswith("-handwritten"), "expected": expect})
        (out / "answer-key.json").write_text(json.dumps(key, indent=2) + "\n")
        print(f"wrote {len(items)} documents to {out.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
