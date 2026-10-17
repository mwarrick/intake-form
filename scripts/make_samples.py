#!/usr/bin/env python3
"""Generate fake hand-filled, faxed referral forms with answer keys.

Each sample is a PDF that looks like a fax of the RC0725-SH form filled out by hand
(handwriting fonts, circled Yes/No answers, ticked boxes, skew, noise, 1-bit fax look),
plus a JSON file with the correct value for every field, for demos and accuracy testing.

Requires: poppler-utils (pdftoppm), Python packages pillow and pypdf, and npm (to fetch
OFL-licensed handwriting fonts from @fontsource on first run).

    python3 scripts/make_samples.py            # writes samples/synthetic/
"""
import json
import math
import random
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
FORM = ROOT / "docs" / "RC0725-SH-referral-form-blank.pdf"
OUT = ROOT / "samples" / "synthetic"
FONT_CACHE = ROOT / ".cache" / "fonts"
FONTS = ["caveat", "nanum-pen-script", "reenie-beanie", "homemade-apple"]
DPI = 200
K = DPI / 72  # PDF points -> pixels
PAGE_H_PT = 792

# Text fields: schema field id -> AcroForm field name. Optional x start (points) where a printed label
# sits inside the widget rect.
TEXT_FIELDS = {
    "referring_hospital": "Referring Hospital",
    "dept_floor": "DeptFloor",
    "referrer_name": "SWCMRN",
    "referrer_phone": "PhonePager",
    "referrer_email": "Email",
    "nursing_station_phone": "Nursing Station",
    "authorized_by": "Authorized by",
    "authorized_by_phone": "Phone",
    "patient_name": "Patient Name",
    "mrn": "MRN",
    "dob": "Date6_af_date",
    "ethnicity": "Ethnicity",
    "ssn_last4": "Text4",
    "insurance": "Insurance",
    "preferred_language": "Preferred Language",
    "chief_complaint": "Cheif Complaint Admitting Diagnosis",
    "admit_date": "Date7_af_date",
    "wounds_detail": "Admit Date 2",
    "tb_test_date": "Date8_af_date",
    "tb_test_results": "Results",
    "o2_explain": "Explain",
    "active_infection_explain": "Explain_2",
    "assistive_device_explain": "Explain_3",
    "hospice_explain": "Explain_4",
    "mental_health_dx_type": "If checked what type",
    "behavioral_explain": "Explain_5",
    "los_authorized_days": "Length of Stay Authorized in Recupertive Care",
}
TEXT_X_START = {"chief_complaint": 215, "wounds_detail": 40}
# Fields whose writing line runs past the widget rect.
TEXT_X_END = {"wounds_detail": 575}

# Radio groups drawn as ticks in printed boxes: field id -> (AcroForm name, options in widget order)
RADIO_FIELDS = {
    "gender": ("Gender", ["Male", "Female", "Transgender", "Other"]),
    "wounds": ("Any Wounds?", ["Yes", "No"]),
    "independent_wound_care": ("Independent with Wound Care?", ["Yes", "No"]),
    "tb_test_done": ("PPD", ["Yes", "No"]),
    "home_health_ordered": ("Home Health", ["Yes", "No"]),
}

# The fillable PDF wires every Yes/No circle and behavioral checkbox to one field ("Check Box1"),
# so they are identified by position: (x, y) of the widget's lower-left corner in points.
CIRCLE_WIDGETS = {
    ("o2", "Yes"): (203, 369), ("o2", "No"): (241, 370),
    ("self_admin_meds", "Yes"): (203, 340), ("self_admin_meds", "No"): (241, 340),
    ("continent", "Yes"): (202, 325), ("continent", "No"): (240, 325),
    ("ostomy", "Yes"): (202, 310), ("ostomy", "No"): (240, 310),
    ("foley", "Yes"): (202, 295), ("foley", "No"): (241, 294),
    ("diabetes", "Yes"): (202, 280), ("diabetes", "No"): (240, 279),
    ("insulin", "Yes"): (202, 265), ("insulin", "No"): (240, 265),
    ("diabetes_oral_meds", "Yes"): (203, 250), ("diabetes_oral_meds", "No"): (240, 251),
    ("active_infection", "Yes"): (481, 370), ("active_infection", "No"): (517, 370),
    ("ambulatory", "Yes"): (480, 340), ("ambulatory", "No"): (516, 340),
    ("assistive_device", "Yes"): (480, 325), ("assistive_device", "No"): (516, 326),
    ("hospice", "Yes"): (480, 295), ("hospice", "No"): (517, 295),
    ("car", "Yes"): (481, 265), ("car", "No"): (517, 266),
    ("service_animal", "Yes"): (480, 250), ("service_animal", "No"): (517, 250),
    ("has_limitations", "No"): (420, 216), ("has_limitations", "Yes"): (491, 216),
}
TICK_WIDGETS = {
    "Mental Health DX": (35, 199), "Non-compliant": (35, 186), "Cognitive Impairment": (35, 172),
    "Other": (36, 158), "Forgetful": (311, 186), "Registered Sex Offender": (311, 171),
}
# Housing Situation's two widgets share one name and one "on" state in the PDF, so place them by position too.
HOUSING_WIDGETS = {"Currently Unhoused": (143, 545), "4+ episodes of homelessness in the past 3 years": (323, 545)}


