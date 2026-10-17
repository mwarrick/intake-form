import type { DocData, SupportingDoc } from "@/lib/documents";
import type { FormData } from "@/lib/form";
import type { Flag } from "@/lib/validate";

/**
 * The admission summary handed to the nurse (LVN) who admits an approved patient: everything the referral
 * and its supporting documents say that matters at the bedside, arranged around the nurse's intake checklist.
 * Plain code, no model, like the cross-checks.
 */
export interface Handoff {
  patient: {
    name: string | null;
    dob: string | null;
    age: number | null;
    mrn: string | null;
    gender: string | null;
    language: string | null;
    phone: string | null;
    emergencyContact: string | null;
  };
  stay: {
    approved: boolean;
    admissionDate: string | null;
    admissionTime: string | null;
    hospital: string | null;
    referrer: string | null;
    referrerPhone: string | null;
    referrerEmail: string | null;
    insurance: string | null;
    memberId: string | null;
    authNumber: string | null;
    authStatus: string | null;
    daysRequested: number | null;
    daysApproved: number | null;
    /** The authorization's end date, or the admission date plus the approved days. */
    endDate: string | null;
  };
  alerts: Alert[];
  /** Documents that contradict the form, as the coordinator saw them at the decision. */
  conflicts: string[];
  allergies: string[];
  situation: {
    chiefComplaint: string | null;
    hospitalAdmitDate: string | null;
    diagnoses: string[];
    history: string[];
    substanceUse: string | null;
    mentalHealth: string | null;
    wounds: string | null;
    independentWoundCare: string | null;
    homeHealthOrdered: string | null;
  };
  medications: {
    rows: MedRow[];
    thirtyDaySupply: string | null;
    selfAdministers: string | null;
    source: string | null;
  };
  baseline: {
    vitals: { takenAt: string | null; bp: string | null; hr: number | null; temp: number | null; rr: number | null; spo2: number | null; oxygen: string | null } | null;
    mobility: { noteDate: string | null; discipline: string | null; distanceFt: number | null; device: string | null; transfers: boolean | null; adls: boolean | null } | null;
    orientedX4: boolean | null;
    cognitiveImpairment: boolean | null;
    tb: string | null;
  };
  /** Plans and recommendations from the hospital records, for the care plan. */
  recommendations: { source: string; text: string }[];
  /** Follow-up appointments and the care team aren't captured yet (no discharge summary document type). */
  followUpsCaptured: false;
}

export interface Alert {
  level: "high" | "medium";
  label: string;
  detail?: string;
}

export interface MedRow {
  name: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  /** Handling notes for the med room: controlled, refrigerate, possible allergy. */
  notes: string[];
}

const CONTROLLED =
  /oxycodone|hydrocodone|morphine|hydromorphone|fentanyl|methadone|buprenorphine|tramadol|codeine|tapentadol|lorazepam|alprazolam|clonazepam|diazepam|temazepam|zolpidem|amphetamine|methylphenidate|pregabalin|phenobarbital|testosterone/i;
const INSULIN = /insulin|glargine|lispro|aspart|detemir|degludec|lantus|humalog|novolog/i;
const REFRIGERATE = /insulin|glargine|lispro|aspart|detemir|degludec|lantus|humalog|novolog|semaglutide|liraglutide|dulaglutide|exenatide|ozempic|trulicity|victoza/i;

/** Allergy wording → medications in that class. Matches are "possible" and always need a nurse to confirm. */
const ALLERGY_CLASSES: [RegExp, RegExp][] = [
  [/sulfa/i, /sulfa|sulfamethoxazole|bactrim|septra|sulfasalazine/i],
  [/penicillin|\bpcn\b/i, /penicillin|amoxicillin|ampicillin|piperacillin|augmentin|nafcillin|dicloxacillin|oxacillin/i],
  [/cephalosporin|cephalexin|keflex/i, /\bcef|cephalexin|keflex/i],
  [/nsaid|ibuprofen|aspirin|naproxen/i, /ibuprofen|naproxen|aspirin|ketorolac|meloxicam|diclofenac|celecoxib/i],
  [/codeine|morphine|opioid|opiate/i, /codeine|morphine|hydrocodone|oxycodone|hydromorphone|tramadol/i],
  [/statin/i, /statin\b/i],
];

/** Allergy entries that don't actually say what the patient is allergic to. */
const UNCLEAR_ALLERGY = /see chart|unknown|unsure|\?|not obtained/i;
const NO_ALLERGY = /^(nkda|nka|none|no known)/i;

