import { DOC_TYPES, type DocData, type SupportingDoc, docTypesById } from "@/lib/documents";
import type { FormData } from "@/lib/form";
import type { Flag } from "@/lib/validate";

/**
 * Compare what the supporting documents say with the referral form and the admission criteria.
 * - "conflict": a document contradicts an answer on the form (attached to that form field)
 * - "eligibility": a document shows an admission criterion isn't met
 * - "document": a checklist problem (missing, out of date, not approved)
 */
export function crossCheck(data: FormData, docs: SupportingDoc[], receivedAt: string): Flag[] {
  const flags: Flag[] = [];
  const read = docs.filter((d) => d.status === "done" && d.data);
  const label = (d: SupportingDoc) => docTypesById.get(d.doc_type)?.label.replace(/ \(.*\)$/, "") ?? d.doc_type;
  const add = (kind: Flag["kind"], message: string, field?: string) => {
    if (!flags.some((f) => f.message === message)) flags.push({ kind, message, field });
  };

  // Checklist items not received. "If needed" items are listed too, without counting as missing,
  // except a culture when the form reports an active infection or a wound. Items the form itself
  // covers (the demographic page) are never listed.
  const present = new Set(docs.map((d) => d.doc_type));
  const cultureNeeded = data.active_infection === "Yes" || data.wounds === "Yes";
  for (const t of DOC_TYPES) {
    if (present.has(t.id) || t.coveredByForm) continue;
    const name = t.label.replace(/ \(if needed\)$/, "");
    if (t.required) add("document", `Missing: ${t.label}`);
    else if (t.id === "culture" && cultureNeeded) add("document", `Missing: ${name} (the form reports an active infection or wound)`);
    else add("document", `Not received (if needed): ${name}`);
  }

  const vitals = read.filter((d) => d.doc_type === "vitals");
  const takenAt = (d: SupportingDoc) => Date.parse(str((d.data as DocData).taken_at) ?? "") || -Infinity;
  const newestVitals = vitals.reduce<SupportingDoc | undefined>((a, b) => (!a || takenAt(b) > takenAt(a) ? b : a), undefined);

  for (const doc of read) {
    const d = doc.data as DocData;
    const src = label(doc);

    // Same patient?
    const name = str(d.patient_name) ?? str(d.member_name);
    if (name && str(data.patient_name) && !sameName(name, str(data.patient_name)!)) {
      add("conflict", `${src} is for "${name}", but the form says "${data.patient_name}"`, "patient_name");
    }
    const dob = str(d.dob) ?? str(d.member_dob);
    if (dob && str(data.dob) && dob !== data.dob) {
      const swapped = swapMonthDay(String(data.dob));
      add(
        "conflict",
        swapped === dob
          ? `Date of birth: ${src} says ${dob}; the form's ${data.dob} has day and month swapped`
          : `Date of birth: ${src} says ${dob}, the form says ${data.dob}`,
        "dob",
      );
    }
    const mrn = str(d.mrn);
    if (mrn && str(data.mrn) && norm(mrn) !== norm(String(data.mrn))) {
      add("conflict", `MRN: ${src} says ${mrn}, the form says ${data.mrn}`, "mrn");
    }

    // Infections.
    for (const inf of rows(d.infections)) {
      const status = (inf.status ?? "").toLowerCase();
      if (status.includes("active") && inf.organism) activeInfection(`${inf.organism}${inf.site ? ` (${inf.site})` : ""} per ${src}`);
    }
    if (doc.doc_type === "culture" && isPositive(d.result) && d.cleared !== true) {
      activeInfection(`${str(d.organism) ?? "Positive culture"}${d.mrsa === true && !/mrsa/i.test(str(d.organism) ?? "") ? " (MRSA)" : ""} on culture${d.collected_at ? ` from ${d.collected_at}` : ""}, not documented as cleared`);
    }

    // Cognition.
    if (d.cognitive_impairment === true) {
      add("eligibility", `${src} documents cognitive impairment`);
      if (!includes(data.behavioral_flags, "Cognitive Impairment")) {
        add("conflict", `${src} documents cognitive impairment; the form doesn't check Cognitive Impairment`, "behavioral_flags");
      }
    }
    if (d.oriented_x4 === false) add("eligibility", `${src}: patient is not alert and oriented x4`);
    if (d.medically_stable === false) add("eligibility", `${src}: not documented as medically stable for discharge`);

    // Mobility and ADLs.
    const feet = typeof d.ambulation_distance_ft === "number" ? d.ambulation_distance_ft : null;
    if (feet !== null && feet < 100) {
      add("eligibility", `${src}: walks ${feet} ft (must manage 100 ft)`);
      if (data.ambulatory === "Yes") add("conflict", `Form says ambulatory, but ${src} reports ${feet} ft`, "ambulatory");
    }
    if (d.transfers_independent === false) add("eligibility", `${src}: can't transfer independently`);
    if (d.adls_independent === false) add("eligibility", `${src}: not independent with activities of daily living`);
    const device = str(d.assistive_device);
    if (device && !/^(none|no|n\/a)$/i.test(device) && data.assistive_device === "No") {
      add("conflict", `${src} lists an assistive device (${device}); the form says none`, "assistive_device");
    }

    // Oxygen.
    const o2 = str(d.oxygen);
    if (o2 && !/room air|^ra$/i.test(o2) && data.o2 === "No") add("conflict", `${src} shows oxygen (${o2}); the form says no O2`, "o2");

    // Medications.
    for (const med of rows(d.medications)) {
      const route = (med.route ?? "").toUpperCase();
      const drug = [med.name, med.dose].filter(Boolean).join(" ");
      if (/\bIV\b|INTRAVENOUS|PICC/.test(route)) {
        add("eligibility", `IV medication: ${drug} (patients must self-administer their medications)`);
        if (data.self_admin_meds === "Yes") add("conflict", `Form says patient self-administers all meds, but ${drug} is IV`, "self_admin_meds");
      }
      if (/insulin|glargine|lispro|aspart|lantus|humalog|novolog/i.test(med.name ?? "") && data.insulin !== "Yes") {
        add("conflict", `${src} includes insulin (${drug}); the form doesn't say insulin`, "insulin");
      }
    }

    // Vitals within 24 hours of the referral. Only the newest set counts: updated vitals often arrive later.
    if (doc.doc_type === "vitals" && doc === newestVitals) {
      const taken = str(d.taken_at);
      const hours = taken ? (Date.parse(receivedAt) - Date.parse(taken)) / 3_600_000 : NaN;
      if (!taken) add("document", "Vitals: no date/time found");
      else if (hours > 24) add("document", `Vitals are ${Math.round(hours)} hours old (checklist asks for the last 24 hours)`);
    }

    // Authorization.
    if (doc.doc_type === "authorization") {
      const status = (str(d.status) ?? "").toLowerCase();
      if (status && !status.includes("approved")) add("document", `Authorization status: ${d.status}`);
      if (!str(d.authorization_number)) add("document", "Authorization number not found on the authorization");
      const days = typeof d.approved_days === "number" ? d.approved_days : null;
      const asked = typeof data.los_authorized_days === "number" ? data.los_authorized_days : null;
      if (days !== null && asked !== null && days < asked) {
        add("conflict", `Authorization approves ${days} days; the form asks for ${asked}`, "los_authorized_days");
      }
      const end = str(d.end_date);
      if (end && end < receivedAt.slice(0, 10)) add("document", `Authorization ended ${end}`);
    }
  }

  return flags;

  function activeInfection(what: string) {
    add("eligibility", `Active infection: ${what}`);
    if (data.active_infection !== "Yes") add("conflict", `Form says no active infection, but: ${what}`, "active_infection");
  }
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}
function rows(v: unknown): Record<string, string | null>[] {
  return Array.isArray(v) ? (v.filter((r) => r && typeof r === "object") as Record<string, string | null>[]) : [];
}
function includes(v: unknown, opt: string): boolean {
  return Array.isArray(v) && v.includes(opt);
}
function isPositive(v: unknown): boolean {
  const s = (str(v) ?? "").toLowerCase();
  return s.includes("positive") || (/growth/.test(s) && !/no growth/.test(s));
}
/** "Last, First" and "First Last" both match; middle names and initials are ignored. */
function sameName(a: string, b: string): boolean {
  const parts = (s: string) => {
    const [last, first] = s.includes(",") ? s.split(",").map((x) => x.trim()) : [s.split(/\s+/).pop()!, s.split(/\s+/)[0]];
    return { first: norm(first ?? "").slice(0, 3), last: norm(last ?? "") };
  };
  const x = parts(a);
  const y = parts(b);
  return x.last === y.last && (!x.first || !y.first || x.first === y.first);
}
function swapMonthDay(iso: string): string | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m && Number(m[3]) <= 12 ? `${m[1]}-${m[3]}-${m[2]}` : null;
}