def ensure_fonts() -> list[Path]:
    FONT_CACHE.mkdir(parents=True, exist_ok=True)
    paths = []
    for name in FONTS:
        target = FONT_CACHE / f"{name}.woff"
        if not target.exists():
            with tempfile.TemporaryDirectory() as tmp:
                subprocess.run(["npm", "pack", "--silent", f"@fontsource/{name}"], cwd=tmp, check=True, capture_output=True)
                tgz = next(Path(tmp).glob("*.tgz"))
                with tarfile.open(tgz) as tf:
                    member = tf.getmember(f"package/files/{name}-latin-400-normal.woff")
                    target.write_bytes(tf.extractfile(member).read())
        paths.append(target)
    return paths


def widgets():
    """AcroForm widgets on page 2: list of (name, on_state, rect)."""
    out = []
    for annot in PdfReader(FORM).pages[1].get("/Annots") or []:
        a = annot.get_object()
        if a.get("/Subtype") != "/Widget":
            continue
        parent = a.get("/Parent")
        name = a.get("/T") or (parent.get_object().get("/T") if parent else None)
        ap = a.get("/AP", {}).get("/N")
        states = [k for k in ap.keys() if k != "/Off"] if hasattr(ap, "keys") else []
        out.append((str(name), states[0] if states else None, [float(x) for x in a["/Rect"]]))
    return out


def rect_px(r):
    x0, y0, x1, y1 = r
    return x0 * K, (PAGE_H_PT - y1) * K, x1 * K, (PAGE_H_PT - y0) * K


def nearest(ws, name, xy):
    cands = [w for w in ws if w[0] == name]
    return min(cands, key=lambda w: math.dist(w[2][:2], xy))[2]


def render_page(n: int) -> Image.Image:
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["pdftoppm", "-r", str(DPI), "-f", str(n), "-l", str(n), "-png", str(FORM), f"{tmp}/p"], check=True)
        return Image.open(next(Path(tmp).glob("p*.png"))).convert("L")


