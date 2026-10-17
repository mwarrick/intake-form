#!/usr/bin/env python3
"""Generate simulated, unredacted 31-page fax referral packets.

The real packets in samples/packets-real/ have names, dates, MRNs, phone numbers and parts of the clinical text
blacked out. These simulated packets follow the same 31 pages as R11.pdf, with every field filled in for a
fictional patient (scripts/unredacted_sim_patients.py), so extraction can be tested on what the redactions hide:

     1      fax cover sheet
     2      Illumination LA/OC referral form, filled in by hand
     3-8    CalAIM Recuperative Care / Short-Term Post Hospitalization referral/authorization request (6 pages)
     9      hospital face sheet
    10-11   wound care progress note, or PT evaluation (page 11 scanned crooked)
    12-13   inpatient progress note
    14-19   specialist consultation (6 pages)
    20-22   social work interdisciplinary addendum
    23-24   history and physical
    25-30   lab and study flowsheets, printed landscape and faxed sideways
    31      vital signs flowsheet, sideways

    .venv/bin/python scripts/make_unredacted_sims.py           # writes samples/synthetic/unredacted-sim-NNN.pdf and .json
    .venv/bin/python scripts/make_unredacted_sims.py 004 005   # only those patients
    .venv/bin/python scripts/make_unredacted_sims.py --layout  # schema/layouts/la-oc.json, for lining fields up on scans
"""
import json
import random
import sys
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_samples import DPI, ensure_fonts, fax_effect  # noqa: E402
from unredacted_sim_patients import PATIENTS  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "samples" / "synthetic"
W, H = int(8.5 * DPI), int(11 * DPI)
TOTAL = 31
SYS = Path("/System/Library/Fonts/Supplemental")
FACES = {
    "arial": "Arial.ttf", "arialb": "Arial Bold.ttf", "ariali": "Arial Italic.ttf", "times": "Times New Roman.ttf",
    "timesb": "Times New Roman Bold.ttf", "verdana": "Verdana.ttf", "verdanab": "Verdana Bold.ttf", "tahoma": "Tahoma.ttf",
    "courier": "Courier New.ttf", "narrow": "Arial Narrow.ttf",
}
_fonts = {}
HAND = []


def F(face, size):
    key = (face, size)
    if key not in _fonts:
        if face.startswith("hand"):
            _fonts[key] = ImageFont.truetype(str(HAND[int(face[4:])]), size)
        else:
            try:
                _fonts[key] = ImageFont.truetype(str(SYS / FACES[face]), size)
            except OSError:
                _fonts[key] = ImageFont.truetype(f"DejaVuSans{'-Bold' if face.endswith('b') else ''}.ttf", size)
    return _fonts[key]


class Canvas:
    def __init__(self, w=W, h=H, rng=None, pen=0):
        self.img = Image.new("L", (w, h), 255)
        self.d = ImageDraw.Draw(self.img)
        self.w, self.h = w, h
        self.rng = rng or random.Random(0)
        self.pen = pen
        # Where each form field and printed word went, for schema/layouts/la-oc.json (see form_layout()).
        self.regions: dict[str, list[float]] = {}
        self.words: list[tuple[str, list[float]]] = []

    def t(self, x, y, s, face="arial", size=26, fill=0, anchor="la"):
        s, f = str(s), F(face, size)
        self.d.text((x, y), s, font=f, fill=fill, anchor=anchor)
        left, top, _, bottom = self.d.textbbox((x, y), s, font=f, anchor=anchor)
        at = 0
        for w in s.split(" "):
            if w:
                x0 = left + f.getlength(s[:at])
                self.words.append((w, [x0, top, x0 + f.getlength(w), bottom]))
            at += len(w) + 1
        return f.getlength(s)

    def mark(self, fid, x0, y0, x1, y1):
        """Record that field fid covers this box (boxes for the same field are joined)."""
        r = self.regions.get(fid)
        self.regions[fid] = [min(r[0], x0), min(r[1], y0), max(r[2], x1), max(r[3], y1)] if r else [x0, y0, x1, y1]

    def wrap(self, x, y, width, s, face="arial", size=26, lh=None, fill=0):
        f, lh = F(face, size), lh or int(size * 1.32)
        for para in str(s).split("\n"):
            cur = ""
            for w in para.split():
                trial = f"{cur} {w}".strip()
                if f.getlength(trial) > width and cur:
                    self.d.text((x, y), cur, font=f, fill=fill)
                    y += lh
                    cur = w
                else:
                    cur = trial
            self.d.text((x, y), cur, font=f, fill=fill)
            y += lh
        return y

    def hand(self, x, y, s, size=40):
        if not s:
            return
        f = F(f"hand{self.pen}", size)
        cx = x
        for ch in str(s):
            self.d.text((cx, y + self.rng.uniform(-2, 2)), ch, font=f, fill=30)
            cx += f.getlength(ch) * self.rng.uniform(0.97, 1.05)

    def line(self, x0, y0, x1, y1, w=2, fill=0):
        self.d.line([x0, y0, x1, y1], fill=fill, width=w)

    def rect(self, x0, y0, x1, y1, w=2, fill=None):
        self.d.rectangle([x0, y0, x1, y1], outline=0, width=w, fill=fill)

    def box(self, x, y, label="", on=False, size=24, face="arial", mark="check"):
        """A printed check box with a label; when on, a hand-drawn check or X over it."""
        self.rect(x, y, x + size, y + size, w=2)
        if label:
            self.t(x + size + 8, y - 2, label, face, size)
        if on:
            j = self.rng.uniform
            if mark == "x":
                self.d.line([x + 2 + j(-2, 2), y + 2, x + size - 2, y + size - 2 + j(-2, 2)], fill=20, width=4)
                self.d.line([x + size - 2, y + 2 + j(-2, 2), x + 2, y + size - 2], fill=20, width=4)
            else:
                self.d.line([(x + 3, y + size * 0.5), (x + size * 0.4, y + size - 2), (x + size + 10 + j(0, 6), y - 14 + j(-4, 4))],
                            fill=20, width=4)
        return x + size + 8 + (F(face, size).getlength(label) if label else 0)

    def field(self, x, y, label, value, x1, size=24, face="arial", hand_size=40, fid=None):
        """Printed label, underline to x1, and a handwritten value on it."""
        if fid:
            self.mark(fid, x, y - 6, x1, y + size + 10)
        lx = x + self.t(x, y, label, face, size) + 8
        self.line(lx, y + size + 4, x1, y + size + 4, w=1)
        self.hand(lx + 6, y + size - hand_size + 6, value, hand_size)


def footer_page(c, n, of, p, printed=True):
    if printed:
        c.t(80, c.h - 120, f"{p['hospital']}   Printed by: {p['sw'].split(',')[0]}   {p['fax_date']} 3:00 PM", "verdana", 18)
    c.t(c.w - 90, c.h - 120, f"{n}/{of}", "verdana", 18, anchor="ra")


def ehr_banner(c, p):
    """The Epic-style patient banner that the real packet has blacked out."""
    c.rect(90, 70, c.w - 90, 150, w=0, fill=235)
    c.t(110, 80, f"{p['last']}, {p['first']} {p['mi']}", "verdanab", 26)
    c.t(110, 116, f"MRN: {p['mrn']}   DOB: {p['dob']} ({p['age']} y.o. {p['sex'][0]})   Acct: {p['account']}   "
                  f"Adm: {p['admit']}", "verdana", 18)
    c.t(c.w - 110, 80, p["hospital"], "verdana", 20, anchor="ra")


def note_header(c, p, author, kind, status, dos, extra=None):
    ehr_banner(c, p)
    y = 200
    c.t(110, y, author, "verdanab", 22)
    c.t(110, y + 32, extra or "", "verdana", 18)
    c.t(620, y, kind, "verdana", 22)
    c.t(620, y + 30, status, "verdana", 20)
    c.t(1050, y, f"Date of Service: {dos}", "verdana", 20)
    c.t(1050, y + 30, f"Creation Time: {dos}", "verdana", 18)
    return y + 100


def blocks(c, y, items, x=110, width=None, size=24):
    """Lay out a list of (kind, payload) blocks top to bottom."""
    width = width or c.w - x - 110
    for kind, val in items:
        if kind == "h":
            y += 10
            c.t(x, y, val, "verdanab", size)
            y += int(size * 1.5)
        elif kind == "p":
            y = c.wrap(x, y, width, val, "verdana", size)
        elif kind == "b":
            y = c.wrap(x, y, width, val, "verdanab", size)
        elif kind == "gap":
            y += val
        elif kind == "bul":
            for s in val:
                c.t(x + 20, y, "•", "verdana", size)
                y = c.wrap(x + 46, y, width - 46, s, "verdana", size)
        elif kind == "kv":
            for k, v in val:
                c.t(x, y, k, "verdana", size)
                c.t(x + 260, y, v, "verdana", size)
                y += int(size * 1.35)
        elif kind == "kvb":
            for k, v in val:
                c.t(x, y, k, "verdanab", size)
                c.t(x + 420, y, v, "verdana", size)
                y += int(size * 1.35)
    return y


# ---------------------------------------------------------------- page 1: fax cover

def fax_cover(p, rng):
    c = Canvas(rng=rng)
    c.t(150, 150, p["hospital"], "timesb", 34)
    c.t(150, 192, p["hosp_addr"], "times", 24)
    c.t(150, 330, "FAX COVER SHEET", "timesb", 48)
    rows = [("FROM", f"{p['referrer']} - Case Management, {p['hospital']}"), ("SENDER FAX", p["hosp_fax"]), (None, None),
            ("TO", "Illumination Foundation"), ("FAX NUMBER", "714-555-0108"), ("DATE", p["fax_date"]),
            ("SUBJECT", f"Referral for RECUP CARE - {p['first'].title()} {p['last'].title()} (DOB {p['dob']})")]
    y = 440
    for k, v in rows:
        if k:
            c.t(150, y, k, "timesb", 24)
            c.t(400, y, v, "times", 24)
            c.line(150, y + 32, 1240, y + 32, 1)
        y += 40 if k else 40
    c.t(150, 820, "MESSAGE", "timesb", 28)
    c.line(150, 860, 1240, 860, 2)
    y = c.wrap(150, 920, 1090, "Hello,", "times", 27)
    y = c.wrap(150, y, 1090, p["cover_msg"], "times", 27)
    y = c.wrap(150, y, 1090, "Thank you for your consideration,", "times", 27)
    y = c.wrap(150, y + 10, 1090, f"{p['referrer']}\n{p['referrer_phone']} | {p['referrer_email']}", "times", 27)
    c.wrap(150, 1760, 1100, "Confidentiality Notice: This fax message and its attachments are for the sole use of the intended "
           "recipient(s) and may contain confidential and privileged information. Any unauthorized review, use, disclosure or "
           f"distribution is prohibited. If you are not the intended recipient, please report this occurrence to the Compliance "
           f"& Privacy Office at {p['hosp_phone']}. Please attempt to contact the sender before destroying all copies of the "
           "fax message and its attachments.", "courier", 17)
    return c.img


# ---------------------------------------------------------------- page 2: Illumination LA/OC referral form

def if_form(p, rng):
    return if_form_canvas(p, rng, Canvas(rng=rng, pen=p["font"])).img


