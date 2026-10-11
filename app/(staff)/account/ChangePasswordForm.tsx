"use client";

import { useActionState } from "react";
import { changeOwnPassword } from "@/app/auth-actions";
import { Field, Message } from "@/app/login/forms";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changeOwnPassword, {});
  return (
    <form action={action} className="card space-y-3 p-5">
      <h2 className="text-base font-semibold text-brand-900">Change password</h2>
      <Field label="Current password" name="current" type="password" autoComplete="current-password" />
      <Field label="New password (8+ characters)" name="password" type="password" autoComplete="new-password" />
      <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" />
      <Message state={state} />
      <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Change password"}</button>
    </form>
  );
}