class Pen:
    def __init__(self, img: Image.Image, font_path: Path, rng: random.Random, size_scale: float):
        self.img, self.draw, self.rng = img, ImageDraw.Draw(img), rng
        self.font_path, self.size_scale = font_path, size_scale
        self.ink = rng.randint(10, 60)

    def text(self, box, s: str, x_start_pt=None, x_end_pt=None):
        x0, y0, x1, y1 = box
        if x_start_pt:
            x0 = x_start_pt * K
        if x_end_pt:
            x1 = x_end_pt * K
        h = y1 - y0
        size = int(h * self.size_scale * self.rng.uniform(0.92, 1.08))
        font = ImageFont.truetype(str(self.font_path), size)
        # Shrink to fit the line, as people do near the margin.
        while font.getlength(s) > (x1 - x0) * 1.05 and size > 18:
            size -= 2
            font = ImageFont.truetype(str(self.font_path), size)
        ascent, descent = font.getmetrics()
        w = int(font.getlength(s)) + 20
        layer = Image.new("L", (w, ascent + descent + 10), 0)
        ImageDraw.Draw(layer).text((10, 5), s, font=font, fill=255)
        angle = self.rng.uniform(-1.2, 1.2)
        rotated = layer.rotate(angle, resample=Image.BICUBIC, expand=True)
        # Sit the baseline just above the printed line at the bottom of the field.
        x = int(x0 + self.rng.uniform(4, 14))
        y = int(y1 - 6 - (5 + ascent) - (rotated.height - layer.height) / 2 + self.rng.uniform(-3, 2))
        layer = rotated
        self.img.paste(self.ink, (x, y), layer)

    def circle(self, box):
        x0, y0, x1, y1 = box
        # The widget is the small box printed before the word; circle the box and the word together.
        right = x1 + 16 * K
        cx, cy = (x0 + right) / 2, (y0 + y1) / 2 + 2
        rx, ry = (right - x0) / 2 + 6, (y1 - y0) / 2 + 7
        start = self.rng.uniform(0, 360)
        pts = []
        for i in range(48):
            t = math.radians(start + i * 7.9)  # a bit more than a full loop, like a real pen stroke
            wob = self.rng.uniform(-1.5, 1.5)
            pts.append((cx + (rx + wob) * math.cos(t), cy + (ry + wob) * math.sin(t)))
        self.draw.line(pts, fill=self.ink, width=3, joint="curve")

    def tick(self, box, style=None):
        x0, y0, x1, y1 = box
        j = lambda: self.rng.uniform(-2, 2)
        if (style or self.rng.choice(["x", "check"])) == "x":
            self.draw.line([(x0 + j(), y0 + j()), (x1 + j(), y1 + j())], fill=self.ink, width=3)
            self.draw.line([(x0 + j(), y1 + j()), (x1 + j(), y0 + j())], fill=self.ink, width=3)
        else:
            self.draw.line(
                [(x0 + j(), (y0 + y1) / 2 + j()), ((x0 + x1) / 2 - 2, y1 + 2), (x1 + 6 + j(), y0 - 8 + j())],
                fill=self.ink, width=3, joint="curve",
            )

    def scribble(self, box):
        x0, y0, x1, y1 = box
        pts = [(x0 - 16 + i * (x1 - x0 + 40) / 8, (y0 if i % 2 else y1) + self.rng.uniform(-3, 3)) for i in range(9)]
        self.draw.line(pts, fill=self.ink, width=3)


def fax_effect(img: Image.Image, rng: random.Random) -> Image.Image:
    img = img.rotate(rng.uniform(-1.2, 1.2), resample=Image.BICUBIC, fillcolor=255, translate=(rng.randint(-15, 15), rng.randint(-10, 20)))
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    noise = Image.effect_noise(img.size, 28)
    img = Image.blend(img, noise, 0.12)
    img = img.point(lambda p: 255 if p > 150 else 0, mode="1")
    # Specks and a fax header line.
    d = ImageDraw.Draw(img)
    for _ in range(250):
        x, y = rng.randint(0, img.width - 1), rng.randint(0, img.height - 1)
        d.point((x, y), fill=0)
    return img


def fax_header(img: Image.Image, page: int, total: int, sender: str):
    d = ImageDraw.Draw(img)
    try:
        f = ImageFont.truetype("DejaVuSansMono.ttf", 22)
    except OSError:
        f = ImageFont.load_default()
    d.text((40, 12), f"OCT-10-2026 14:{20 + page:02d}  FROM: {sender}  TO: 18883829551  P.{page}/{total}", font=f, fill=0)


def typed_page(title: str, lines: list[str]) -> Image.Image:
    img = Image.new("L", (int(8.5 * DPI), int(11 * DPI)), 255)
    d = ImageDraw.Draw(img)
    try:
        big, small = ImageFont.truetype("DejaVuSans-Bold.ttf", 44), ImageFont.truetype("DejaVuSans.ttf", 30)
    except OSError:
        big = small = ImageFont.load_default()
    d.text((140, 160), title, font=big, fill=0)
    for i, line in enumerate(lines):
        d.text((140, 280 + i * 52), line, font=small, fill=0)
    return img


def fill_form(answers: dict, font: Path, rng: random.Random, crossed_out: dict) -> Image.Image:
    ws = widgets()
    by_name = {w[0]: w for w in ws}
    img = render_page(2)
    pen = Pen(img, font, rng, size_scale=1.35 if "homemade" not in font.name else 1.0)

    for fid, name in TEXT_FIELDS.items():
        v = answers.get(fid)
        if v in (None, "", []):
            continue
        pen.text(rect_px(by_name[name][2]), str(v), TEXT_X_START.get(fid), TEXT_X_END.get(fid))

    for fid, (name, options) in RADIO_FIELDS.items():
        v = answers.get(fid)
        if v is None:
            continue
        group = [w for w in ws if w[0] == name]
        group.sort(key=lambda w: w[1] or "")  # on-states /0, /1, ... follow the option order
        pen.tick(rect_px(group[options.index(v)][2]))

    for opt in answers.get("housing_situation") or []:
        pen.tick(rect_px(nearest(ws, "Housing Situation", HOUSING_WIDGETS[opt])))

    for (fid, opt), xy in CIRCLE_WIDGETS.items():
        box = rect_px(nearest(ws, "Check Box1", xy))
        if crossed_out.get(fid) == opt:
            pen.circle(box)
            pen.scribble(box)
        if answers.get(fid) == opt:
            pen.circle(box)

    for opt in answers.get("behavioral_flags") or []:
        pen.tick(rect_px(nearest(ws, "Check Box1", TICK_WIDGETS[opt])), style="x")

    return img


