"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteReferral } from "@/app/actions";

/** Delete a referral and its uploaded files after confirming, then go back to the queue or to the upload page. */
export function DeleteReferral({
  id,
  label = "Delete referral",
  then = "/referrals",
  className = "btn-secondary px-2.5 py-1 text-sm text-red-700 hover:border-red-300",
}: {
  id: string;
  label?: string;
  then?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!window.confirm("Delete this referral and every file uploaded with it? This can't be undone.")) return;
    setBusy(true);
    setError(null);
    const res = await deleteReferral(id);
    if ("error" in res) {
      setError(res.error);
      setBusy(false);
      return;
    }
    router.push(then);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button className={className} disabled={busy} onClick={run}>
        {busy ? "Deleting…" : label}
      </button>
      {error && <span className="text-sm text-red-700">{error}</span>}
    </span>
  );
}