def if_form_canvas(p, rng, c):
    c.t(120, 120, "ILLUMINATION", "arial", 20)
    c.t(120, 146, "RECUPERATIVE", "arialb", 40)
    c.t(1580, 160, "LA/OC REFERRAL FORM", "arial", 40, fill=110, anchor="ra")
    c.line(100, 240, 1600, 240, 4)
    c.wrap(110, 262, 1480, "To refer a patient, please complete the entire form including supporting documents and FAX to "
           "714-555-0108 or email to RECUP@ifhomeless.test For all referral questions, please contact IF Referral Coordinator "
           "at 714-555-0109.", "arial", 19)
    c.rect(105, 310, 1600, 430)
    y = 320
    c.field(115, y, "Referring Hospital", p["hospital"], 840, 22, hand_size=34, fid="referring_hospital")
    c.field(860, y, "Dept/Floor", p["unit"], 1590, 22, hand_size=34, fid="dept_floor")
    c.field(115, y + 28, "SW/CM/RN:", p["referrer"], 840, 22, hand_size=34, fid="referrer_name")
    c.field(860, y + 28, "Phone/pager#:", p["referrer_phone"], 1590, 22, hand_size=34, fid="referrer_phone")
    c.field(115, y + 56, "E-mail", p["referrer_email"], 840, 22, hand_size=34, fid="referrer_email")
    c.field(860, y + 56, "Nursing station#:", p["nursing_phone"], 1590, 22, hand_size=34, fid="nursing_station_phone")
    c.field(115, y + 84, "Authorized by:", p["authorized_by"], 840, 22, hand_size=34, fid="authorized_by")
    c.field(860, y + 84, "phone#:", p["authorized_phone"], 1590, 22, hand_size=34, fid="authorized_by_phone")
    y = 460
    c.field(110, y, "Patient Name", f"{p['first'].title()} {p['last'].title()}", 720, 22, fid="patient_name")
    c.field(730, y, "MRN", p["mrn"], 1080, 22, fid="mrn")
    c.field(1090, y, "DOB", p["dob"], 1590, 22, fid="dob")
    y += 42
    x = c.t(110, y, "Gender:", "arial", 22) + 125
    for g in ["Male", "Female", "Transgender"]:
        x = c.box(x, y, g, p["sex"] == g, 22, mark="x") + 30
    c.mark("gender", 110, y - 6, x - 30, y + 32)
    c.field(x, y, "Ethnicity:", p["ethnicity"], 1150, 22, hand_size=34, fid="ethnicity")
    c.field(1160, y, "Social Security# (last 4)", p["ssn4"], 1590, 22, hand_size=34, fid="ssn_last4")
    y += 40
    c.box(110, y, "ED Visit", False, 22)
    c.box(290, y, "Hospital Admit", True, 22, mark="x")
    c.field(520, y, "Date", p["admit"], 900, 22, hand_size=34, fid="admit_date")
    c.field(1000, y, "Expected Discharge Date", p["dc"], 1590, 22, hand_size=34)
    y += 42
    c.field(110, y, "Insurance Type:", p["insurance"], 560, 22, fid="insurance")
    x = c.t(580, y, "English Speaking?", "arial", 22) + 590
    x = c.box(x, y, "Yes", p["english"], 22) + 20
    x = c.box(x, y, "No", not p["english"], 22) + 20
    c.field(x + 10, y, "*Primary Language Spoken:", p["language"], 1590, 22, fid="preferred_language")
    y += 46
    c.t(110, y, "PLEASE VERIFY:", "arialb", 20)
    c.box(300, y, "Currently homeless", p["homeless"], 20)
    c.t(560, y, "Check if:", "arial", 20)
    end = c.box(660, y, "Homeless for more than 1 year continuously or 4 episodes in last 3 years", p["homeless_long"], 20)
    c.mark("housing_situation", 110, y - 6, end, y + 28)
    y += 40
    c.t(110, y, "CHIEF COMPLAINT/ADMITTING DIAGNOSIS:", "arialb", 20)
    c.hand(120, y + 18, p["form_cc"], 36 if len(p["form_cc"]) < 80 else 31)
    c.line(110, y + 56, 1590, y + 56, 1)
    c.mark("chief_complaint", 110, y - 4, 1590, y + 60)
    y += 80
    x = c.t(110, y, "SUBSTANCE ABUSE?", "arialb", 20) + 125
    x = c.box(x, y, "None", not p["substances"], 20) + 20
    for s in ["Alcohol", "Cocaine", "Heroin", "Meth"]:
        x = c.box(x, y, s, s in p["substances"], 20, mark="x") + 20
    c.box(x, y, "Other: ______________", False, 20)
    y += 36
    last = sorted(p["substances"].values())[-1] if p["substances"] else ""
    c.field(110, y, "Last Date Used:", last, 640, 20, hand_size=32)
    x = c.t(760, y, "Current withdrawals:", "arial", 20) + 770
    x = c.box(x, y, "No", not p["withdrawals"], 20) + 20
    c.box(x, y, "Yes  *Please explain__________", p["withdrawals"], 20)
    y += 46
    x = c.t(110, y, "ANY WOUNDS?", "arialb", 20) + 125
    x = c.box(x, y, "Yes", p["wound"], 20, mark="x") + 16
    x = c.box(x, y, "No", not p["wound"], 20, mark="x") + 16
    c.mark("wounds", 110, y - 6, x - 16, y + 28)
    c.field(x, y, "If/Loc/Size/Stage:", p["wound_desc"], 1590, 20, hand_size=34, fid="wounds_detail")
    y += 40
    x = c.t(110, y, "Independent with wound care?", "arial", 20) + 120
    wi = p["wound_independent"]
    x = c.box(x, y, "Yes", wi is True, 20) + 16
    x = c.box(x, y, "No", wi is False, 20) + 16
    c.mark("independent_wound_care", 110, y - 6, x - 16, y + 28)
    hx = x
    x = c.t(x, y, "If no, will Home Health be ordered?", "arial", 20) + x + 10
    hh = p["wound"] and wi is False
    x = c.box(x, y, "Yes", hh, 20) + 16
    c.mark("home_health_ordered", hx, y - 6, c.box(x, y, "no", p["wound"] and not hh, 20), y + 28)
    y += 40
    x = c.t(110, y, "PPD/TB test or Chest XRAY performed?", "arial", 20) + 120
    x = c.box(x, y, "yes", bool(p["tb"]), 20) + 16
    x = c.box(x, y, "no", not p["tb"], 20, mark="x") + 16
    c.mark("tb_test_done", 110, y - 6, x - 16, y + 28)
    c.field(x + 20, y, "Date:", p["tb"][0] if p["tb"] else "N/A", 1040, 20, hand_size=32, fid="tb_test_date")
    c.field(1050, y, "Results:", p["tb"][1] if p["tb"] else "", 1590, 20, hand_size=28, fid="tb_test_results")
    y += 46
    x = c.t(110, y, "ANY LIMITATIONS, BEHAVIORAL CHALLENGES OR MENTAL HEALTH ISSUES?", "arialb", 19) + 120
    c.mark("has_limitations", 110, y - 6, c.box(x, y, "None", not p["mh"], 20), y + 28)
    c.mark("behavioral_flags", x + 120, y - 6, c.box(x + 120, y, "Auditory/Visual Hallucinations", False, 20), y + 28)
    y += 40
    x = c.box(110, y, "Mental Health DX IF yes, what type?:", bool(p["mh"]), 20, mark="x")
    c.mark("behavioral_flags", 110, y - 6, x, y + 28)
    c.hand(x + 20, y - 14, p["mh_type"], 36)
    c.line(x + 10, y + 24, 1150, y + 24, 1)
    c.mark("mental_health_dx_type", x + 10, y - 10, 1150, y + 28)
    c.mark("behavioral_flags", 1180, y - 6, c.box(1180, y, "Non-compliant", False, 20), y + 28)
    c.mark("behavioral_flags", 1400, y - 6, c.box(1400, y, "forgetful", False, 20), y + 28)
    y += 40
    c.mark("behavioral_flags", 110, y - 6, c.box(110, y, "Cognitive Impairment", False, 20), y + 28)
    c.mark("behavioral_flags", 400, y - 6, c.box(400, y, "Reg. Sex offender", False, 20), y + 28)
    c.mark("behavioral_explain", 650, y - 6, c.box(650, y, "other, please explain ____________________________", False, 20), y + 28)
    y += 60
    c.rect(105, y, 1600, y + 320)
    y += 16

    def yn(x, y, label, val, explain=None, fid=None, explain_fid=None):
        x0 = x
        x = c.t(x, y, label, "arial", 20) + x + 10
        x = c.box(x, y, "Yes", val is True, 20) + 14
        x = c.box(x, y, "No", val is False, 20) + 14
        if fid:
            c.mark(fid, x0, y - 6, x - 14, y + 28)
        if explain is not None:
            ex = x
            x = c.t(x, y, "*Please explain:", "arial", 20) + x + 6
            c.hand(x, y - 14, explain, 32)
            c.line(x, y + 22, x + 220, y + 22, 1)
            if explain_fid:
                c.mark(explain_fid, ex, y - 10, x + 220, y + 28)

    yn(120, y, "Requires O2?", p["o2"], fid="o2")
    yn(620, y, "Self Administer All Meds?", p["self_meds"], "N/A", fid="self_admin_meds")
    y += 38
    yn(120, y, "Continent of Bowel & Bladder?", p["continent"], fid="continent")
    yn(780, y, "Colostomy/Ileostomy", False, fid="ostomy")
    yn(1240, y, "Foley Catheter", False, fid="foley")
    y += 38
    yn(120, y, "Independent w/all ADL's?", p["adls"], "N/A")
    y += 38
    x = c.t(120, y, "Diabetic?", "arialb", 20) + 130
    x = c.box(x, y, "No", not p["diabetic"], 20) + 14
    x = c.box(x, y, "If Yes, then:", p["diabetic"], 20) + 14
    c.mark("diabetes", 120, y - 6, x - 14, y + 28)
    ix = x
    x = c.box(x, y, "Insulin", p["insulin"], 20) + 14
    c.mark("insulin", ix, y - 6, x - 14, y + 28)
    ox = x
    x = c.box(x, y, "Oral Meds", p["diabetic"] and not p["insulin"], 20) + 30
    c.mark("diabetes_oral_meds", ox, y - 6, x - 30, y + 28)
    cx = x
    x = c.t(x, y, "Communicable Diseases?:", "arial", 20) + x + 8
    c.mark("active_infection", cx, y - 6, x, y + 28)
    c.mark("active_infection_explain", x, y - 16, 1590, y + 28)
    c.hand(x, y - 16, p["communicable"], 30 if len(p["communicable"]) > 12 else 34)
    y += 38
    x = c.t(120, y, "Anticoagulants?:", "arial", 20) + 130
    x = c.box(x, y, "No", not p["anticoag"], 20) + 14
    x = c.box(x, y, "IF yes, Requires INR/PT/PTT checks through Home Health or Clinic?", p["anticoag"], 20) + 10
    c.hand(x, y - 14, "None", 32)
    y += 38
    yn(120, y, "Ambulatory?", p["ambulatory"], fid="ambulatory")
    yn(560, y, "Assistive device?", bool(p["device"]), p["device"] or "N/A", fid="assistive_device", explain_fid="assistive_device_explain")
    y += 38
    yn(120, y, "Does Patient have a car?", p["car"], fid="car")
    yn(620, y, "Spouse/Partner?", p["partner"])
    yn(1130, y, "Service Animal?", p["service_animal"], fid="service_animal")
    y += 70
    c.t(830, y, "Length of Stay authorized in Recuperative Care:____days", "arialb", 22, anchor="ma")
    c.mark("los_authorized_days", *c.d.textbbox((830, y), "Length of Stay authorized in Recuperative Care:____days", font=F("arialb", 22), anchor="ma"))
    y += 40
    x = c.t(110, y, "Attached Docs:", "arialb", 20) + 120
    for d in ["Face Sheet", "H&P", "Med List", "Psych notes", "Surgical notes", "PT/OT Eval.", "SW notes"]:
        x = c.box(x, y, d, d in p["attached"], 20) + 22
    y += 50
    c.line(100, y, 1600, y, 4)
    c.t(830, y + 10, "IF STAFF ONLY", "arialb", 20, anchor="ma")
    y += 50
    c.t(110, y, "Date Received:________  Reviewed by:______________  Approved: ☐ Yes ☐ No  Date:_______  Auth#______",
        "arial", 20)
    c.t(110, y + 36, "Denied Reason?:___________________________  Admission Date/time:______________  Exit Date:________",
        "arial", 20)
    c.t(110, y + 72, "Extension Requested?: ☐ no ☐ yes  If yes, Approved additional days?:______ by:_______  TOTAL LOS:______",
        "arial", 20)
    c.t(830, y + 130, "WWW.IFRECUP.TEST  |  COPYRIGHT © 2016, ILLUMINATION FOUNDATION. ALL RIGHTS RESERVED.", "arial", 15,
        fill=90, anchor="ma")
    return c


