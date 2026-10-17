"use client";

import { useState } from "react";

/**
 * Small hand-built SVG charts for the program dashboard (no chart library). Colors are categorical slots 1–4
 * (blue, orange, violet, aqua); aqua is below 3:1 contrast, so every chart also has a table view.
 */
const C = {
  s1: "#2a78d6",
  s2: "#eb6834",
  s3: "#1baf7a",
  s4: "#8a5cd6",
  grid: "#e2e8f0",
  axis: "#64748b",
  ref: "#94a3b8",
  surface: "#ffffff",
};

export interface Week {
  week: string;
  approved: number;
  denied: number;
  withdrawn: number;
  pending: number;
  medianMinutes: number | null;
  within2h: number | null;
}

const SERIES = [
  { key: "approved", label: "Approved", color: C.s1 },
  { key: "denied", label: "Denied", color: C.s2 },
  { key: "withdrawn", label: "Withdrawn", color: C.s4 },
  { key: "pending", label: "Awaiting decision", color: C.s3 },
] as const;

const W = 640;
const H = 220;
const PAD = { l: 36, r: 12, t: 12, b: 28 };

function short(iso: string) {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function niceMax(v: number) {
  if (v <= 5) return 5;
  const step = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / step) * step;
}

/** Path for a bar with 4px rounded top corners and a square base. */
function topRounded(x: number, y: number, w: number, h: number, r = 4) {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

/** Referrals per week, stacked by outcome. */
export function WeeklyStack({ weeks }: { weeks: Week[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(1, ...weeks.map((w) => w.approved + w.denied + w.withdrawn + w.pending)));
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const band = plotW / Math.max(1, weeks.length);
  const barW = Math.min(24, band * 0.6);
  const y = (v: number) => PAD.t + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  const h = hover !== null ? weeks[hover] : null;

  return (
    <figure className="space-y-2">
      <Legend items={SERIES.map((s) => ({ label: s.label, color: s.color }))} />
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Referrals per week by outcome" onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={C.grid} strokeWidth={1} />
              <text x={PAD.l - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={C.axis}>{t}</text>
            </g>
          ))}
          {weeks.map((w, i) => {
            const x = PAD.l + band * i + (band - barW) / 2;
            let base = 0;
            const segs = SERIES.map((s) => ({ ...s, v: w[s.key] })).filter((s) => s.v > 0);
            return (
              <g key={w.week} opacity={hover === null || hover === i ? 1 : 0.45}>
                {segs.map((s, j) => {
                  const y0 = y(base);
                  base += s.v;
                  const y1 = y(base);
                  // 2px surface gap between stacked segments.
                  const height = Math.max(0, y0 - y1 - (j > 0 ? 2 : 0));
                  const top = y1;
                  return j === segs.length - 1 ? (
                    <path key={s.key} d={topRounded(x, top, barW, height)} fill={s.color} />
                  ) : (
                    <rect key={s.key} x={x} y={top} width={barW} height={height} fill={s.color} />
                  );
                })}
                {(i % Math.ceil(weeks.length / 7) === 0 || i === weeks.length - 1) && (
                  <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize={11} fill={C.axis}>{short(w.week)}</text>
                )}
                <rect x={PAD.l + band * i} y={PAD.t} width={band} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} />
              </g>
            );
          })}
        </svg>
        {h && hover !== null && (
          <Tooltip x={((PAD.l + band * (hover + 0.5)) / W) * 100}>
            <p className="font-medium">Week of {short(h.week)}</p>
            {SERIES.map((s) => (
              <p key={s.key} className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full" style={{ background: s.color }} />
                {s.label}: {h[s.key]}
              </p>
            ))}
          </Tooltip>
        )}
      </div>
      <TableView
        head={["Week of", "Approved", "Denied", "Withdrawn", "Awaiting", "Total"]}
        rows={weeks.map((w) => [short(w.week), w.approved, w.denied, w.withdrawn, w.pending, w.approved + w.denied + w.withdrawn + w.pending])}
      />
    </figure>
  );
}

