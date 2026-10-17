"use client";

import { useRouter } from "next/navigation";

/** From and To days for the referral queue. Moving one past the other moves the other with it. */
export function DateRangePicker({ from, to, today }: { from: string; to: string; today: string }) {
  const router = useRouter();
  const go = (f: string, t: string) => router.push(f === t ? `/referrals?date=${f}` : `/referrals?from=${f}&to=${t}`);
  const input = "rounded-md border border-slate-300 px-2 py-1.5 text-sm";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
      <label className="inline-flex items-center gap-1.5">
        From
        <input
          type="date"
          className={input}
          value={from}
          max={today}
          onChange={(e) => {
            const f = e.target.value;
            if (f) go(f, f > to ? f : to);
          }}
        />
      </label>
      <label className="inline-flex items-center gap-1.5">
        to
        <input
          type="date"
          className={input}
          value={to}
          max={today}
          onChange={(e) => {
            const t = e.target.value;
            if (t) go(t < from ? t : from, t);
          }}
        />
      </label>
    </span>
  );
}