# ---------------------------------------------------------------- pages 3-8: CalAIM referral/authorization request

def calaim_head(c, n):
    c.t(1580, 130, "CalAIM Recuperative Care/Short-Term Post Hospitalization", "arial", 26, anchor="ra")
    c.t(1580, 162, "Referral/Authorization Form", "arial", 26, anchor="ra")
    c.t(1580, 194, f"Page {n} of 6", "arial", 26, anchor="ra")
    c.t(1580, 2030, f"Page {n} of 6", "arial", 22, anchor="ra")


def calaim(p, rng):
    pages = []
    hs = 38
    # Page 1
    c = Canvas(rng=rng, pen=p["font"])
    c.t(140, 160, "CalOptima Health", "arial", 46, fill=90)
    for i, line in enumerate(["CalAIM Recuperative Care/Short-Term Post", "Hospitalization",
                              "Referral/Authorization Request"]):
        c.t(1570, 150 + i * 36, line, "timesb", 32, anchor="ra")
    c.t(1570, 258, "Page 1 of 6", "times", 28, anchor="ra")
    c.t(140, 330, "Instructions:", "arialb", 26)
    c.wrap(140, 362, 1420, "Please complete this form and attach the following documents: Plan of Care, Discharge Plan, PT/OT "
           "notes and H&P. Authorization may be denied if this information is not provided.", "arial", 26)
    c.t(140, 470, "Step 1: Complete all information below.", "arialb", 26)
    y = 530
    c.t(150, y, "Referral Information", "arialb", 27)
    rows = [
        [("Referral date:", p["fax_date"], 150, 700), ("Referred by:", p["referrer"], 760, 1560)],
        [("Agency or relationship to member:", f"{p['hospital']} - Case Mgmt", 150, 1560)],
        [("Referring provider National Provider Identifier (NPI) (if applicable):", p["hosp_npi"], 150, 1560)],
        [("Phone:", p["referrer_phone"], 150, 560), ("Fax:", p["hosp_fax"], 580, 960), ("Email:", p["referrer_email"], 980, 1580)],
    ]
    y += 44
    for row in rows:
        for label, val, x0, x1 in row:
            c.field(x0, y, label, val, x1, 26, hand_size=hs if len(val) < 26 else 32)
        y += 46
    y += 20
    c.t(150, y, "Member Information", "arialb", 27)
    y += 44
    for row in [
        [("Member name:", f"{p['first'].title()} {p['last'].title()}", 150, 760), ("CalOptima Health ID:", p["cin"], 780, 1500)],
        [("Date of birth:", p["dob"], 150, 760), ("Member's preferred language:", p["language"], 780, 1500)],
        [("Phone:", p["phone"], 150, 760), ("Email:", "N/A", 780, 1500)],
    ]:
        for label, val, x0, x1 in row:
            c.field(x0, y, label, val, x1, 26, hand_size=hs)
        y += 46
    x = c.t(150, y, "Is the member currently in hospital?", "arial", 26) + 170
    x = c.box(x, y, "Yes", True, 26, mark="x") + 30
    c.box(x, y, "No", False, 26)
    y += 46
    c.field(150, y, "Last visit to PCP:", "unknown" if "None" in p["pcp"] else "06/2026", 760, 26, hand_size=hs)
    c.field(780, y, "Next PCP visit:", "", 1500, 26)
    y += 70
    c.t(150, y, "Primary Care Provider (PCP) Information", "arialb", 27)
    y += 44
    c.field(150, y, "Name:", p["pcp"], 1000, 26, hand_size=34)
    y += 46
    c.field(150, y, "Phone:", p["pcp_phone"], 760, 26, hand_size=hs)
    c.field(780, y, "Address:", p["pcp_addr"], 1580, 26, hand_size=26)
    y += 80
    y = c.wrap(140, y, 1420, "Step 2: Check the boxes for the Community Supports the member is interested in receiving. The "
               "following pages provide additional eligibility information about Community Supports.", "arial", 26)
    y = c.wrap(140, y + 20, 1420, "Step 3: Please check off the most appropriate Recuperative Care/Short-Term Post-Hospitalization "
               "Housing pathways based on the eligibility listed in the following pages.", "arial", 26)
    c.wrap(140, y + 20, 1420, "Please note that members may not receive more than a combined 182 days of Short-Term "
           "Post-Hospitalization, Recuperative Care and Transitional Rent during any rolling 12-month period.", "arialb", 24,
           fill=100)
    pages.append(c.img)

    # Page 2 and the top of page 3: pathway table (static text).
    def pathway(c, y, checked, name, desc, elig):
        c.box(150, y + 4, "", checked, 26, mark="x")
        c.wrap(200, y, 220, name, "arial", 26)
        c.wrap(440, y, 330, desc, "arial", 26)
        return max(c.wrap(800, y, 760, elig, "arial", 26), y + 200) + 30

    c = Canvas(rng=rng, pen=p["font"])
    calaim_head(c, 2)
    for x, h in [(200, "Pathway"), (440, "Description"), (800, "Eligibility")]:
        c.t(x, 250, h, "arialb", 28)
    y = 300
    y = pathway(c, y, True, "Recuperative Care only", "Short-term residential care for individuals who no longer require "
                "hospitalization but will need to heal from an injury, illness or mental health condition.",
                "Both must apply:\n   Homeless or at risk of homelessness\n   Member requires recovery in order to heal from an "
                "injury or illness.")
    y = pathway(c, y, False, "Short-Term Post-Hospitalization Housing only", "Assists members with high medical or behavioral "
                "health needs with short-term housing after leaving the hospital, recovery facility, recuperative care or "
                "other facility.", "Member must meet the following criteria:\n(1) Member is exiting an institution, which "
                "includes recuperative care facilities, inpatient hospitals, residential substance use disorder or mental health "
                "treatment facilities, correctional facilities or nursing facilities.\nAND\n(2) Member is experiencing "
                "homelessness.\nAND\n(3) Member meets one the following criteria: a. Is receiving ECM b. Have one or more serious "
                "chronic conditions c. Have a serious mental illness; or d. Is at risk of institutionalization.\nAND\n(4) Member "
                "is having ongoing physical and behavioral health needs as determined by a qualified health professional.")
    pathway(c, y, False, "Nursing Facility with plans to transition to Recuperative Care", "Short-term residential care for "
            "individuals who no longer require hospitalization but still need to heal from an injury or illness or a mental "
            "health condition.", "Select one that applies:\n   Homeless or at risk of homelessness\n   Member who is at risk of "
            "hospitalization or at post-hospitalization\n   Members who live alone with no formal supports.")
    pages.append(c.img)

    # Page 3
    c = Canvas(rng=rng, pen=p["font"])
    calaim_head(c, 3)
    pathway(c, 250, False, "Recuperative Care with plans to transition to Short-Term Post-Hospitalization Housing",
            "Short-term residential care for individuals who no longer require hospitalization but still need to heal from an "
            "injury, illness or mental health condition.", "Select one that applies:\n   Homeless or at risk of homelessness\n"
            "   Individuals who are at risk of hospitalization or at post-hospitalization\nOR\n   Individuals who live alone "
            "with no formal supports\nAND\n   Member is exiting recuperative care, inpatient hospital, residential substance "
            "use disorder treatment facility, residential mental health treatment facility, correctional facility or nursing "
            "facility.")
    y = 760
    c.t(150, y, "Admitting Diagnosis", "arialb", 27)
    c.t(150, y + 40, "Qualifying Recuperative Care/Short-Term Post-Hospitalization Housing diagnosis:", "arial", 26)
    c.hand(160, y + 80, p["qual_dx"], 44)
    y += 200
    c.field(150, y, "ED visit/hospital admit date:", p["admit"], 760, 26, hand_size=hs)
    c.field(800, y, "Expected discharge date:", p["dc"], 1400, 26, hand_size=hs)
    y += 80
    x = c.t(150, y, "Will the member need any specialist follow-up care?", "arialb", 26) + 170
    x = c.box(x, y, "Yes", True, 26) + 20
    c.box(x, y, "No", False, 26)
    fu = [(p["consult_specialty"], p["consultant"], p["hosp_phone"], p["consult_fu"])] + [tuple(f) for f in p["followups"]]
    y += 46
    for i in range(3):
        row = fu[i] if i < len(fu) else ("", "", "", "")
        for j, (label, val) in enumerate(zip(["Specialty:", "Provider name:", "Phone:", "Scheduled appt date:"], row)):
            lx = 190 + c.t(190, y, f"{i + 1}) {label}" if j == 0 else f"     {label}", "arial", 26)
            c.hand(lx + 14, y - 12, val, 36)
            y += 40
    y += 30
    c.t(150, y, "Authorized Home Health Provider", "arialb", 27)
    y += 44
    x = c.t(150, y, "Service(s):", "arial", 26) + 160
    hh = p["home_health"]
    for s in ["Physical therapy", "Occupational therapy", "Speech", "Wound care"]:
        x = c.box(x, y, s, bool(hh) and s in hh[1], 26) + 26
    if hh:
        c.field(150, y + 50, "Agency:", hh[0], 1200, 26, hand_size=36)
    pages.append(c.img)

    # Page 4
    c = Canvas(rng=rng, pen=p["font"])
    calaim_head(c, 4)
    y = 250
    c.box(150, y, "Personal care", False, 26)
    c.field(150, y + 40, "Provider name:", "", 900, 26)
    c.field(920, y + 40, "Start date:", "", 1500, 26)
    y += 120
    c.t(150, y, "Health Information", "arialb", 27)
    c.t(150, y + 36, "General", "arialb", 26)
    x = c.t(150, y + 76, "Gender:", "arial", 26) + 160
    x = c.box(x, y + 76, "Male", p["sex"] == "Male", 26, mark="x") + 20
    c.box(x, y + 76, "Female", p["sex"] == "Female", 26, mark="x")
    c.box(150, y + 114, "Placement needs related to gender.", False, 26)
    c.t(1060, y + 70, "COVID vaccine", "arial", 26)
    for i, dose in enumerate(["Dose 1:", "Dose 2:", "Booster 1:", "Booster 2:"]):
        yy = y + 106 + i * 36
        c.t(1060, yy, dose, "arial", 26)
        had = i < p["covid_doses"]
        c.box(1200, yy, "Yes", had, 24)
        c.box(1300, yy, "No", not had, 24)
    y += 290
    x = c.t(150, y, "TB test or chest X-ray performed?", "arial", 26) + 170
    x = c.box(x, y, "Yes", bool(p["tb"]), 26, mark="x") + 20
    c.box(x, y, "No", not p["tb"], 26, mark="x")
    c.field(150, y + 40, "If Yes, date:", p["tb"][0] if p["tb"] else "", 700, 26, hand_size=36)
    c.t(150, y + 84, "Results:", "arial", 26)
    neg = bool(p["tb"])
    c.box(270, y + 84, "Positive", False, 26)
    c.box(270, y + 118, "Negative", neg, 26)
    c.t(800, y + 84, "Comments:", "arial", 26)
    if p["tb"]:
        c.hand(950, y + 70, p["tb"][1], 32)
    y += 170
    c.t(150, y, "Neuro", "arialb", 26)
    x = c.t(150, y + 40, "Alert and oriented to:", "arial", 26) + 170
    for s in ["Person", "Place", "Time", "Situation"]:
        x = c.box(x, y + 40, s, True, 26, mark="x") + 24
    c.t(150, y + 90, "Respiratory", "arialb", 26)
    x = c.box(150, y + 130, "Requires O2 (Explain):", p["o2"], 26)
    c.hand(x + 20, y + 112, p["o2_note"], 34)
    y += 200
    c.t(150, y, "GI/GU", "arialb", 26)
    for i, s in enumerate(["Incontinent of bowel", "Incontinent of bladder", "Colostomy/ileostomy", "Foley catheter"]):
        c.box(150, y + 40 + i * 34, s, False, 24)
    c.t(1060, y + 40, "Does the member require tube feeding?", "arial", 26)
    c.box(1060, y + 76, "Yes", False, 24)
    c.box(1170, y + 76, "No", True, 24)
    y += 200
    c.t(150, y, "Ambulation/Mobility", "arialb", 26)
    x = c.t(150, y + 40, "Can the member independently perform ADLs?", "arial", 26) + 170
    x = c.box(x, y + 40, "Yes", p["adls"], 26) + 20
    c.box(x, y + 40, "No", not p["adls"], 26)
    c.field(150, y + 80, "How far can the member ambulate?",
            p["ambulate"], 1300, 26,
            hand_size=36)
    x = c.t(150, y + 130, "Does the member use DME?", "arial", 26) + 170
    x = c.box(x, y + 130, "Yes", bool(p["device"]), 26, mark="x") + 20
    c.box(x, y + 130, "No", not p["device"], 26, mark="x")
    c.field(150, y + 170, "If yes, please explain:", p["device"] or "", 1300, 26, hand_size=34)
    for i, (lbl, v) in enumerate([("Fractures:", p["fracture"]), ("Recent surgery:", p["recent_surgery"])]):
        yy = y + 220 + i * 44
        c.t(150, yy, lbl, "arial", 26)
        c.box(370, yy, "Yes", v, 26)
        c.box(480, yy, "No", not v, 26)
    y += 330
    c.t(150, y, "Integumentary", "arialb", 26)
    x = c.t(150, y + 40, "Wound(s):", "arial", 26) + 170
    x = c.box(x, y + 40, "Yes", p["wound"], 26) + 20
    c.box(x, y + 40, "No", not p["wound"], 26)
    c.t(150, y + 80, "If yes, provide location(s)/size/stage:", "arial", 26)
    c.hand(640, y + 66, p["wound_desc"], 30)
    x = c.t(150, y + 130, "Independent with wound care?", "arial", 26) + 170
    x = c.box(x, y + 130, "Yes", p["wound_independent"] is True, 26) + 20
    c.box(x, y + 130, "No", p["wound_independent"] is False, 26)
    pages.append(c.img)

    # Page 5
    c = Canvas(rng=rng, pen=p["font"])
    calaim_head(c, 5)
    y = 250
    c.t(150, y, "Infections", "arialb", 27)
    c.t(150, y + 40, "Communicable disease/isolation describe:", "arial", 26)
    c.hand(640, y + 26, p["communicable"], 34)
    x = c.t(150, y + 90, "IV Antibiotics:", "arial", 26) + 160
    x = c.box(x, y + 90, "Yes", p["iv_abx"], 26) + 20
    c.box(x, y + 90, "No", not p["iv_abx"], 26)
    c.field(150, y + 126, "If yes, frequency:", "", 900, 26)
    y += 180
    c.t(150, y, "Psycho-social Information:", "arialb", 27)
    c.box(150, y + 40, "Registered sex offender", False, 26)
    c.t(800, y + 34, "Member has:", "arial", 26)
    c.box(800, y + 70, "Car", p["car"], 24)
    c.box(920, y + 70, "Spouse/partner", p["partner"], 24)
    c.box(800, y + 104, "Service animal", False, 24)
    c.box(1050, y + 104, "Pets", False, 24)
    y += 170
    c.t(150, y, "Substance Use", "arialb", 27)
    c.box(380, y, "None", not p["substances"], 26, mark="x")
    c.t(150, y + 40, "Type", "arial", 26)
    c.t(500, y + 40, "Last Date Used", "arial", 26)
    for i, s in enumerate(["Alcohol", "Cocaine", "Heroin", "Methamphetamine", "Opioid", "Other"]):
        yy = y + 80 + i * 40
        key = "Meth" if s == "Methamphetamine" else s
        c.box(150, yy, s, key in p["substances"], 26, mark="x")
        if key in p["substances"]:
            c.hand(500, yy - 14, p["substances"][key], 34)
    y += 340
    c.t(150, y, "Mental Health DX", "arialb", 27)
    x = 150
    for s in ["Anxiety", "Bipolar", "Cognitive impairment", "Depression", "Schizophrenia"]:
        x = c.box(x, y + 40, s, s in p["mh"], 26, mark="x") + 30
    x = c.box(150, y + 80, "Trauma-related", "Trauma-related" in p["mh"], 26, mark="x") + 30
    c.box(x, y + 80, "Other (please explain):", False, 26)
    on, tx = p["mh_treatment"]
    x = c.box(150, y + 130, "Current treatment:", on, 26)
    c.hand(x + 20, y + 114, tx, 34)
    c.t(150, y + 190, "Requires assistance with ADLs, please explain:", "arial", 26)
    c.hand(760, y + 174, "N/A", 36)
    y += 290
    c.t(150, y, "Medication Management", "arialb", 27)
    x = 150
    for s, v in [("Diabetic", p["diabetic"]), ("Insulin", p["insulin"]), ("Oral meds", p["diabetic"] and not p["insulin"]),
                 ("Anticoagulants", p["anticoag"]), ("Requires INR/PTT checks", False)]:
        x = c.box(x, y + 40, s, v, 26) + 26
    c.box(150, y + 80, "Requires assistance with medication. List medication(s):", False, 26)
    if p["insulin"]:
        c.hand(170, y + 116, "Lantus 22u nightly, Humalog sliding scale - pt self-injects, needs glucometer supplies", 32)
    y = 1900
    for i, q in enumerate(["Does the member have enough medication to last through the end of the month?",
                           "Does the member understand how to obtain refills on their medications?"]):
        yy = y + i * 40
        c.t(150, yy, q, "arial", 25)
        c.box(1300, yy, "Yes", True, 24)
        c.box(1400, yy, "No", False, 24)
    pages.append(c.img)

    # Page 6
    c = Canvas(rng=rng, pen=p["font"])
    calaim_head(c, 6)
    y = 250
    c.t(150, y, "Health Information", "arialb", 27)
    x = c.t(150, y + 40, "Does the member have a preferred pharmacy?", "arial", 26) + 170
    pharm = p["pharmacy"]
    x = c.box(x, y + 40, "Yes", bool(pharm), 26) + 20
    c.box(x, y + 40, "No", not pharm, 26)
    c.field(150, y + 80, "If yes, where:", pharm or "", 1000, 26, hand_size=34)
    c.wrap(150, y + 124, 1300, "Does the member understand how to take their medication and why they are taking their "
           "medication?", "arial", 26)
    c.box(310, y + 160, "Yes", True, 26)
    c.box(420, y + 160, "No", False, 26)
    y += 240
    y = c.wrap(150, y, 1400, "Step 4: Based on the services selected for the member above, please submit this Referral Form to "
               "the most appropriate provider listed below via fax or mail.", "arial", 26)
    y += 20
    c.t(850, y, "Community Supports Provider Contact Information", "arialb", 27, anchor="ma")
    c.t(150, y + 36, "Recuperative Care and Short-Term Hospitalization", "arialb", 27)
    y += 90
    providers = [("Illumination Foundation (serving adults and children)", "714-555-0109", "714-555-0108", "recup@ifhomeless.test"),
                 ("Coastal Recovery Homes (adults)", "949-555-0131", "949-555-0132", "intake@coastalrecovery.test"),
                 ("Orange County Rescue Mission - Village of Hope", "714-555-0134", "714-555-0135", "medical@ocrm.test"),
                 ("Mercy House Living Centers", "714-555-0137", "714-555-0138", "recup@mercyhouse.test")]
    for name, ph, fx, em in providers:
        c.rect(150, y, 1560, y + 130, w=1)
        c.wrap(170, y + 14, 600, name, "arial", 25)
        c.t(860, y + 14, f"Phone number: {ph}", "arial", 25)
        c.t(860, y + 48, f"Fax number: {fx}", "arial", 25)
        c.t(860, y + 82, f"Email: {em}", "arial", 25)
        y += 130
        if name.startswith("Illumination"):
            c.t(850, y + 8, "Select from the below only after checking the capacity for OC Providers first.", "ariali", 24,
                fill=110, anchor="ma")
            y += 50
    y += 40
    c.t(850, y, "STOP", "arialb", 30, anchor="ma")
    c.t(150, y + 50, "- " * 70, "arial", 20)
    c.t(850, y + 90, "Community Supports Provider to Complete Section Below", "arialb", 27, anchor="ma")
    y = c.wrap(150, y + 130, 1400, "Step 5: Complete the section below and return the response to the referrer at the hospital "
               "or skilled nursing facility. If the member belongs to Kaiser Permanente, please submit these documents directly "
               "to Kaiser Permanente.", "arial", 26)
    c.t(150, y + 30, "Accepting/Not Accepting", "arialb", 27)
    c.t(150, y + 70, "Was the member accepted?", "arial", 26)
    c.box(500, y + 70, "Yes", False, 26)
    c.box(610, y + 70, "No", False, 26)
    c.t(150, y + 110, "If the member was not accepted for service, please provide the reason:", "arial", 26)
    pages.append(c.img)
    return pages


