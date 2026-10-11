import Link from "next/link";

export default async function Thanks({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return (
    <div className="card mx-auto max-w-xl p-6 text-center">
      <h1 className="text-xl font-semibold text-brand-900">Referral received</h1>
      <p className="mt-2 text-sm text-slate-600">
        A referral coordinator will review it and contact you with a decision within two hours.
      </p>
      {id && <p className="mt-3 text-xs text-slate-500">Reference: {id.slice(0, 8).toUpperCase()}</p>}
      <div className="mt-5 flex justify-center gap-3">
        <Link href="/refer" className="btn-secondary">Submit another</Link>
        {id && <Link href={`/referrals/${id}`} className="btn-primary">View as coordinator</Link>}
      </div>
    </div>
  );
}
