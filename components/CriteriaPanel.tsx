"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CRITERIA_STALE_MS, type CriteriaCheck, RULE_GROUPS, RULES, type RuleResult, rulesById, summarize } from "@/lib/criteria";

const OUTCOME_LABEL: Record<RuleResult["outcome"], string> = {
  ok: "OK",
  concern: "Concern",
  unknown: "Can't tell",
  not_applicable: "Doesn't apply",
};

/**
 * IHH's admission criteria checked against the whole packet (lib/criteria-check.ts): what to look at, what to ask the
 * hospital for and what the packet doesn't settle, each with a quote and links to its pages on the scan.
 */
export function CriteriaPanel({
  referralId,
  check,
  onShowPage,
}: {
  referralId: string;
  check: CriteriaCheck | null;
  onShowPage?: (page: number) => void;
}) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const stale = check?.status === "running" && Date.now() - Date.parse(check.startedAt) > CRITERIA_STALE_MS;
  const running = (check?.status === "running" && !stale) || starting;

  async function run() {
    setStarting(true);
    setRunError(null);
    const res = await fetch(`/api/referrals/${referralId}/criteria`, { method: "POST" }).catch(() => null);
    if (!res?.ok) setRunError((await res?.json().catch(() => null))?.error ?? "Could not start the check");
    router.refresh();
    setStarting(false);
  }
  const runButton = (label: string) => (
    <button className="btn-secondary px-2 py-0.5 text-xs" disabled={running} onClick={run}>
      {label}
    </button>
  );

  const checkedGroups = (check?.groups ?? Object.keys(RULE_GROUPS)).filter((g) => RULE_GROUPS[g]);
  const checkedRules = new Set(checkedGroups.flatMap((g) => RULE_GROUPS[g].rules)).size;

  return (
    <div className="card space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-brand-900">IHH admission criteria</h2>
        <span className="text-xs text-slate-500">internal outline, checked against every page</span>
        <span className="ml-auto">
          {!check && !running && runButton("Check criteria")}
          {(check?.status === "done" || check?.status === "failed" || stale) && !running && runButton("Run again")}
        </span>
      </div>

      {runError && <p className="text-sm text-red-700">{runError}</p>}
      {!check && !running && (
        <p className="text-sm text-slate-600">This packet hasn’t been checked against IHH’s admission criteria yet.</p>
      )}
      {running && (
        <p className="flex items-center gap-2 text-sm text-slate-700">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-600" />
          Reading every page and checking {checkedRules} rules. This takes a minute or two; you can review the form meanwhile.
        </p>
      )}
      {!running && (check?.status === "failed" || stale) && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          The criteria check didn’t finish{check?.error ? `: ${check.error}` : "."} The form and documents are unaffected.
        </p>
      )}
      {!running && check?.status === "done" && check.results && <Results results={check.results} onShowPage={onShowPage} />}

      {check && (
        <p className="text-xs text-slate-500">
          Checked: {checkedGroups.map((g) => RULE_GROUPS[g].label.toLowerCase()).join("; ")} ({checkedRules} of {RULES.length}{" "}
          rules). Not checked yet: diabetes, cardiac, respiratory, wounds and conditions by body system.
          {check.status === "done" && check.finishedAt && ` Checked ${new Date(check.finishedAt).toLocaleString()} with ${check.model}.`}{" "}
          The coordinator decides; this shows where to look.
        </p>
      )}
    </div>
  );
}

function Results({ results, onShowPage }: { results: RuleResult[]; onShowPage?: (page: number) => void }) {
  const s = summarize(results);
  const shown = new Set([...s.concerns, ...s.request, ...s.unknown, ...s.review].map((r) => r.rule_id));
  const rest = results.filter((r) => !shown.has(r.rule_id));
  const section = (title: string, items: RuleResult[], tone: string, empty?: string) =>
    items.length || empty ? (
      <div>
        <h3 className="text-sm font-medium text-slate-800">
          {title} <span className="font-normal text-slate-500">({items.length})</span>
        </h3>
        {items.length ? (
          <ul className={`mt-1 divide-y divide-white/60 rounded-md text-sm ${tone}`}>
            {items.map((r) => (
              <RuleItem key={r.rule_id} r={r} onShowPage={onShowPage} />
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-slate-500">{empty}</p>
        )}
      </div>
    ) : null;

  return (
    <div className="space-y-3">
      {section("Concerns", s.concerns, "bg-purple-50 text-purple-900", "None found in the rules checked.")}
      {section("Ask the hospital for", s.request, "bg-amber-50 text-amber-900")}
      {section("Can’t tell from this packet", s.unknown, "bg-slate-50 text-slate-800")}
      {section("Always the coordinator’s call", s.review, "bg-sky-50 text-sky-900")}
      {rest.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer select-none font-medium text-slate-700">
            Other rules checked ({rest.filter((r) => r.outcome === "ok").length} OK,{" "}
            {rest.filter((r) => r.outcome === "not_applicable").length} don’t apply
            {rest.some((r) => r.outcome === "unknown") && `, ${rest.filter((r) => r.outcome === "unknown").length} questions unanswered`})
          </summary>
          <ul className="mt-1 divide-y divide-slate-100 rounded-md bg-slate-50 text-slate-700">
            {rest.map((r) => (
              <RuleItem key={r.rule_id} r={r} onShowPage={onShowPage} showOutcome />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function RuleItem({ r, onShowPage, showOutcome }: { r: RuleResult; onShowPage?: (page: number) => void; showOutcome?: boolean }) {
  const rule = rulesById.get(r.rule_id);
  return (
    <li className="space-y-1 p-2.5">
      <p>
        <span className="mr-1.5 rounded bg-white/70 px-1.5 py-0.5 font-mono text-xs" title={rule ? `${rule.section}: ${rule.text}` : undefined}>
          {r.rule_id}
        </span>
        {showOutcome && <span className="mr-1.5 text-xs font-medium uppercase">{OUTCOME_LABEL[r.outcome]}</span>}
        {r.note}
      </p>
      {rule && <p className="text-xs opacity-75">Rule: {rule.text}</p>}
      {(r.evidence || r.pages.length > 0) && (
        <p className="flex flex-wrap items-baseline gap-1.5 text-xs">
          {r.evidence && <q className="italic">{r.evidence}</q>}
          {r.pages.map((p) =>
            onShowPage ? (
              <button
                key={p}
                className="rounded bg-white px-1.5 py-0.5 font-medium text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50"
                onClick={() => onShowPage(p)}
                title={`Show page ${p} of the scan`}
              >
                p. {p}
              </button>
            ) : (
              <span key={p}>p. {p}</span>
            ),
          )}
        </p>
      )}
    </li>
  );
}