# ---------------------------------------------------------------- page 9: face sheet

def face_sheet(p, rng):
    c = Canvas(rng=rng)

    def section(y, title, rows, h):
        c.t(140, y, title, "timesb", 30)
        c.rect(135, y + 34, 1570, y + 34 + h, w=2)
        yy = y + 46
        for left, right in rows:
            for (k, v), xk, xv in [(left, 420, 440), (right, 1180, 1200)]:
                if k:
                    c.t(xk, yy, f"{k}:", "times", 22, anchor="ra")
                if k or v:
                    c.t(xv, yy, v, "timesb", 22)
            yy += 34
        return y + 34 + h + 14

    c.rect(135, 100, 1570, 300, w=2)
    c.t(160, 120, p["hospital"].upper(), "timesb", 32)
    c.t(160, 162, p["hosp_addr"], "times", 22)
    c.t(160, 192, f"Phone {p['hosp_phone']}   Fax {p['hosp_fax']}", "times", 22)
    c.t(160, 240, "INPATIENT FACE SHEET", "timesb", 30)
    for i, (k, v) in enumerate([("Encounter Date/Tm", p["admit_time"]), ("Inpatient Date/Tm", p["admit_time"]),
                                ("Patient Name", f"{p['last']}, {p['first']} {p['mi']}"), ("MRN", p["mrn"]),
                                ("Hospital Account", p["account"]), ("Hospital NPI #", p["hosp_npi"])]):
        c.t(1150, 112 + i * 30, f"{k}:", "times", 21, anchor="ra")
        c.t(1170, 112 + i * 30, v, "timesb", 21)
    adm = p["adm_dx"]
    y = section(320, "ENCOUNTER", [
        (("Patient Class", "Inpatient"), ("Unit", p["unit"])),
        (("Hospital Service", "Hospital Medicine"), ("Bed", p["bed"])),
        (("Admitting Provider", p["admitting"]), ("Referring Physician", p["referring_md"])),
        (("Attending Provider", p["attending"]), ("Chief Complaint", p["chief_complaint"])),
        (("Primary Care Provider", p["pcp"]), (None, None)),
        (("Adm Diagnosis", adm[0]), (None, None)),
        (("", adm[1]), (None, None)), (("", adm[2]), (None, None)),
    ], 290)
    y = section(y, "PATIENT", [
        (("Name", f"{p['last']}, {p['first']} {p['mi']}"), ("DOB", f"{p['dob']}  Age: {p['age']}")),
        (("Address", p["address"][:40]), ("Sex", p["sex"])),
        (("City/State/Zip", p["city"]), ("Marital Status", p["marital"])),
        (("Language", p["language"]), ("Religion", p["religion"])),
        (("Social Security", p["ssn"]), ("Primary Phone", p["phone"])),
        (("Ethnicity", p["ethnicity"]), (None, None)),
    ], 280)
    c.t(160, y - 60, "EMERGENCY CONTACT   " + "   ".join(x for x in p["emergency"] if x), "times", 22)
    y = section(y, "GUARANTOR", [
        (("Guarantor", f"{p['last']}, {p['first']} {p['mi']}"), ("DOB", p["dob"])),
        (("Address", p["address"][:40]), ("Sex", p["sex"])),
        (("", p["city"]), ("Home Phone", p["phone"])),
        (("Relation to Patient", "Self"), ("Work Phone", "None")),
        (("Guarantor ID", f"G{p['account'][-7:]}"), ("Status", p["guarantor_status"])),
    ], 190)
    y = section(y, "COVERAGE", [
        (("PRIMARY INSURANCE", ""), (None, None)),
        (("Payor and Phone #", "CALOPTIMA 888-555-0144"), ("Plan", p["plan"].split(" (")[0][:30])),
        (("Group Number", p["group"]), ("Coverage Effective", "01/01/2026")),
        (("Subscriber Name", f"{p['last']}, {p['first']}"), ("Subscriber DOB", p["dob"])),
        (("Subscriber ID", p["member_id"]), ("Pat. Rel. to Subscriber", "Self")),
        (("County Code", "30 - Orange"), ("Aid Code", p["aid_code"])),
        (("SECONDARY INSURANCE", "None"), (None, None)),
    ], 260)
    c.t(140, y + 20, f"Printed {p['fax_date']} 09:58 by {p['referrer'].split(',')[0]}", "times", 20)
    c.t(1570, y + 20, f"Acct {p['account']}", "times", 20, anchor="ra")
    return c.img


