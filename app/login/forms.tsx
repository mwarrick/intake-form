"use client";

import { useActionState } from "react";
import { type FormState, createFirstAdmin, signIn } from "@/app/auth-actions";

export function Field({ label, name, type = "text", autoComplete, defaultValue, required = true }: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input className="input" name={name} type={type} autoComplete={autoComplete} defaultValue={defaultValue} required={required} />
    </label>
  );
}

export function Message({ state }: { state: FormState }) {
  if (state.error) return <p className="text-sm text-red-700">{state.error}</p>;
  if (state.ok) return <p className="text-sm text-emerald-700">{state.ok}</p>;
  return null;
}

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <form action={action} className="card space-y-3 p-5">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" name="email" type="email" autoComplete="username" />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required={false} />
      <Message state={state} />
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      <p className="text-xs text-slate-500">
        New here? Sign in with just your email, then choose a password. Forgot your password? Ask an admin to clear it.
      </p>
    </form>
  );
}

export function FirstAdminForm() {
  const [state, action, pending] = useActionState(createFirstAdmin, {});
  return (
    <form action={action} className="card space-y-3 p-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" name="first_name" autoComplete="given-name" />
        <Field label="Last name" name="last_name" autoComplete="family-name" />
      </div>
      <Field label="Email" name="email" type="email" autoComplete="username" />
      <Field label="Password (8+ characters)" name="password" type="password" autoComplete="new-password" />
      <Message state={state} />
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Creating…" : "Create admin account"}</button>
    </form>
  );
}