/** Median minutes from receipt to decision, per week, against the two-hour promise. */
export function DecisionTrend({ weeks }: { weeks: Week[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const pts = weeks.map((w, i) => ({ i, w, v: w.medianMinutes })).filter((p): p is { i: number; w: Week; v: number } => p.v !== null);
  const max = niceMax(Math.max(150, ...pts.map((p) => p.v)));
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (weeks.length > 1 ? (i / (weeks.length - 1)) * plotW : plotW / 2);
  const y = (v: number) => PAD.t + plotH - (v / max) * plotH;
  const d = pts.map((p, j) => `${j ? "L" : "M"}${x(p.i)},${y(p.v)}`).join("");
  const last = pts.at(-1);
  const h = hover !== null ? pts.find((p) => p.i === hover) : undefined;

  return (
    <figure className="space-y-2">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Median minutes to decision per week"
          onMouseMove={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - box.left) / box.width) * W;
            const near = pts.reduce<(typeof pts)[number] | undefined>((a, p) => (!a || Math.abs(x(p.i) - px) < Math.abs(x(a.i) - px) ? p : a), undefined);
            setHover(near?.i ?? null);
          }}
          onMouseLeave={() => setHover(null)}
        >
          {[0, max / 2, max].map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={C.grid} strokeWidth={1} />
              <text x={PAD.l - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={C.axis}>{t}</text>
            </g>
          ))}
          <line x1={PAD.l} x2={W - PAD.r} y1={y(120)} y2={y(120)} stroke={C.ref} strokeWidth={1} />
          <text x={W - PAD.r} y={y(120) - 5} textAnchor="end" fontSize={11} fill={C.axis}>2-hour promise</text>
          {h && <line x1={x(h.i)} x2={x(h.i)} y1={PAD.t} y2={PAD.t + plotH} stroke={C.ref} strokeWidth={1} />}
          <path d={d} fill="none" stroke={C.s1} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {(h ? [h] : last ? [last] : []).map((p) => (
            <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={4.5} fill={C.s1} stroke={C.surface} strokeWidth={2} />
          ))}
          {last && !h && (
            <text x={x(last.i) - 8} y={y(last.v) - 10} textAnchor="end" fontSize={12} fontWeight={600} fill="#0f172a">{last.v} min</text>
          )}
          {weeks.map((w, i) =>
            i % Math.ceil(weeks.length / 7) === 0 || i === weeks.length - 1 ? (
              <text key={w.week} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill={C.axis}>{short(w.week)}</text>
            ) : null,
          )}
        </svg>
        {h && (
          <Tooltip x={(x(h.i) / W) * 100}>
            <p className="font-medium">Week of {short(h.w.week)}</p>
            <p>Median {h.v} min</p>
            {h.w.within2h !== null && <p>{Math.round(h.w.within2h * 100)}% within 2 hours</p>}
          </Tooltip>
        )}
      </div>
      <TableView
        head={["Week of", "Median minutes", "Within 2 hours"]}
        rows={weeks.map((w) => [short(w.week), w.medianMinutes ?? "—", w.within2h === null ? "—" : `${Math.round(w.within2h * 100)}%`])}
      />
    </figure>
  );
}

/** Horizontal bars for counts, one series; the value sits at the bar's tip. */
export function BarList({ items, total, empty = "None" }: { items: { label: string; count: number }[]; total?: number; empty?: string }) {
  const [hover, setHover] = useState<string | null>(null);
  if (!items.length) return <p className="text-sm text-slate-500">{empty}</p>;
  const max = Math.max(...items.map((i) => i.count));
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-3" onMouseEnter={() => setHover(i.label)} onMouseLeave={() => setHover(null)}>
          <span className="leading-tight text-slate-700">{i.label}</span>
          <span className="flex min-w-0 items-center gap-2">
            {/* The bar takes the room the value leaves, so the value never overflows. */}
            <span className="min-w-0 flex-1">
              {i.count > 0 && (
                <span
                  className="block h-3.5 rounded-r-[4px]"
                  style={{ width: `${Math.max(3, (i.count / max) * 100)}%`, background: C.s1, opacity: hover && hover !== i.label ? 0.45 : 1 }}
                />
              )}
            </span>
            <span className="shrink-0 whitespace-nowrap tabular-nums text-slate-700">
              {i.count}
              {total ? <span className="text-slate-500"> ({Math.round((i.count / total) * 100)}%)</span> : null}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

function Tooltip({ x, children }: { x: number; children: React.ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-md"
      style={{ left: `${Math.min(88, Math.max(12, x))}%` }}
    >
      {children}
    </div>
  );
}

function TableView({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-slate-500 hover:text-brand-700">Show as table</summary>
      <table className="mt-2 w-full text-left">
        <thead className="text-slate-500">
          <tr>{head.map((h) => <th key={h} className="py-0.5 pr-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 tabular-nums">
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} className="py-0.5 pr-3">{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