# ---------------------------------------------------------------- pages 10-11: wound note or PT eval

def doc2(p, rng):
    d = p["doc2"]
    c1 = Canvas(rng=rng)
    if p["doc2_kind"] == "wound":
        y = note_header(c1, p, p["wound_rn"], "Interdisciplinary", "Addendum", "10/12/2026 10:14", "Wound Care Nurse")
        title = "INPATIENT WOUND and OSTOMY PROGRESS NOTE"
    else:
        y = note_header(c1, p, p["wound_rn"], "Therapy Notes", "Signed", "10/12/2026 13:40", "Physical Therapist")
        title = "PHYSICAL THERAPY EVALUATION"
    y = blocks(c1, y + 20, [("b", title), ("gap", 20), ("h", "S - Subjective:"), ("p", d["subjective"]), ("gap", 14),
                            ("h", "O - Objective:")] + [("p", s) for s in d["objective"]] + [("gap", 14), ("h", "A - Assessment:")])
    if p["doc2_kind"] == "wound":
        items = [("p", f"Wound Location: {d['location']}"), ("p", f"Measurements: {d['measure']}"),
                 ("p", f"Undermining: {d['undermining']}"), ("p", f"Tunneling: {d['tunneling']}"),
                 ("p", f"Wound bed: {d['bed']}"), ("p", f"Periwound: {d['periwound']}"), ("p", f"Drainage: {d['drainage']}"),
                 ("p", f"Wound care: {d['care']}"), ("p", "The patient tolerated well.")]
    else:
        items = [("p", "Pt presents with decreased activity tolerance, impaired balance and gait deviations secondary to "
                       "pneumonia/COPD exacerbation and deconditioning. Prior level of function: independent community "
                       "ambulator. Rehab potential: good."),
                 ("p", "Goals (by discharge): ambulate 200 ft with FWW mod I; SpO2 >= 90% with ambulation using pursed-lip "
                       "breathing; independent with home exercise program.")]
    blocks(c1, y, items)
    footer_page(c1, 1, 2, p)

    c2 = Canvas(rng=rng)
    ehr_banner(c2, p)
    y = blocks(c2, 230, [("h", "P - Plan:"), ("p", d["plan"])], size=26)
    y += 60
    c2.t(110, y, "Revision History", "verdanab", 26)
    y += 40
    for x, h in [(110, "Date/Time"), (420, "User"), (850, "Provider Type"), (1200, "Action")]:
        c2.t(x, y, h, "verdana", 20, fill=80)
    role = "Wound Nurse" if p["doc2_kind"] == "wound" else "Physical Therapist"
    for i, act in enumerate(["Addend", "Sign"]):
        yy = y + 36 + i * 32
        for x, s in [(110, f"10/12/2026 {11 - i}:0{2 + i} AM"), (420, p["wound_rn"].split(",")[0]), (850, role), (1200, act)]:
            c2.t(x, yy, s, "verdana", 20)
    footer_page(c2, 2, 2, p)
    # This page came through the fax crooked in the real packet.
    c2.img = c2.img.rotate(rng.uniform(-4, -2.5), resample=Image.BICUBIC, fillcolor=255, expand=False)
    return [c1.img, c2.img]


# ---------------------------------------------------------------- pages 12-13: progress note; 23-24: H&P

def vitals_block(v):
    return [("h", "Vitals:"), ("kv", [(k, v[k]) for k in ["BP", "Pulse", "Resp", "Temp", "SpO2"]])]


EXAM = ["General: Awake, alert, in no apparent distress.", "Head: Normocephalic, atraumatic.",
        "Respiratory: Breathing comfortably and in no respiratory distress. No audible wheezing or stridor.",
        "Cardiovascular: Extremities are warm and well perfused.", "Neuro: Awake and alert. Moving extremities."]


def progress_note(p, rng):
    c1 = Canvas(rng=rng)
    y = note_header(c1, p, p["attending"], "Progress Notes", "Signed", "10/13/2026 08:47", "Hospitalist")
    y = blocks(c1, y, [("p", f"Patient Preferred Name: {p['first'].title()}"), ("gap", 10),
                       ("b", "Inpatient Progress Note - Hospital Medicine"), ("gap", 10), ("h", "Assessment & Plan"),
                       ("b", "• " + p["problems"][0])] + [("p", s) for s in p["problems"][1:]] + [("gap", 16)] +
               [("p", s) for s in p["plan_lines"]] + [("gap", 20), ("p", p["pn_update"]), ("gap", 10),
               ("h", "Interval Summary"), ("p", p["pn_interval"]), ("gap", 10)] + vitals_block(p["vitals_pn"]) +
               [("gap", 10), ("h", "Physical Exam"), ("p", EXAM[0])])
    footer_page(c1, 1, 2, p)
    c2 = Canvas(rng=rng)
    ehr_banner(c2, p)
    blocks(c2, 200, [("p", s) for s in EXAM[1:]] + [("p", p["exam_extra"]), ("gap", 20), ("h", "Results Review"),
           ("p", "I have reviewed the latest lab and imaging results."), ("h", "Required Daily Device Assessment:"),
           ("p", "This patient does not have a documented central line or urinary catheter."), ("gap", 30),
           ("p", f"Electronically signed by {p['attending']} at 10/13/2026 9:12 AM")])
    footer_page(c2, 2, 2, p)
    return [c1.img, c2.img]


def hp(p, rng):
    c1 = Canvas(rng=rng)
    y = note_header(c1, p, p["hp_author"], "H&P", "Signed", f"{p['admit']} 21:30", "Hospitalist")
    y = blocks(c1, y, [("b", "Inpatient History and Physical - Hospital Medicine"), ("gap", 10), ("h", "Assessment & Plan"),
                       ("b", "• " + p["problems"][0])] + [("p", s) for s in p["problems"][1:]] + [("gap", 14)] +
               [("p", s) for s in p["plan_lines"]] + [("gap", 14), ("h", "Chief complaint"),
               ("p", p["chief_complaint"].capitalize()), ("gap", 10), ("p", p["hp_hpi"]), ("gap", 10),
               ("h", "Medical/Surgical/Social/Family History"), ("p", "I have reviewed and updated the patient history."),
               ("h", "Allergies"), ("p", p["allergies"])], size=23)
    footer_page(c1, 1, 2, p)
    c2 = Canvas(rng=rng)
    ehr_banner(c2, p)
    blocks(c2, 200, vitals_block(p["vitals_hp"]) + [("gap", 20), ("h", "Physical Exam")] + [("b", s) for s in EXAM] +
           [("p", p["exam_extra"]), ("gap", 20), ("h", "Results Review"),
            ("p", "I have reviewed the latest lab and imaging results."), ("h", "Required Daily Device Assessment:"),
            ("p", "This patient does not have a documented central line or urinary catheter."), ("gap", 30),
            ("p", f"Electronically signed by {p['hp_author']} at {p['admit']} 11:58 PM")])
    footer_page(c2, 2, 2, p)
    return [c1.img, c2.img]


