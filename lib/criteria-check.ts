import "server-only";
import { RULE_GROUPS, type RuleResult, rulesById } from "@/lib/criteria";
import { type PageImage, type PageType, type Usage, jsonCall, models } from "@/lib/extract";

export interface PageText {
  page: number;
  type: string;
  text: string;
}

const TRANSCRIBE_INSTRUCTIONS = `You transcribe one scanned page from a hospital referral packet into plain text.
Rules:
- Copy every word, number and handwritten note as written. Don't summarize, correct or interpret.
- Solid black boxes are redactions (removed for privacy). Write [REDACTED] where one is.
- Checkboxes: [x] when marked, [ ] when not. Circled options: (circled) after the word.
- Tables: one row per line, cells separated by " | ".
- A page with nothing on it but a fax header: write (blank page).`;

/** Turn each page into text once, so the criteria can be checked against the whole packet cheaply. */
export async function transcribePages(pages: PageImage[], pageTypes: PageType[], usage: Usage, concurrency = 6): Promise<PageText[]> {
  const types = new Map(pageTypes.map((t) => [t.page, t.type]));
  const out: PageText[] = [];
  let next = 0;
  async function worker() {
    while (next < pages.length) {
      const p = pages[next++];
      // One unreadable page shouldn't sink the packet; the checker sees that it failed.
      const text = await jsonCall<{ text: string }>({
        step: "transcribe",
        model: models.transcribe,
        instructions: TRANSCRIBE_INSTRUCTIONS,
        text: `Page ${p.pageNumber}. Transcribe it.`,
        images: [{ dataUrl: p.dataUrl, detail: "high" }],
        schemaName: "page_text",
        jsonSchema: {
          type: "object",
          additionalProperties: false,
          required: ["text"],
          properties: { text: { type: "string" } },
        },
        usage,
      }).then(
        (r) => r.text,
        (e) => `(could not transcribe this page: ${e instanceof Error ? e.message : e})`,
      );
      out.push({ page: p.pageNumber, type: types.get(p.pageNumber) ?? "other", text });
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, pages.length) }, worker));
  return out.sort((a, b) => a.page - b.page);
}

const CRITERIA_INSTRUCTIONS = `You help a referral coordinator at Illumination Health + Home (IHH) recuperative care, which takes
people experiencing homelessness who are ready to leave the hospital but need a safe place to recover. You check one
referral packet against some of IHH's admission rules. A person makes the decision; you show them where to look.

For each rule, give an outcome for this patient:
- ok: the packet shows the patient is fine on this rule.
- concern: the packet shows a problem against this rule (an exclusion that applies, a requirement not met, a required
  document or arrangement missing when the rule applies).
- unknown: the packet doesn't settle it. "Not in the packet" is unknown, never ok.
- not_applicable: the rule's condition doesn't apply (e.g. no IV antibiotics, so the IV rule doesn't apply).
For "ask" rules, use ok if the packet answers the question (put the answer in note) and unknown if it doesn't.
For "eligible" rules (conditions IHH accepts, sometimes with an arrangement): not_applicable if the patient doesn't
have the condition; ok if they have it and it fits; concern if they have it but the stated qualifier or arrangement
is missing (e.g. a skin infection that needs IV antibiotics, not oral).
For "document" rules: ok if the packet has the document; concern if the rule applies and it is missing or
incomplete. These are things to request from the hospital, not reasons to deny.

Rules for judging:
- IHH's internal outline (rule IDs without FORM-) wins over the referral form's list (FORM-) when they disagree.
- [REDACTED] marks privacy redactions, not missing information. Dates are redacted, so rules that turn on hours or
  days (24 hours, 72 hours) are usually unknown unless the packet states the interval in words or times of day.
- Charts disagree with themselves and include earlier stays. Prefer the most recent, and mention a contradiction in note.
- History is not the same as current: a past diagnosis or a resolved problem is not a current concern unless the rule
  says "history of".
- evidence: a short quote (under 200 characters) copied exactly from the packet, or null. pages: where it is.
- note: one plain sentence a coordinator can act on.

Specific rules:
- FORM-X4 is only about MRSA, tuberculosis and C. diff that a doctor or CID hasn't cleared. Cellulitis, abscesses,
  pneumonia, UTIs and other infections are not FORM-X4 concerns: judge them by the outline (INT-E1 for skin
  infections on oral antibiotics, INT-E3 and ID-3 for IV antibiotics). A negative MRSA swab or culture means MRSA is
  not active.
- Aggression and violence (OTH-1, FORM-X7): violence, threats or weapons toward anyone (family, staff, police,
  strangers), and combative behavior during this stay, are concerns even if not aimed at staff or other patients;
  IHH's staff and other patients would be next. Say who it was directed at and when, if the packet says.
- Mobility (MOB-3, MOB-4): a wheelchair-dependent patient who transfers and uses the chair independently meets the
  mobility rules without walking 100 ft. Rest breaks and a walker or cane are fine (modified independence). Use the
  most recent PT/OT evaluation; distances and assist levels (independent, modified independent, supervision, contact
  guard, min/mod/max assist) decide it. Supervision or any physical assist is not independent.
- Cognition (COG-2, FORM-M3): AOx4 means oriented to person, place, time and situation. AOx3 or less, or
  "confused" in the most recent notes, is a concern. Delirium or encephalopathy that has cleared by the latest note
  is not.`;

/** Judge one group of rules against the packet's text. Every rule in the group gets a result. */
export async function checkGroup(group: string, pages: PageText[], usage: Usage): Promise<RuleResult[]> {
  const ids = RULE_GROUPS[group].rules;
  const rules = ids.map((id) => rulesById.get(id)!);
  const packet = pages.map((p) => `=== Page ${p.page} (${p.type}) ===\n${p.text}`).join("\n\n");
  const { results } = await jsonCall<{ results: RuleResult[] }>({
    step: `criteria:${group}`,
    model: models.criteria,
    instructions: CRITERIA_INSTRUCTIONS,
    text: [
      `Rules (${RULE_GROUPS[group].label}):`,
      ...rules.map((r) => `- ${r.id} [${r.kind}]: ${r.text}`),
      "",
      `The packet, ${pages.length} pages:`,
      packet,
    ].join("\n"),
    images: [],
    schemaName: "criteria_results",
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      required: ["results"],
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["rule_id", "outcome", "evidence", "pages", "note"],
            properties: {
              rule_id: { type: "string", enum: ids },
              outcome: { type: "string", enum: ["ok", "concern", "unknown", "not_applicable"] },
              evidence: { type: ["string", "null"] },
              pages: { type: "array", items: { type: "integer" } },
              note: { type: "string" },
            },
          },
        },
      },
    },
    usage,
  });
  const valid = new Set(pages.map((p) => p.page));
  return ids.map((id): RuleResult => {
    const r = results.find((x) => x.rule_id === id);
    if (!r) return { rule_id: id, outcome: "unknown", evidence: null, pages: [], note: "The checker gave no answer for this rule." };
    return { ...r, pages: r.pages.filter((p) => valid.has(p)) };
  });
}

/** Every group, in parallel. */
export async function checkCriteria(pages: PageText[], usage: Usage, groups = Object.keys(RULE_GROUPS)): Promise<RuleResult[]> {
  return (await Promise.all(groups.map((g) => checkGroup(g, pages, usage)))).flat();
}