export function buildHandoff(data: FormData, docs: SupportingDoc[], docFlags: Flag[], today = new Date()): Handoff {
  const read = docs.filter((d) => d.status === "done" && d.data);
  const ofType = (t: string) => read.filter((d) => d.doc_type === t).map((d) => d.data as DocData);
  const first = (t: string) => ofType(t)[0] ?? null;
  const newest = (t: string, key: string) =>
    ofType(t).reduce<DocData | null>((a, b) => (!a || time(b[key]) > time(a[key]) ? b : a), null);

  const demo = first("demographics");
  const auth = first("authorization");
  const hp = first("history_physical");
  const medList = first("medications");
  const vitals = newest("vitals", "taken_at");
  const mobility = newest("therapy_notes", "note_date");
  const progress = newest("progress_notes", "note_date");
  const culture = newest("culture", "collected_at");

  // Allergies from every document that lists them, without repeats.
  const allergies = unique([...list(hp?.allergies), ...list(medList?.allergies)]);
  const realAllergies = allergies.filter((a) => !UNCLEAR_ALLERGY.test(a) && !NO_ALLERGY.test(a));

  const medRows: MedRow[] = rows(medList?.medications)
    .filter((m) => str(m.name))
    .map((m) => {
      const name = str(m.name)!;
      const notes: string[] = [];
      if (CONTROLLED.test(name)) notes.push("Controlled: count and lock");
      if (REFRIGERATE.test(name)) notes.push("Refrigerate unopened");
      const clash = allergyMatch(name, allergies);
      if (clash) notes.push(`Possible allergy: ${clash}`);
      return { name, dose: str(m.dose), route: str(m.route), frequency: str(m.frequency), notes };
    });

  const alerts: Alert[] = [];
  const high = (label: string, detail?: string) => alerts.push({ level: "high", label, detail });
  const medium = (label: string, detail?: string) => alerts.push({ level: "medium", label, detail });

  // Infection and isolation, from the cross-checks (they read cultures and H&P infections) and the form.
  const infections = docFlags.filter((f) => f.kind === "eligibility" && f.message.startsWith("Active infection: "));
  for (const f of infections) high("Contact precautions: active infection", f.message.replace("Active infection: ", ""));
  if (!infections.length && data.active_infection === "Yes") high("Active infection on the form", str(data.active_infection_explain) ?? undefined);
  if (culture?.mrsa === true && !infections.length) medium("MRSA history", "Culture shows MRSA; confirm it was cleared");

  for (const m of medRows) {
    const clash = m.notes.find((n) => n.startsWith("Possible allergy"));
    if (clash) high(`Allergy check: ${m.name}`, `${clash.replace("Possible allergy: ", "Allergy list says ")}. Confirm with the patient and prescriber before giving.`);
  }
  if (!allergies.length) medium("No allergies listed", "Ask the patient and confirm with the hospital");
  else if (!realAllergies.length && allergies.some((a) => UNCLEAR_ALLERGY.test(a))) medium("Allergies unclear", allergies.join("; "));

  if (data.o2 === "Yes" || (str(vitals?.oxygen) && !/room air|^ra$/i.test(str(vitals?.oxygen)!))) {
    high("Oxygen", [str(data.o2_explain), str(vitals?.oxygen)].filter(Boolean).join("; ") || undefined);
  }
  if (data.insulin === "Yes" || medRows.some((m) => INSULIN.test(m.name))) {
    medium("Insulin-dependent diabetic", "Fingerstick glucose checks; insulin storage");
  } else if (data.diabetes === "Yes") medium("Diabetic", "Oral medications");
  if (data.wounds === "Yes") {
    const homeHealth = { Yes: "home health ordered", No: "home health NOT ordered" }[String(data.home_health_ordered)] ?? null;
    const detail = [str(data.wounds_detail), homeHealth].filter(Boolean).join("; ") || undefined;
    if (data.independent_wound_care === "No") high("Wound care: not independent", detail);
    else medium("Wound", detail);
  }
  if (data.foley === "Yes") medium("Foley catheter");
  if (data.ostomy === "Yes") medium("Colostomy/ileostomy");
  if (data.continent === "No") medium("Not continent of bowel and bladder");

  const device = str(data.assistive_device_explain) ?? (data.assistive_device === "Yes" ? "assistive device" : null) ?? deviceFrom(mobility);
  if (device) medium("Fall risk", `Uses ${device}`);
  if (mobility?.adls_independent === false) medium("Needs help with daily activities", str(mobility.recommendations) ?? undefined);

  const behavioral = list(data.behavioral_flags);
  if (behavioral.length) medium("Behavioral / mental health", [behavioral.join(", "), str(data.mental_health_dx_type), str(data.behavioral_explain)].filter(Boolean).join("; "));
  if (data.hospice === "Yes") medium("Hospice", str(data.hospice_explain) ?? undefined);
  if (data.meds_30_day_supply === "No") high("Not arriving with a 30-day supply of medications");
  if (data.service_animal === "Yes") medium("Service animal");

  // The stay: admission date and the authorization.
  const daysApproved = num(auth?.approved_days);
  const admissionDate = str(data.admission_date);
  const endDate = str(auth?.end_date) ?? (admissionDate && daysApproved ? addDays(admissionDate, daysApproved) : null);

  const recommendations = [
    hp && str(hp.plan) && { source: "H&P plan", text: str(hp.plan)! },
    progress && str(progress.plan) && { source: "Progress note plan", text: str(progress.plan)! },
    ...ofType("therapy_notes")
      .filter((t) => str(t.recommendations))
      .map((t) => ({ source: `${str(t.discipline) ?? "Therapy"} recommendations`, text: str(t.recommendations)! })),
  ].filter((r): r is { source: string; text: string } => !!r);

  const dob = str(data.dob) ?? str(demo?.dob);
  const tb = data.tb_test_done === "Yes"
    ? [str(data.tb_test_results), str(data.tb_test_date)].filter(Boolean).join(", ") || "Done"
    : data.tb_test_done === "No" ? "Not done" : null;

  return {
    patient: {
      name: str(data.patient_name) ?? str(demo?.patient_name),
      dob,
      age: dob ? ageOn(dob, today) : null,
      mrn: str(data.mrn) ?? str(demo?.mrn),
      gender: str(data.gender) ?? str(demo?.sex),
      language: str(data.preferred_language) ?? str(demo?.preferred_language),
      phone: str(demo?.phone),
      emergencyContact: str(demo?.emergency_contact),
    },
    stay: {
      approved: data.approved === "Yes",
      admissionDate,
      admissionTime: str(data.admission_time),
      hospital: str(data.referring_hospital),
      referrer: [str(data.referrer_name), str(data.dept_floor)].filter(Boolean).join(", ") || null,
      referrerPhone: str(data.referrer_phone) ?? str(data.nursing_station_phone),
      referrerEmail: str(data.referrer_email),
      insurance: str(demo?.insurance) ?? str(data.insurance),
      memberId: str(demo?.member_id),
      authNumber: str(data.authorization_number) ?? str(auth?.authorization_number),
      authStatus: str(auth?.status),
      daysRequested: num(data.los_authorized_days),
      daysApproved,
      endDate,
    },
    alerts: [...alerts.filter((a) => a.level === "high"), ...alerts.filter((a) => a.level === "medium")],
    conflicts: docFlags.filter((f) => f.kind === "conflict").map((f) => f.message),
    allergies,
    situation: {
      chiefComplaint: str(data.chief_complaint) ?? str(hp?.chief_complaint),
      hospitalAdmitDate: str(data.admit_date),
      diagnoses: list(hp?.diagnoses),
      history: list(hp?.past_medical_history).filter((h) => !list(hp?.diagnoses).includes(h)),
      substanceUse: str(hp?.substance_use),
      mentalHealth: str(data.mental_health_dx_type),
      wounds: data.wounds === "Yes" ? str(data.wounds_detail) ?? "Yes" : data.wounds === "No" ? "None" : null,
      independentWoundCare: str(data.independent_wound_care),
      homeHealthOrdered: str(data.home_health_ordered),
    },
    medications: {
      rows: medRows,
      thirtyDaySupply: str(data.meds_30_day_supply),
      selfAdministers: str(data.self_admin_meds),
      source: medList ? str(medList.notes) : null,
    },
    baseline: {
      vitals: vitals && {
        takenAt: str(vitals.taken_at),
        bp: str(vitals.blood_pressure),
        hr: num(vitals.heart_rate),
        temp: num(vitals.temperature_f),
        rr: num(vitals.resp_rate),
        spo2: num(vitals.spo2),
        oxygen: str(vitals.oxygen),
      },
      mobility: mobility && {
        noteDate: str(mobility.note_date),
        discipline: str(mobility.discipline),
        distanceFt: num(mobility.ambulation_distance_ft),
        device: str(mobility.assistive_device),
        transfers: bool(mobility.transfers_independent),
        adls: bool(mobility.adls_independent),
      },
      orientedX4: bool(progress?.oriented_x4) ?? bool(hp?.oriented_x4),
      cognitiveImpairment: bool(progress?.cognitive_impairment) ?? bool(hp?.cognitive_impairment),
      tb,
    },
    recommendations,
    followUpsCaptured: false,
  };
}