# ---------------------------------------------------------------- pages 14-19: consultation

def lab_days(p):
    start = datetime.strptime(p["admit"], "%m/%d/%Y")
    return [(start + timedelta(days=i)) for i in range(5)]


def consult(p, rng):
    k = p["consult"]
    pages = []
    c = Canvas(rng=rng)
    y = note_header(c, p, p["consultant"], "Consults", "Signed", "10/11/2026 14:20", f"Specialty: {p['consult_specialty']}")
    c.t(850, y, "CONSULTATION", "verdanab", 24, anchor="ma")
    y = blocks(c, y + 50, [("p", "Consults"), ("p", f"{p['consult_specialty']} consult ordered by {p['attending']}"), ("gap", 20),
               ("kvb", [("Patient:", f"{p['first'].title()} {p['last'].title()}"), ("Medical Record Number:", p["mrn"]),
                        ("Date of birth:", p["dob"]), ("", ""), ("Date of admission:", p["admit"]),
                        ("Date of service:", "10/11/2026"), ("", ""), ("Admitting Provider:", p["admitting"]),
                        ("Requesting/Referring", "Internal Medicine")]),
               ("gap", 20), ("h", "Reason for Consultation:"), ("p", k["reason"]), ("gap", 10), ("h", "Chief Complaint"),
               ("p", k["cc"]), ("gap", 10), ("h", "History of Present Illness"), ("p", k["hpi"]), ("gap", 10),
               ("p", "Past Medical History:"), ("b", "Past Medical History:"), ("kv", [("Diagnosis", "Date")])], size=23)
    blocks(c, y, [("bul", p["pmh"][:4])], size=23)
    footer_page(c, 1, 6, p)
    pages.append(c.img)

    c = Canvas(rng=rng)
    ehr_banner(c, p)
    y = blocks(c, 190, [("bul", p["pmh"][4:]), ("gap", 20), ("p", "Past Surgical History:"), ("p", p["psh"]), ("gap", 20),
                        ("b", "Current Facility-Administered Medications"), ("p", "Scheduled Meds:")] +
               [("p", m) for m in p["sched_meds"]] + [("gap", 16), ("p", "PRN Meds:")] + [("p", m) for m in p["prn_meds"]] +
               [("gap", 16), ("p", "Allergies"), ("p", p["allergies"]), ("gap", 16), ("b", "Social History"),
                ("p", "Socioeconomic History"), ("kv", [("• Marital status:", p["marital"])]), ("p", "Tobacco Use"),
                ("kv", [("• Smoking status:", p["tobacco"][:40])]), ("p", "Substance and Sexual Activity"),
                ("kv", [("• Alcohol use:", p["alcohol"][0]), ("   Alcohol/week:", f"{p['alcohol'][1]} standard drinks"),
                        ("• Drug use:", p["drugs"])])], size=22)
    footer_page(c, 2, 6, p)
    pages.append(c.img)

    c = Canvas(rng=rng)
    ehr_banner(c, p)
    a = p["alcohol"]
    homeless = "Yes" if p["homeless"] else "No"
    blocks(c, 190, [("b", "Social Drivers of Health From This Encounter"), ("gap", 10),
                    ("p", f"Tobacco Use: {'Low Risk' if p['tobacco'] == 'Never' else 'High Risk'} (10/10/2026)"),
                    ("bul", [f"Smoking Tobacco Use: {p['tobacco']}", "Smokeless Tobacco Use: Never"]),
                    ("p", f"Alcohol Use: {'Alcohol Misuse' if a[0] == 'Yes' else 'Not At Risk'} (10/10/2026)"),
                    ("p", "   AUDIT-C"),
                    ("bul", [f"Frequency of Alcohol Consumption: {a[2]}", f"Average Number of Drinks: {a[3]}",
                             f"Frequency of Binge Drinking: {a[4]}"]),
                    ("p", "Food Insecurity: Food Insecurity Present (10/10/2026)"),
                    ("bul", ["Worried About Running Out of Food in the Last Year: Sometimes true",
                             "Ran Out of Food in the Last Year: Sometimes true"]),
                    ("p", "Transportation Needs: Unmet Transportation Needs (10/10/2026)"),
                    ("bul", ["Lack of Transportation (Medical): Yes", "Lack of Transportation (Non-Medical): Yes"]),
                    ("p", "Stress: Patient declined (10/10/2026)"),
                    ("p", "Intimate Partner Violence: Not At Risk (10/10/2026)"),
                    ("bul", ["Fear of Current or Ex-Partner: No", "Emotionally Abused: No", "Physically Abused: No",
                             "Sexually Abused: No"]),
                    ("p", "Housing Stability: High Risk (10/10/2026)"),
                    ("bul", ["Unable to Pay for Housing in the Last Year: Yes", "Number of Times Moved in the Last Year: 2",
                             f"Homeless in the Last Year: {homeless}"]),
                    ("p", "Utilities: Not At Risk (10/10/2026)"), ("gap", 10), ("b", "Social History"),
                    ("p", "Social History Narrative"), ("bul", ["Not on file"]), ("gap", 20), ("p", "Family History:"),
                    ("p", "Noncontributory")], size=22)
    footer_page(c, 3, 6, p)
    pages.append(c.img)

    c = Canvas(rng=rng)
    ehr_banner(c, p)
    vs = p["vitals_series"]
    y = blocks(c, 190, [("b", "Review of Systems"), ("p", "Review of Systems"), ("p", k["ros"]),
                        ("p", "All other systems reviewed and are negative."), ("gap", 20), ("b", "Vital Signs"),
                        ("p", f"Temp: {vs['T'][2]} °C ({vs['T'][2] * 9 / 5 + 32:.1f} °F), Pulse: {vs['HR'][2]}, Resp: "
                              f"{vs['RR'][2]}, BP: {vs['SBP'][2]}/{vs['DBP'][2]}, SpO2: {vs['SpO2'][2]}%"),
                        ("p", f"Temp Min: {min(vs['T'])} °C  Max: {max(vs['T'])} °C"),
                        ("p", f"Weight: {p['weight']}, Body mass index is {p['bmi']} kg/m²."), ("gap", 20),
                        ("b", "Physical Examination")] + [("p", s) for s in k["exam"]] + [("gap", 20), ("b", "Laboratory:")],
               size=22)
    days = lab_days(p)[:2]
    L = p["labs"]
    y = lab_table(c, y, ["WBC AUTO", "HEMOGLOBIN", "HEMATOCRIT", "PLATELETS AUTO"], ["thous/mcL", "g/dL", "%", "thous/mcL"],
                  [L["WBC"][:2], L["Hgb"][:2], L["Hct"][:2], L["Plt"][:2]], days, [(4.0, 11.0), (13.0, 17.5), (38, 50), (150, 400)])
    y = lab_table(c, y + 20, ["SODIUM", "POTASSIUM", "CHLORIDE", "CO2", "BUN", "CREATININE", "CALCIUM", "GLUCOSE"],
                  ["mmol/L", "mmol/L", "mmol/L", "mmol/L", "mg/dL", "mg/dL", "mg/dL", "mg/dL"],
                  [L["Na"][:2], [4.1, 3.9], [99, 101], [28, 27], [14, 12], [0.9, 0.8], [8.6, 8.8], L["Glucose"][:2]], days,
                  [(136, 145), (3.5, 5.1), (98, 107), (21, 32), (7, 18), (0.6, 1.3), (8.5, 10.1), (70, 99)])
    footer_page(c, 4, 6, p)
    pages.append(c.img)

    c = Canvas(rng=rng)
    ehr_banner(c, p)
    items = [("b", "Microbiology:"), ("p", "Microbiology Results (last 30 days)")]
    items += [("bul", k["micro"]), ("gap", 20), ("b", "Anti-microbials:")]
    for name, date, res in k["imaging"]:
        items += [("gap", 14), ("p", name), ("p", f"Result Date: {date}"), ("p", res)]
    blocks(c, 190, items, size=22)
    footer_page(c, 5, 6, p)
    pages.append(c.img)

    c = Canvas(rng=rng)
    ehr_banner(c, p)
    blocks(c, 190, [("b", "Diagnostic Studies"), ("p", "Available data and images were reviewed personally. Significant "
                    "results and findings are addressed here or in the Assessment and Plan."), ("gap", 20),
                    ("b", "Assessment :")] + [("b", s) for s in k["assessment"]] + [("gap", 20), ("b", "Plan:")] +
           [("b", s) for s in k["plan"]] + [("gap", 30), ("p", "Complex antimicrobial therapy, counseling and treatment "
           "-including educating patient and family on antimicrobial resistance, mitigation and tailoring therapy options "
           "based on public Health data. Public health investigation as needed."), ("gap", 20),
           ("p", f"Thank you for allowing me to assist in the care of {p['first'].title()} {p['last'].title()}. For "
                 f"questions or concerns, feel free to contact my service at {p['hosp_phone']}."), ("gap", 20),
           ("p", f"Electronically signed by {p['consultant']} at 10/11/2026 4:41 PM")], size=22)
    footer_page(c, 6, 6, p)
    pages.append(c.img)
    return pages


def lab_table(c, y, names, units, values, days, ranges):
    widths = [190, 190, 190, 190]
    x0 = 110
    c.rect(x0, y, x0 + sum(widths), y + 40 + 34 * len(names), w=2)
    heads = ["Lab", "Units"] + [d.strftime("%m/%d/%y 0500") for d in days]
    x = x0
    for h, w in zip(heads, widths):
        c.t(x + 6, y + 8, h, "verdana", 18)
        c.line(x, y, x, y + 40 + 34 * len(names), 1)
        x += w
    yy = y + 40
    for n, u, vals, (lo, hi) in zip(names, units, values, ranges):
        c.line(x0, yy, x0 + sum(widths), yy, 1)
        c.t(x0 + 6, yy + 6, n, "verdana", 18)
        c.t(x0 + 196, yy + 6, u, "verdana", 18)
        for i, v in enumerate(vals):
            flag = "*" if v < lo or v > hi else ""
            c.t(x0 + 386 + i * 190, yy + 6, f"{v}{flag}", "verdanab" if flag else "verdana", 18)
        yy += 34
    return yy + 10


# ---------------------------------------------------------------- pages 20-22: social work addendum