def blank_answers() -> dict:
    schema = json.loads((ROOT / "schema" / "referral-form.json").read_text())
    return {
        f["id"]: ([] if f["type"] == "multi_choice" else None)
        for s in schema["sections"] if not s.get("staffOnly") for f in s["fields"]
    }


# Each sample: how it is written on paper ("written") and the correct normalized answers ("expected").
SAMPLES = [
    {
        "name": "sample-1-clean",
        "about": "Neat handwriting, eligible patient, form page only.",
        "font": 0,
        "packet": ["form"],
        "written": {
            "referring_hospital": "Orange Coast Regional", "dept_floor": "Med-Surg 4W",
            "referrer_name": "Dana Whitfield, MSW", "referrer_phone": "714-555-0142",
            "referrer_email": "dwhitfield@ocregional.test", "nursing_station_phone": "714-555-0190",
            "authorized_by": "Dr. R. Patel", "authorized_by_phone": "714-555-0177",
            "patient_name": "Marcus Delgado", "mrn": "OC4471209", "dob": "11/23/1968",
            "gender": "Male", "ethnicity": "Hispanic", "ssn_last4": "4821",
            "insurance": "CalOptima", "preferred_language": "Spanish",
            "housing_situation": ["Currently Unhoused"],
            "chief_complaint": "CHF exacerbation, now stable on oral diuretics",
            "admit_date": "10/06/2026", "wounds": "No", "tb_test_done": "Yes",
            "tb_test_date": "10/7/26", "tb_test_results": "Neg CXR",
            "o2": "No", "self_admin_meds": "Yes", "continent": "Yes", "ostomy": "No", "foley": "No",
            "diabetes": "No", "active_infection": "No", "ambulatory": "Yes", "assistive_device": "No",
            "hospice": "No", "car": "No", "service_animal": "No", "has_limitations": "No",
            "los_authorized_days": "14",
        },
        "expected_overrides": {
            "referrer_phone": "(714) 555-0142", "nursing_station_phone": "(714) 555-0190",
            "authorized_by_phone": "(714) 555-0177", "dob": "1968-11-23", "admit_date": "2026-10-06",
            "tb_test_date": "2026-10-07", "los_authorized_days": 14,
        },
        "crossed_out": {},
    },
    {
        "name": "sample-2-messy",
        "about": "Messier writing, wound and diabetes follow-ups, a crossed-out answer, and a DOB that reads either way round.",
        "font": 1,
        "packet": ["info", "form"],
        "written": {
            "referring_hospital": "St. Jude Medical Ctr", "dept_floor": "3 North",
            "referrer_name": "K. Nguyen RN CM", "referrer_phone": "(714) 555-0118 x204",
            "referrer_email": "knguyen@stjude.test",
            "patient_name": "Tamara Ellis", "mrn": "SJ-0093381", "dob": "04/07/1965",
            "gender": "Female", "ethnicity": "Black", "ssn_last4": "0397", "insurance": "Medi-Cal",
            "preferred_language": "English",
            "housing_situation": ["Currently Unhoused", "4+ episodes of homelessness in the past 3 years"],
            "chief_complaint": "LLE cellulitis s/p I&D, DM2 uncontrolled",
            "admit_date": "10/2/26", "wounds": "Yes",
            "wounds_detail": "1 wound L lower leg 4x3cm, stage 2, packed daily",
            "independent_wound_care": "No", "home_health_ordered": "Yes",
            "tb_test_done": "Yes", "tb_test_date": "10/3/26", "tb_test_results": "PPD neg",
            "o2": "No", "self_admin_meds": "Yes", "continent": "Yes", "ostomy": "No", "foley": "No",
            "diabetes": "Yes", "insulin": "Yes", "diabetes_oral_meds": "Yes",
            "active_infection": "No", "ambulatory": "Yes", "assistive_device": "Yes",
            "assistive_device_explain": "front wheel walker", "hospice": "No", "car": "No",
            "service_animal": "No", "has_limitations": "Yes", "behavioral_flags": ["Mental Health DX", "Forgetful"],
            "mental_health_dx_type": "Depression, stable on meds",
            "los_authorized_days": "21",
        },
        "expected_overrides": {
            "referrer_phone": "(714) 555-0118 x204", "dob": "1965-04-07", "admit_date": "2026-10-02",
            "tb_test_date": "2026-10-03", "los_authorized_days": 21,
        },
        # Referrer first circled Yes for Active Infection, scribbled it out, then circled No.
        "crossed_out": {"active_infection": "Yes"},
    },
    {
        "name": "sample-3-ineligible",
        "about": "Three-page packet (cover info page, form, medication list); patient fails admission criteria.",
        "font": 2,
        "packet": ["info", "form", "meds"],
        "written": {
            "referring_hospital": "Fountain Valley Hosp.", "dept_floor": "ICU stepdown",
            "referrer_name": "Alex Romero LCSW", "referrer_phone": "714 555 0163",
            "patient_name": "Gerald Pike", "mrn": "FV2290114", "dob": "2/14/1952",
            "gender": "Male", "ssn_last4": "7710", "insurance": "Medicare",
            "preferred_language": "English", "housing_situation": ["Currently Unhoused"],
            "chief_complaint": "Pneumonia, MRSA in sputum, on IV vanc",
            "admit_date": "9/29/26", "wounds": "No", "tb_test_done": "No",
            "o2": "Yes", "o2_explain": "2L NC continuous", "self_admin_meds": "No",
            "continent": "No", "ostomy": "No", "foley": "Yes", "diabetes": "No",
            "active_infection": "Yes", "active_infection_explain": "MRSA - not yet cleared by ID",
            "ambulatory": "No", "assistive_device": "Yes", "assistive_device_explain": "wheelchair",
            "hospice": "No", "car": "No", "service_animal": "No",
            "has_limitations": "Yes", "behavioral_flags": ["Cognitive Impairment"],
            "behavioral_explain": "Early dementia per neuro, disoriented at night",
        },
        "expected_overrides": {
            "referrer_phone": "(714) 555-0163", "dob": "1952-02-14", "admit_date": "2026-09-29",
        },
        "crossed_out": {},
    },
]

