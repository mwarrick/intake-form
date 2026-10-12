#!/usr/bin/env python3
"""Write schema/field-regions.json: where each field sits on the paper form.

The review screen uses it to zoom the scan to a field when a coordinator clicks it. Positions come
from the AcroForm widget rects in the blank RC0725-SH PDF (the same mapping make_samples.py fills in),
as fractions of the page with the origin at the top left: [left, top, right, bottom].

    python3 scripts/make_regions.py            # needs pypdf and pillow, like make_samples.py
"""
import json

from make_samples import (
    CIRCLE_WIDGETS, HOUSING_WIDGETS, PAGE_H_PT, RADIO_FIELDS, ROOT, TEXT_FIELDS, TEXT_X_END, TEXT_X_START,
    TICK_WIDGETS, nearest, widgets,
)

PAGE_W_PT = 612


def union(rects):
    return [min(r[0] for r in rects), min(r[1] for r in rects), max(r[2] for r in rects), max(r[3] for r in rects)]


def fraction(r):
    x0, y0, x1, y1 = r
    return [round(x0 / PAGE_W_PT, 4), round((PAGE_H_PT - y1) / PAGE_H_PT, 4), round(x1 / PAGE_W_PT, 4), round((PAGE_H_PT - y0) / PAGE_H_PT, 4)]


def main():
    ws = widgets()
    by_name = {w[0]: w[2] for w in ws}
    rects: dict[str, list[list[float]]] = {}

    for fid, name in TEXT_FIELDS.items():
        x0, y0, x1, y1 = by_name[name]
        rects[fid] = [[TEXT_X_START.get(fid, x0), y0, TEXT_X_END.get(fid, x1), y1]]
    for fid, (name, _) in RADIO_FIELDS.items():
        rects[fid] = [w[2] for w in ws if w[0] == name]
    rects["housing_situation"] = [nearest(ws, "Housing Situation", xy) for xy in HOUSING_WIDGETS.values()]
    for (fid, _), xy in CIRCLE_WIDGETS.items():
        rects.setdefault(fid, []).append(nearest(ws, "Check Box1", xy))
    rects["behavioral_flags"] = [nearest(ws, "Check Box1", xy) for xy in TICK_WIDGETS.values()]

    schema = json.loads((ROOT / "schema" / "referral-form.json").read_text())
    order = [f["id"] for s in schema["sections"] for f in s["fields"]]
    regions = {fid: fraction(union(rects[fid])) for fid in order if fid in rects}
    out = ROOT / "schema" / "field-regions.json"
    out.write_text("{\n" + ",\n".join(f'  "{k}": {json.dumps(v)}' for k, v in regions.items()) + "\n}\n")
    print(f"wrote {len(regions)} field regions to {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