def sw(p, rng):
    pages = []
    mh = ", ".join(p["mh"]).lower() or "none reported"
    sub = ", ".join(p["substances"]) or "None"
    rows1 = [("Assessment", None), ("Assessment Type", "Initial;Face to Face"), ("Referral Data", None),
             ("Referral Source", "Nurse"), ("Referral Name", "Homeless"), ("Referral Reason", "Homeless"),
             ("Patient Information", None), ("Where was the patient admitted from?", "Unhoused"),
             ("Living Arrangements", p["living"][0]), ("Primary Caretaker(s)", "Self"),
             ("Type of Residence", p["living"][1]),
             ("Primary Family/Caregiver Contact Name, Number and Relationship", " ".join(x for x in p["emergency"] if x)),
             ("Permission to Contact", "Yes"), ("Emergency/Primary Contact Language Preference", p["language"]),
             ("Home Care Services", "No"), ("Additional Services on Admission", "Not Applicable"),
             ("In the past 12 months, has lack of transportation kept you from medical appointments or from getting "
              "medications?", p["transport_barrier"]),
             ("Is Patient Minor?", "No"), ("Child Welfare Services Involvement", "No"),
             ("Interpreter used?", p["interpreter"] or "Not Needed"),
             ("Anticipated Discharge Disposition/Needs", "Recuperative care"), ("Activities of Daily Living", None),
             ("Prior to Level of Function", "Ambulatory"), ("Assistive Device", p["device"] or "Not applicable"),
             ("Ambulation", "Independent" if not p["device"] else "Assisted with device"), ("Dressing", "Independent"),
             ("Feeding", "Independent"), ("Behavior", "Oriented"),
             ("Communication", f"Talks;Understands speaking;Understands {p['language']}"), ("Income Information", None),
             ("Veterans Affiliation", "No"), ("Adjustment to Illness", None), ("Patient's Adjustment", "Acceptance"),
             ("Family's Adjustment", p["family_adjust"]),
             ("Mental Health Assessment", None), ("Hospitalization History", "No"), ("Past Mental Health Issues", mh),
             ("Mental Status", "No issues")]
    rows2 = [("Mental Status - Orientation", "oriented and alert"), ("Behavioral Assessment", "No issues"),
             ("Physical Assessment", "No issues"), ("Suicide Attempt History", "No"),
             ("Current Psychiatrists Provider and Phone Number", p["psychiatrist"]), ("Therapist and Phone Number", "n/a"),
             ("Family History of Mental Illness/Substance Abuse/Suicide", "n/a"),
             ("Have you experienced any neglect or abuse in the past?", "Patient refuses to disclose details"),
             ("Past Neglect or Abuse re-assessed at discharged", "Patient refuses to disclose details"),
             ("Notify Treatment Team to Assess Patient's Capacity?", "No concerns at this time"),
             ("Psychological Trauma History", "None" if "Trauma-related" not in p["mh"] else "Yes - PTSD"),
             ("Coping Skills", "Other"), ("Strengths", "Verbalizes Needs and Makes them Known"),
             ("Barriers", "Unhoused"), ("Substance Abuse History", sub),
             ("Substance Abuse Resources", "Patient will accept substance abuse resources" if p["substances"] else "n/a"),
             ("Stress", None), ("Do you feel stress - tense, restless, nervous, or anxious, or unable to sleep at night "
                                "because your mind is troubled all the time - these days?", "Pt declined to answer"),
             ("Intimate Partner Violence", None),
             ("Within the last year, have you been afraid of your partner or ex-partner?", "No"),
             ("Within the last year, have you been humiliated or emotionally abused in other ways by your partner or "
              "ex-partner?", "No"),
             ("Within the last year, have you been kicked, hit, slapped, or otherwise physically hurt by your partner or "
              "ex-partner?", "No"), ("Alcohol Use", None),
             ("Q1: How often do you have a drink containing alcohol?", p["alcohol"][2]),
             ("Q2: How many drinks containing alcohol do you have on a typical day when you are drinking?", p["alcohol"][3]),
             ("Q3: How often do you have six or more drinks on one occasion?", p["alcohol"][4]), ("Discharge", None),
             ("Barriers to Discharge", "Clinical reason"), ("Patient Engaged in Discharge Planning", "Yes"),
             ("Family/Caregiver's Assessed for", "Readiness, willingness, and ability to provide or support self-management "
                                                 "activities"),
             ("Patient/Family/Other Are In Agreement With Discharge Plan", "Yes")]

    def grid(c, y, rows, x0=110, w1=470, w2=820):
        for k, v in rows:
            f = F("arial", 21)
            if v is None:
                c.rect(x0, y, x0 + w1 + w2, y + 30, w=1)
                c.t(x0 + 4, y + 3, k, "arialb", 22)
                y += 30
                continue
            ky = c.wrap(x0 + 4, y + 3, w1 - 8, k, "arial", 21, lh=24)
            vy = c.wrap(x0 + w1 + 4, y + 3, w2 - 8, v, "arial", 21, lh=24)
            h = max(ky, vy) - y + 4
            c.rect(x0, y, x0 + w1, y + h, w=1)
            c.rect(x0 + w1, y, x0 + w1 + w2, y + h, w=1)
            y += h
        return y

    c = Canvas(rng=rng)
    note_header(c, p, p["sw"], "Interdisciplinary", "Addendum", "10/11/2026 11:05", "Social Worker")
    grid(c, 330, rows1)
    footer_page(c, 1, 3, p)
    pages.append(c.img)
    c = Canvas(rng=rng)
    ehr_banner(c, p)
    grid(c, 190, rows2)
    footer_page(c, 2, 3, p)
    pages.append(c.img)
    c = Canvas(rng=rng)
    ehr_banner(c, p)
    y = grid(c, 190, [("Plan/Interventions", "Resources given")])
    y = blocks(c, y + 30, sum([[("p", s), ("gap", 20)] for s in p["sw_note"]], []) + [("h", "Addendum:"), ("p", p["sw_addendum"]),
               ("gap", 20), ("h", "Revision History")], size=22)
    for x, h in [(110, "Date/Time"), (420, "User"), (850, "Provider Type"), (1200, "Action")]:
        c.t(x, y, h, "verdana", 20, fill=80)
    for i, act in enumerate(["Addend", "Sign"]):
        yy = y + 36 + i * 32
        for x, s in [(110, f"10/11/2026 {['1:24 PM', '11:52 AM'][i]}"), (420, p["sw"].split(",")[0]), (850, "Social Worker"),
                     (1200, act)]:
            c.t(x, yy, s, "verdana", 20)
    footer_page(c, 3, 3, p)
    pages.append(c.img)
    return pages


# ---------------------------------------------------------------- pages 25-31: sideways flowsheets

LAB_PAGES = [
    [("BASIC PANEL", None), ("Sodium", "Na", 136, 145), ("Potassium", 4.1, 3.5, 5.1), ("Chloride", 100, 98, 107),
     ("CO2", 28, 21, 32), ("Anion Gap", 7, 5, 15), ("BUN", 13, 7, 18), ("Creatinine", 0.9, 0.6, 1.3), ("Calcium", 8.7, 8.5, 10.1),
     ("Glucose", "Glucose", 70, 99), ("eGFR - high estimate", 88, 60, 999), ("LIVER PANEL", None), ("Total Protein", 7.4, 6.4, 8.2),
     ("Albumin", 3.6, 3.4, 5.0), ("Alkaline Phosphatase", 104, 45, 117), ("AST", 21, 15, 37), ("ALT (SGPT)", 18, 16, 61),
     ("Bilirubin, Total", 0.6, 0.2, 1.0), ("LIPID PANEL", None), ("Cholesterol", 182, 0, 200), ("Triglycerides", 141, 0, 150),
     ("HDL Cholesterol", 41, 40, 999), ("LDL Chol CALC", 113, 0, 100)],
    [("BLOOD CHEMISTRY", None), ("Magnesium", 2.0, 1.6, 2.6), ("Phosphorus", 3.4, 2.5, 4.9), ("Troponin I, High Sensitivity", 6, 0, 34),
     ("BNP", 48, 0, 100), ("TSH", 1.9, 0.36, 3.74), ("Lipase", 40, 73, 393), ("Hemoglobin A1c", 6.0, 4.0, 5.6),
     ("Total CK", 112, 39, 308), ("C.B.C.", None), ("WBC", "WBC", 4.0, 11.0), ("RBC", 4.4, 4.5, 5.9), ("Hemoglobin", "Hgb", 13.0, 17.5),
     ("Hematocrit", "Hct", 38, 50), ("MCV", "MCV", 80, 100), ("MCH", 29.0, 27, 33), ("MCHC", 33.1, 32, 36), ("RDW", 13.8, 11.5, 14.5),
     ("Platelets", "Plt", 150, 400), ("MPV", 9.4, 7.4, 10.4), ("Neutrophils %", 71.3, 40, 75), ("Neutrophils Absolute", 8.1, 1.8, 7.7)],
    [("DIFFERENTIAL", None), ("Lymphocytes %", 17.9, 20, 45), ("Lymphocytes Absolute", 2.4, 1.0, 4.8), ("Monocytes %", 7.6, 2, 10),
     ("Monocytes Absolute", 1.0, 0.1, 1.0), ("Eosinophils %", 2.4, 0, 6), ("Eosinophils Absolute", 0.3, 0, 0.5),
     ("Basophils %", 0.6, 0, 2), ("Basophils Absolute", 0.1, 0, 0.2), ("Nucleated RBCs", 0, 0, 0), ("RBC MORPHOLOGY", None),
     ("Anisocytosis", "Few", None, None), ("Microcytes", "Few", None, None), ("Hypochromia", "Slight", None, None),
     ("Polychromasia", "Normal", None, None), ("Platelet Morphology", "Normal", None, None), ("COAGULATION", None),
     ("Prothrombin Time", 11.1, 9.6, 12.3), ("INR", 1.05, 0.9, 1.1), ("aPTT", 29.5, 24, 36)],
    [("D-Dimer/D.I.C.", None), ("D-Dimer", 0.42, 0, 0.5), ("BLOOD BANK RESULTS", None), ("ABO/Rh(D)", "O POSITIVE", None, None),
     ("Antibody Screen", "NEGATIVE", None, None), ("Blood Component Type", "See below", None, None), ("STOOL RESULTS", None),
     ("Occult Bld, Stool", "Negative", None, None), ("CULTURES/SMEARS", None), ("Aerobic Culture with Gram Stain", "See micro", None, None),
     ("Blood Culture", "No growth", None, None), ("MOLECULAR MICRO", None), ("COVID-19, PCR", "Not Detected", None, None),
     ("Influenza A, PCR", "Not Detected", None, None), ("Influenza B, PCR", "Not Detected", None, None),
     ("Respiratory Syncytial Virus PCR", "Not Detected", None, None), ("POC OTHER", None), ("Glucose POC", "Glucose", 70, 140),
     ("HISTORICAL - CERNER", None), ("Sodium Lvl", 137, 136, 145), ("Potassium Lvl", 4.0, 3.5, 5.1)],
    [("CHEMISTRY - OTHER", None), ("Lactic Acid", 1.4, 0.5, 2.0), ("Procalcitonin", 0.21, 0, 0.5), ("CRP", 6.2, 0, 1.0),
     ("Sed Rate (ESR)", 48, 0, 20), ("Ferritin", 21, 24, 336), ("Iron", 28, 65, 175), ("TIBC", 448, 250, 450),
     ("Vitamin B12", 412, 211, 911), ("Folate", 9.8, 5.9, 24.8), ("Reticulocyte %", 2.1, 0.5, 2.0), ("CT SCAN", None),
     ("CT Head WO/W Contrast", "Final", None, None), ("CT Soft Tissue Neck With Contrast", "Final", None, None),
     ("CTA Chest PE", "Final", None, None), ("X-RAY / FLUORO", None), ("X-Ray Chest Single View", "Final", None, None),
     ("X-Ray Chest 2 Views", "Final", None, None), ("X-Ray Foot Right 3 Views", "Final", None, None), ("MRI", None),
     ("MRI Foot Right WO/W Contrast", "Final", None, None), ("ULTRASOUND", None),
     ("US Duplex Venous LE Bilateral", "Not done", None, None)],
    [("ECHO STUDIES", None), ("Transthoracic echo (TTE)", "Not done", None, None), ("ECG", None), ("ECG 12 lead", "Final", None, None),
     ("Ventricular Rate", "HR", 60, 100), ("Atrial Rate", "HR", 60, 100), ("PR Interval", 166, 120, 200), ("QRS Duration", 92, 70, 110),
     ("QT Interval", 372, 0, 999), ("QTc Calculation", 431, 350, 450), ("P Axis", 54, None, None), ("R Axis", 23, None, None),
     ("T Axis", 42, None, None), ("ECG Interpretation", "Sinus rhythm", None, None), ("Others", None),
     ("Stress echocardiogram", "Not done", None, None), ("Other Cardiology Result", "None", None, None)],
]


