"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-xl p-6">
      <h1 className="text-lg font-semibold text-red-800">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600">
        If this is a fresh deployment, check that the Supabase environment variables are set and the migration in
        supabase/migrations has been applied.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-slate-500">Error ID: {error.digest}</p>}
      <button className="btn-secondary mt-4" onClick={reset}>Try again</button>
    </div>
  );
}