/** The allergy a medication may belong to, if any. */
export function allergyMatch(med: string, allergies: string[]): string | null {
  for (const allergy of allergies) {
    if (NO_ALLERGY.test(allergy)) continue;
    for (const [a, m] of ALLERGY_CLASSES) if (a.test(allergy) && m.test(med)) return allergy;
    // The allergy names the drug itself, e.g. "Lisinopril (cough)".
    const word = allergy.toLowerCase().match(/[a-z]{5,}/)?.[0];
    if (word && med.toLowerCase().includes(word)) return allergy;
  }
  return null;
}

export function ageOn(dob: string, today: Date): number | null {
  const m = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d)) age--;
  return age;
}

function addDays(iso: string, days: number): string | null {
  const t = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(t) ? null : new Date(t + days * 86_400_000).toISOString().slice(0, 10);
}
function deviceFrom(note: DocData | null): string | null {
  const d = str(note?.assistive_device);
  return d && !/^(none|no|n\/a)$/i.test(d) ? d : null;
}
function time(v: unknown): number {
  return (typeof v === "string" && Date.parse(v)) || -Infinity;
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function bool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}
function list(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : [];
}
function rows(v: unknown): Record<string, string | null>[] {
  return Array.isArray(v) ? (v.filter((r) => r && typeof r === "object") as Record<string, string | null>[]) : [];
}
function unique(xs: string[]): string[] {
  const seen = new Set<string>();
  return xs.filter((x) => {
    const k = x.toLowerCase().trim();
    return seen.has(k) ? false : (seen.add(k), true);
  });
}
