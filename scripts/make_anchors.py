#!/usr/bin/env python3
"""Write schema/layouts/rc0725-sh.json: the field regions from schema/field-regions.json, plus the printed
words on the blank RC0725-SH form page and where they sit.

The review screen finds these words on a scan with text recognition and uses them to line the field
regions up with that scan (lib/align.ts). Only words printed once on the page are kept, as fractions
of the page with the origin at the top left: [left, top, right, bottom].

    python3 scripts/make_regions.py && python3 scripts/make_anchors.py     # needs poppler-utils (pdftotext)
"""
import json
import re
import subprocess
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FORM = ROOT / "docs" / "RC0725-SH-referral-form-blank.pdf"
PAGE = 2


def norm(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", text.lower())


def main():
    html = subprocess.run(
        ["pdftotext", "-f", str(PAGE), "-l", str(PAGE), "-bbox", str(FORM), "-"], capture_output=True, text=True, check=True
    ).stdout
    # pdftotext's XHTML isn't always well-formed (bare "&"), so read it with patterns.
    w, h = (float(v) for v in re.search(r'<page width="([\d.]+)" height="([\d.]+)"', html).groups())
    words = [
        (norm(m[5]), [float(v) for v in m.groups()[:4]])
        for m in re.finditer(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', html)
    ]
    counts = Counter(t for t, _ in words)
    # Short words ("No", "Yes", "of") repeat or are easily misread; numbers are mostly the form's footer.
    anchors = [
        {"t": t, "b": [round(b[0] / w, 4), round(b[1] / h, 4), round(b[2] / w, 4), round(b[3] / h, 4)]}
        for t, b in words
        if counts[t] == 1 and len(t) >= 4 and not t.isdigit()
    ]
    regions = json.loads((ROOT / "schema" / "field-regions.json").read_text())
    out = ROOT / "schema" / "layouts" / "rc0725-sh.json"
    out.parent.mkdir(exist_ok=True)
    rows = ",\n".join(f'    "{k}": {json.dumps(v)}' for k, v in regions.items())
    words = ",\n".join(f"    {json.dumps(a)}" for a in anchors)
    out.write_text(f'{{\n  "name": "RC0725-SH referral form",\n  "regions": {{\n{rows}\n  }},\n  "anchors": [\n{words}\n  ]\n}}\n')
    print(f"wrote {len(regions)} field regions and {len(anchors)} anchor words to {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