MED_LIST = [
    "Patient: Gerald Pike    MRN: FV2290114",
    "",
    "1. Vancomycin 1.25 g IV q12h",
    "2. Furosemide 20 mg PO daily",
    "3. Donepezil 5 mg PO nightly",
    "4. Acetaminophen 650 mg PO q6h PRN pain",
    "5. Heparin 5,000 units SC q8h",
    "",
    "Allergies: Penicillin (rash)",
]


def main():
    fonts = ensure_fonts()
    OUT.mkdir(parents=True, exist_ok=True)
    for i, s in enumerate(SAMPLES):
        rng = random.Random(1000 + i)
        pages = []
        for kind in s["packet"]:
            if kind == "form":
                pages.append(fill_form(s["written"], fonts[s["font"]], rng, s["crossed_out"]))
            elif kind == "info":
                pages.append(render_page(1))
            elif kind == "meds":
                pages.append(typed_page("MEDICATION ADMINISTRATION LIST", MED_LIST))
        sender = s["written"]["referring_hospital"].upper()[:22]
        faxed = []
        for n, p in enumerate(pages, 1):
            p = fax_effect(p, rng)
            fax_header(p, n, len(pages), sender)
            faxed.append(p)
        pdf = OUT / f"{s['name']}.pdf"
        faxed[0].save(pdf, save_all=True, append_images=faxed[1:], resolution=DPI)

        expected = blank_answers()
        expected.update({k: v for k, v in s["written"].items()})
        expected.update(s["expected_overrides"])
        (OUT / f"{s['name']}.json").write_text(json.dumps({
            "about": s["about"],
            "form_pages": [n for n, kind in enumerate(s["packet"], 1) if kind == "form"],
            "expected": expected,
        }, indent=2) + "\n")
        print(f"wrote {pdf.relative_to(ROOT)} ({len(pages)} page{'s' if len(pages) > 1 else ''})")


if __name__ == "__main__":
    sys.exit(main())
