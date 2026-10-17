"use client";

import { useRouter } from "next/navigation";

/** Jumps the referral queue to the chosen day. */
export function DayPicker({ day, today }: { day: string; today: string }) {
  const router = useRouter();
  return (
    <input
      type="date"
      aria-label="Show referrals received on"
      className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      value={day}
      max={today}
      onChange={(e) => {
        const v = e.target.value;
        if (v) router.push(`/referrals?date=${v}`);
      }}
    />
  );
}