def flowsheet_pages(p, rng):
    days = lab_days(p)
    L = p["labs"]
    vs = p["vitals_series"]
    pages = []
    for n, rows in enumerate(LAB_PAGES):
        c = Canvas(H, W, rng=rng)  # landscape
        c.t(90, 70, f"{p['last']}, {p['first']} {p['mi']}   MRN {p['mrn']}   DOB {p['dob']}   {p['hospital']}", "arialb", 22)
        c.t(90, 104, "Results Review - All Results (Table View)    " + ("Labs" if n < 5 else "Cardiology"), "arial", 20)
        c.t(c.w - 90, 70, f"Page {n + 1} of 7", "arial", 20, anchor="ra")
        x_name, x_col, col_w = 90, 620, 300
        y = 160
        for i, d in enumerate(days):
            c.t(x_col + i * col_w, y, d.strftime("%m/%d/%y %H:%M").replace("00:00", "05:12"), "arialb", 20)
        y += 40
        c.line(90, y, c.w - 90, y, 2)
        y += 8
        jit = random.Random(f"{p['slug']}{n}")
        for row in rows:
            name = row[0]
            if row[1] is None:
                c.t(x_name, y, name, "arialb", 21)
                y += 32
                continue
            c.t(x_name, y, name, "arial", 19)
            base, lo, hi = p.get("lab_overrides", {}).get(name, row[1]), row[2], row[3]
            for i in range(len(days)):
                if isinstance(base, str) and base in L:
                    v = L[base][i]
                elif isinstance(base, str) and base == "HR":
                    v = vs["HR"][i * 2]
                elif isinstance(base, str):
                    v = base if i in (0, 2) else ""
                else:
                    v = round(base * jit.uniform(0.94, 1.06), 2 if base < 3 else (1 if base < 30 else 0))
                    v = int(v) if base >= 30 else v
                    if i not in (0, 1, 3, 4):
                        v = ""
                if v == "":
                    continue
                flag = ""
                if lo is not None and not isinstance(v, str):
                    flag = " ^" if v > hi else (" v" if v < lo else "")
                c.t(x_col + i * col_w, y, f"{v}{flag}", "arialb" if flag else "arial", 19)
            c.line(x_name, y + 27, c.w - 90, y + 27, 1, fill=190)
            y += 31
        pages.append(c.img.rotate(90, expand=True))

    # Vitals flowsheet with a trend graph
    c = Canvas(H, W, rng=rng)
    c.t(90, 70, f"{p['last']}, {p['first']} {p['mi']}   MRN {p['mrn']}   DOB {p['dob']}   {p['hospital']}", "arialb", 22)
    c.t(90, 104, "Flowsheet - Vital Signs    Column Interval: 12 hr", "arial", 20)
    c.t(c.w - 90, 70, "Page 7 of 7", "arial", 20, anchor="ra")
    start = datetime.strptime(p["admit"], "%m/%d/%Y")
    times = [start + timedelta(hours=12 * i + 8) for i in range(10)]
    gx0, gx1, gy0, gy1 = 420, c.w - 120, 180, 900
    c.rect(gx0, gy0, gx1, gy1, w=1)
    c.t(90, gy0, "BP, Pulse, SpO2", "arialb", 22)
    for v in range(40, 200, 20):
        yy = gy1 - (v - 40) / 160 * (gy1 - gy0)
        c.t(gx0 - 12, yy - 10, str(v), "arial", 16, anchor="ra")
        c.line(gx0, yy, gx1, yy, 1, fill=220)
    step = (gx1 - gx0) / (len(times) - 1)

    def plot(series, dash=False):
        pts = [(gx0 + i * step, gy1 - (v - 40) / 160 * (gy1 - gy0)) for i, v in enumerate(series)]
        for (a, b), (cx, cy) in zip(pts, pts[1:]):
            if dash:
                for t in range(0, 10, 2):
                    c.line(a + (cx - a) * t / 10, b + (cy - b) * t / 10, a + (cx - a) * (t + 1) / 10, b + (cy - b) * (t + 1) / 10, 2)
            else:
                c.line(a, b, cx, cy, 2)
        for x, y in pts:
            c.d.ellipse([x - 5, y - 5, x + 5, y + 5], outline=0, width=2)

    for key, dash in [("SBP", False), ("DBP", False), ("HR", True), ("SpO2", True)]:
        plot(vs[key], dash)
    for key, lbl in [("SBP", "BP sys"), ("DBP", "BP dia"), ("HR", "Pulse"), ("SpO2", "SpO2 %")]:
        c.t(gx1 + 10, gy1 - (vs[key][-1] - 40) / 160 * (gy1 - gy0) - 10, lbl, "arial", 16)
    y = 960
    c.t(90, y, "Vital Signs", "arialb", 22)
    for i, t in enumerate(times):
        c.t(gx0 + i * step, y, t.strftime("%m/%d %H%M"), "arialb", 17, anchor="ma")
    y += 40
    for lbl, key in [("Temperature (°C (°F))", "T"), ("Heart Rate", "HR"), ("Blood Pressure (mmHg)", "BP"),
                     ("Resp Rate", "RR"), ("SpO2 %", "SpO2")]:
        c.t(90, y, lbl, "arial", 19)
        for i in range(len(times)):
            if key == "T":
                s = f"{vs['T'][i]} ({vs['T'][i] * 9 / 5 + 32:.1f})"
            elif key == "BP":
                s = f"{vs['SBP'][i]}/{vs['DBP'][i]}"
            else:
                s = str(vs[key][i])
            c.t(gx0 + i * step, y, s, "arial", 17, anchor="ma")
        c.line(90, y + 30, c.w - 90, y + 30, 1, fill=190)
        y += 40
    c.t(90, y + 20, f"O2 Device: {p['o2_device']}",
        "arial", 19)
    c.t(90, y + 54, f"Weight: {p['weight']}    BMI: {p['bmi']}", "arial", 19)
    pages.append(c.img.rotate(90, expand=True))
    return pages


# ---------------------------------------------------------------- assemble

def fax_stamp(img, page, p):
    d = ImageDraw.Draw(img)
    d.text((40, 14), f"{p['fax_stamp']} {10 + page // 20}:{(page * 2) % 60:02d}  FROM: {p['hospital_short']} CASE MGMT "
                     f"{p['hosp_fax']}  TO: 17145550108  P.{page:03d}/{TOTAL:03d}", font=F("courier", 22), fill=0)


def build(p):
    rng = random.Random(f"sim-{p['slug']}")
    pages = ([fax_cover(p, rng), if_form(p, rng)] + calaim(p, rng) + [face_sheet(p, rng)] + doc2(p, rng) +
             progress_note(p, rng) + consult(p, rng) + sw(p, rng) + hp(p, rng) + flowsheet_pages(p, rng))
    assert len(pages) == TOTAL, len(pages)
    faxed = []
    for i, img in enumerate(pages, 1):
        if img.size != (W, H):
            img = img.resize((W, H))
        img = img.copy()
        fax_stamp(img, i, p)
        faxed.append(fax_effect(img, rng))
    pdf = OUT / f"unredacted-sim-{p['slug']}.pdf"
    faxed[0].save(pdf, save_all=True, append_images=faxed[1:], resolution=DPI)
    key = {k: v for k, v in p.items() if k not in ("doc2", "consult", "sw_note", "vitals_series", "labs", "font")}
    key["pages"] = {
        "1": "fax cover sheet", "2": "Illumination LA/OC referral form (handwritten)",
        "3-8": "CalAIM Recuperative Care / Short-Term Post Hospitalization referral/authorization request",
        "9": "hospital face sheet", "10-11": "wound care progress note" if p["doc2_kind"] == "wound" else "PT evaluation",
        "12-13": "inpatient progress note", "14-19": f"{p['consult_specialty']} consultation",
        "20-22": "social work interdisciplinary addendum", "23-24": "history and physical",
        "25-30": "lab/study flowsheets (sideways)", "31": "vital signs flowsheet (sideways)",
    }
    (OUT / f"unredacted-sim-{p['slug']}.json").write_text(json.dumps(key, indent=2) + "\n")
    print(f"wrote {pdf.relative_to(ROOT)} ({TOTAL} pages)")


def form_layout():
    """Write schema/layouts/la-oc.json: where each field and each printed word sits on the LA/OC form, as fractions
    of the page [left, top, right, bottom]. lib/align.ts finds the words on a scan and lines the fields up with it."""
    c = Canvas(rng=random.Random(0))
    # Drawing the page fills in c.regions and c.words; the handwriting isn't recorded.
    if_form_canvas(PATIENTS[0], random.Random(0), c)
    frac = lambda b: [round(b[0] / W, 4), round(b[1] / H, 4), round(b[2] / W, 4), round(b[3] / H, 4)]  # noqa: E731
    norm = [("".join(ch for ch in w.lower() if ch.isalnum()), b) for w, b in c.words]
    counts = Counter(t for t, _ in norm)
    # Words printed once and long enough not to be confused with others.
    anchors = [{"t": t, "b": frac(b)} for t, b in norm if counts[t] == 1 and len(t) >= 4 and not t.isdigit()]
    # The printed words inside each field ("Requires", "O2", "Yes", "No"), so the box can be snapped to them on a scan.
    labels = {
        fid: [{"t": t, "b": frac(b)} for t, b in norm if t and r[0] <= (b[0] + b[2]) / 2 <= r[2] and r[1] <= (b[1] + b[3]) / 2 <= r[3]]
        for fid, r in c.regions.items()
    }
    out = ROOT / "schema" / "layouts" / "la-oc.json"
    out.parent.mkdir(exist_ok=True)
    regions = ",\n".join(f'    "{k}": {json.dumps(frac(v))}' for k, v in c.regions.items())
    label_rows = ",\n".join(f'    "{k}": {json.dumps(v)}' for k, v in labels.items() if v)
    words = ",\n".join(f"    {json.dumps(a)}" for a in anchors)
    out.write_text(f'{{\n  "name": "Illumination LA/OC referral form",\n  "regions": {{\n{regions}\n  }},\n'
                   f'  "labels": {{\n{label_rows}\n  }},\n  "anchors": [\n{words}\n  ]\n}}\n')
    print(f"wrote {len(c.regions)} field regions and {len(anchors)} anchor words to {out.relative_to(ROOT)}")


def main():
    HAND.extend(ensure_fonts())
    if sys.argv[1:] == ["--layout"]:
        form_layout()
        return
    only = set(sys.argv[1:])
    for p in PATIENTS:
        if not only or p["slug"] in only:
            build(p)


if __name__ == "__main__":
    main()
